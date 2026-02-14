// Contract addresses for MegaETH Testnet
export const CHAIN_CONFIG = {
  chainId: 6343,
  chainName: 'MegaETH Testnet',
  rpcUrl: 'https://timothy.megaeth.com/rpc',
  blockExplorer: 'https://megaeth-testnet-v2.blockscout.com',
} as const;

export const CONTRACT_ADDRESSES = {
  USDM: '0x4605821e41B3e95C78C2e3871bc4597a0939189A',
  POOL: '0x8114b7D0F42dE0cfF87a2614c4Cb795ff1e3ffC3',
  ORACLE: '0x79C021144eC4b3c3c73BDAe81b48c4B3194C51BD',
} as const;

// Pool ABI — matches deployed WeatherBetPool contract exactly
// getMarket returns 7 values (no id field — contract doesn't return it)
// getMarketStatus returns 7 values (includes creatorEarnings)
export const POOL_ABI = [
  'function bet(uint256 marketId, bool isYes, uint256 amount)',
  'function claim(uint256 marketId) returns (uint256)',
  'function claimRefund(uint256 marketId)',
  'function getMarket(uint256 marketId) view returns (string cityName, int256 lat, int256 lon, bool isRainMarket, uint256 historicalAvg, uint256 startTime, uint256 endTime)',
  'function getMarketStatus(uint256 marketId) view returns (uint256 yesPool, uint256 noPool, bool resolved, bool outcome, address creator, bool cancelled, uint256 creatorEarnings)',
  'function getOdds(uint256 marketId) view returns (uint256 yesPct, uint256 noPct, uint256 yesMultiplier, uint256 noMultiplier)',
  'function getUserBet(uint256 marketId, address user) view returns (uint256 yesAmount, uint256 noAmount, bool claimed)',
  'function calculatePayout(uint256 marketId, bool isYes, uint256 amount) view returns (uint256 payout, uint256 netPayout)',
  'function getBettorCount(uint256 marketId) view returns (uint256)',
  'function nextMarketId() view returns (uint256)',
  'function platformBalance() view returns (uint256)',
  'function climateFundBalance() view returns (uint256)',
] as const;

// USDm ABI — includes faucet functions
export const USDM_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function faucet()',
  'function canClaimFaucet(address user) view returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
] as const;
