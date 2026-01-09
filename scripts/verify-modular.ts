import { run } from "hardhat";

async function main() {
  const { readFileSync } = await import("fs");
  const addresses = JSON.parse(readFileSync("deploy/modular-sepolia.json", "utf8"));

  console.log("=== Verifying Modular Contracts ===\n");

  // Verify ApxosToken if it was deployed
  if (addresses.stablecoin && !process.env.STABLECOIN_ADDRESS) {
    console.log("Verifying ApxosToken...");
    try {
      await run("verify:verify", {
        address: addresses.stablecoin,
        constructorArguments: [
          process.env.APXOS_TOKEN_NAME || "Apxos USD",
          process.env.APXOS_TOKEN_SYMBOL || "APXUSD",
          Number(process.env.APXOS_TOKEN_DECIMALS || 6),
          process.env.APXOS_TOKEN_OWNER || addresses.treasury
        ],
      });
      console.log("✅ ApxosToken verified\n");
    } catch (error) {
      console.log("❌ ApxosToken verification failed:", error.message + "\n");
    }
  }

  // Verify Factory
  console.log("Verifying ApxosFactory...");
  try {
    await run("verify:verify", {
      address: addresses.factory,
      constructorArguments: [],
    });
    console.log("✅ ApxosFactory verified\n");
  } catch (error) {
    console.log("❌ ApxosFactory verification failed:", error.message + "\n");
  }

  // Note: Individual contracts (Consumer, Provider, Marketplace) cannot be verified
  // directly because they were deployed by the factory. They can be verified manually
  // on Etherscan by providing the contract code and constructor arguments.

  console.log("=== Manual Verification Required ===");
  console.log("The Consumer, Provider, and Marketplace contracts were deployed by the Factory.");
  console.log("To verify them on Etherscan:");
  console.log("1. Go to Etherscan and search for the contract addresses");
  console.log("2. Click 'Verify and Publish'");
  console.log("3. Select 'Solidity (Single File)'");
  console.log("4. Upload the contract source code");
  console.log("5. Set compiler version to 0.8.24");
  console.log("6. Provide constructor arguments (see below)");
  console.log();

  console.log("Constructor Arguments:");
  console.log(`Consumer: ["${addresses.stablecoin}", "${addresses.marketplace}", "${addresses.provider}"]`);
  console.log(`Provider: ["${addresses.stablecoin}", "${addresses.consumer}"]`);
  console.log(`Marketplace: ["${addresses.stablecoin}", "${addresses.consumer}", ${addresses.commissionBps}, "${addresses.treasury}"]`);

  console.log("\n✅ Verification guide completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});