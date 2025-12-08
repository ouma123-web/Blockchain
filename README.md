# Apxos Settlement Contracts

Environnement Hardhat contenant :

- `ApxosSettlement.sol` : escrow + batch payments + revenue sharing.
- `ApxosToken.sol` : ERC20 (APXUSD) avec mint/burn contrôlé.
- `MockUSDC.sol` : token 6 décimales pour tests.
- Scripts de déploiement (`scripts/00-*.ts`) et tests.

## Prérequis

- Node.js 18+
- `pnpm` ou `npm`
- Variables d’environnement (copier `env.sample` vers `.env`).

## Installation

```bash
cd blockchain/apxos-settlement
npm install
```

## Tests & Gas

```bash
npm run build
npm run test        # tests unitaires Hardhat
npm run gas         # inclut un rapport gas
```

## Déploiement Sepolia

1. Renseigner `.env` :
   - `SEPOLIA_RPC`
   - `DEPLOYER_KEY`
   - `TREASURY` (wallet commission RedSys)
   - `STABLECOIN_ADDRESS` (optionnel si token déjà déployé)
   - `INIT_COMMISSION_BPS` (500 = 5 %)
   - `SETTLEMENT_OPERATOR` (adresse du gateway off-chain)
   - `APXOS_TOKEN_*` si tu déploies ton propre stablecoin
2. Déployer :

```bash
npm run deploy:token        # APXUSD / APXOS token
npm run deploy:usdc         # Mock USDC (test)
npm run deploy:settlement   # ApxosSettlement
npm run deploy:roles        # Donne SETTLEMENT_ROLE
```

Les adresses sont sauvegardées dans `deploy/sepolia.json`.

