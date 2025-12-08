import { ethers } from "hardhat";
import { expect } from "chai";

describe("ApxosSettlement", function () {
  it("handles escrow deposit, confirm, batch release with commission", async () => {
    const [admin, client, provider, treasury] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockUSDC");
    const token = await Token.deploy();

    const Settlement = await ethers.getContractFactory("ApxosSettlement");
    const settlement = await Settlement.deploy(await token.getAddress(), 500, treasury.address);

    await token.mint(client.address, 1_000_000);
    await token.connect(client).approve(await settlement.getAddress(), ethers.MaxUint256);

    const escrowId = ethers.id("escrow-1");
    await settlement.connect(client).depositEscrow(escrowId, 1_000_000, ethers.ZeroHash);

    const settlementRole = await settlement.SETTLEMENT_ROLE();
    await settlement.grantRole(settlementRole, admin.address);
    await settlement.connect(admin).confirmDelivery(escrowId);

    const batchId = ethers.id("batch-1");
    await settlement.connect(admin).batchRelease(batchId, [
      { escrowId, provider: provider.address, amount: 1_000_000 }
    ]);

    expect(await token.balanceOf(provider.address)).to.equal(950_000);
    expect(await token.balanceOf(treasury.address)).to.equal(50_000);
  });
});



