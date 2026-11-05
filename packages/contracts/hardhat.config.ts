import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const PRIVATE_KEY = process.env.PRIVATE_KEY ?? "0x" + "0".repeat(64);

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    "worldchain-sepolia": {
      url: process.env.WORLDCHAIN_SEPOLIA_RPC ?? "https://worldchain-sepolia.g.alchemy.com/public",
      accounts: [PRIVATE_KEY],
      chainId: 4801,
    },
    worldchain: {
      url: "https://worldchain-mainnet.g.alchemy.com/public",
      accounts: [PRIVATE_KEY],
      chainId: 480,
    },
  },
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
};

export default config;
