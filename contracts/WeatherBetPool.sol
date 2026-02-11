// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╦ ╦╔═╗╔═╗╔╦╗╦ ╦╔═╗╦═╗╔╗ ╔═╗╔╦╗
 * ║║║║╣ ╠═╣ ║ ╠═╣║╣ ╠╦╝╠╩╗║╣  ║ 
 * ╚╩╝╚═╝╩ ╩ ╩ ╩ ╩╚═╝╩╚═╚═╝╚═╝ ╩ 
 * 
 * WeatherBet Parimutuel Pool v1
 * 
 * Dynamic Parimutuel model:
 * - Users bet YES or NO into a shared pool
 * - Odds update live based on pool ratio
 * - Winners split the losing side's pool
 * - 0.5% fee on winnings only (losers pay nothing extra)
 * - Revenue split: 60% platform / 30% climate impact / 10% market creator
 * - No LP needed, no counterparty needed, instant fills
 * 
 * Simplification principles applied:
 * - One struct, minimal functions
 * - No matching engine, no order book
 * - Every bet fills instantly against the pool
 * - ~200 lines vs 400+ for order book
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract WeatherBetPool {

    // ============ CONSTANTS ============

    uint256 public constant PRECISION = 1e6;          // 6 decimal precision (matches USDm)
    uint256 public constant WIN_FEE_BPS = 50;          // 0.5% fee on winnings (50 basis points)
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public constant MIN_BET = 1e6;              // 1 USDm minimum bet
    uint256 public constant PLATFORM_SHARE = 6000;      // 60% of fees → platform
    uint256 public constant CLIMATE_SHARE = 3000;       // 30% of fees → climate impact
    uint256 public constant CREATOR_SHARE = 1000;       // 10% of fees → market creator

    // ============ STATE ============

    IERC20 public immutable usdm;
    address public owner;
    address public oracle;
    address public climateFund;                          // Receives 30% of fees
    uint256 public platformBalance;                      // Accumulated platform fees
    uint256 public climateFundBalance;                   // Accumulated climate impact fees
    uint256 public nextMarketId;

    struct Market {
        uint256 id;
        string cityName;
        int256 lat;                                      // Latitude × 1e6 (readable, not hashed)
        int256 lon;                                      // Longitude × 1e6 (readable, not hashed)
        bool isRainMarket;
        uint256 historicalAvg;                           // Rain in mm, temp in 0.1°C
        uint256 startTime;
        uint256 endTime;
        uint256 yesPool;                                 // Total USDm bet on YES
        uint256 noPool;                                  // Total USDm bet on NO
        bool resolved;
        bool outcome;                                    // true = YES won, false = NO won
        address creator;                                 // Gets 10% of fees
        uint256 creatorEarnings;                         // Accumulated creator earnings
        bool cancelled;                                  // Admin can cancel (full refunds)
    }

    struct UserBet {
        uint256 yesAmount;                               // Total USDm user bet on YES
        uint256 noAmount;                                // Total USDm user bet on NO
        bool claimed;                                    // Whether user claimed winnings
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => UserBet)) public userBets;
    
    // Track all bettors per market for enumeration
    mapping(uint256 => address[]) internal marketBettors;
    mapping(uint256 => mapping(address => bool)) internal hasBet;

    // ============ EVENTS ============

    event MarketCreated(uint256 indexed marketId, string cityName, bool isRainMarket, uint256 endTime, address creator);
    event BetPlaced(uint256 indexed marketId, address indexed user, bool isYes, uint256 amount, uint256 newYesPool, uint256 newNoPool);
    event MarketResolved(uint256 indexed marketId, bool outcome, uint256 yesPool, uint256 noPool);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 payout, uint256 fee);
    event MarketCancelled(uint256 indexed marketId);
    event RefundClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event ClimateFundWithdrawn(address indexed to, uint256 amount);
    event PlatformWithdrawn(address indexed to, uint256 amount);

    // ============ ERRORS ============

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

    // ============ MODIFIERS ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyOracle() {
        if (msg.sender != oracle && msg.sender != owner) revert Unauthorized();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(address _usdm, address _climateFund) {
        usdm = IERC20(_usdm);
        owner = msg.sender;
        oracle = msg.sender;
        climateFund = _climateFund;
        nextMarketId = 1;
    }

    // ============ MARKET MANAGEMENT ============

    /**
     * @notice Create a new weather market
     * @param cityName Display name of the city
     * @param lat Latitude × 1e6 (e.g., São Paulo = -23550520)
     * @param lon Longitude × 1e6 (e.g., São Paulo = -46633309)
     * @param isRainMarket true for rain, false for temperature
     * @param historicalAvg Historical average (rain in mm, temp in 0.1°C)
     * @param durationDays How many days the market stays open
     */
    function createMarket(
        string calldata cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 durationDays
    ) external returns (uint256 marketId) {
        marketId = nextMarketId++;
        
        markets[marketId] = Market({
            id: marketId,
            cityName: cityName,
            lat: lat,
            lon: lon,
            isRainMarket: isRainMarket,
            historicalAvg: historicalAvg,
            startTime: block.timestamp,
            endTime: block.timestamp + (durationDays * 1 days),
            yesPool: 0,
            noPool: 0,
            resolved: false,
            outcome: false,
            creator: msg.sender,
            creatorEarnings: 0,
            cancelled: false
        });

        emit MarketCreated(marketId, cityName, isRainMarket, markets[marketId].endTime, msg.sender);
    }

    // ============ BETTING ============

    /**
     * @notice Place a bet on YES or NO
     * @param marketId Market to bet on
     * @param isYes true = bet YES (will exceed), false = bet NO (will not exceed)
     * @param amount Amount of USDm to bet (6 decimals)
     * 
     * Odds are calculated from pool ratio:
     *   If yesPool=700, noPool=300 → YES costs 70¢, pays 1.43x / NO costs 30¢, pays 3.33x
     *   
     * Every bet fills instantly — no counterparty needed.
     */
    function bet(uint256 marketId, bool isYes, uint256 amount) external {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (market.resolved || market.cancelled) revert MarketNotActive();
        if (block.timestamp >= market.endTime) revert MarketNotActive();
        if (amount < MIN_BET) revert BetTooSmall();

        // Transfer USDm from user to this contract
        usdm.transferFrom(msg.sender, address(this), amount);

        // Add to the appropriate pool
        if (isYes) {
            market.yesPool += amount;
            userBets[marketId][msg.sender].yesAmount += amount;
        } else {
            market.noPool += amount;
            userBets[marketId][msg.sender].noAmount += amount;
        }

        // Track bettor for enumeration
        if (!hasBet[marketId][msg.sender]) {
            hasBet[marketId][msg.sender] = true;
            marketBettors[marketId].push(msg.sender);
        }

        emit BetPlaced(marketId, msg.sender, isYes, amount, market.yesPool, market.noPool);
    }

    // ============ RESOLUTION ============

    /**
     * @notice Resolve a market with the actual weather outcome
     * @param marketId Market to resolve
     * @param actualValue Actual weather value (rain mm or temp 0.1°C)
     * 
     * outcome = true (YES wins) if actualValue > historicalAvg
     * outcome = false (NO wins) if actualValue <= historicalAvg
     */
    function resolveMarket(uint256 marketId, uint256 actualValue) external onlyOracle {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (market.resolved) revert AlreadyResolved();
        if (block.timestamp < market.endTime) revert MarketNotEnded();

        market.resolved = true;
        market.outcome = actualValue > market.historicalAvg;

        emit MarketResolved(marketId, market.outcome, market.yesPool, market.noPool);
    }

    /**
     * @notice Cancel a market — full refunds for all bettors
     */
    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (market.resolved) revert AlreadyResolved();

        market.cancelled = true;
        emit MarketCancelled(marketId);
    }

    // ============ CLAIMS ============

    /**
     * @notice Claim winnings from a resolved market
     * @param marketId Market to claim from
     * 
     * Payout formula:
     *   userShare = userBet / winningPool
     *   payout = userShare × totalPool
     *   fee = payout × 0.5% (only on profit, losers pay nothing)
     *   
     * Fee distribution:
     *   60% → platform treasury
     *   30% → climate impact fund
     *   10% → market creator
     */
    function claim(uint256 marketId) external returns (uint256 payout) {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (!market.resolved) revert MarketNotResolved();
        
        UserBet storage userBet = userBets[marketId][msg.sender];
        if (userBet.claimed) revert AlreadyClaimed();
        userBet.claimed = true;

        uint256 totalPool = market.yesPool + market.noPool;
        uint256 userWinBet;
        uint256 winningPool;

        if (market.outcome) {
            // YES won
            userWinBet = userBet.yesAmount;
            winningPool = market.yesPool;
        } else {
            // NO won
            userWinBet = userBet.noAmount;
            winningPool = market.noPool;
        }

        if (userWinBet == 0) revert NothingToClaim();

        // Calculate payout: user's share of the total pool
        payout = (userWinBet * totalPool) / winningPool;

        // Calculate fee on PROFIT only (payout - original bet)
        uint256 profit = payout - userWinBet;
        uint256 fee = (profit * WIN_FEE_BPS) / FEE_DENOMINATOR;

        // Distribute fee
        uint256 platformFee = (fee * PLATFORM_SHARE) / FEE_DENOMINATOR;
        uint256 climateFee = (fee * CLIMATE_SHARE) / FEE_DENOMINATOR;
        uint256 creatorFee = fee - platformFee - climateFee; // Remainder to avoid rounding loss

        platformBalance += platformFee;
        climateFundBalance += climateFee;
        market.creatorEarnings += creatorFee;

        // Transfer net payout to user
        uint256 netPayout = payout - fee;
        usdm.transfer(msg.sender, netPayout);

        emit WinningsClaimed(marketId, msg.sender, netPayout, fee);
    }

    /**
     * @notice Claim refund from a cancelled market
     */
    function claimRefund(uint256 marketId) external {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (!market.cancelled) revert MarketNotCancelled();
        
        UserBet storage userBet = userBets[marketId][msg.sender];
        if (userBet.claimed) revert AlreadyClaimed();
        userBet.claimed = true;

        uint256 refund = userBet.yesAmount + userBet.noAmount;
        if (refund == 0) revert NothingToClaim();

        usdm.transfer(msg.sender, refund);
        emit RefundClaimed(marketId, msg.sender, refund);
    }

    /**
     * @notice Creator claims accumulated earnings
     */
    function claimCreatorEarnings(uint256 marketId) external {
        Market storage market = markets[marketId];
        if (market.creator != msg.sender) revert Unauthorized();
        
        uint256 earnings = market.creatorEarnings;
        if (earnings == 0) revert NothingToClaim();
        
        market.creatorEarnings = 0;
        usdm.transfer(msg.sender, earnings);
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get current odds for a market
     * @return yesPct YES probability (0-100)
     * @return noPct NO probability (0-100)  
     * @return yesMultiplier Payout multiplier for YES (× PRECISION)
     * @return noMultiplier Payout multiplier for NO (× PRECISION)
     */
    function getOdds(uint256 marketId) external view returns (
        uint256 yesPct,
        uint256 noPct,
        uint256 yesMultiplier,
        uint256 noMultiplier
    ) {
        Market storage market = markets[marketId];
        uint256 total = market.yesPool + market.noPool;
        
        if (total == 0) {
            return (50, 50, 2 * PRECISION, 2 * PRECISION);
        }

        yesPct = (market.yesPool * 100) / total;
        noPct = 100 - yesPct;
        
        // Multiplier = totalPool / sidePool (how much $1 bet returns)
        yesMultiplier = market.yesPool > 0 ? (total * PRECISION) / market.yesPool : 0;
        noMultiplier = market.noPool > 0 ? (total * PRECISION) / market.noPool : 0;
    }

    /**
     * @notice Get full market data
     */
    function getMarket(uint256 marketId) external view returns (
        uint256 id,
        string memory cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 startTime,
        uint256 endTime,
        uint256 yesPool,
        uint256 noPool,
        bool resolved,
        bool outcome,
        address creator,
        bool cancelled
    ) {
        Market storage m = markets[marketId];
        return (
            m.id, m.cityName, m.lat, m.lon, m.isRainMarket,
            m.historicalAvg, m.startTime, m.endTime,
            m.yesPool, m.noPool, m.resolved, m.outcome,
            m.creator, m.cancelled
        );
    }

    /**
     * @notice Get user's bet in a market
     */
    function getUserBet(uint256 marketId, address user) external view returns (
        uint256 yesAmount,
        uint256 noAmount,
        bool claimed
    ) {
        UserBet storage ub = userBets[marketId][user];
        return (ub.yesAmount, ub.noAmount, ub.claimed);
    }

    /**
     * @notice Calculate potential payout for a hypothetical bet
     * @param marketId Market to calculate for
     * @param isYes Betting YES or NO
     * @param amount Amount to bet
     * @return payout Gross payout if this side wins
     * @return netPayout Payout after 0.5% fee on profit
     */
    function calculatePayout(uint256 marketId, bool isYes, uint256 amount) external view returns (
        uint256 payout,
        uint256 netPayout
    ) {
        Market storage market = markets[marketId];
        uint256 newTotal = market.yesPool + market.noPool + amount;
        uint256 newSidePool = isYes ? market.yesPool + amount : market.noPool + amount;
        
        payout = (amount * newTotal) / newSidePool;
        uint256 profit = payout - amount;
        uint256 fee = (profit * WIN_FEE_BPS) / FEE_DENOMINATOR;
        netPayout = payout - fee;
    }

    /**
     * @notice Get number of unique bettors in a market
     */
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
        // Anyone can trigger climate fund withdrawal to the designated address
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
