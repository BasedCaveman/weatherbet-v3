// Contract addresses for MegaETH Testnet (v2 deployment - Feb 22, 2026)
export const CHAIN_CONFIG = {
  chainId: 6343,
  chainName: 'MegaETH Testnet',
  rpcUrl: 'https://timothy.megaeth.com/rpc',
  blockExplorer: 'https://megaeth-testnet-v2.blockscout.com',
} as const;

export const CONTRACT_ADDRESSES = {
  USDM: '0x3fAA5e48d982cc9428d9DFe3b522Dd8DFa9172f2',
  POOL: '0x29173954EbCe7Cc38257c905ad571e9700A07a59',
  ORACLE: '0x3f73Ca0f8A0CA1356CF870b067fDE918166C6777',
} as const;

// USDm is 18 decimals (matches mainnet USDM)
export const USDM_DECIMALS = 18;

// Pool ABI — matches WeatherBetPoolV2 (split MarketInfo + MarketState storage)
// getMarket: 7 return values (from MarketInfo)
// getMarketStatus: 7 return values (from MarketState + creator + earnings)
export const POOL_ABI = [
  // Core actions
  'function bet(uint256 marketId, bool isYes, uint256 amount)',
  'function claim(uint256 marketId) returns (uint256)',
  'function claimRefund(uint256 marketId)',

  // Market views
  'function getMarket(uint256 marketId) view returns (string cityName, int256 lat, int256 lon, bool isRainMarket, uint256 historicalAvg, uint256 startTime, uint256 endTime)',
  'function getMarketStatus(uint256 marketId) view returns (uint256 yesPool, uint256 noPool, bool resolved, bool outcome, address creator, bool cancelled, uint256 creatorEarnings)',
  'function getOdds(uint256 marketId) view returns (uint256 yesPct, uint256 noPct, uint256 yesMultiplier, uint256 noMultiplier)',
  'function getUserBet(uint256 marketId, address user) view returns (uint256 yesAmount, uint256 noAmount, bool claimed)',
  'function calculatePayout(uint256 marketId, bool isYes, uint256 amount) view returns (uint256 payout, uint256 netPayout)',
  'function getBettorCount(uint256 marketId) view returns (uint256)',
  'function getResolutionDetails(uint256 marketId) view returns (uint256 actualValue, uint256 resolvedAt, bool resolved, bool outcome)',
  'function nextMarketId() view returns (uint256)',

  // Fee views
  'function platformBalance() view returns (uint256)',
  'function climateFundBalance() view returns (uint256)',
  'function creatorEarnings(uint256 marketId) view returns (uint256)',
  'function getFeeConfig() view returns (uint256 feeBps, uint256 platformShare, uint256 creatorShare, uint256 climateShare, address platformAddress, address climateFundAddress)',
  'function feeBps() view returns (uint256)',

  // Withdrawals (pull pattern)
  'function withdrawPlatformFees()',
  'function withdrawClimateFund()',
  'function withdrawCreatorEarnings(uint256 marketId)',

  // Admin: fee config
  'function updateFeeShares(uint256 platformShare, uint256 creatorShare, uint256 climateShare)',
  'function updateFeeBps(uint256 newFeeBps)',
  'function updateFeeAddresses(address platformAddress, address climateFundAddress)',

  // Admin: oracle & ownership
  'function setOracle(address oracle)',
  'function transferOwnership(address newOwner)',
  'function acceptOwnership()',
  'function owner() view returns (address)',
  'function pendingOwner() view returns (address)',
  'function oracle() view returns (address)',

  // Admin: emergency
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',

  // Admin: dead pool recovery
  'function sweepUnclaimable(uint256 marketId)',
] as const;

// USDm ABI (v2 — 18 decimals, 1000 USDm faucet)
export const USDM_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function faucet()',
  'function canClaimFaucet(address user) view returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
] as const;
