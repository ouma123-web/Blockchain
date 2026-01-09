// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ApxosConsumer
/// @notice Consumer-side escrow management contract
contract ApxosConsumer is ReentrancyGuard, AccessControl {
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER_ROLE");

    IERC20 public immutable stablecoin;
    address public marketplace;
    address public providerContract;
    bool public paused;

    struct Escrow {
        address payer;
        uint128 amount;
        uint128 released;
        bool readyForRelease;
        bool disputed;
        bytes32 metaHash;
    }

    mapping(bytes32 => Escrow) public escrows;

    event EscrowDeposited(bytes32 indexed escrowId, address indexed payer, uint256 amount, bytes32 metaHash);
    event Disputed(bytes32 indexed escrowId, address indexed by);
    event MarketplaceUpdated(address indexed oldMarketplace, address indexed newMarketplace);
    event ProviderContractUpdated(address indexed oldProvider, address indexed newProvider);
    event Paused(address indexed by);
    event Unpaused(address indexed by);

    constructor(address stablecoin_, address marketplace_, address providerContract_) {
        require(stablecoin_ != address(0), "stablecoin required");
        require(marketplace_ != address(0), "marketplace required");
        require(providerContract_ != address(0), "provider contract required");

        stablecoin = IERC20(stablecoin_);
        marketplace = marketplace_;
        providerContract = providerContract_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MARKETPLACE_ROLE, marketplace_);
        _grantRole(PROVIDER_ROLE, providerContract_);

        // Grant settlement role to deployer initially
        _grantRole(keccak256("SETTLEMENT_ROLE"), msg.sender);
    }

    modifier whenNotPaused() {
        require(!paused, "paused");
        _;
    }

    modifier onlyMarketplace() {
        require(hasRole(MARKETPLACE_ROLE, msg.sender) || msg.sender == marketplace, "only marketplace");
        _;
    }

    modifier onlyProviderContract() {
        require(hasRole(PROVIDER_ROLE, msg.sender) || msg.sender == providerContract, "only provider contract");
        _;
    }

    /// @notice Deposit funds into escrow for a rental
    function depositEscrow(bytes32 escrowId, uint128 amount, bytes32 metaHash) external nonReentrant whenNotPaused {
        require(escrowId != bytes32(0), "invalid id");
        require(amount > 0, "amount zero");
        require(escrows[escrowId].payer == address(0), "escrow exists");

        escrows[escrowId] = Escrow({
            payer: msg.sender,
            amount: amount,
            released: 0,
            readyForRelease: false,
            disputed: false,
            metaHash: metaHash
        });

        bool success = stablecoin.transferFrom(msg.sender, address(this), amount);
        require(success, "transfer failed");

        emit EscrowDeposited(escrowId, msg.sender, amount, metaHash);
    }

    /// @notice Raise a dispute on an escrow (only by the payer)
    function raiseDispute(bytes32 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.payer != address(0), "unknown escrow");
        require(msg.sender == escrow.payer || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not allowed");
        require(!escrow.disputed, "already disputed");

        escrow.disputed = true;
        emit Disputed(escrowId, msg.sender);
    }

    /// @notice Confirm delivery (called by marketplace)
    function confirmDelivery(bytes32 escrowId) external onlyMarketplace {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.payer != address(0), "unknown escrow");
        require(!escrow.disputed, "in dispute");
        require(!escrow.readyForRelease, "already confirmed");

        escrow.readyForRelease = true;
    }

    /// @notice Process payment release (called by provider contract)
    function releasePayment(bytes32 escrowId, uint128 amount, address provider, uint256 commission) external onlyProviderContract returns (bool) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.readyForRelease, "escrow not ready");
        require(!escrow.disputed, "escrow in dispute");
        require(escrow.released + amount <= escrow.amount, "insufficient balance");

        escrow.released += amount;

        // Transfer payment to provider (minus commission)
        uint256 paymentAmount = amount - commission;
        if (paymentAmount > 0) {
            bool success = stablecoin.transfer(provider, paymentAmount);
            require(success, "provider transfer failed");
        }

        return true;
    }

    /// @notice Transfer commission to treasury (called by provider contract)
    function transferCommission(address treasury, uint256 amount) external onlyProviderContract {
        require(treasury != address(0), "invalid treasury");
        require(amount > 0, "zero amount");

        bool success = stablecoin.transfer(treasury, amount);
        require(success, "commission transfer failed");
    }

    /// @notice Complete rental transaction and release payment to provider (called by marketplace)
    function completeRental(bytes32 escrowId, address provider, uint128 commission, address treasury) external onlyMarketplace returns (bool) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.readyForRelease, "escrow not ready for release");
        require(!escrow.disputed, "escrow is disputed");
        require(escrow.released < escrow.amount, "escrow already fully released");
        require(provider != address(0), "invalid provider address");
        require(treasury != address(0), "invalid treasury address");

        uint128 remainingBalance = escrow.amount - escrow.released;
        uint128 paymentAmount = remainingBalance - commission;

        // Transfer payment to provider
        if (paymentAmount > 0) {
            bool success = stablecoin.transfer(provider, paymentAmount);
            require(success, "provider payment transfer failed");
        }

        // Transfer commission to treasury
        if (commission > 0) {
            bool success = stablecoin.transfer(treasury, commission);
            require(success, "commission transfer failed");
        }

        escrow.released = escrow.amount;
        return true;
    }

    /// @notice Process revenue share (called by marketplace)
    function revenueShare(bytes32 escrowId, address[] calldata recipients, uint128[] calldata amounts) external onlyMarketplace {
        require(recipients.length == amounts.length, "length mismatch");

        Escrow storage escrow = escrows[escrowId];
        require(escrow.readyForRelease, "escrow not ready");
        require(!escrow.disputed, "escrow in dispute");

        uint256 totalAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            require(recipients[i] != address(0), "invalid recipient");
            require(amounts[i] > 0, "amount zero");
            totalAmount += amounts[i];
        }

        require(totalAmount <= escrow.amount - escrow.released, "exceeds escrow");

        // Transfer funds to recipients
        for (uint256 i = 0; i < recipients.length; i++) {
            bool success = stablecoin.transfer(recipients[i], amounts[i]);
            require(success, "revenue share transfer failed");
        }

        escrow.released += uint128(totalAmount);
    }

    /// @notice Clear a dispute (admin only)
    function clearDispute(bytes32 escrowId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.payer != address(0), "unknown escrow");
        require(escrow.disputed, "not disputed");

        escrow.disputed = false;
    }

    /// @notice Get escrow details
    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    /// @notice Check if escrow exists
    function escrowExists(bytes32 escrowId) external view returns (bool) {
        return escrows[escrowId].payer != address(0);
    }

    /// @notice Check if escrow is ready for release
    function isEscrowReady(bytes32 escrowId) external view returns (bool) {
        return escrows[escrowId].readyForRelease;
    }

    /// @notice Check if escrow is disputed
    function isEscrowDisputed(bytes32 escrowId) external view returns (bool) {
        return escrows[escrowId].disputed;
    }

    /// @notice Get remaining escrow balance
    function getEscrowBalance(bytes32 escrowId) external view returns (uint128) {
        Escrow memory escrow = escrows[escrowId];
        return escrow.amount - escrow.released;
    }

    /// @notice Update marketplace contract address
    function setMarketplace(address newMarketplace) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMarketplace != address(0), "zero marketplace");
        emit MarketplaceUpdated(marketplace, newMarketplace);
        marketplace = newMarketplace;
        _grantRole(MARKETPLACE_ROLE, newMarketplace);
    }

    /// @notice Update provider contract address
    function setProviderContract(address newProviderContract) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newProviderContract != address(0), "zero provider contract");
        emit ProviderContractUpdated(providerContract, newProviderContract);
        providerContract = newProviderContract;
        _grantRole(PROVIDER_ROLE, newProviderContract);
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
}