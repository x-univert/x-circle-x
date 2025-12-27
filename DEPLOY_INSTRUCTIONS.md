# Instructions de Déploiement - CircleManager Smart Contract

## Fichiers générés

✅ **Smart Contract compilé avec succès !**

- **WASM**: `contracts/circle-manager/output/circle-manager.wasm` (12 KB)
- **ABI**: `contracts/circle-manager/output/circle-manager.abi.json`
- **Métadonnées**: `contracts/circle-manager/output/circle-manager.mxsc.json`

## Méthode 1 : Déploiement via MultiversX Playground (RECOMMANDÉ)

1. Allez sur **https://devnet-play.multiversx.com/**
2. Cliquez sur "New Contract"
3. Upload le fichier `circle-manager.wasm`
4. Upload le fichier `circle-manager.abi.json`
5. Connectez votre wallet
6. Dans la section "Deploy":
   - **Gas Limit**: `60000000`
   - **Aucun argument** (le constructeur init() ne prend pas de paramètres)
7. Cliquez sur "Deploy"
8. Signez la transaction avec votre wallet
9. **Notez l'adresse du contrat déployé** (commence par `erd1qqqqqqqqqqqq...`)

## Méthode 2 : Déploiement via mxpy (Ligne de commande)

### Prérequis
- Exporter votre wallet Devnet en fichier PEM
- Placer le fichier PEM dans `wallets/wallet-devnet.pem`

### Commande de déploiement

```bash
mxpy contract deploy ^
  --bytecode="contracts/circle-manager/output/circle-manager.wasm" ^
  --pem="wallets/wallet-devnet.pem" ^
  --gas-limit=60000000 ^
  --proxy="https://devnet-gateway.multiversx.com" ^
  --chain=D ^
  --recall-nonce ^
  --send
```

### Vérifier le déploiement

```bash
mxpy contract query <CONTRACT_ADDRESS> ^
  --function="getNextCircleId" ^
  --proxy="https://devnet-gateway.multiversx.com"
```

Devrait retourner `1` si le contrat est bien initialisé.

## Méthode 3 : Déploiement via xPortal Mobile

1. Utilisez mxpy pour générer un QR code :
```bash
mxpy contract deploy ^
  --bytecode="contracts/circle-manager/output/circle-manager.wasm" ^
  --gas-limit=60000000 ^
  --proxy="https://devnet-gateway.multiversx.com" ^
  --chain=D ^
  --ledger ^
  --outfile=deploy-tx.json
```

2. Scannez le QR code avec xPortal
3. Signez et envoyez la transaction

## Après le déploiement

Une fois déployé, vous obtiendrez une **adresse de contrat** (Contract Address) qui ressemble à :
```
erd1qqqqqqqqqqqqqpgqxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Copiez cette adresse** et ajoutez-la dans votre fichier de configuration frontend :

`dapp/src/config.ts` :
```typescript
export const CONTRACT_ADDRESS = 'erd1qqqqqqqqqqqqqpgqxxxxxxxxxx...';
export const NETWORK = 'devnet';
```

## Vérification du contrat

Vous pouvez vérifier votre contrat sur :
- **Explorer Devnet**: https://devnet-explorer.multiversx.com/accounts/<CONTRACT_ADDRESS>
- **API Explorer**: https://devnet-api.multiversx.com/accounts/<CONTRACT_ADDRESS>

## Endpoints disponibles

Une fois déployé, votre contrat expose ces endpoints :

### Endpoints de mutation (nécessitent des transactions)
- `createCircle(contribution_amount: BigUint, cycle_duration: u64, max_members: u32)` → Crée un nouveau cercle
- `requestMembership(circle_id: u64)` → Demande à rejoindre un cercle
- `voteForMember(circle_id: u64, candidate: Address, approve: bool)` → Vote pour un candidat
- `contribute(circle_id: u64)` + paiement EGLD → Contribue au cycle actuel

### Endpoints de vue (lecture seule)
- `getCircle(circle_id: u64)` → Récupère les infos d'un cercle
- `getNextCircleId()` → Prochain ID de cercle disponible
- `getTreasuryBalance()` → Solde de la trésorerie du protocole
- `getProtocolFee()` → Pourcentage de frais (300 = 3%)

## Initialisation automatique

Le contrat s'initialise automatiquement avec :
- `next_circle_id = 1`
- `protocol_fee_percentage = 300` (3%)
- `treasury_balance = 0`

Aucune configuration supplémentaire n'est nécessaire après le déploiement.

## Problèmes connus

### Erreur "invalid contract code"
- **Cause**: Le WASM n'est pas optimisé avec wasm-opt
- **Solution**: Utiliser MultiversX Playground qui accepte les WASM non-optimisés sur Devnet

### Erreur "insufficient gas"
- **Solution**: Augmenter le gas limit à 60,000,000 ou plus

### Erreur "account not found"
- **Solution**: Vérifier que votre wallet a des fonds EGLD sur Devnet
- **Faucet Devnet**: https://devnet-wallet.multiversx.com/ (menu Faucet)
