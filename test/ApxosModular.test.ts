import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
  ApxosToken,
  ApxosFactory,
  ApxosConsumer,
  ApxosProvider,
  ApxosMarketplace
} from "../typechain-types";

describe("Apxos Modular Contracts", function () {
  let deployer: SignerWithAddress;
  let consumer: SignerWithAddress;
  let provider: SignerWithAddress;
  let operator: SignerWithAddress;

  let token: ApxosToken;
  let factory: ApxosFactory;
  let consumerContract: ApxosConsumer;
  let providerContract: ApxosProvider;
  let marketplaceContract: ApxosMarketplace;

  const ecosystemId = ethers.keccak256(ethers.toUtf8Bytes("test-ecosystem"));
  const commissionBps = 500; // 5%

  beforeEach(async function () {
    [deployer, consumer, provider, operator] = await ethers.getSigners();

    // Deploy token
    const Token = await ethers.getContractFactory("ApxosToken");
    token = await Token.deploy("Apxos USD", "APXUSD", 6, deployer.address);
    await token.waitForDeployment();

    // Deploy factory
    const Factory = await ethers.getContractFactory("ApxosFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Deploy ecosystem
    await factory.deployEcosystem(
      ecosystemId,
      await token.getAddress(),
      commissionBps,
      deployer.address
    );

    // Get contract addresses
    const [consumerAddr, providerAddr, marketplaceAddr] = await factory.getEcosystem(ecosystemId);

    // Attach to contracts
    const Consumer = await ethers.getContractFactory("ApxosConsumer");
    consumerContract = Consumer.attach(consumerAddr);

    const Provider = await ethers.getContractFactory("ApxosProvider");
    providerContract = Provider.attach(providerAddr);

    const Marketplace = await ethers.getContractFactory("ApxosMarketplace");
    marketplaceContract = Marketplace.attach(marketplaceAddr);

    // Setup roles - deployer has admin rights, grant settlement roles to operator
    await marketplaceContract.grantRole(await marketplaceContract.SETTLEMENT_ROLE(), operator.address);
    await providerContract.grantRole(await providerContract.SETTLEMENT_ROLE(), operator.address);

    // Mint tokens to consumer
    await token.mint(consumer.address, ethers.parseUnits("1000", 6));
  });

  describe("Factory Deployment", function () {
    it("Should deploy all contracts correctly", async function () {
      const [consumerAddr, providerAddr, marketplaceAddr, stablecoinAddr] = await factory.getEcosystem(ecosystemId);

      expect(consumerAddr).to.not.equal(ethers.ZeroAddress);
      expect(providerAddr).to.not.equal(ethers.ZeroAddress);
      expect(marketplaceAddr).to.not.equal(ethers.ZeroAddress);
      expect(stablecoinAddr).to.equal(await token.getAddress());
    });

    it("Should prevent duplicate ecosystem deployment", async function () {
      await expect(
        factory.deployEcosystem(
          ecosystemId,
          await token.getAddress(),
          commissionBps,
          deployer.address
        )
      ).to.be.revertedWith("ecosystem already exists");
    });
  });

  describe("Consumer Contract", function () {
    it("Should allow depositing escrow", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-escrow"));
      const amount = ethers.parseUnits("100", 6);
      const metaHash = ethers.keccak256(ethers.toUtf8Bytes("test-metadata"));

      // Approve token transfer
      await token.connect(consumer).approve(await consumerContract.getAddress(), amount);

      // Deposit escrow
      await expect(
        consumerContract.connect(consumer).depositEscrow(escrowId, amount, metaHash)
      ).to.emit(consumerContract, "EscrowDeposited");

      // Check escrow data
      const escrow = await consumerContract.getEscrow(escrowId);
      expect(escrow.payer).to.equal(consumer.address);
      expect(escrow.amount).to.equal(amount);
      expect(escrow.readyForRelease).to.be.false;
    });

    it("Should allow raising disputes", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-escrow"));
      const amount = ethers.parseUnits("100", 6);

      // Setup escrow
      await token.connect(consumer).approve(await consumerContract.getAddress(), amount);
      await consumerContract.connect(consumer).depositEscrow(escrowId, amount, ethers.ZeroHash);

      // Raise dispute
      await expect(
        consumerContract.connect(consumer).raiseDispute(escrowId)
      ).to.emit(consumerContract, "Disputed");

      const escrow = await consumerContract.getEscrow(escrowId);
      expect(escrow.disputed).to.be.true;
    });
  });

  describe("Marketplace Contract", function () {
    it("Should confirm delivery", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-escrow"));
      const amount = ethers.parseUnits("100", 6);

      // Setup escrow
      await token.connect(consumer).approve(await consumerContract.getAddress(), amount);
      await consumerContract.connect(consumer).depositEscrow(escrowId, amount, ethers.ZeroHash);

      // Confirm delivery
      await expect(
        marketplaceContract.connect(operator).confirmDelivery(escrowId)
      ).to.emit(marketplaceContract, "DeliveryConfirmed");

      const escrow = await consumerContract.getEscrow(escrowId);
      expect(escrow.readyForRelease).to.be.true;
    });

    it("Should handle revenue sharing", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-escrow"));
      const amount = ethers.parseUnits("100", 6);

      // Setup escrow and confirm delivery
      await token.connect(consumer).approve(await consumerContract.getAddress(), amount);
      await consumerContract.connect(consumer).depositEscrow(escrowId, amount, ethers.ZeroHash);
      await marketplaceContract.connect(operator).confirmDelivery(escrowId);

      // Setup revenue sharing
      const batchId = ethers.keccak256(ethers.toUtf8Bytes("revenue-batch"));
      const stakeholders = [provider.address, deployer.address];
      const amounts = [ethers.parseUnits("60", 6), ethers.parseUnits("20", 6)];

      // Mint tokens to consumer contract for revenue sharing
      await token.mint(await consumerContract.getAddress(), ethers.parseUnits("80", 6));

      await expect(
        marketplaceContract.connect(operator).batchRevenueShare(batchId, [{
          escrowId,
          stakeholders,
          amounts
        }])
      ).to.emit(marketplaceContract, "RevenueShared");
    });
  });

  describe("Provider Contract", function () {
    it("Should process batch payments", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("test-escrow"));
      const amount = ethers.parseUnits("100", 6);

      // Setup escrow and confirm delivery
      await token.connect(consumer).approve(await consumerContract.getAddress(), amount);
      await consumerContract.connect(consumer).depositEscrow(escrowId, amount, ethers.ZeroHash);
      await marketplaceContract.connect(operator).confirmDelivery(escrowId);

      // Process batch payment
      const batchId = ethers.keccak256(ethers.toUtf8Bytes("payment-batch"));
      const paymentParams = [{
        escrowId,
        provider: provider.address,
        amount: ethers.parseUnits("95", 6) // 100 - 5% commission
      }];

      await expect(
        providerContract.connect(operator).batchRelease(
          batchId,
          paymentParams,
          commissionBps,
          deployer.address
        )
      ).to.emit(providerContract, "BatchPaid");

      // Check final balances
      const providerBalance = await token.balanceOf(provider.address);
      const treasuryBalance = await token.balanceOf(deployer.address);

      expect(providerBalance).to.equal(ethers.parseUnits("95", 6)); // 100 - 5% commission
      expect(treasuryBalance).to.equal(ethers.parseUnits("5", 6)); // 5% commission
    });
  });

  describe("Integration Flow", function () {
    it("Should handle complete rental flow", async function () {
      const escrowId = ethers.keccak256(ethers.toUtf8Bytes("rental-escrow"));
      const rentalAmount = ethers.parseUnits("100", 6);

      // 1. Consumer deposits escrow
      await token.connect(consumer).approve(await consumerContract.getAddress(), rentalAmount);
      await consumerContract.connect(consumer).depositEscrow(escrowId, rentalAmount, ethers.ZeroHash);

      // 2. Marketplace confirms delivery
      await marketplaceContract.connect(operator).confirmDelivery(escrowId);

      // 3. Provider processes payment
      const batchId = ethers.keccak256(ethers.toUtf8Bytes("payment-batch"));
      const paymentParams = [{
        escrowId,
        provider: provider.address,
        amount: ethers.parseUnits("95", 6)
      }];

      await providerContract.connect(operator).batchRelease(
        batchId,
        paymentParams,
        commissionBps,
        deployer.address
      );

      // 4. Verify final state
      const escrow = await consumerContract.getEscrow(escrowId);
      expect(escrow.amount).to.equal(rentalAmount);
      expect(escrow.released).to.equal(ethers.parseUnits("95", 6));
      expect(escrow.readyForRelease).to.be.true;
    });
  });
});