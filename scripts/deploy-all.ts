import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log("=== Apxos Settlement Deployment ===\n");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH\n");

  if (balance === 0n) {
    throw new Error("Insufficient balance. Please get Sepolia ETH from a faucet.");
  }

  // Step 1: Deploy ApxosToken (only if STABLECOIN_ADDRESS is not provided)
  let tokenAddress: string;
  if (process.env.STABLECOIN_ADDRESS) {
    tokenAddress = process.env.STABLECOIN_ADDRESS;
    console.log("Step 1: Using existing stablecoin address...");
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

  // Step 2: Deploy ApxosSettlement
  console.log("Step 2: Deploying ApxosSettlement...");
  const stablecoinAddress = tokenAddress;
  const treasury = process.env.TREASURY || deployer.address;
  const commissionBps = Number(process.env.INIT_COMMISSION_BPS || 500);

  const Settlement = await ethers.getContractFactory("ApxosSettlement");
  const settlement = await Settlement.deploy(stablecoinAddress, commissionBps, treasury);
  await settlement.waitForDeployment();
  const settlementAddress = await settlement.getAddress();
  console.log(`✅ ApxosSettlement deployed at: ${settlementAddress}\n`);

  // Step 3: Set roles if SETTLEMENT_OPERATOR is provided
  const operator = process.env.SETTLEMENT_OPERATOR;
  if (operator) {
    console.log("Step 3: Setting roles...");
    const role = await settlement.SETTLEMENT_ROLE();
    const tx = await settlement.grantRole(role, operator);
    await tx.wait();
    console.log(`✅ Granted SETTLEMENT_ROLE to: ${operator}\n`);
  }

  // Save deployment addresses
  const { writeFileSync } = await import("fs");
  const addressBook: any = {
    apxosSettlement: settlementAddress,
    stablecoin: stablecoinAddress,
    treasury: treasury,
    commissionBps: commissionBps
  };
  // Only save apxosToken if we deployed it (not using existing stablecoin)
  if (!process.env.STABLECOIN_ADDRESS) {
    addressBook.apxosToken = tokenAddress;
  } else {
    addressBook.stablecoinAddress = tokenAddress;
  }
  writeFileSync("deploy/sepolia.json", JSON.stringify(addressBook, null, 2));

  console.log("=== Deployment Summary ===");
  if (!process.env.STABLECOIN_ADDRESS) {
    console.log("ApxosToken:", tokenAddress);
  } else {
    console.log("Stablecoin (existing):", stablecoinAddress);
  }
  console.log("ApxosSettlement:", settlementAddress);
  console.log("Treasury:", treasury);
  console.log("Commission (bps):", commissionBps);
  console.log("\n✅ All contracts deployed successfully!");
  console.log("\nNext step: Run 'npm run verify' to verify contracts on Etherscan");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

