// Contract addresses for MegaETH Testnet
export const CHAIN_CONFIG = {
  chainId: 6343,
  chainName: 'MegaETH Testnet',
  rpcUrl: 'https://timothy.megaeth.com/rpc',
  blockExplorer: 'https://megaeth-testnet-v2.blockscout.com',
} as const;

export const CONTRACT_ADDRESSES = {
  USDM: '0x4605821e41B3e95C78C2e3871bc4597a0939189A',
  TREASURY: '0xB0df50AbdE74447870F2160883c82477C6E6f72F',
  ORDER_BOOK: '0xcAA2bdD4A51702AaB56dE268E178f822CEC9F104',
  ORACLE: '0x5F87c7822F4Efb3C198154694A5d7Ad05D0dE373',
} as const;

// OrderBook ABI
export const ORDER_BOOK_ABI = [
  'function getMarket(uint256 marketId) view returns (tuple(uint256 id, bytes32 locationHash, string cityName, bool isRainMarket, uint256 startTime, uint256 endTime, uint256 historicalAvg, bool resolved, bool outcome, uint256 totalYesShares, uint256 totalNoShares))',
  'function getOrder(uint256 orderId) view returns (tuple(uint256 orderId, uint256 marketId, address user, bool isYes, uint256 price, uint256 shares, uint256 filled, bool cancelled, uint256 timestamp))',
  'function getPosition(uint256 marketId, address user) view returns (uint256 yesShares, uint256 noShares)',
  'function getBalance(address user) view returns (uint256)',
  'function getBestPrices(uint256 marketId) view returns (uint256 bestYesBid, uint256 bestYesAsk, uint256 bestNoBid, uint256 bestNoAsk)',
  'function getUserOrders(address user) view returns (uint256[])',
  'function nextMarketId() view returns (uint256)',
  'function placeOrder(uint256 marketId, bool isYes, uint256 price, uint256 shares) returns (uint256)',
  'function cancelOrder(uint256 orderId)',
  'function deposit(uint256 amount)',
  'function withdraw(uint256 amount)',
  'function claimWinnings(uint256 marketId) returns (uint256)',
] as const;

// USDm ABI
export const USDM_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function mint(address to, uint256 amount)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
] as const;
