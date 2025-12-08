import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const { SEPOLIA_RPC, DEPLOYER_KEY, ETHERSCAN_KEY } = process.env;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: SEPOLIA_RPC || "",
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY] : []
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY || ""
  }
};

export default config;


