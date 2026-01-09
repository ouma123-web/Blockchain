// Test script to interact with deployed contracts on local Hardhat network
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Apxos Contracts Interaction\n");

  // Get signers first
  const [deployer, consumer, provider] = await ethers.getSigners();
  console.log("👥 Test Accounts:");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Consumer: ${consumer.address}`);
  console.log(`Provider: ${provider.address}\n`);

  // Deploy a local token for testing
  console.log("🪙 Deploying local test token...");
  const TestToken = await ethers.getContractFactory("ApxosToken");
  const tokenContract = await TestToken.deploy("Test USD", "TUSD", 6, deployer.address);
  await tokenContract.waitForDeployment();
  const stablecoinAddress = await tokenContract.getAddress();
  console.log(`✅ Test token deployed at: ${stablecoinAddress}\n`);

  // Deploy contracts locally for testing
  console.log("🏭 Deploying contracts locally...");

  // Deploy Factory
  const Factory = await ethers.getContractFactory("ApxosFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  // Deploy ecosystem
  const ecosystemId = ethers.keccak256(ethers.toUtf8Bytes("test-ecosystem"));
  const treasury = deployer.address;
  const commissionBps = 500;

  await factory.deployEcosystem(ecosystemId, stablecoinAddress, commissionBps, treasury);
  const [consumerAddr, providerAddr, marketplaceAddr] = await factory.getEcosystem(ecosystemId);

  const addresses = {
    factory: factoryAddress,
    consumer: consumerAddr,
    provider: providerAddr,
    marketplace: marketplaceAddr,
    stablecoin: stablecoinAddress,
    treasury: treasury,
    commissionBps: commissionBps
  };

  console.log("✅ Local ecosystem deployed\n");

  // Setup roles for testing
  console.log("🔐 Setting up roles...");
  await marketplaceContract.connect(deployer).grantRole(await marketplaceContract.SETTLEMENT_ROLE(), deployer.address);
  await providerContract.connect(deployer).grantRole(await providerContract.SETTLEMENT_ROLE(), deployer.address);
  console.log("✅ Roles configured\n");

  console.log("📋 Contract Addresses:");
  console.log(`Factory: ${addresses.factory}`);
  console.log(`Consumer: ${addresses.consumer}`);
  console.log(`Provider: ${addresses.provider}`);
  console.log(`Marketplace: ${addresses.marketplace}`);
  console.log(`Stablecoin: ${addresses.stablecoin}\n`);

  // Attach to contracts
  const Consumer = await ethers.getContractFactory("ApxosConsumer");
  const Provider = await ethers.getContractFactory("ApxosProvider");
  const Marketplace = await ethers.getContractFactory("ApxosMarketplace");

  const consumerContract = Consumer.attach(addresses.consumer);
  const providerContract = Provider.attach(addresses.provider);
  const marketplaceContract = Marketplace.attach(addresses.marketplace);

  // Test 1: Mint tokens to consumer
  console.log("💰 Minting 100 USDC to consumer...");
  await tokenContract.mint(consumer.address, ethers.parseUnits("100", 6));
  const consumerBalance = await tokenContract.balanceOf(consumer.address);
  console.log(`✅ Consumer balance: ${ethers.formatUnits(consumerBalance, 6)} USDC\n`);

  // Test 2: Consumer deposits escrow
  console.log("🔒 Consumer depositing escrow...");
  const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-rental-" + Date.now()));
  const amount = ethers.parseUnits("10", 6); // 10 USDC

  // Approve token transfer
  await tokenContract.connect(consumer).approve(addresses.consumer, amount);

  // Deposit escrow
  const depositTx = await consumerContract.connect(consumer).depositEscrow(
    escrowId,
    amount,
    ethers.keccak256(ethers.toUtf8Bytes("rental metadata"))
  );
  await depositTx.wait();
  console.log(`✅ Escrow deposited with ID: ${escrowId}\n`);

  // Test 3: Check escrow status
  console.log("🔍 Checking escrow status...");
  const escrow = await consumerContract.getEscrow(escrowId);
  console.log(`📊 Escrow status:`);
  console.log(`   - Payer: ${escrow.payer}`);
  console.log(`   - Amount: ${ethers.formatUnits(escrow.amount, 6)} USDC`);
  console.log(`   - Ready for release: ${escrow.readyForRelease}`);
  console.log(`   - Disputed: ${escrow.disputed}\n`);

  // Test 4: Marketplace confirms delivery
  console.log("✅ Marketplace confirming delivery...");
  const confirmTx = await marketplaceContract.connect(deployer).confirmDelivery(escrowId);
  await confirmTx.wait();
  console.log("✅ Delivery confirmed\n");

  // Test 5: Check updated escrow status
  console.log("🔍 Checking updated escrow status...");
  const updatedEscrow = await consumerContract.getEscrow(escrowId);
  console.log(`📊 Updated escrow status:`);
  console.log(`   - Ready for release: ${updatedEscrow.readyForRelease}\n`);

  // Test 6: Provider processes payment
  console.log("💸 Provider processing payment...");
  const batchId = ethers.keccak256(ethers.toUtf8Bytes("batch-" + Date.now()));

  const payments = [{
    escrowId: escrowId,
    provider: provider.address,
    amount: ethers.parseUnits("9.5", 6) // 9.5 USDC (10 - 5% commission)
  }];

  const paymentTx = await providerContract.connect(deployer).batchRelease(
    batchId,
    payments,
    500, // 5% commission
    deployer.address // treasury
  );
  await paymentTx.wait();
  console.log("✅ Payment processed\n");

  // Test 7: Check final balances
  console.log("📊 Final balances:");
  const finalConsumerBalance = await tokenContract.balanceOf(consumer.address);
  const providerBalance = await tokenContract.balanceOf(provider.address);
  const treasuryBalance = await tokenContract.balanceOf(deployer.address);

  console.log(`💰 Consumer: ${ethers.formatUnits(finalConsumerBalance, 6)} USDC`);
  console.log(`💰 Provider: ${ethers.formatUnits(providerBalance, 6)} USDC`);
  console.log(`💰 Treasury: ${ethers.formatUnits(treasuryBalance, 6)} USDC`);

  console.log("\n🎉 All tests completed successfully!");
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };