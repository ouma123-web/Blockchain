// Script to show local deployment status and contract information
const fs = require("fs");

async function showLocalStatus() {
  console.log("🔍 Checking Local Deployment Status\n");

  try {
    // Try to read local deployment file (could be local-modular.json or modular-sepolia.json)
    let localDeploy;
    if (fs.existsSync("deploy/local-modular.json")) {
      localDeploy = JSON.parse(fs.readFileSync("deploy/local-modular.json", "utf8"));
    } else if (fs.existsSync("deploy/modular-sepolia.json")) {
      localDeploy = JSON.parse(fs.readFileSync("deploy/modular-sepolia.json", "utf8"));
    } else {
      throw new Error("No deployment file found");
    }

    console.log("✅ Local Deployment Found:");
    console.log("═══════════════════════════════════════════════");
    console.log(`Network: ${localDeploy.network || 'hardhat'}`);
    console.log(`Deployed: ${localDeploy.deployedAt || 'Recently'}`);
    console.log(`Ecosystem ID: ${localDeploy.ecosystemId}`);
    console.log("");

    console.log("📋 Contract Addresses:");
    console.log("═══════════════════════════════════════════════");
    console.log(`🏭 Factory:      ${localDeploy.factory}`);
    console.log(`🛒 Consumer:     ${localDeploy.consumer}`);
    console.log(`💰 Provider:     ${localDeploy.provider}`);
    console.log(`🏪 Marketplace:  ${localDeploy.marketplace}`);
    console.log(`💵 Stablecoin:   ${localDeploy.stablecoin}`);
    console.log(`🏦 Treasury:     ${localDeploy.treasury}`);
    console.log("");

    console.log("⚙️ Configuration:");
    console.log("═══════════════════════════════════════════════");
    console.log(`Commission Rate: ${localDeploy.commissionBps} bps (${localDeploy.commissionBps/100}%)`);
    console.log(`Settlement Op:   ${localDeploy.operator}`);
    console.log("");

    // Try to connect to local network and get contract info
    console.log("🔗 Local Network Status:");
    console.log("═══════════════════════════════════════════════");

    try {
      // Check if we can connect to local network
      const { ethers } = require("hardhat");

      // Get network info
      const provider = ethers.provider;
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();

      console.log(`✅ Connected to: ${network.name} (chainId: ${network.chainId})`);
      console.log(`📦 Latest Block: ${blockNumber}`);

      // Check contract code
      const Consumer = await ethers.getContractFactory("ApxosConsumer");
      const consumerContract = Consumer.attach(localDeploy.consumer);

      try {
        const consumerCode = await provider.getCode(localDeploy.consumer);
        const hasCode = consumerCode !== '0x';
        console.log(`🛒 Consumer Contract: ${hasCode ? '✅ Deployed' : '❌ Not found'}`);
      } catch (error) {
        console.log(`🛒 Consumer Contract: ❌ Error checking`);
      }

      try {
        const providerCode = await provider.getCode(localDeploy.provider);
        const hasCode = providerCode !== '0x';
        console.log(`💰 Provider Contract: ${hasCode ? '✅ Deployed' : '❌ Not found'}`);
      } catch (error) {
        console.log(`💰 Provider Contract: ❌ Error checking`);
      }

      try {
        const marketplaceCode = await provider.getCode(localDeploy.marketplace);
        const hasCode = marketplaceCode !== '0x';
        console.log(`🏪 Marketplace Contract: ${hasCode ? '✅ Deployed' : '❌ Not found'}`);
      } catch (error) {
        console.log(`🏪 Marketplace Contract: ❌ Error checking`);
      }

    } catch (error) {
      console.log("❌ Cannot connect to local Hardhat network");
      console.log("💡 Make sure Hardhat Network is running:");
      console.log("   npx hardhat node");
    }

  } catch (error) {
    console.log("❌ No local deployment found");
    console.log("💡 Run local deployment first:");
    console.log("   npm run deploy:local");
  }

  console.log("");
  console.log("🎯 How to Test Contracts:");
  console.log("═══════════════════════════════════════════════");
  console.log("1. Open Hardhat Console: npx hardhat console --network hardhat");
  console.log("2. Run interaction test: npm run test:interaction");
  console.log("3. Check this status: npm run show:local");
  console.log("");
  console.log("🌐 For Web Interface:");
  console.log("═══════════════════════════════════════════════");
  console.log("• Use Etherscan for Sepolia contracts");
  console.log("• Use browser extensions for local networks");
  console.log("• Hardhat doesn't provide built-in web UI");
}

if (require.main === module) {
  showLocalStatus().catch(console.error);
}