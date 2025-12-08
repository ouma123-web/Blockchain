import { readFileSync } from "fs";
import { ethers } from "hardhat";

async function main() {
  const operator = process.env.SETTLEMENT_OPERATOR;
  if (!operator) {
    throw new Error("SETTLEMENT_OPERATOR missing from env");
  }

  const cfg = JSON.parse(readFileSync("deploy/sepolia.json", "utf-8"));
  if (!cfg.apxosSettlement) {
    throw new Error("apxosSettlement address missing. Deploy contract first.");
  }

  const settlement = await ethers.getContractAt("ApxosSettlement", cfg.apxosSettlement);
  const role = await settlement.SETTLEMENT_ROLE();

  const tx = await settlement.grantRole(role, operator);
  await tx.wait();

  console.log("Granted SETTLEMENT_ROLE to:", operator);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



