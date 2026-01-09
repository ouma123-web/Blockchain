# Apxos Smart Contracts Architecture

## 📁 Contract Structure

```
contracts/
├── interfaces/           # Contract interfaces
│   ├── IApxosConsumer.sol
│   ├── IApxosProvider.sol
│   └── IApxosMarketplace.sol
├── core/                # Main modular contracts
│   ├── ApxosConsumer.sol
│   ├── ApxosProvider.sol
│   ├── ApxosMarketplace.sol
│   └── ApxosFactory.sol
├── legacy/              # Deprecated contracts (historical reference)
│   └── ApxosSettlementLegacy.sol
└── tokens/              # Token contracts
    ├── ApxosToken.sol
    └── MockUSDC.sol
```

## 🏗️ Architecture Overview

### Current Architecture (Modular)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ApxosConsumer  │    │ ApxosProvider   │    │ ApxosMarketplace │
│                 │    │                 │    │                 │
│ • Escrow dépôt  │◄──►│ • Paiements     │◄──►│ • Confirmations  │
│ • Disputes      │    │ • Batch release │    │ • Revenue share  │
│ • Funds custody │    │ • Commissions   │    │ • Administration │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────┐
                    │  ApxosFactory       │
                    │                     │
                    │ • Déploiement       │
                    │ • Orchestration     │
                    │ • Mises à jour      │
                    └─────────────────────┘
```

### Legacy Architecture (Deprecated)
```
┌─────────────────┐
│ ApxosSettlement │ ← DEPRECATED
│ (Single Contract)│
│ • All features   │
│ • Monolithic     │
│ • Hard to maintain│
└─────────────────┘
```

## 📋 Contract Roles

### ApxosConsumer
**Purpose**: Consumer-side escrow management
**Key Functions**:
- `depositEscrow()` - Deposit funds into escrow
- `raiseDispute()` - Raise disputes on escrows
- `getEscrow()` - Query escrow details

### ApxosProvider
**Purpose**: Provider-side payment processing
**Key Functions**:
- `batchRelease()` - Process batch payments to providers
- `isEscrowReady()` - Check escrow readiness
- `getEscrowBalance()` - Get remaining escrow balance

### ApxosMarketplace
**Purpose**: Marketplace operations and administration
**Key Functions**:
- `confirmDelivery()` - Confirm delivery completion
- `batchRevenueShare()` - Distribute revenue to stakeholders
- `setCommission()` - Update commission rates
- `clearDispute()` - Admin dispute resolution

### ApxosFactory
**Purpose**: Deployment orchestration and registry
**Key Functions**:
- `deployEcosystem()` - Deploy complete modular ecosystem
- `getEcosystem()` - Query deployed ecosystem addresses
- `updateConsumerContract()` - Update contract references

## 🔄 Migration Guide

### From ApxosSettlementLegacy to Modular Contracts

| Legacy Function | New Contract | New Function |
|----------------|--------------|--------------|
| `depositEscrow()` | ApxosConsumer | `depositEscrow()` |
| `confirmDelivery()` | ApxosMarketplace | `confirmDelivery()` |
| `batchRelease()` | ApxosProvider | `batchRelease()` |
| `batchRevenueShare()` | ApxosMarketplace | `batchRevenueShare()` |
| `raiseDispute()` | ApxosConsumer | `raiseDispute()` |
| `clearDispute()` | ApxosMarketplace | `clearDispute()` |

### Deployment Scripts

**Legacy Deployment** (Deprecated):
```bash
npm run deploy:all
```

**Modular Deployment** (Recommended):
```bash
npm run deploy:modular
npm run verify:modular
```

## 📚 Documentation

- [Modular Architecture Guide](../MODULAR_README.md)
- [Deployment Guide](../../DEPLOYMENT_GUIDE.md)
- [Testing](test/ApxosModular.test.ts)

## ⚠️ Important Notes

- **DO NOT USE** `ApxosSettlementLegacy.sol` for new deployments
- The legacy contract is kept for historical reference only
- All new development should use the modular architecture
- Legacy contract will be removed in future versions

## 🧪 Testing

```bash
# Test modular contracts
npm run test:modular

# Test legacy contract (for comparison)
npm run test
```