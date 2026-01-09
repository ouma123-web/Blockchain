import { readFileSync } from "fs";
import hre from "hardhat";

async function main() {
  const cfg = JSON.parse(readFileSync("deploy/sepolia.json", "utf-8"));

  console.log("Verifying contracts on Etherscan...\n");

  // Verify ApxosToken if deployed
  if (cfg.apxosToken) {
    try {
      console.log(`Verifying ApxosToken at ${cfg.apxosToken}...`);
      const name = process.env.APXOS_TOKEN_NAME || "Apxos USD";
      const symbol = process.env.APXOS_TOKEN_SYMBOL || "APXUSD";
      const decimals = Number(process.env.APXOS_TOKEN_DECIMALS || 6);
      const owner = process.env.APXOS_TOKEN_OWNER || "";

      await hre.run("verify:verify", {
        address: cfg.apxosToken,
        constructorArguments: [name, symbol, decimals, owner],
      });
      console.log("✅ ApxosToken verified!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ ApxosToken already verified!\n");
      } else {
        console.error("❌ Error verifying ApxosToken:", error.message, "\n");
      }
    }
  }

  // Verify MockUSDC if deployed
  if (cfg.mockUSDC) {
    try {
      console.log(`Verifying MockUSDC at ${cfg.mockUSDC}...`);
      await hre.run("verify:verify", {
        address: cfg.mockUSDC,
        constructorArguments: [],
      });
      console.log("✅ MockUSDC verified!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MockUSDC already verified!\n");
      } else {
        console.error("❌ Error verifying MockUSDC:", error.message, "\n");
      }
    }
  }

  // Verify ApxosSettlement if deployed
  if (cfg.apxosSettlement) {
    try {
      console.log(`Verifying ApxosSettlement at ${cfg.apxosSettlement}...`);
      const stablecoinAddress = process.env.STABLECOIN_ADDRESS || cfg.stablecoin || cfg.stablecoinAddress || cfg.apxosToken || cfg.mockUSDC;
      const commissionBps = cfg.commissionBps || Number(process.env.INIT_COMMISSION_BPS || 500);
      const treasury = cfg.treasury || process.env.TREASURY || "";

      if (!stablecoinAddress) {
        throw new Error("Stablecoin address not found in config or env");
      }

      await hre.run("verify:verify", {
        address: cfg.apxosSettlement,
        constructorArguments: [stablecoinAddress, commissionBps, treasury],
      });
      console.log("✅ ApxosSettlement verified!\n");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ ApxosSettlement already verified!\n");
      } else {
        console.error("❌ Error verifying ApxosSettlement:", error.message, "\n");
      }
    }
  }

  console.log("\n✅ Verification process completed!");
  console.log("\nView your contracts on Etherscan:");
  if (cfg.apxosToken) {
    console.log(`ApxosToken: https://sepolia.etherscan.io/address/${cfg.apxosToken}`);
  }
  if (cfg.mockUSDC) {
    console.log(`MockUSDC: https://sepolia.etherscan.io/address/${cfg.mockUSDC}`);
  }
  if (cfg.apxosSettlement) {
    console.log(`ApxosSettlement: https://sepolia.etherscan.io/address/${cfg.apxosSettlement}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

