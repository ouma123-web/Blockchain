// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./ApxosConsumer.sol";
import "./ApxosProvider.sol";
import "./ApxosMarketplace.sol";
import "../tokens/ApxosToken.sol";

/// @title ApxosFactory
/// @notice Factory contract for deploying and managing Apxos ecosystem contracts
contract ApxosFactory {
    struct ApxosContracts {
        address consumer;
        address provider;
        address marketplace;
        address stablecoin;
        uint96 commissionBps;
        address treasury;
        bool deployed;
    }

    mapping(bytes32 => ApxosContracts) public ecosystems;
    address[] public deployedEcosystems;

    event EcosystemDeployed(
        bytes32 indexed ecosystemId,
        address consumer,
        address provider,
        address marketplace,
        address stablecoin,
        uint96 commissionBps,
        address treasury
    );

    event ContractUpdated(
        bytes32 indexed ecosystemId,
        string contractType,
        address oldAddress,
        address newAddress
    );

    /// @notice Deploy a complete Apxos ecosystem
    /// @param ecosystemId Unique identifier for this ecosystem
    /// @param stablecoin Address of the stablecoin contract
    /// @param commissionBps Commission rate in basis points
    /// @param treasury Treasury address for commissions
    function deployEcosystem(
        bytes32 ecosystemId,
        address stablecoin,
        uint96 commissionBps,
        address treasury
    ) external returns (address consumer, address provider, address marketplace) {
        require(ecosystemId != bytes32(0), "invalid ecosystem id");
        require(stablecoin != address(0), "invalid stablecoin");
        require(treasury != address(0), "invalid treasury");
        require(!ecosystems[ecosystemId].deployed, "ecosystem already exists");

        // Deploy contracts in dependency order
        // 1. Deploy placeholder addresses first (will be updated after deployment)
        address tempConsumer = address(0x123); // Temporary placeholder
        address tempProvider = address(0x456); // Temporary placeholder

        // 2. Deploy Marketplace (depends on Consumer)
        ApxosMarketplace marketplaceContract = new ApxosMarketplace(
            stablecoin,
            tempConsumer, // Will be updated
            commissionBps,
            treasury
        );
        marketplace = address(marketplaceContract);

        // 3. Deploy Consumer (depends on Marketplace and Provider)
        ApxosConsumer consumerContract = new ApxosConsumer(
            stablecoin,
            marketplace,
            tempProvider // Will be updated
        );
        consumer = address(consumerContract);

        // 4. Deploy Provider (depends on Consumer)
        ApxosProvider providerContract = new ApxosProvider(
            stablecoin,
            consumer
        );
        provider = address(providerContract);

        // 5. Update cross-references
        marketplaceContract.setConsumerContract(consumer);
        consumerContract.setProviderContract(provider);
        consumerContract.setMarketplace(marketplace);

        // 6. Transfer admin rights to the ecosystem deployer (msg.sender)
        marketplaceContract.grantRole(0x00, msg.sender); // DEFAULT_ADMIN_ROLE
        providerContract.grantRole(0x00, msg.sender); // DEFAULT_ADMIN_ROLE
        consumerContract.grantRole(0x00, msg.sender); // DEFAULT_ADMIN_ROLE

        // 7. Store ecosystem info
        ecosystems[ecosystemId] = ApxosContracts({
            consumer: consumer,
            provider: provider,
            marketplace: marketplace,
            stablecoin: stablecoin,
            commissionBps: commissionBps,
            treasury: treasury,
            deployed: true
        });

        deployedEcosystems.push(consumer);

        emit EcosystemDeployed(
            ecosystemId,
            consumer,
            provider,
            marketplace,
            stablecoin,
            commissionBps,
            treasury
        );

        return (consumer, provider, marketplace);
    }

    /// @notice Get ecosystem contract addresses
    /// @param ecosystemId The ecosystem identifier
    function getEcosystem(bytes32 ecosystemId) external view returns (
        address consumer,
        address provider,
        address marketplace,
        address stablecoin,
        uint96 commissionBps,
        address treasury,
        bool deployed
    ) {
        ApxosContracts memory ecosystem = ecosystems[ecosystemId];
        return (
            ecosystem.consumer,
            ecosystem.provider,
            ecosystem.marketplace,
            ecosystem.stablecoin,
            ecosystem.commissionBps,
            ecosystem.treasury,
            ecosystem.deployed
        );
    }

    /// @notice Update consumer contract for an ecosystem
    /// @param ecosystemId The ecosystem to update
    /// @param newConsumer New consumer contract address
    function updateConsumerContract(bytes32 ecosystemId, address newConsumer) external {
        require(ecosystems[ecosystemId].deployed, "ecosystem not found");
        require(newConsumer != address(0), "invalid address");

        address oldConsumer = ecosystems[ecosystemId].consumer;
        ecosystems[ecosystemId].consumer = newConsumer;

        // Update references in other contracts
        ApxosMarketplace(ecosystems[ecosystemId].marketplace).setConsumerContract(newConsumer);
        ApxosProvider(ecosystems[ecosystemId].provider).setConsumerContract(newConsumer);

        emit ContractUpdated(ecosystemId, "consumer", oldConsumer, newConsumer);
    }

    /// @notice Update provider contract for an ecosystem
    /// @param ecosystemId The ecosystem to update
    /// @param newProvider New provider contract address
    function updateProviderContract(bytes32 ecosystemId, address newProvider) external {
        require(ecosystems[ecosystemId].deployed, "ecosystem not found");
        require(newProvider != address(0), "invalid address");

        address oldProvider = ecosystems[ecosystemId].provider;
        ecosystems[ecosystemId].provider = newProvider;

        // Update reference in consumer contract
        ApxosConsumer(ecosystems[ecosystemId].consumer).setProviderContract(newProvider);

        emit ContractUpdated(ecosystemId, "provider", oldProvider, newProvider);
    }

    /// @notice Update marketplace contract for an ecosystem
    /// @param ecosystemId The ecosystem to update
    /// @param newMarketplace New marketplace contract address
    function updateMarketplaceContract(bytes32 ecosystemId, address newMarketplace) external {
        require(ecosystems[ecosystemId].deployed, "ecosystem not found");
        require(newMarketplace != address(0), "invalid address");

        address oldMarketplace = ecosystems[ecosystemId].marketplace;
        ecosystems[ecosystemId].marketplace = newMarketplace;

        // Update reference in consumer contract
        ApxosConsumer(ecosystems[ecosystemId].consumer).setMarketplace(newMarketplace);

        emit ContractUpdated(ecosystemId, "marketplace", oldMarketplace, newMarketplace);
    }

    /// @notice Get total number of deployed ecosystems
    function getEcosystemCount() external view returns (uint256) {
        return deployedEcosystems.length;
    }

    /// @notice Check if ecosystem exists
    /// @param ecosystemId The ecosystem to check
    function ecosystemExists(bytes32 ecosystemId) external view returns (bool) {
        return ecosystems[ecosystemId].deployed;
    }
}