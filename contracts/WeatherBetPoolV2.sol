// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title WeatherBetPool v2
 * @notice Parimutuel weather prediction market with updatable fee splits
 * 
 * DEPLOYMENT ARGS (MegaETH Testnet - Chain 6343):
 *   _usdm:              0x3fAA5e48d982cc9428d9DFe3b522Dd8DFa9172f2
 *   _oracle:            0x5833869fdEB4D371b854D7474F5F84B43320FD05
 *   _platformAddress:   0x1a9a200a1cC1F701DDE3c2bbBEE7FC7061dC5E8C
 *   _climateFundAddress: 0x5122b4D90185958FAa110a3A02B647C755B977Fd
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

error Unauthorized();
error ZeroAddress();
error MarketNotFound();
error MarketNotActive();
error MarketNotResolved();
error MarketAlreadyResolved();
error MarketNotExpired();
error MarketCancelled();
error BetTooSmall();
error NothingToClaim();
error AlreadyClaimed();
error InvalidShares();
error InvalidOracleValue();
error TransferFailed();
error ContractPaused();
error InvalidTimeRange();
error WinningPoolNotEmpty();
error CooldownActive();
error NewOwnerIsZero();
error NotPendingOwner();

abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    modifier nonReentrant() {
        if (_status == _ENTERED) revert("ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract WeatherBetPoolV2 is ReentrancyGuard {

    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_BET = 1e18;
    uint256 public constant MAX_FEE_BPS = 500;
    uint256 public constant MAX_MARKET_DURATION = 90 days;
    uint256 public constant MIN_MARKET_DURATION = 1 hours;
    uint256 public constant SWEEP_COOLDOWN = 7 days;
    uint256 public constant MAX_RAINFALL_MM = 10_000;

    IERC20 public immutable usdm;
    address public owner;
    address public pendingOwner;
    address public oracle;
    bool public paused;

    uint256 public feeBps = 50;
    uint256 public platformShare = 5000;
    uint256 public creatorShare = 2500;
    uint256 public climateShare = 2500;
    address public platformAddress;
    address public climateFundAddress;
    uint256 public platformBalance;
    uint256 public climateFundBalance;

    uint256 public nextMarketId = 1;

    struct MarketInfo {
        string cityName;
        int256 lat;
        int256 lon;
        bool isRainMarket;
        uint256 historicalAvg;
        uint256 startTime;
        uint256 endTime;
        address creator;
    }

    struct MarketState {
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
        bool cancelled;
        uint256 actualValue;
        uint256 resolvedAt;
        uint256 bettorCount;
    }

    struct UserBet {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    mapping(uint256 => MarketInfo) public marketInfo;
    mapping(uint256 => MarketState) public marketState;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    mapping(uint256 => uint256) public creatorEarnings;

    event MarketCreated(uint256 indexed marketId, string cityName, address indexed creator);
    event BetPlaced(uint256 indexed marketId, address indexed bettor, bool isYes, uint256 amount);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 actualValue);
    event MarketCancelledEvent(uint256 indexed marketId);
    event Claimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event FeeSharesUpdated(uint256 platformShare, uint256 creatorShare, uint256 climateShare);
    event FeeBpsUpdated(uint256 newFeeBps);
    event OracleUpdated(address indexed newOracle);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
    event DeadPoolSwept(uint256 indexed marketId, uint256 amount);
    event PlatformWithdrawn(address indexed to, uint256 amount);
    event ClimateFundWithdrawn(address indexed to, uint256 amount);
    event CreatorWithdrawn(uint256 indexed marketId, address indexed creator, uint256 amount);
    event FeeAddressesUpdated(address platform, address climateFund);

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle) revert Unauthorized();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    constructor(
        address _usdm,
        address _oracle,
        address _platformAddress,
        address _climateFundAddress
    ) {
        if (_usdm == address(0)) revert ZeroAddress();
        if (_oracle == address(0)) revert ZeroAddress();
        if (_platformAddress == address(0)) revert ZeroAddress();
        if (_climateFundAddress == address(0)) revert ZeroAddress();

        usdm = IERC20(_usdm);
        oracle = _oracle;
        owner = msg.sender;
        platformAddress = _platformAddress;
        climateFundAddress = _climateFundAddress;
    }

    // ── MARKET MANAGEMENT ──

    function createMarket(
        string calldata _cityName,
        int256 _lat,
        int256 _lon,
        bool _isRainMarket,
        uint256 _historicalAvg,
        uint256 _startTime,
        uint256 _endTime,
        address _creator
    ) external onlyOracle whenNotPaused returns (uint256 marketId) {
        if (_creator == address(0)) revert ZeroAddress();
        if (bytes(_cityName).length == 0 || bytes(_cityName).length > 64) revert InvalidOracleValue();
        if (_endTime <= _startTime) revert InvalidTimeRange();
        if (_endTime - _startTime > MAX_MARKET_DURATION) revert InvalidTimeRange();
        if (_endTime - _startTime < MIN_MARKET_DURATION) revert InvalidTimeRange();
        if (_lat < -90_000000 || _lat > 90_000000) revert InvalidOracleValue();
        if (_lon < -180_000000 || _lon > 180_000000) revert InvalidOracleValue();

        marketId = nextMarketId++;

        MarketInfo storage info = marketInfo[marketId];
        info.cityName = _cityName;
        info.lat = _lat;
        info.lon = _lon;
        info.isRainMarket = _isRainMarket;
        info.historicalAvg = _historicalAvg;
        info.startTime = _startTime;
        info.endTime = _endTime;
        info.creator = _creator;

        emit MarketCreated(marketId, _cityName, _creator);
    }

    // ── BETTING ──

    function bet(
        uint256 _marketId,
        bool _isYes,
        uint256 _amount
    ) external nonReentrant whenNotPaused {
        MarketInfo storage info = marketInfo[_marketId];
        MarketState storage state = marketState[_marketId];

        if (bytes(info.cityName).length == 0) revert MarketNotFound();
        if (state.resolved || state.cancelled) revert MarketNotActive();
        if (block.timestamp >= info.endTime) revert MarketNotActive();
        if (_amount < MIN_BET) revert BetTooSmall();

        UserBet storage ub = userBets[_marketId][msg.sender];
        if (ub.yesAmount == 0 && ub.noAmount == 0) {
            state.bettorCount++;
        }

        if (_isYes) {
            state.yesPool += _amount;
            ub.yesAmount += _amount;
        } else {
            state.noPool += _amount;
            ub.noAmount += _amount;
        }

        if (!usdm.transferFrom(msg.sender, address(this), _amount)) revert TransferFailed();
        emit BetPlaced(_marketId, msg.sender, _isYes, _amount);
    }

    // ── RESOLUTION ──

    function resolveMarket(uint256 _marketId, uint256 _actualValue) external onlyOracle {
        MarketInfo storage info = marketInfo[_marketId];
        MarketState storage state = marketState[_marketId];

        if (bytes(info.cityName).length == 0) revert MarketNotFound();
        if (state.resolved) revert MarketAlreadyResolved();
        if (state.cancelled) revert MarketCancelled();
        if (block.timestamp < info.endTime) revert MarketNotExpired();
        if (info.isRainMarket && _actualValue > MAX_RAINFALL_MM) revert InvalidOracleValue();

        state.outcome = _actualValue > info.historicalAvg;
        state.resolved = true;
        state.actualValue = _actualValue;
        state.resolvedAt = block.timestamp;

        emit MarketResolved(_marketId, state.outcome, _actualValue);
    }

    function cancelMarket(uint256 _marketId) external onlyOwner {
        MarketInfo storage info = marketInfo[_marketId];
        MarketState storage state = marketState[_marketId];
        if (bytes(info.cityName).length == 0) revert MarketNotFound();
        if (state.resolved) revert MarketAlreadyResolved();
        state.cancelled = true;
        emit MarketCancelledEvent(_marketId);
    }

    // ── CLAIMS ──

    function claim(uint256 _marketId) external nonReentrant whenNotPaused returns (uint256 netPayout) {
        MarketState storage state = marketState[_marketId];
        if (!state.resolved) revert MarketNotResolved();

        UserBet storage ub = userBets[_marketId][msg.sender];
        if (ub.claimed) revert AlreadyClaimed();

        uint256 winningBet = state.outcome ? ub.yesAmount : ub.noAmount;
        if (winningBet == 0) revert NothingToClaim();

        uint256 winningPool = state.outcome ? state.yesPool : state.noPool;
        uint256 totalPool = state.yesPool + state.noPool;

        ub.claimed = true;

        uint256 grossPayout = (winningBet * totalPool) / winningPool;
        uint256 profit = grossPayout - winningBet;
        uint256 fee = 0;

        if (profit > 0) {
            fee = (profit * feeBps) / BPS;
            uint256 pFee = (fee * platformShare) / BPS;
            uint256 cFee = (fee * climateShare) / BPS;
            platformBalance += pFee;
            climateFundBalance += cFee;
            creatorEarnings[_marketId] += fee - pFee - cFee;
        }

        netPayout = grossPayout - fee;
        if (!usdm.transfer(msg.sender, netPayout)) revert TransferFailed();
        emit Claimed(_marketId, msg.sender, netPayout);
    }

    function claimRefund(uint256 _marketId) external nonReentrant {
        MarketState storage state = marketState[_marketId];
        if (!state.cancelled) revert MarketCancelled();

        UserBet storage ub = userBets[_marketId][msg.sender];
        if (ub.claimed) revert AlreadyClaimed();

        uint256 total = ub.yesAmount + ub.noAmount;
        if (total == 0) revert NothingToClaim();

        ub.claimed = true;
        if (!usdm.transfer(msg.sender, total)) revert TransferFailed();
        emit RefundClaimed(_marketId, msg.sender, total);
    }

    // ── DEAD POOL RECOVERY ──

    function sweepUnclaimable(uint256 _marketId) external onlyOwner nonReentrant {
        MarketState storage state = marketState[_marketId];
        if (!state.resolved) revert MarketNotResolved();

        uint256 winningPool = state.outcome ? state.yesPool : state.noPool;
        if (winningPool != 0) revert WinningPoolNotEmpty();
        if (block.timestamp < state.resolvedAt + SWEEP_COOLDOWN) revert CooldownActive();

        uint256 losingPool = state.outcome ? state.noPool : state.yesPool;
        if (losingPool == 0) revert NothingToClaim();

        if (state.outcome) { state.noPool = 0; } else { state.yesPool = 0; }

        uint256 half = losingPool / 2;
        platformBalance += half;
        climateFundBalance += (losingPool - half);
        emit DeadPoolSwept(_marketId, losingPool);
    }

    // ── WITHDRAWALS ──

    function withdrawPlatformFees() external nonReentrant {
        if (msg.sender != platformAddress && msg.sender != owner) revert Unauthorized();
        uint256 amount = platformBalance;
        if (amount == 0) revert NothingToClaim();
        platformBalance = 0;
        if (!usdm.transfer(platformAddress, amount)) revert TransferFailed();
        emit PlatformWithdrawn(platformAddress, amount);
    }

    function withdrawClimateFund() external nonReentrant {
        if (msg.sender != climateFundAddress && msg.sender != owner) revert Unauthorized();
        uint256 amount = climateFundBalance;
        if (amount == 0) revert NothingToClaim();
        climateFundBalance = 0;
        if (!usdm.transfer(climateFundAddress, amount)) revert TransferFailed();
        emit ClimateFundWithdrawn(climateFundAddress, amount);
    }

    function withdrawCreatorEarnings(uint256 _marketId) external nonReentrant {
        address creator = marketInfo[_marketId].creator;
        if (msg.sender != creator) revert Unauthorized();
        uint256 amount = creatorEarnings[_marketId];
        if (amount == 0) revert NothingToClaim();
        creatorEarnings[_marketId] = 0;
        if (!usdm.transfer(creator, amount)) revert TransferFailed();
        emit CreatorWithdrawn(_marketId, creator, amount);
    }

    // ── ADMIN: FEES ──

    function updateFeeShares(uint256 _p, uint256 _cr, uint256 _cl) external onlyOwner {
        if (_p + _cr + _cl != BPS) revert InvalidShares();
        platformShare = _p;
        creatorShare = _cr;
        climateShare = _cl;
        emit FeeSharesUpdated(_p, _cr, _cl);
    }

    function updateFeeBps(uint256 _newFeeBps) external onlyOwner {
        if (_newFeeBps > MAX_FEE_BPS) revert InvalidShares();
        feeBps = _newFeeBps;
        emit FeeBpsUpdated(_newFeeBps);
    }

    function updateFeeAddresses(address _p, address _c) external onlyOwner {
        if (_p == address(0) || _c == address(0)) revert ZeroAddress();
        platformAddress = _p;
        climateFundAddress = _c;
        emit FeeAddressesUpdated(_p, _c);
    }

    // ── ADMIN: ORACLE & OWNERSHIP ──

    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        if (_newOwner == address(0)) revert NewOwnerIsZero();
        pendingOwner = _newOwner;
        emit OwnershipTransferStarted(owner, _newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    function pause() external onlyOwner { paused = true; emit Paused(msg.sender); }
    function unpause() external onlyOwner { paused = false; emit Unpaused(msg.sender); }

    // ── VIEW FUNCTIONS ──

    function getMarket(uint256 _id) external view returns (
        string memory, int256, int256, bool, uint256, uint256, uint256
    ) {
        MarketInfo storage i = marketInfo[_id];
        return (i.cityName, i.lat, i.lon, i.isRainMarket, i.historicalAvg, i.startTime, i.endTime);
    }

    function getMarketStatus(uint256 _id) external view returns (
        uint256, uint256, bool, bool, address, bool, uint256
    ) {
        MarketState storage s = marketState[_id];
        address c = marketInfo[_id].creator;
        uint256 e = creatorEarnings[_id];
        return (s.yesPool, s.noPool, s.resolved, s.outcome, c, s.cancelled, e);
    }

    function getOdds(uint256 _id) external view returns (
        uint256 yesPct, uint256 noPct, uint256 yesMul, uint256 noMul
    ) {
        MarketState storage s = marketState[_id];
        uint256 total = s.yesPool + s.noPool;
        if (total == 0) return (50, 50, 200, 200);
        yesPct = (s.yesPool * 100) / total;
        noPct = 100 - yesPct;
        yesMul = s.yesPool > 0 ? (total * 100) / s.yesPool : 0;
        noMul = s.noPool > 0 ? (total * 100) / s.noPool : 0;
    }

    function getUserBet(uint256 _id, address _user) external view returns (
        uint256, uint256, bool
    ) {
        UserBet storage ub = userBets[_id][_user];
        return (ub.yesAmount, ub.noAmount, ub.claimed);
    }

    function calculatePayout(uint256 _id, bool _isYes, uint256 _amount) external view returns (
        uint256 payout, uint256 netPayout
    ) {
        MarketState storage s = marketState[_id];
        uint256 winPool = _isYes ? s.yesPool : s.noPool;
        uint256 total = s.yesPool + s.noPool;
        payout = winPool == 0 ? total + _amount : (_amount * (total + _amount)) / (winPool + _amount);
        uint256 profit = payout > _amount ? payout - _amount : 0;
        netPayout = payout - ((profit * feeBps) / BPS);
    }

    function getBettorCount(uint256 _id) external view returns (uint256) {
        return marketState[_id].bettorCount;
    }

    function getFeeConfig() external view returns (
        uint256, uint256, uint256, uint256, address, address
    ) {
        return (feeBps, platformShare, creatorShare, climateShare, platformAddress, climateFundAddress);
    }

    function getResolutionDetails(uint256 _id) external view returns (
        uint256, uint256, bool, bool
    ) {
        MarketState storage s = marketState[_id];
        return (s.actualValue, s.resolvedAt, s.resolved, s.outcome);
    }
}

