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

  it("blocks release when disputed and allows after clearing", async () => {
    const [admin, client, provider, treasury] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockUSDC");
    const token = await Token.deploy();
    const Settlement = await ethers.getContractFactory("ApxosSettlement");
    const settlement = await Settlement.deploy(await token.getAddress(), 500, treasury.address);

    await token.mint(client.address, 1_000_000);
    await token.connect(client).approve(await settlement.getAddress(), ethers.MaxUint256);

    const escrowId = ethers.id("escrow-dispute");
    await settlement.connect(client).depositEscrow(escrowId, 1_000_000, ethers.ZeroHash);

    const settlementRole = await settlement.SETTLEMENT_ROLE();
    await settlement.grantRole(settlementRole, admin.address);
    await settlement.connect(admin).confirmDelivery(escrowId);

    // Client ouvre un litige
    await settlement.connect(client).raiseDispute(escrowId);

    await expect(
      settlement.connect(admin).batchRelease(ethers.id("batch-dispute"), [
        { escrowId, provider: provider.address, amount: 1_000_000 }
      ])
    ).to.be.revertedWith("escrow in dispute");

    // Admin résout le litige
    await settlement.connect(admin).clearDispute(escrowId);

    await settlement.connect(admin).batchRelease(ethers.id("batch-ok"), [
      { escrowId, provider: provider.address, amount: 1_000_000 }
    ]);

    expect(await token.balanceOf(provider.address)).to.equal(950_000);
    expect(await token.balanceOf(treasury.address)).to.equal(50_000);
  });

  it("enforces batch size limit and pause", async () => {
    const [admin, client, provider, treasury] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("MockUSDC");
    const token = await Token.deploy();
    const Settlement = await ethers.getContractFactory("ApxosSettlement");
    const settlement = await Settlement.deploy(await token.getAddress(), 500, treasury.address);

    await token.mint(client.address, 5_000_000);
    await token.connect(client).approve(await settlement.getAddress(), ethers.MaxUint256);

    const settlementRole = await settlement.SETTLEMENT_ROLE();
    await settlement.grantRole(settlementRole, admin.address);

    // créer plusieurs escrows
    const params: any[] = [];
    for (let i = 0; i < 3; i++) {
      const eid = ethers.id(`escrow-${i}`);
      await settlement.connect(client).depositEscrow(eid, 1_000_000, ethers.ZeroHash);
      await settlement.connect(admin).confirmDelivery(eid);
      params.push({ escrowId: eid, provider: provider.address, amount: 1_000_000 });
    }

    // pause empêche le batch
    await settlement.connect(admin).pause();
    await expect(
      settlement.connect(admin).batchRelease(ethers.id("batch-paused"), params)
    ).to.be.revertedWith("paused");
    await settlement.connect(admin).unpause();

    // batch limit (MAX_BATCH_SIZE=50) : test d'erreur avec 51 entrées
    const bigParams = Array.from({ length: 51 }, (_, i) => ({
      escrowId: ethers.id(`big-${i}`),
      provider: provider.address,
      amount: 1
    }));
    await expect(
      settlement.connect(admin).batchRelease(ethers.id("batch-too-big"), bigParams)
    ).to.be.revertedWith("batch too large");

    // batch valide
    await settlement.connect(admin).batchRelease(ethers.id("batch-small"), params);
    expect(await token.balanceOf(provider.address)).to.equal(2_850_000); // 3 * 950k
    expect(await token.balanceOf(treasury.address)).to.equal(150_000);
  });
});



