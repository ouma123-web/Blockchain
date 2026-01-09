// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Apxos Marketplace Interface
/// @notice Interface for marketplace operations and revenue sharing
interface IApxosMarketplace {
    struct ShareParam {
        bytes32 escrowId;
        address[] stakeholders;
        uint128[] amounts;
    }

    /// @notice Confirm delivery for an escrow
    /// @param escrowId The escrow to confirm
    function confirmDelivery(bytes32 escrowId) external;

    /// @notice Process batch revenue sharing
    /// @param batchId Unique batch identifier
    /// @param params Array of revenue sharing parameters
    function batchRevenueShare(bytes32 batchId, ShareParam[] calldata params) external;

    /// @notice Clear a dispute
    /// @param escrowId The escrow dispute to clear
    function clearDispute(bytes32 escrowId) external;

    /// @notice Set commission rate
    /// @param newCommissionBps New commission rate in basis points
    function setCommission(uint96 newCommissionBps) external;

    /// @notice Set treasury address
    /// @param newTreasury New treasury address
    function setTreasury(address newTreasury) external;

    /// @notice Pause the marketplace
    function pause() external;

    /// @notice Unpause the marketplace
    function unpause() external;

    /// @notice Get commission rate
    /// @return commissionBps Current commission rate
    function getCommissionBps() external view returns (uint96);

    /// @notice Get treasury address
    /// @return treasury Current treasury address
    function getTreasury() external view returns (address);

    /// @notice Check if marketplace is paused
    /// @return paused Whether the marketplace is paused
    function isPaused() external view returns (bool);

    event DeliveryConfirmed(bytes32 indexed escrowId);
    event RevenueShared(bytes32 indexed batchId, uint256 distributionCount);
    event DisputeCleared(bytes32 indexed escrowId, address indexed by);
    event CommissionUpdated(uint256 oldBps, uint256 newBps);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event Paused(address indexed by);
    event Unpaused(address indexed by);
}