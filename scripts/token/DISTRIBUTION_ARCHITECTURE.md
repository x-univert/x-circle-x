# XCIRCLEX Token Distribution Architecture

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ARCHITECTURE DE DISTRIBUTION                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                         ┌──────────────────┐                            │
│                         │   ISSUANCE TX    │                            │
│                         │                  │                            │
│                         │  314,159,265     │                            │
│                         │    XCIRCLEX      │                            │
│                         └────────┬─────────┘                            │
│                                  │                                      │
│                                  ▼                                      │
│                    ┌─────────────────────────────┐                      │
│                    │      DEPLOYER WALLET        │                      │
│                    │   (Détient 100% initial)    │                      │
│                    └─────────────┬───────────────┘                      │
│                                  │                                      │
│          ┌───────────────────────┼───────────────────────┐              │
│          │           │           │           │           │              │
│          ▼           ▼           ▼           ▼           ▼              │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐         │
│    │   SC0   │ │ STAKING │ │TREASURY │ │  TEAM   │ │  OTHER  │         │
│    │  (35%)  │ │  (15%)  │ │  (10%)  │ │  (10%)  │ │  (30%)  │         │
│    └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Allocations Détaillées

### 1. Récompenses Cercle de Vie (35%) - ~110M XCIRCLEX

**Destinataire:** SC0 (Circle of Life Center)

**Utilisation:**
- Récompenses quotidiennes pour les cycles réussis
- 1 XCIRCLEX par SC actif par cycle réussi
- Burn automatique sur cycles réussis
- Redistribution aux signataires si cycle échoué

**Mécanisme:**
```
SC0 détient les tokens
    │
    ├── Cycle réussi → Distribue aux SC périphériques + BURN
    │
    └── Cycle échoué → Redistribue aux signataires (PAS de burn)
```

**Smart Contract Role:** `ESDTRoleLocalBurn` (pour brûler les tokens)

---

### 2. Pool de Liquidité (20%) - ~63M XCIRCLEX

**Destinataire:** xExchange LP Contract / Pair EGLD-XCIRCLEX

**Utilisation:**
- Liquidité initiale sur xExchange
- Paired avec EGLD collectés des créations de SC (1 EGLD × 70%)
- Permet l'échange EGLD ↔ XCIRCLEX

**Croissance:**
```
Chaque nouveau SC créé:
    │
    └── 1 EGLD payé
        ├── 70% (0.7 EGLD) → Pool de liquidité
        ├── 20% (0.2 EGLD) → Trésorerie DAO
        └── 10% (0.1 EGLD) → Réserve d'urgence
```

---

### 3. Staking Rewards (15%) - ~47M XCIRCLEX

**Destinataire:** Staking Smart Contract

**Utilisation:**
- Récompenses pour les 12 niveaux de staking (30j → 360j)
- APY de 5% (niveau 1) à 42% (niveau 12)
- Durée estimée: 3-5 ans

**Après épuisement:**
- Récompenses continuent via frais du protocole
- APY réduit mais durable (5-15%)

---

### 4. Équipe Fondatrice (10%) - ~31M XCIRCLEX

**Destinataire:** Vesting Smart Contract (Team)

**Vesting Schedule:**
```
Mois 0-6:   ████████████░░░░░░░░░░░░  Cliff (0% libéré)
Mois 6-12:  ████████████████░░░░░░░░  25% libéré
Mois 12-18: ████████████████████░░░░  50% libéré
Mois 18-24: ████████████████████████  75% libéré
Mois 24+:   ████████████████████████  100% libéré
```

**Structure Vesting:**
- Cliff: 6 mois (aucun token libéré)
- Durée totale: 24 mois
- Libération: Linéaire après le cliff

---

### 5. Trésorerie DAO (10%) - ~31M XCIRCLEX

**Destinataire:** Treasury Smart Contract (Multi-sig DAO)

**Utilisation:**
- Financement développement
- Partenariats stratégiques
- Audits de sécurité
- Grants communautaires

**Gouvernance:**
- Contrôlé par vote DAO
- Propositions nécessitent 10,000+ XCIRCLEX
- Quorum: 10% du supply circulant
- Timelock: 48h avant exécution

---

### 6. Marketing & Growth (5%) - ~16M XCIRCLEX

**Destinataire:** Marketing Wallet (Multi-sig)

**Vesting:** 12 mois linéaire

**Utilisation:**
- Campagnes marketing
- Influenceurs
- Événements
- Contenu éducatif

---

### 7. Conseillers (3%) - ~9M XCIRCLEX

**Destinataire:** Vesting Smart Contract (Advisors)

**Vesting Schedule:**
- Cliff: 3 mois
- Durée totale: 12 mois
- Libération: Linéaire après le cliff

---

### 8. Airdrop Initial (2%) - ~6M XCIRCLEX

**Destinataire:** Airdrop Smart Contract

**Utilisation:**
- Early adopters
- Testeurs beta
- Communauté initiale

**Critères d'éligibilité:**
- Participation aux tests devnet
- Membres Discord actifs
- Premiers créateurs de SC

---

## Adresses des Smart Contracts

| Allocation | Type | Adresse (à définir) |
|------------|------|---------------------|
| Cercle de Vie | SC0 | erd1qqqqqqqqqqqqq... |
| Staking | Staking SC | erd1qqqqqqqqqqqqq... |
| Trésorerie | Treasury SC | erd1qqqqqqqqqqqqq... |
| Team Vesting | Vesting SC | erd1qqqqqqqqqqqqq... |
| Advisor Vesting | Vesting SC | erd1qqqqqqqqqqqqq... |
| Marketing | Wallet Multi-sig | erd1... |
| Airdrop | Airdrop SC | erd1qqqqqqqqqqqqq... |
| Liquidité | xExchange LP | erd1qqqqqqqqqqqqq... |

---

## Ordre de Déploiement

1. **Émettre le token XCIRCLEX** (issue_token.bat)
2. **Déployer SC0** (Circle of Life Center) avec le token identifier
3. **Déployer Staking SC**
4. **Déployer Treasury SC** (multi-sig)
5. **Déployer Vesting SC** pour Team et Advisors
6. **Configurer les rôles** (setSpecialRole pour SC0)
7. **Distribuer les tokens** vers chaque SC/wallet
8. **Créer la pool de liquidité** sur xExchange

---

## Sécurité

### Rôles ESDT nécessaires:

| SC | Rôle | Raison |
|----|------|--------|
| SC0 | ESDTRoleLocalBurn | Brûler tokens sur cycles réussis |
| Staking SC | - | Reçoit/envoie seulement |
| Treasury SC | - | Contrôlé par DAO |

### Multi-signatures recommandées:

| Wallet | Signataires | Quorum |
|--------|-------------|--------|
| Marketing | 3 | 2/3 |
| Deployer | 3 | 2/3 |
| Emergency | 5 | 3/5 |

---

## Commandes de Distribution

Après avoir déployé les SC et obtenu leurs adresses:

```bash
# Exemple: Distribuer 35% vers SC0
mxpy tx new \
    --receiver <SC0_ADDRESS> \
    --value 0 \
    --gas-limit 500000 \
    --data "ESDTTransfer@<TOKEN_HEX>@<AMOUNT_HEX>" \
    --pem=deployer.pem \
    --chain=D \
    --proxy=https://devnet-gateway.multiversx.com \
    --recall-nonce \
    --send
```

---

*Document créé le 6 décembre 2025*
*X-CIRCLE-X DAO*
