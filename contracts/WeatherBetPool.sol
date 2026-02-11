// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * WeatherBet Parimutuel Pool v1
 * 
 * Dynamic Parimutuel model:
 * - Users bet YES or NO into a shared pool
 * - Odds update live based on pool ratio
 * - Winners split the losing side's pool
 * - 0.5% fee on winnings only (losers pay nothing extra)
 * - Revenue split: 60% platform / 30% climate impact / 10% market creator
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract WeatherBetPool {

    uint256 public constant PRECISION = 1e6;
    uint256 public constant WIN_FEE_BPS = 50;           // 0.5%
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MIN_BET = 1e6;               // 1 USDm
    uint256 public constant PLATFORM_SHARE = 6000;       // 60%
    uint256 public constant CLIMATE_SHARE = 3000;        // 30%
    uint256 public constant CREATOR_SHARE = 1000;        // 10%

    IERC20 public immutable usdm;
    address public owner;
    address public oracle;
    address public climateFund;
    uint256 public platformBalance;
    uint256 public climateFundBalance;
    uint256 public nextMarketId;

    // Split into two structs to avoid stack-too-deep
    struct MarketInfo {
        string cityName;
        int256 lat;
        int256 lon;
        bool isRainMarket;
        uint256 historicalAvg;
        address creator;
    }

    struct MarketState {
        uint256 startTime;
        uint256 endTime;
        uint256 yesPool;
        uint256 noPool;
        bool resolved;
        bool outcome;
        bool cancelled;
        uint256 creatorEarnings;
    }

    struct UserBet {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    mapping(uint256 => MarketInfo) public marketInfo;
    mapping(uint256 => MarketState) public marketState;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    mapping(uint256 => address[]) internal marketBettors;
    mapping(uint256 => mapping(address => bool)) internal hasBet;

    event MarketCreated(uint256 indexed marketId, string cityName, bool isRainMarket, uint256 endTime, address creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount, uint256 newYesPool, uint256 newNoPool);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 yesPool, uint256 noPool);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout, uint256 fee);
    event MarketCancelled(uint256 indexed marketId);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event ClimateFundWithdrawn(address indexed to, uint256 amount);
    event PlatformWithdrawn(address indexed to, uint256 amount);

    error Unauthorized();
    error InvalidMarket();
    error MarketNotActive();
    error MarketNotResolved();
    error MarketNotCancelled();
    error AlreadyClaimed();
    error AlreadyResolved();
    error BetTooSmall();
    error NothingToClaim();
    error ZeroAddress();
    error MarketNotEnded();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle && msg.sender != owner) revert Unauthorized();
        _;
    }

    constructor(address _usdm, address _climateFund) {
        usdm = IERC20(_usdm);
        owner = msg.sender;
        oracle = msg.sender;
        climateFund = _climateFund;
        nextMarketId = 1;
    }

    // ============ MARKET MANAGEMENT ============

    function createMarket(
        string calldata cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 durationDays
    ) external onlyOracle returns (uint256) {
        uint256 marketId = nextMarketId++;

        marketInfo[marketId] = MarketInfo({
            cityName: cityName,
            lat: lat,
            lon: lon,
            isRainMarket: isRainMarket,
            historicalAvg: historicalAvg,
            creator: msg.sender
        });

        marketState[marketId] = MarketState({
            startTime: block.timestamp,
            endTime: block.timestamp + (durationDays * 1 days),
            yesPool: 0,
            noPool: 0,
            resolved: false,
            outcome: false,
            cancelled: false,
            creatorEarnings: 0
        });

        emit MarketCreated(marketId, cityName, isRainMarket, marketState[marketId].endTime, msg.sender);
        return marketId;
    }

    // ============ BETTING ============

    function bet(uint256 marketId, bool isYes, uint256 amount) external {
        MarketState storage state = marketState[marketId];
        // marketId validity: if endTime is 0, market doesn't exist
        if (state.endTime == 0) revert InvalidMarket();
        if (state.resolved || state.cancelled) revert MarketNotActive();
        if (block.timestamp >= state.endTime) revert MarketNotActive();
        if (amount < MIN_BET) revert BetTooSmall();

        usdm.transferFrom(msg.sender, address(this), amount);

        if (isYes) {
            state.yesPool += amount;
            userBets[marketId][msg.sender].yesAmount += amount;
        } else {
            state.noPool += amount;
            userBets[marketId][msg.sender].noAmount += amount;
        }

        if (!hasBet[marketId][msg.sender]) {
            hasBet[marketId][msg.sender] = true;
            marketBettors[marketId].push(msg.sender);
        }

        emit BetPlaced(marketId, msg.sender, isYes, amount, state.yesPool, state.noPool);
    }

    // ============ RESOLUTION ============

    function resolveMarket(uint256 marketId, uint256 actualValue) external onlyOracle {
        MarketState storage state = marketState[marketId];
        MarketInfo storage info = marketInfo[marketId];
        if (state.endTime == 0) revert InvalidMarket();
        if (state.resolved) revert AlreadyResolved();
        if (block.timestamp < state.endTime) revert MarketNotEnded();

        state.resolved = true;
        state.outcome = actualValue > info.historicalAvg;

        emit MarketResolved(marketId, state.outcome, state.yesPool, state.noPool);
    }

    function cancelMarket(uint256 marketId) external onlyOwner {
        MarketState storage state = marketState[marketId];
        if (state.endTime == 0) revert InvalidMarket();
        if (state.resolved) revert AlreadyResolved();

        state.cancelled = true;
        emit MarketCancelled(marketId);
    }

    // ============ CLAIMS ============

    function claim(uint256 marketId) external returns (uint256) {
        MarketState storage state = marketState[marketId];
        if (!state.resolved) revert MarketNotResolved();

        UserBet storage ub = userBets[marketId][msg.sender];
        if (ub.claimed) revert AlreadyClaimed();
        ub.claimed = true;

        uint256 totalPool = state.yesPool + state.noPool;
        uint256 userWinBet;
        uint256 winningPool;

        if (state.outcome) {
            userWinBet = ub.yesAmount;
            winningPool = state.yesPool;
        } else {
            userWinBet = ub.noAmount;
            winningPool = state.noPool;
        }

        if (userWinBet == 0) revert NothingToClaim();

        uint256 payout = (userWinBet * totalPool) / winningPool;
        uint256 profit = payout - userWinBet;
        uint256 fee = (profit * WIN_FEE_BPS) / FEE_DENOMINATOR;

        // Distribute fee: 60/30/10
        uint256 pFee = (fee * PLATFORM_SHARE) / FEE_DENOMINATOR;
        uint256 cFee = (fee * CLIMATE_SHARE) / FEE_DENOMINATOR;
        uint256 crFee = fee - pFee - cFee;

        platformBalance += pFee;
        climateFundBalance += cFee;
        state.creatorEarnings += crFee;

        uint256 netPayout = payout - fee;
        usdm.transfer(msg.sender, netPayout);

        emit WinningsClaimed(marketId, msg.sender, netPayout, fee);
        return netPayout;
    }

    function claimRefund(uint256 marketId) external {
        MarketState storage state = marketState[marketId];
        if (!state.cancelled) revert MarketNotCancelled();

        UserBet storage ub = userBets[marketId][msg.sender];
        if (ub.claimed) revert AlreadyClaimed();
        ub.claimed = true;

        uint256 refund = ub.yesAmount + ub.noAmount;
        if (refund == 0) revert NothingToClaim();

        usdm.transfer(msg.sender, refund);
        emit RefundClaimed(marketId, msg.sender, refund);
    }

    function claimCreatorEarnings(uint256 marketId) external {
        MarketInfo storage info = marketInfo[marketId];
        MarketState storage state = marketState[marketId];
        if (info.creator != msg.sender) revert Unauthorized();

        uint256 earnings = state.creatorEarnings;
        if (earnings == 0) revert NothingToClaim();

        state.creatorEarnings = 0;
        usdm.transfer(msg.sender, earnings);
    }

    // ============ VIEW FUNCTIONS ============

    function getOdds(uint256 marketId) external view returns (
        uint256 yesPct,
        uint256 noPct,
        uint256 yesMultiplier,
        uint256 noMultiplier
    ) {
        MarketState storage state = marketState[marketId];
        uint256 total = state.yesPool + state.noPool;

        if (total == 0) {
            return (50, 50, 2 * PRECISION, 2 * PRECISION);
        }

        yesPct = (state.yesPool * 100) / total;
        noPct = 100 - yesPct;
        yesMultiplier = state.yesPool > 0 ? (total * PRECISION) / state.yesPool : 0;
        noMultiplier = state.noPool > 0 ? (total * PRECISION) / state.noPool : 0;
    }

    function getMarket(uint256 marketId) external view returns (
        string memory cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 startTime,
        uint256 endTime
    ) {
        MarketInfo storage info = marketInfo[marketId];
        MarketState storage state = marketState[marketId];
        return (
            info.cityName, info.lat, info.lon,
            info.isRainMarket, info.historicalAvg,
            state.startTime, state.endTime
        );
    }

    function getMarketStatus(uint256 marketId) external view returns (
        uint256 yesPool,
        uint256 noPool,
        bool resolved,
        bool outcome,
        address creator,
        bool cancelled,
        uint256 creatorEarnings
    ) {
        MarketInfo storage info = marketInfo[marketId];
        MarketState storage state = marketState[marketId];
        return (
            state.yesPool, state.noPool,
            state.resolved, state.outcome,
            info.creator, state.cancelled,
            state.creatorEarnings
        );
    }

    function getUserBet(uint256 marketId, address user) external view returns (
        uint256 yesAmount,
        uint256 noAmount,
        bool claimed
    ) {
        UserBet storage ub = userBets[marketId][user];
        return (ub.yesAmount, ub.noAmount, ub.claimed);
    }

    function calculatePayout(uint256 marketId, bool isYes, uint256 amount) external view returns (
        uint256 payout,
        uint256 netPayout
    ) {
        MarketState storage state = marketState[marketId];
        uint256 newTotal = state.yesPool + state.noPool + amount;
        uint256 newSidePool = isYes ? state.yesPool + amount : state.noPool + amount;

        payout = (amount * newTotal) / newSidePool;
        uint256 profit = payout - amount;
        uint256 fee = (profit * WIN_FEE_BPS) / FEE_DENOMINATOR;
        netPayout = payout - fee;
    }

    function getBettorCount(uint256 marketId) external view returns (uint256) {
        return marketBettors[marketId].length;
    }

    // ============ ADMIN ============

    function setOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        oracle = _oracle;
    }

    function setClimateFund(address _climateFund) external onlyOwner {
        if (_climateFund == address(0)) revert ZeroAddress();
        climateFund = _climateFund;
    }

    function withdrawPlatformFees(address to) external onlyOwner {
        uint256 amount = platformBalance;
        platformBalance = 0;
        usdm.transfer(to, amount);
        emit PlatformWithdrawn(to, amount);
    }

    function withdrawClimateFund() external {
        uint256 amount = climateFundBalance;
        climateFundBalance = 0;
        usdm.transfer(climateFund, amount);
        emit ClimateFundWithdrawn(climateFund, amount);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        owner = newOwner;
    }
}
