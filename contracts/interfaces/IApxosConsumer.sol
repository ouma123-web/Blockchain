// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Apxos Consumer Interface
/// @notice Interface for consumer-side escrow operations
interface IApxosConsumer {
    struct Escrow {
        address payer;
        uint128 amount;
        uint128 released;
        bool readyForRelease;
        bool disputed;
        bytes32 metaHash;
    }

    /// @notice Deposit funds into escrow for a rental
    /// @param escrowId Unique escrow identifier
    /// @param amount Amount to deposit
    /// @param metaHash Hash of off-chain rental data
    function depositEscrow(bytes32 escrowId, uint128 amount, bytes32 metaHash) external;

    /// @notice Raise a dispute on an escrow
    /// @param escrowId The escrow to dispute
    function raiseDispute(bytes32 escrowId) external;

    /// @notice Get escrow details
    /// @param escrowId The escrow to query
    /// @return escrow The escrow data
    function getEscrow(bytes32 escrowId) external view returns (Escrow memory);

    /// @notice Check if escrow exists
    /// @param escrowId The escrow to check
    /// @return exists Whether the escrow exists
    function escrowExists(bytes32 escrowId) external view returns (bool);

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

    /// @notice Process payment release (called by provider contract)
    /// @param escrowId The escrow to release from
    /// @param amount Amount to release
    /// @param provider Provider address
    /// @param commission Commission amount
    function releasePayment(bytes32 escrowId, uint128 amount, address provider, uint256 commission) external returns (bool);

    /// @notice Transfer commission to treasury (called by provider contract)
    /// @param treasury Treasury address
    /// @param amount Commission amount
    function transferCommission(address treasury, uint256 amount) external;

    /// @notice Confirm delivery for an escrow
    /// @param escrowId The escrow to confirm
    function confirmDelivery(bytes32 escrowId) external;

    /// @notice Process revenue share
    /// @param escrowId The escrow for revenue sharing
    /// @param recipients Array of recipient addresses
    /// @param amounts Array of amounts to distribute
    function revenueShare(bytes32 escrowId, address[] calldata recipients, uint128[] calldata amounts) external;

    /// @notice Complete rental transaction and release payment to provider
    /// @param escrowId The escrow to complete
    /// @param provider Provider address to receive payment
    /// @param commission Commission amount to deduct
    /// @param treasury Treasury address for commission
    /// @return success Whether the completion was successful
    function completeRental(bytes32 escrowId, address provider, uint128 commission, address treasury) external returns (bool);

    /// @notice Clear a dispute
    /// @param escrowId The escrow dispute to clear
    function clearDispute(bytes32 escrowId) external;

    event EscrowDeposited(bytes32 indexed escrowId, address indexed payer, uint256 amount, bytes32 metaHash);
    event Disputed(bytes32 indexed escrowId, address indexed by);
}