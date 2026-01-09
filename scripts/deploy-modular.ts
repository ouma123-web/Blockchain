import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("=== Apxos Modular Deployment ===\n");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error("Insufficient balance. Please get Sepolia ETH from a faucet.");
  }

  // Configuration
  const ecosystemId = ethers.keccak256(ethers.toUtf8Bytes("apxos-main-ecosystem"));
  const stablecoinAddress = process.env.STABLECOIN_ADDRESS || "";
  const treasury = process.env.TREASURY || deployer.address;
  const commissionBps = Number(process.env.INIT_COMMISSION_BPS || 500);

  console.log("Configuration:");
  console.log("- Ecosystem ID:", ecosystemId);
  console.log("- Treasury:", treasury);
  console.log("- Commission (bps):", commissionBps);
  console.log("- Stablecoin:", stablecoinAddress || "Will deploy ApxosToken\n");

  // Step 1: Deploy ApxosToken if no stablecoin provided
  let tokenAddress: string;
  if (stablecoinAddress) {
    tokenAddress = stablecoinAddress;
    console.log("Step 1: Using existing stablecoin...");
    console.log(`✅ Using stablecoin at: ${tokenAddress}\n`);
  } else {
    console.log("Step 1: Deploying ApxosToken...");
    const name = process.env.APXOS_TOKEN_NAME || "Apxos USD";
    const symbol = process.env.APXOS_TOKEN_SYMBOL || "APXUSD";
    const decimals = Number(process.env.APXOS_TOKEN_DECIMALS || 6);
    const owner = process.env.APXOS_TOKEN_OWNER || deployer.address;

    const Token = await ethers.getContractFactory("ApxosToken");
    const token = await Token.deploy(name, symbol, decimals, owner);
    await token.waitForDeployment();
    tokenAddress = await token.getAddress();
    console.log(`✅ ApxosToken deployed at: ${tokenAddress}\n`);
  }

  // Step 2: Deploy ApxosFactory
  console.log("Step 2: Deploying ApxosFactory...");
  const Factory = await ethers.getContractFactory("ApxosFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ ApxosFactory deployed at: ${factoryAddress}\n`);

  // Step 3: Deploy complete ecosystem via Factory
  console.log("Step 3: Deploying Apxos Ecosystem via Factory...");
  const deployTx = await factory.deployEcosystem(
    ecosystemId,
    tokenAddress,
    commissionBps,
    treasury
  );
  await deployTx.wait();

  // Get deployed contract addresses
  const [consumerAddr, providerAddr, marketplaceAddr] = await factory.getEcosystem(ecosystemId);

  console.log("✅ Ecosystem deployed successfully!\n");

  // Step 4: Set roles if operator is specified
  const operator = process.env.SETTLEMENT_OPERATOR;
  if (operator) {
    console.log("Step 4: Setting settlement roles...");

    // Grant settlement role in marketplace
    const Marketplace = await ethers.getContractFactory("ApxosMarketplace");
    const marketplaceContract = Marketplace.attach(marketplaceAddr);
    const marketplaceGrantTx = await marketplaceContract.grantSettlementRole(operator);
    await marketplaceGrantTx.wait();

    // Grant settlement role in provider
    const Provider = await ethers.getContractFactory("ApxosProvider");
    const providerContract = Provider.attach(providerAddr);
    const providerGrantTx = await providerContract.grantSettlementRole(operator);
    await providerGrantTx.wait();

    console.log(`✅ Granted SETTLEMENT_ROLE to: ${operator}\n`);
  }

  // Save deployment addresses
  const { writeFileSync } = await import("fs");
  const addressBook = {
    ecosystemId: ecosystemId,
    factory: factoryAddress,
    consumer: consumerAddr,
    provider: providerAddr,
    marketplace: marketplaceAddr,
    stablecoin: tokenAddress,
    treasury: treasury,
    commissionBps: commissionBps,
    operator: operator || null,
    network: "sepolia",
    deployedAt: new Date().toISOString()
  };

  // Save to JSON
  writeFileSync("deploy/modular-sepolia.json", JSON.stringify(addressBook, null, 2));

  // Display summary
  console.log("=== Modular Deployment Summary ===");
  console.log("Factory:", factoryAddress);
  console.log("Consumer:", consumerAddr);
  console.log("Provider:", providerAddr);
  console.log("Marketplace:", marketplaceAddr);
  if (!stablecoinAddress) {
    console.log("ApxosToken:", tokenAddress);
  } else {
    console.log("Stablecoin (existing):", tokenAddress);
  }
  console.log("Treasury:", treasury);
  console.log("Commission (bps):", commissionBps);
  console.log("Settlement Operator:", operator || "Not set");
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nNext steps:");
  console.log("1. Run 'npm run verify-modular' to verify all contracts on Etherscan");
  console.log("2. Test the contracts with 'npm run test-modular'");
  console.log("3. Update your frontend/backend to use the new contract addresses");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});