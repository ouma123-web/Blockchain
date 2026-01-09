// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IApxosConsumer.sol";

/// @title ApxosMarketplace
/// @notice Marketplace operations, revenue sharing and administrative functions
contract ApxosMarketplace is ReentrancyGuard, AccessControl {
    bytes32 public constant SETTLEMENT_ROLE = keccak256("SETTLEMENT_ROLE");

    uint256 public constant MAX_BATCH_SIZE = 50;

    IERC20 public immutable stablecoin;
    IApxosConsumer public consumerContract;
    address public treasury;
    uint96 public commissionBps;
    bool public paused;

    struct ShareParam {
        bytes32 escrowId;
        address[] stakeholders;
        uint128[] amounts;
    }

    event DeliveryConfirmed(bytes32 indexed escrowId);
    event RevenueShared(bytes32 indexed batchId, uint256 distributionCount);
    event DisputeCleared(bytes32 indexed escrowId, address indexed by);
    event CommissionUpdated(uint256 oldBps, uint256 newBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event ConsumerContractUpdated(address indexed oldConsumer, address indexed newConsumer);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    constructor(
        address stablecoin_,
        address consumerContract_,
        uint96 commissionBps_,
        address treasury_
    ) {
        require(stablecoin_ != address(0), "stablecoin required");
        require(consumerContract_ != address(0), "consumer contract required");
        require(treasury_ != address(0), "treasury required");

        stablecoin = IERC20(stablecoin_);
        consumerContract = IApxosConsumer(consumerContract_);
        treasury = treasury_;
        commissionBps = commissionBps_;

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

    /// @notice Confirm delivery for an escrow
    function confirmDelivery(bytes32 escrowId) external onlySettlementRole whenNotPaused {
        consumerContract.confirmDelivery(escrowId);
        emit DeliveryConfirmed(escrowId);
    }

    /// @notice Complete rental transaction and release payment to provider
    function completeRental(bytes32 escrowId, address provider) external onlySettlementRole whenNotPaused {
        require(provider != address(0), "invalid provider");

        // Calculate commission
        uint128 remainingBalance = consumerContract.getEscrowBalance(escrowId);
        uint128 commission = (remainingBalance * commissionBps) / 10000;

        // Complete the rental through consumer contract
        bool success = consumerContract.completeRental(escrowId, provider, commission, treasury);
        require(success, "rental completion failed");

        emit DeliveryConfirmed(escrowId); // Reusing event for completion
    }

    /// @notice Process batch revenue sharing
    function batchRevenueShare(bytes32 batchId, ShareParam[] calldata params) external onlySettlementRole nonReentrant whenNotPaused {
        require(batchId != bytes32(0), "invalid batch");
        require(params.length > 0, "empty batch");
        require(params.length <= MAX_BATCH_SIZE, "batch too large");

        for (uint256 i = 0; i < params.length; ) {
            ShareParam calldata share = params[i];
            require(share.stakeholders.length == share.amounts.length, "length mismatch");

            // Process revenue share through consumer contract (includes fund transfers)
            consumerContract.revenueShare(share.escrowId, share.stakeholders, share.amounts);

            unchecked {
                ++i;
            }
        }

        emit RevenueShared(batchId, params.length);
    }

    /// @notice Clear a dispute
    function clearDispute(bytes32 escrowId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        consumerContract.clearDispute(escrowId);
        emit DisputeCleared(escrowId, msg.sender);
    }

    /// @notice Set commission rate
    function setCommission(uint96 newCommissionBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newCommissionBps <= 1000, "max 10%");
        emit CommissionUpdated(commissionBps, newCommissionBps);
        commissionBps = newCommissionBps;
    }

    /// @notice Set treasury address
    function setTreasury(address newTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newTreasury != address(0), "zero treasury");
        emit TreasuryUpdated(treasury, newTreasury);
        treasury = newTreasury;
    }

    /// @notice Update consumer contract address
    function setConsumerContract(address newConsumerContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newConsumerContract != address(0), "zero consumer contract");
        emit ConsumerContractUpdated(address(consumerContract), newConsumerContract);
        consumerContract = IApxosConsumer(newConsumerContract);
    }

    /// @notice Pause the marketplace
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = true;
        emit Paused(msg.sender);
    }

    /// @notice Unpause the marketplace
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        paused = false;
        emit Unpaused(msg.sender);
    }

    /// @notice Get commission rate
    function getCommissionBps() external view returns (uint96) {
        return commissionBps;
    }

    /// @notice Get treasury address
    function getTreasury() external view returns (address) {
        return treasury;
    }

    /// @notice Check if marketplace is paused
    function isPaused() external view returns (bool) {
        return paused;
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