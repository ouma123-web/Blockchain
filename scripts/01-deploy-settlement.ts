import { readFileSync, writeFileSync } from "fs";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ApxosSettlement with:", deployer.address);

  const existing = JSON.parse(readFileSync("deploy/sepolia.json", "utf-8"));
  const stablecoinAddress = process.env.STABLECOIN_ADDRESS || existing.apxosToken || existing.mockUSDC;
  if (!stablecoinAddress) {
    throw new Error("No stablecoin address. Provide STABLECOIN_ADDRESS or run deploy:token/deploy:usdc.");
  }

  const treasury = process.env.TREASURY || deployer.address;
  const commissionBps = Number(process.env.INIT_COMMISSION_BPS || 500);

  const Settlement = await ethers.getContractFactory("ApxosSettlement");
  const settlement = await Settlement.deploy(stablecoinAddress, commissionBps, treasury);
  await settlement.waitForDeployment();

  existing.apxosSettlement = await settlement.getAddress();
  writeFileSync("deploy/sepolia.json", JSON.stringify(existing, null, 2));

  console.log("ApxosSettlement deployed at:", existing.apxosSettlement);
  console.log("Treasury:", treasury, "Commission (bps):", commissionBps);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

