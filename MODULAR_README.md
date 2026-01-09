# Apxos Modular Smart Contracts

## Architecture Overview

Le contrat `ApxosSettlement.sol` original a été refactorisé en **3 contrats spécialisés** pour une meilleure séparation des responsabilités :

### 🏗️ Architecture Modulaire

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ApxosConsumer  │    │ ApxosProvider   │    │ ApxosMarketplace │
│                 │    │                 │    │                 │
│ • Escrow dépôt  │    │ • Paiements     │    │ • Confirmations  │
│ • Disputes      │◄──►│ • Batch release │◄──►│ • Revenue share  │
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

## Contrats Détaillés

### 1. ApxosConsumer (Gestion Consumer)
**Responsabilités :**
- Dépôt d'escrow par les consumers
- Gestion des fonds en custody
- Gestion des disputes côté consumer
- Libération des fonds approuvés

**Fonctions clés :**
```solidity
depositEscrow(bytes32 escrowId, uint128 amount, bytes32 metaHash)
raiseDispute(bytes32 escrowId)
releasePayment(bytes32 escrowId, uint128 amount, address provider, uint256 commission)
```

### 2. ApxosProvider (Gestion Provider)
**Responsabilités :**
- Traitement des paiements batch aux providers
- Calcul et prélèvement des commissions
- Transfert des commissions au treasury
- Validation des conditions de paiement

**Fonctions clés :**
```solidity
batchRelease(bytes32 batchId, ReleaseParam[] params, uint96 commissionBps, address treasury)
isEscrowReady(bytes32 escrowId)
isEscrowDisputed(bytes32 escrowId)
```

### 3. ApxosMarketplace (Administration)
**Responsabilités :**
- Confirmation des livraisons
- Revenue sharing (distribution aux stakeholders)
- Gestion administrative (commissions, treasury, pause)
- Résolution des disputes

**Fonctions clés :**
```solidity
confirmDelivery(bytes32 escrowId)
batchRevenueShare(bytes32 batchId, ShareParam[] params)
setCommission(uint96 newCommissionBps)
clearDispute(bytes32 escrowId)
```

### 4. ApxosFactory (Orchestration)
**Responsabilités :**
- Déploiement coordonné des 3 contrats
- Gestion des références croisées
- Mises à jour de contrats
- Registry des écosystèmes déployés

**Fonctions clés :**
```solidity
deployEcosystem(bytes32 ecosystemId, address stablecoin, uint96 commissionBps, address treasury)
updateConsumerContract(bytes32 ecosystemId, address newConsumer)
getEcosystem(bytes32 ecosystemId)
```

## Interfaces

Chaque contrat expose une interface pour faciliter l'intégration :

- `IApxosConsumer.sol` - Fonctions consumer
- `IApxosProvider.sol` - Fonctions provider
- `IApxosMarketplace.sol` - Fonctions marketplace

## Flux de Travail

### 1. Dépôt d'Escrow
```
Consumer → ApxosConsumer.depositEscrow()
```

### 2. Confirmation de Livraison
```
Marketplace → ApxosMarketplace.confirmDelivery()
```

### 3. Paiement Provider
```
Provider → ApxosProvider.batchRelease()
         ↓
         ApxosConsumer.releasePayment()
```

### 4. Revenue Sharing (optionnel)
```
Marketplace → ApxosMarketplace.batchRevenueShare()
             ↓
             ApxosConsumer.revenueShare()
```

## Avantages de l'Architecture Modulaire

### ✅ **Séparation des Responsabilités**
- Chaque contrat a un rôle clair et limité
- Réduction de la complexité par contrat
- Maintenance plus facile

### ✅ **Évolutivité**
- Possibilité d'upgrader individuellement chaque contrat
- Nouveaux contrats peuvent être ajoutés facilement
- Interfaces stables pour l'intégration

### ✅ **Sécurité**
- Surface d'attaque réduite par contrat
- Audit plus facile (contrats plus petits)
- Isolation des fonctionnalités sensibles

### ✅ **Flexibilité**
- Différentes configurations possibles
- Réutilisation de contrats dans différents contextes
- Tests unitaires plus ciblés

## Déploiement

### Déploiement Automatique (Recommandé)
```bash
npm run deploy:modular
```

### Déploiement Manuel
```bash
# 1. Déployer le token (optionnel)
npm run deploy:token

# 2. Déployer la factory
# 3. Utiliser la factory pour déployer l'écosystème
```

## Tests

```bash
# Tests unitaires
npm run test:modular

# Tests d'intégration complets
npm run test
```

## Migration depuis ApxosSettlement.sol

### Changements Fonctionnels
- `depositEscrow()` → `ApxosConsumer.depositEscrow()`
- `confirmDelivery()` → `ApxosMarketplace.confirmDelivery()`
- `batchRelease()` → `ApxosProvider.batchRelease()`
- `batchRevenueShare()` → `ApxosMarketplace.batchRevenueShare()`

### Nouveaux Paramètres
- `ecosystemId` pour identifier l'instance
- Adresses des contrats interconnectés

### Configuration
Les rôles `SETTLEMENT_ROLE` doivent être configurés sur les contrats Provider et Marketplace.

## Recommandations

### Pour les Développeurs Frontend
1. Utiliser les interfaces pour l'intégration TypeScript
2. Gérer les adresses des 3 contrats
3. Prévoir la gestion d'erreurs cross-contracts

### Pour les Audits
1. Auditer chaque contrat séparément
2. Vérifier les interactions cross-contracts
3. Tester les scénarios de failure

### Pour les Mises à Jour
1. Prévoir des contrats proxy pour les upgrades
2. Tester les migrations de données
3. Maintenir la compatibilité des interfaces

---

## 📋 Checklist d'Intégration

- [ ] Adresses des 3 contrats configurées
- [ ] Rôles SETTLEMENT_ROLE attribués
- [ ] Interfaces intégrées dans le frontend
- [ ] Gestion d'erreurs cross-contracts
- [ ] Tests d'intégration complets
- [ ] Documentation API mise à jour