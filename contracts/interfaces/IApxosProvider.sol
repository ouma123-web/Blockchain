// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Apxos Provider Interface
/// @notice Interface for provider-side payment operations
interface IApxosProvider {
    struct ReleaseParam {
        bytes32 escrowId;
        address provider;
        uint128 amount;
    }

    /// @notice Process batch payments to providers
    /// @param batchId Unique batch identifier
    /// @param params Array of payment parameters
    /// @param commissionBps Commission rate in basis points
    /// @param treasury Treasury address for commissions
    function batchRelease(
        bytes32 batchId,
        ReleaseParam[] calldata params,
        uint96 commissionBps,
        address treasury
    ) external;

    /// @notice Check if escrow is ready for release
    /// @param escrowId The escrow to check
    /// @return ready Whether the escrow is ready for release
    function isEscrowReady(bytes32 escrowId) external view returns (bool);

    /// @notice Check if escrow is disputed
    /// @param escrowId The escrow to check
    /// @return disputed Whether the escrow is disputed
    function isEscrowDisputed(bytes32 escrowId) external view returns (bool);

    /// @notice Get remaining escrow balance
    /// @param escrowId The escrow to query
    /// @return remaining The remaining balance
    function getEscrowBalance(bytes32 escrowId) external view returns (uint128);

    event BatchPaid(bytes32 indexed batchId, uint256 providerCount, uint256 commissionTaken);
}