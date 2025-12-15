import { writeFileSync } from "fs";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying MockUSDC with:", deployer.address);

  const Token = await ethers.getContractFactory("MockUSDC");
  const token = await Token.deploy();
  await token.waitForDeployment();

  const addressBook = {
    mockUSDC: await token.getAddress()
  };

  writeFileSync("deploy/sepolia.json", JSON.stringify(addressBook, null, 2));
  console.log("MockUSDC deployed at:", addressBook.mockUSDC);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});




