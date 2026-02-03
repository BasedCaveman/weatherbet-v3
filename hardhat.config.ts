import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // MegaETH Timothy Testnet
    megaeth_testnet: {
      url: "https://rpc-testnet.megaeth.com",
      chainId: 6343, // MegaETH testnet chain ID
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // MegaETH Mainnet (when available)
    megaeth: {
      url: "https://rpc.megaeth.com",
      chainId: 88888, // Placeholder - update when mainnet launches
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    // Local development
    localhost: {
      url: "http://127.0.0.1:8545",
    },
  },
  etherscan: {
    apiKey: {
      megaeth_testnet: "not-needed", // MegaETH explorer doesn't require API key
    },
    customChains: [
      {
        network: "megaeth_testnet",
        chainId: 6343,
        urls: {
          apiURL: "https://explorer-testnet.megaeth.com/api",
          browserURL: "https://explorer-testnet.megaeth.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./tests",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
};

export default config;
