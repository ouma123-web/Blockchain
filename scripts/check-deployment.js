// Script to check deployment status and generate Etherscan links
const fs = require("fs");

function generateEtherscanLinks(addresses, network = "sepolia") {
  const baseUrl = network === "mainnet"
    ? "https://etherscan.io"
    : `https://${network}.etherscan.io`;

  console.log(`🔗 Etherscan Links (${network.toUpperCase()}):\n`);

  if (addresses.factory) {
    console.log(`🏭 Factory: ${baseUrl}/address/${addresses.factory}`);
  }
  if (addresses.consumer) {
    console.log(`🛒 Consumer: ${baseUrl}/address/${addresses.consumer}`);
  }
  if (addresses.provider) {
    console.log(`💰 Provider: ${baseUrl}/address/${addresses.provider}`);
  }
  if (addresses.marketplace) {
    console.log(`🏪 Marketplace: ${baseUrl}/address/${addresses.marketplace}`);
  }
  if (addresses.stablecoin) {
    console.log(`💵 Stablecoin: ${baseUrl}/address/${addresses.stablecoin}`);
  }
  if (addresses.apxosToken) {
    console.log(`🪙 ApxosToken: ${baseUrl}/address/${addresses.apxosToken}`);
  }
  if (addresses.apxosSettlement) {
    console.log(`📜 ApxosSettlement: ${baseUrl}/address/${addresses.apxosSettlement}`);
  }

  console.log(`\n📊 Deployment Summary:`);
  console.log(`Network: ${network}`);
  console.log(`Deployed at: ${addresses.deployedAt || 'Unknown'}`);
  console.log(`Treasury: ${addresses.treasury || 'Not set'}`);
  console.log(`Commission: ${addresses.commissionBps || 0} bps`);
}

// Check existing deployments
console.log("📋 Checking Existing Deployments:\n");

try {
  // Check modular deployment
  if (fs.existsSync("deploy/modular-sepolia.json")) {
    console.log("✅ Found Modular Sepolia Deployment:");
    const modular = JSON.parse(fs.readFileSync("deploy/modular-sepolia.json", "utf8"));
    generateEtherscanLinks(modular, "sepolia");
  } else {
    console.log("❌ No modular Sepolia deployment found");
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // Check legacy deployment
  if (fs.existsSync("deploy/sepolia.json")) {
    console.log("📜 Found Legacy Sepolia Deployment:");
    const legacy = JSON.parse(fs.readFileSync("deploy/sepolia.json", "utf8"));
    generateEtherscanLinks(legacy, "sepolia");
  } else {
    console.log("❌ No legacy Sepolia deployment found");
  }

} catch (error) {
  console.error("❌ Error reading deployment files:", error.message);
}

console.log("\n💡 Next Steps:");
console.log("1. Get Sepolia ETH from faucet if needed");
console.log("2. Run: npm run deploy:modular");
console.log("3. Check contracts on Etherscan using links above");
console.log("4. Run: npm run verify:modular");