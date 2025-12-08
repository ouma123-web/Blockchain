// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ApxosSettlement
/// @notice Escrow + batch settlement contract for Apxos payments
contract ApxosSettlement is ReentrancyGuard, AccessControl {
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    IERC20 public immutable stablecoin; // USDC initially, APXUSD ensuite
    address public treasury; // RedSys commission wallet
    uint96 public commissionBps; // e.g. 500 = 5%

    struct Escrow {
        address payer;
        uint128 amount;
        uint128 released;
        bool readyForRelease;
        bytes32 metaHash; // hash des données off-chain
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowDeposited(bytes32 indexed escrowId, address indexed payer, uint256 amount, bytes32 metaHash);
    event DeliveryConfirmed(bytes32 indexed escrowId);
    event BatchPaid(bytes32 indexed batchId, uint256 providerCount, uint256 commissionTaken);
    event RevenueShared(bytes32 indexed batchId, uint256 distributionCount);
    event CommissionUpdated(uint256 oldBps, uint256 newBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address stablecoin_, uint96 commissionBps_, address treasury_) {
        require(stablecoin_ != address(0), "stablecoin required");
        require(treasury_ != address(0), "treasury required");
        stablecoin = IERC20(stablecoin_);
        treasury = treasury_;
        _setCommission(commissionBps_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function depositEscrow(bytes32 escrowId, uint128 amount, bytes32 metaHash) external nonReentrant {
        require(escrowId != bytes32(0), "invalid id");
        require(amount > 0, "amount zero");
        Escrow storage entry = escrows[escrowId];
        require(entry.payer == address(0), "escrow exists");

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            amount: amount,
            released: 0,
            readyForRelease: false,
            metaHash: metaHash
        });

        bool ok = stablecoin.transferFrom(msg.sender, address(this), amount);
        require(ok, "transfer failed");

        emit EscrowDeposited(escrowId, msg.sender, amount, metaHash);
    }

    function confirmDelivery(bytes32 escrowId) external onlyRole(SETTLEMENT_ROLE) {
        Escrow storage entry = escrows[escrowId];
        require(entry.payer != address(0), "unknown escrow");
        require(!entry.readyForRelease, "already confirmed");
        entry.readyForRelease = true;
        emit DeliveryConfirmed(escrowId);
    }

    struct ReleaseParam {
        bytes32 escrowId;
        address provider;
        uint128 amount;
    }

    function batchRelease(bytes32 batchId, ReleaseParam[] calldata params) external onlyRole(SETTLEMENT_ROLE) nonReentrant {
        require(batchId != bytes32(0), "invalid batch");
        require(params.length > 0, "empty batch");
        uint256 totalCommission;

        for (uint256 i = 0; i < params.length; ++i) {
            ReleaseParam calldata payment = params[i];
            require(payment.provider != address(0), "invalid provider");
            require(payment.amount > 0, "amount zero");

            Escrow storage entry = escrows[payment.escrowId];
            require(entry.readyForRelease, "escrow not ready");
            require(entry.released + payment.amount <= entry.amount, "insufficient balance");

            entry.released += payment.amount;
            uint256 commission = (payment.amount * commissionBps) / 10_000;
            totalCommission += commission;

            bool ok = stablecoin.transfer(payment.provider, payment.amount - commission);
            require(ok, "provider transfer failed");
        }

        if (totalCommission > 0) {
            bool okCommission = stablecoin.transfer(treasury, totalCommission);
            require(okCommission, "commission transfer failed");
        }

        emit BatchPaid(batchId, params.length, totalCommission);
    }

    struct ShareParam {
        bytes32 escrowId;
        address[] stakeholders;
        uint128[] amounts;
    }

    function batchRevenueShare(bytes32 batchId, ShareParam[] calldata params) external onlyRole(SETTLEMENT_ROLE) nonReentrant {
        require(batchId != bytes32(0), "invalid batch");
        require(params.length > 0, "empty batch");

        for (uint256 i = 0; i < params.length; ++i) {
            ShareParam calldata share = params[i];
            require(share.stakeholders.length == share.amounts.length, "length mismatch");
            Escrow storage entry = escrows[share.escrowId];
            require(entry.readyForRelease, "escrow not ready");

            uint256 sum;
            for (uint256 j = 0; j < share.stakeholders.length; ++j) {
                address recipient = share.stakeholders[j];
                uint128 amount = share.amounts[j];
                require(recipient != address(0), "invalid recipient");
                require(amount > 0, "amount zero");
                sum += amount;
                bool ok = stablecoin.transfer(recipient, amount);
                require(ok, "share transfer failed");
            }

            require(sum <= entry.amount - entry.released, "exceeds escrow");
            entry.released += uint128(sum);
        }

        emit RevenueShared(batchId, params.length);
    }

    function setCommission(uint96 newCommissionBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setCommission(newCommissionBps);
    }

    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "zero treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    function _setCommission(uint96 newCommissionBps) internal {
        require(newCommissionBps <= 1000, "max 10%");
        emit CommissionUpdated(commissionBps, newCommissionBps);
        commissionBps = newCommissionBps;
    }
}

