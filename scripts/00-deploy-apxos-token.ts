import { writeFileSync, existsSync, readFileSync } from "fs";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying ApxosToken with:", deployer.address);

  const name = process.env.APXOS_TOKEN_NAME || "Apxos USD";
  const symbol = process.env.APXOS_TOKEN_SYMBOL || "APXUSD";
  const decimals = Number(process.env.APXOS_TOKEN_DECIMALS || 6);
  const owner = process.env.APXOS_TOKEN_OWNER || deployer.address;

  const Token = await ethers.getContractFactory("ApxosToken");
  const token = await Token.deploy(name, symbol, decimals, owner);
  await token.waitForDeployment();

  const cfgPath = "deploy/sepolia.json";
  let cfg = {};
  if (existsSync(cfgPath)) {
    cfg = JSON.parse(readFileSync(cfgPath, "utf-8"));
  }
  (cfg as any).apxosToken = await token.getAddress();
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

  console.log(`${symbol} deployed at:`, (cfg as any).apxosToken);
  console.log("Owner:", owner);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

