// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IApxosConsumer.sol";

/// @title ApxosProvider
/// @notice Provider-side payment processing contract
contract ApxosProvider is ReentrancyGuard, AccessControl {
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 50;

    IERC20 public immutable stablecoin;
    IApxosConsumer public consumerContract;
    bool public paused;

    struct ReleaseParam {
        bytes32 escrowId;
        address provider;
        uint128 amount;
    }

    event BatchPaid(bytes32 indexed batchId, uint256 providerCount, uint256 commissionTaken);
    event ConsumerContractUpdated(address indexed oldConsumer, address indexed newConsumer);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    constructor(address stablecoin_, address consumerContract_) {
        require(stablecoin_ != address(0), "stablecoin required");
        require(consumerContract_ != address(0), "consumer contract required");

        stablecoin = IERC20(stablecoin_);
        consumerContract = IApxosConsumer(consumerContract_);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    modifier onlySettlementRole() {
        require(hasRole(SETTLEMENT_ROLE, msg.sender), "only settlement role");
        _;
    }

    /// @notice Process batch payments to providers
    function batchRelease(
        bytes32 batchId,
        ReleaseParam[] calldata params,
        uint96 commissionBps,
        address treasury
    ) external onlySettlementRole nonReentrant whenNotPaused {
        require(batchId != bytes32(0), "invalid batch");
        require(params.length > 0, "empty batch");
        require(params.length <= MAX_BATCH_SIZE, "batch too large");
        require(treasury != address(0), "invalid treasury");

        uint256 totalCommission;

        for (uint256 i = 0; i < params.length; ) {
            ReleaseParam calldata payment = params[i];
            require(payment.provider != address(0), "invalid provider");
            require(payment.amount > 0, "amount zero");

            // Check escrow state via consumer contract
            require(consumerContract.isEscrowReady(payment.escrowId), "escrow not ready");
            require(!consumerContract.isEscrowDisputed(payment.escrowId), "escrow in dispute");

            // Verify sufficient balance
            uint128 remainingBalance = consumerContract.getEscrowBalance(payment.escrowId);
            require(remainingBalance >= payment.amount, "insufficient balance");

            // Calculate commission
            uint256 commission = (payment.amount * commissionBps) / 10_000;
            totalCommission += commission;

            // Process payment through consumer contract
            bool success = consumerContract.releasePayment(payment.escrowId, payment.amount, payment.provider, commission);
            require(success, "release failed");

            unchecked {
                ++i;
            }
        }

        // Transfer total commission to treasury through consumer contract
        if (totalCommission > 0) {
            consumerContract.transferCommission(treasury, totalCommission);
        }

        emit BatchPaid(batchId, params.length, totalCommission);
    }

    /// @notice Check if escrow is ready for release
    function isEscrowReady(bytes32 escrowId) external view returns (bool) {
        return consumerContract.isEscrowReady(escrowId);
    }

    /// @notice Check if escrow is disputed
    function isEscrowDisputed(bytes32 escrowId) external view returns (bool) {
        return consumerContract.isEscrowDisputed(escrowId);
    }

    /// @notice Get remaining escrow balance
    function getEscrowBalance(bytes32 escrowId) external view returns (uint128) {
        IApxosConsumer.Escrow memory escrow = consumerContract.getEscrow(escrowId);
        return escrow.amount - escrow.released;
    }

    /// @notice Update consumer contract address
    function setConsumerContract(address newConsumerContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newConsumerContract != address(0), "zero consumer contract");
        emit ConsumerContractUpdated(address(consumerContract), newConsumerContract);
        consumerContract = IApxosConsumer(newConsumerContract);
    }

    /// @notice Pause the contract
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the contract
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Grant settlement role to an address
    function grantSettlementRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SETTLEMENT_ROLE, account);
    }

    /// @notice Revoke settlement role from an address
    function revokeSettlementRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(SETTLEMENT_ROLE, account);
    }
}