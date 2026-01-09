import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=== Deploying to Sepolia ===\n");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error("Insufficient balance. Please get Sepolia ETH from a faucet.");
  }

  // Use existing stablecoin
  const stablecoinAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
  const treasury = "0x19bb5d775c45aa3eb378a9d120c56fa9d09da467";
  const commissionBps = 500;

  console.log("Using stablecoin at:", stablecoinAddress);
  console.log("Treasury:", treasury);
  console.log("Commission (bps):", commissionBps, "\n");

  // Use dummy address for initial deployment
  const dummyAddress = "0x0000000000000000000000000000000000000001";

  // Deploy ApxosMarketplace first with dummy consumer address
  console.log("Step 1: Deploying ApxosMarketplace...");
  const Marketplace = await ethers.getContractFactory("ApxosMarketplace");
  const marketplace = await Marketplace.deploy(
    stablecoinAddress,
    dummyAddress, // consumer (will update later)
    commissionBps,
    treasury
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("✅ ApxosMarketplace deployed at:", marketplaceAddress);

  // Deploy ApxosConsumer with real marketplace address
  console.log("\nStep 2: Deploying ApxosConsumer...");
  const Consumer = await ethers.getContractFactory("ApxosConsumer");
  const consumer = await Consumer.deploy(
    stablecoinAddress,
    marketplaceAddress,
    dummyAddress  // provider (not needed for basic functionality)
  );
  await consumer.waitForDeployment();
  const consumerAddress = await consumer.getAddress();
  console.log("✅ ApxosConsumer deployed at:", consumerAddress);

  // Update marketplace contract with consumer address
  console.log("\nStep 3: Setting consumer address in marketplace contract...");
  const setConsumerTx = await marketplace.setConsumerContract(consumerAddress);
  await setConsumerTx.wait();
  console.log("✅ Consumer address updated");

  // Update consumer contract with marketplace address (for confirmation)
  console.log("\nStep 4: Setting marketplace address in consumer contract...");
  const setMarketplaceTx = await consumer.setMarketplace(marketplaceAddress);
  await setMarketplaceTx.wait();
  console.log("✅ Marketplace address updated");

  // Grant settlement role
  console.log("\nStep 5: Granting settlement role...");
  const grantRoleTx = await marketplace.grantSettlementRole(deployer.address);
  await grantRoleTx.wait();
  console.log("✅ Settlement role granted");

  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    consumer: consumerAddress,
    marketplace: marketplaceAddress,
    stablecoin: stablecoinAddress,
    treasury: treasury,
    commissionBps: commissionBps,
    network: "sepolia",
    deployedAt: new Date().toISOString()
  };

  fs.writeFileSync("deploy/live-sepolia.json", JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("Consumer:", consumerAddress);
  console.log("Marketplace:", marketplaceAddress);
  console.log("Stablecoin:", stablecoinAddress);
  console.log("\n💡 Update your .env file with these addresses");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});