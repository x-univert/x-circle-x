# X-CIRCLE-X - Adresses des Smart Contracts

**Reseau:** MultiversX Devnet
**Date de mise a jour:** 6 Decembre 2025

---

## Token XCIRCLEX

| Propriete | Valeur |
|-----------|--------|
| **Token ID** | `XCIRCLEX-3b9d57` |
| **Decimales** | 18 |
| **Supply Total** | 314,159,265.358979323846264338 (base PI) |

**Explorer:** https://devnet-explorer.multiversx.com/tokens/XCIRCLEX-3b9d57

---

## Smart Contracts Deployes

### 1. XCIRCLEX Staking Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw` |
| **Description** | Staking 360 degres avec 12 niveaux (30-360 jours, 5%-42% APY) |
| **Fonctions principales** | stake, unstake, claimRewards, emergencyUnstake, getTotalStakedByUser |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw

---

### 2. XCIRCLEX DAO Contract (Legacy v1)

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgq35zrtzej655v2czk5plzaa6hp4wluun7flfql80l9d` |
| **Description** | Ancien DAO - Ne recoit que XCIRCLEX |
| **Statut** | DEPRECATED - Migrer vers DAO-v2 |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgq35zrtzej655v2czk5plzaa6hp4wluun7flfql80l9d

---

### 2b. XCIRCLEX DAO-v2 Contract (Nouveau)

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgq90jjjlwjfg2s45y8mxm6xgweavdhyxw8flfqaatay7` |
| **Description** | Nouveau DAO payable - Recoit EGLD + XCIRCLEX |
| **Metadata** | Payable (peut recevoir EGLD et tokens) |
| **Fonctions principales** | createProposal, vote, depositToTreasury, depositEgldToTreasury, receiveFromCircleOfLife |
| **Staking integre** | Oui - Les tokens stakes comptent pour le pouvoir de vote |
| **Distribution** | Recoit 30% des EGLD distribues par SC0 |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgq90jjjlwjfg2s45y8mxm6xgweavdhyxw8flfqaatay7

---

### 3. XCIRCLEX Vesting Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0` |
| **Description** | Distribution progressive des tokens (Team, Marketing, Advisors) |
| **Fonctions principales** | claim, getVestingSchedule |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0

---

### 4. Circle Manager Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgq4v9m37smxz06p858t5mzdzc69tu6pvlsflfqwf7tf8` |
| **Description** | Gestion des cercles de contribution |
| **Fonctions principales** | createCircle, requestMembership, voteForMember, contribute |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgq4v9m37smxz06p858t5mzdzc69tu6pvlsflfqwf7tf8

---

### 5. Circle of Life Center Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgqa6yjeghz6c38cdmk4z0xhsd2jdus0m74flfq0df5xn` |
| **Description** | Contract central pour les transactions circulaires |
| **Fonctions principales** | Deploie des smart contracts pour chaque membre |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqa6yjeghz6c38cdmk4z0xhsd2jdus0m74flfq0df5xn

---

### 6. Circle Peripheral Contract (Template)

| Propriete | Valeur |
|-----------|--------|
| **Type** | Contract Template (SC1, SC2, SC3...) |
| **WASM** | `contracts/circle-peripheral/output/circle-peripheral.wasm` |
| **Description** | Smart contract peripherique cree pour chaque membre du cercle |
| **Deploye par** | Circle of Life Center (SC0) automatiquement |
| **Fonctions principales** | deposit, transfer, signAndForward, forceTransferToSC0 |

> **Note:** Ce contrat n'a pas d'adresse fixe. Une nouvelle instance est deployee par SC0 pour chaque membre qui rejoint le cercle. Chaque instance a son propre owner (le membre) et peut recevoir/envoyer des EGLD dans le cadre des cycles.

---

## Wallet Deployer

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1ff267s6mprn09d3zcuptyqc3h44psl3dfpp7uza5j74qv0kyflfq5z9tyg` |
| **Fichier PEM** | `multiversx-wallets/wallet-test-devnet.pem` |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1ff267s6mprn09d3zcuptyqc3h44psl3dfpp7uza5j74qv0kyflfq5z9tyg

---

### 7. LP Locker Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgqtwutsamdra4capldu6nkzsu8zwkkdxfaflfqmzvuzz` |
| **Description** | Verrouillage des LP tokens pour 12 mois minimum |
| **Fonctions principales** | lockLpTokens, extendLock, unlock, getLockInfo |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqtwutsamdra4capldu6nkzsu8zwkkdxfaflfqmzvuzz

---

### 8. Token Protection Contract

| Propriete | Valeur |
|-----------|--------|
| **Adresse** | `erd1qqqqqqqqqqqqqpgqescv0dcpdgu62sa7a89s3w2qdc9njsydflfqwfxdvx` |
| **Description** | Anti-whale (2% max) et Sell Tax progressive (10%/5%/0%) |
| **Fonctions principales** | recordPurchase, sellWithTax, verifyTransfer, setExempt |

**Explorer:** https://devnet-explorer.multiversx.com/accounts/erd1qqqqqqqqqqqqqpgqescv0dcpdgu62sa7a89s3w2qdc9njsydflfqwfxdvx

---

## Resume des Adresses (copier-coller)

```
XCIRCLEX_TOKEN_ID=XCIRCLEX-3b9d57
STAKING_CONTRACT=erd1qqqqqqqqqqqqqpgqd5r76rsws9kvzcdsxqqgjlrjlw90x44uflfq386xhw
DAO_CONTRACT_V1=erd1qqqqqqqqqqqqqpgq35zrtzej655v2czk5plzaa6hp4wluun7flfql80l9d
DAO_CONTRACT_V2=erd1qqqqqqqqqqqqqpgq90jjjlwjfg2s45y8mxm6xgweavdhyxw8flfqaatay7
VESTING_CONTRACT=erd1qqqqqqqqqqqqqpgqc00rmsjfsk6prqwpcjggxzmdeus0vwa0flfqhxgel0
CIRCLE_MANAGER=erd1qqqqqqqqqqqqqpgq4v9m37smxz06p858t5mzdzc69tu6pvlsflfqwf7tf8
CIRCLE_OF_LIFE=erd1qqqqqqqqqqqqqpgqa6yjeghz6c38cdmk4z0xhsd2jdus0m74flfq0df5xn
LP_LOCKER=erd1qqqqqqqqqqqqqpgqtwutsamdra4capldu6nkzsu8zwkkdxfaflfqmzvuzz
TOKEN_PROTECTION=erd1qqqqqqqqqqqqqpgqescv0dcpdgu62sa7a89s3w2qdc9njsydflfqwfxdvx
CIRCLE_PERIPHERAL_WASM=contracts/circle-peripheral/output/circle-peripheral.wasm
DEPLOYER_WALLET=erd1ff267s6mprn09d3zcuptyqc3h44psl3dfpp7uza5j74qv0kyflfq5z9tyg
```

---

## Statut de Verification

| Contrat | Statut | Derniere verification |
|---------|--------|----------------------|
| Staking | OK | 6 Dec 2025 |
| DAO | OK | 6 Dec 2025 |
| Vesting | OK | 6 Dec 2025 |
| Circle Manager | - | Non verifie |
| Circle of Life | - | Non verifie |
| Circle Peripheral | WASM OK | Template (pas d'adresse fixe) |
