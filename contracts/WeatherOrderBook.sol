// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WeatherOrderBook
 * @notice Simple order book for weather prediction markets
 * @dev Peer-to-peer trading without AMM complexity
 * 
 * Core Invariants:
 * 1. YES price + NO price = 1.00 USDm
 * 2. Total orders ≤ Total market liquidity
 * 3. Orders only before market end time
 * 4. Winners get exactly 1.00 USDm per share
 */

interface IUSDm {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract WeatherOrderBook {
    // ============ CONSTANTS ============
    
    uint256 public constant PRECISION = 1e6;  // 6 decimals (USDm has 6 decimals)
    uint256 public constant MAX_PRICE = PRECISION;  // $1.00
    uint256 public constant MIN_PRICE = 0.01e6;  // $0.01
    
    // ============ STRUCTS ============
    
    struct Market {
        uint256 id;
        bytes32 locationHash;      // keccak256(abi.encodePacked(lat, lon))
        string cityName;
        bool isRainMarket;         // true = rain, false = temperature
        uint256 startTime;
        uint256 endTime;
        uint256 historicalAvg;     // 10-year average (rainfall in mm or temp in 0.1°C)
        bool resolved;
        bool outcome;              // true = YES won, false = NO won
        uint256 totalYesShares;
        uint256 totalNoShares;
    }
    
    struct Order {
        uint256 orderId;
        uint256 marketId;
        address user;
        bool isYes;               // true = buying YES, false = buying NO
        uint256 price;            // Price per share (in USDm, 6 decimals)
        uint256 shares;           // Total shares in order
        uint256 filled;           // Shares already filled
        bool cancelled;
        uint256 timestamp;
    }
    
    struct Position {
        uint256 yesShares;
        uint256 noShares;
    }
    
    // ============ STATE ============
    
    IUSDm public immutable usdm;
    address public oracle;        // Chainlink oracle address
    address public treasury;
    
    uint256 public nextMarketId;
    uint256 public nextOrderId;
    
    mapping(uint256 => Market) public markets;
    mapping(uint256 => Order) public orders;
    mapping(uint256 => mapping(address => Position)) public positions;
    mapping(address => uint256) public balances;  // User USDm balances
    
    // Order book: marketId => isYes => price => orderIds[]
    mapping(uint256 => mapping(bool => mapping(uint256 => uint256[]))) public orderBook;
    
    // User's active orders
    mapping(address => uint256[]) public userOrders;
    
    // ============ EVENTS ============
    
    event MarketCreated(uint256 indexed marketId, string cityName, bool isRainMarket, uint256 endTime);
    event OrderPlaced(uint256 indexed orderId, uint256 indexed marketId, address indexed user, bool isYes, uint256 price, uint256 shares);
    event OrderMatched(uint256 indexed buyOrderId, uint256 indexed sellOrderId, uint256 shares, uint256 price);
    event OrderCancelled(uint256 indexed orderId, address indexed user);
    event MarketResolved(uint256 indexed marketId, bool outcome);
    event WinningsClaimed(uint256 indexed marketId, address indexed user, uint256 amount);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    
    // ============ ERRORS ============
    
    error InvalidPrice();
    error InvalidShares();
    error MarketNotActive();
    error MarketEnded();
    error InsufficientBalance();
    error OrderNotFound();
    error Unauthorized();
    error MarketNotResolved();
    error AlreadyResolved();
    error InvalidMarket();
    
    // ============ CONSTRUCTOR ============
    
    constructor(address _usdm, address _oracle, address _treasury) {
        usdm = IUSDm(_usdm);
        oracle = _oracle;
        treasury = _treasury;
        nextMarketId = 1;
        nextOrderId = 1;
    }
    
    // ============ CORE FUNCTIONS ============
    
    /**
     * @notice Create a new weather market
     * @param cityName Name of the city (e.g., "São Paulo")
     * @param lat Latitude (scaled by 1e6)
     * @param lon Longitude (scaled by 1e6)
     * @param isRainMarket true for rain, false for temperature
     * @param historicalAvg 10-year average value
     * @param durationDays Market duration in days
     */
    function createMarket(
        string calldata cityName,
        int256 lat,
        int256 lon,
        bool isRainMarket,
        uint256 historicalAvg,
        uint256 durationDays
    ) external returns (uint256 marketId) {
        if (msg.sender != oracle && msg.sender != treasury) revert Unauthorized();
        
        marketId = nextMarketId++;
        bytes32 locationHash = keccak256(abi.encodePacked(lat, lon));
        
        markets[marketId] = Market({
            id: marketId,
            locationHash: locationHash,
            cityName: cityName,
            isRainMarket: isRainMarket,
            startTime: block.timestamp,
            endTime: block.timestamp + (durationDays * 1 days),
            historicalAvg: historicalAvg,
            resolved: false,
            outcome: false,
            totalYesShares: 0,
            totalNoShares: 0
        });
        
        emit MarketCreated(marketId, cityName, isRainMarket, markets[marketId].endTime);
    }
    
    /**
     * @notice Place a limit order
     * @param marketId Market to trade
     * @param isYes true for YES shares, false for NO shares
     * @param price Price per share (must be 0.01 - 0.99)
     * @param shares Number of shares
     */
    function placeOrder(
        uint256 marketId,
        bool isYes,
        uint256 price,
        uint256 shares
    ) external returns (uint256 orderId) {
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (market.resolved) revert MarketEnded();
        if (block.timestamp >= market.endTime) revert MarketEnded();
        if (price < MIN_PRICE || price >= MAX_PRICE) revert InvalidPrice();
        if (shares == 0) revert InvalidShares();
        
        // Calculate cost
        uint256 cost = (shares * price) / PRECISION;
        if (balances[msg.sender] < cost) revert InsufficientBalance();
        
        // Deduct balance
        balances[msg.sender] -= cost;
        
        // Create order
        orderId = nextOrderId++;
        orders[orderId] = Order({
            orderId: orderId,
            marketId: marketId,
            user: msg.sender,
            isYes: isYes,
            price: price,
            shares: shares,
            filled: 0,
            cancelled: false,
            timestamp: block.timestamp
        });
        
        // Add to order book
        orderBook[marketId][isYes][price].push(orderId);
        userOrders[msg.sender].push(orderId);
        
        emit OrderPlaced(orderId, marketId, msg.sender, isYes, price, shares);
        
        // Try to match immediately
        _matchOrders(marketId, isYes, price);
    }
    
    /**
     * @notice Cancel an unfilled order
     * @param orderId Order to cancel
     */
    function cancelOrder(uint256 orderId) external {
        Order storage order = orders[orderId];
        if (order.orderId == 0) revert OrderNotFound();
        if (order.user != msg.sender) revert Unauthorized();
        if (order.cancelled) revert OrderNotFound();
        
        uint256 unfilledShares = order.shares - order.filled;
        if (unfilledShares == 0) return; // Fully filled, nothing to cancel
        
        // Refund unfilled portion
        uint256 refund = (unfilledShares * order.price) / PRECISION;
        balances[msg.sender] += refund;
        
        order.cancelled = true;
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @notice Resolve market using oracle data
     * @param marketId Market to resolve
     * @param actualValue Actual weather value from oracle
     */
    function resolveMarket(uint256 marketId, uint256 actualValue) external {
        if (msg.sender != oracle) revert Unauthorized();
        
        Market storage market = markets[marketId];
        if (market.id == 0) revert InvalidMarket();
        if (market.resolved) revert AlreadyResolved();
        if (block.timestamp < market.endTime) revert MarketNotActive();
        
        // Determine outcome: did actual exceed historical average?
        market.outcome = actualValue > market.historicalAvg;
        market.resolved = true;
        
        emit MarketResolved(marketId, market.outcome);
    }
    
    /**
     * @notice Claim winnings after market resolution
     * @param marketId Market to claim from
     */
    function claimWinnings(uint256 marketId) external returns (uint256 payout) {
        Market storage market = markets[marketId];
        if (!market.resolved) revert MarketNotResolved();
        
        Position storage pos = positions[marketId][msg.sender];
        
        uint256 winningShares = market.outcome ? pos.yesShares : pos.noShares;
        if (winningShares == 0) return 0;
        
        // Each winning share pays out 1.00 USDm
        payout = winningShares * PRECISION / PRECISION;  //winningShares * 1.00
        
        // Clear position
        pos.yesShares = 0;
        pos.noShares = 0;
        
        // Credit balance
        balances[msg.sender] += payout;
        
        emit WinningsClaimed(marketId, msg.sender, payout);
    }
    
    // ============ BALANCE MANAGEMENT ============
    
    /**
     * @notice Deposit USDm into the contract
     * @param amount Amount to deposit
     */
    function deposit(uint256 amount) external {
        if (!usdm.transferFrom(msg.sender, address(this), amount)) revert InsufficientBalance();
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }
    
    /**
     * @notice Withdraw USDm from the contract
     * @param amount Amount to withdraw
     */
    function withdraw(uint256 amount) external {
        if (balances[msg.sender] < amount) revert InsufficientBalance();
        balances[msg.sender] -= amount;
        if (!usdm.transfer(msg.sender, amount)) revert InsufficientBalance();
        emit Withdrawn(msg.sender, amount);
    }
    
    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @notice Match orders at a given price level
     * @param marketId Market ID
     * @param isYes Order side
     * @param price Price level
     */
    function _matchOrders(uint256 marketId, bool isYes, uint256 price) internal {
        // Calculate opposite price (YES + NO = 1.00)
        uint256 oppositePrice = MAX_PRICE - price;
        
        uint256[] storage buyOrders = orderBook[marketId][isYes][price];
        uint256[] storage sellOrders = orderBook[marketId][!isYes][oppositePrice];
        
        if (buyOrders.length == 0 || sellOrders.length == 0) return;
        
        // Match orders FIFO
        for (uint256 i = 0; i < buyOrders.length && sellOrders.length > 0; i++) {
            Order storage buyOrder = orders[buyOrders[i]];
            if (buyOrder.cancelled || buyOrder.filled == buyOrder.shares) continue;
            
            for (uint256 j = 0; j < sellOrders.length; j++) {
                Order storage sellOrder = orders[sellOrders[j]];
                if (sellOrder.cancelled || sellOrder.filled == sellOrder.shares) continue;
                
                // Match orders
                uint256 buyRemaining = buyOrder.shares - buyOrder.filled;
                uint256 sellRemaining = sellOrder.shares - sellOrder.filled;
                uint256 matchSize = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
                
                // Update fills
                buyOrder.filled += matchSize;
                sellOrder.filled += matchSize;
                
                // Update positions
                Position storage buyPos = positions[marketId][buyOrder.user];
                Position storage sellPos = positions[marketId][sellOrder.user];
                
                if (isYes) {
                    buyPos.yesShares += matchSize;
                    sellPos.noShares += matchSize;
                } else {
                    buyPos.noShares += matchSize;
                    sellPos.yesShares += matchSize;
                }
                
                // Update market totals
                Market storage market = markets[marketId];
                if (isYes) {
                    market.totalYesShares += matchSize;
                } else {
                    market.totalNoShares += matchSize;
                }
                
                emit OrderMatched(buyOrder.orderId, sellOrder.orderId, matchSize, price);
                
                if (buyOrder.filled == buyOrder.shares) break;
            }
        }
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @notice Get market details
     */
    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }
    
    /**
     * @notice Get order details
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @notice Get user's position in a market
     */
    function getPosition(uint256 marketId, address user) external view returns (uint256 yesShares, uint256 noShares) {
        Position storage pos = positions[marketId][user];
        return (pos.yesShares, pos.noShares);
    }
    
    /**
     * @notice Get order book at a price level
     */
    function getOrdersAtPrice(
        uint256 marketId,
        bool isYes,
        uint256 price
    ) external view returns (uint256[] memory) {
        return orderBook[marketId][isYes][price];
    }
    
    /**
     * @notice Get user's active orders
     */
    function getUserOrders(address user) external view returns (uint256[] memory) {
        return userOrders[user];
    }
    
    /**
     * @notice Get best bid/ask
     */
    function getBestPrices(uint256 marketId) external view returns (
        uint256 bestYesBid,
        uint256 bestYesAsk,
        uint256 bestNoBid,
        uint256 bestNoAsk
    ) {
        // Scan through price levels to find best prices
        // This is simplified - production would use a more efficient structure
        
        for (uint256 p = MAX_PRICE - MIN_PRICE; p >= MIN_PRICE; p -= MIN_PRICE) {
            if (orderBook[marketId][true][p].length > 0 && bestYesBid == 0) {
                bestYesBid = p;
            }
            if (orderBook[marketId][false][p].length > 0 && bestNoBid == 0) {
                bestNoBid = p;
            }
            if (bestYesBid > 0 && bestNoBid > 0) break;
        }
        
        for (uint256 p = MIN_PRICE; p < MAX_PRICE; p += MIN_PRICE) {
            if (orderBook[marketId][true][p].length > 0 && bestYesAsk == 0) {
                bestYesAsk = p;
            }
            if (orderBook[marketId][false][p].length > 0 && bestNoAsk == 0) {
                bestNoAsk = p;
            }
            if (bestYesAsk > 0 && bestNoAsk > 0) break;
        }
    }
}
