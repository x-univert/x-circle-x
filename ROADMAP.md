# 🗓️ Roadmap - xCircle DAO

**Dernière mise à jour** : Octobre 2024

Ce document présente la feuille de route détaillée du projet xCircle DAO, organisée par phases et trimestres.

---

## 📊 Vue d'ensemble

```
2025 Q4         2026 Q1         2026 Q2         2026 Q3         2026 Q4
    |               |               |               |               |
    |          🔵 PHASE 1      🟢 PHASE 2      🟡 PHASE 3      🟠 PHASE 4
    |           Fondations        Beta          Mainnet       Expansion
    |               |               |               |               |
    └─ Setup       MVP          Testing        Launch         Scale
```

---

## 🔵 Phase 1 : Fondations (Q1 2026)

### Objectif principal

**Créer un MVP (Minimum Viable Product) fonctionnel sur Devnet MultiversX**

### Milestone 1.1 : Setup & Architecture (Semaines 1-2)

#### Smart Contracts

- [ ] Initialiser projet Rust avec MultiversX framework
- [ ] Structure de base CircleManager contract
- [ ] Structure de base Token contract
- [ ] Configuration build & tests
- [ ] Documentation architecture contracts

**Livrables** :

- ✅ Repo GitHub structuré
- ✅ Cargo.toml configurés
- ✅ Scripts de build automatisés

#### Frontend dApp

- [ ] Setup React + Vite + TypeScript
- [ ] Configuration TailwindCSS
- [ ] Intégration @multiversx/sdk-dapp
- [ ] Composants de base (Layout, Header, Footer)
- [ ] Routing avec React Router

**Livrables** :

- ✅ dApp squelette fonctionnel
- ✅ Connexion xPortal working
- ✅ Design system de base

#### DevOps

- [ ] GitHub Actions CI/CD
- [ ] Tests automatisés sur push
- [ ] Linting (Rustfmt, ESLint, Prettier)
- [ ] Pre-commit hooks

### Milestone 1.2 : Smart Contracts Core (Semaines 3-5)

#### CircleManager Contract

```rust
Fonctionnalités :
├─ Création de cercles
├─ Gestion des membres
├─ Système de votes (admission)
├─ Contributions automatiques
├─ Distribution rotative
└─ Pénalités de retard
```

**Tasks détaillées** :

- [ ] Struct `Circle` avec tous les champs nécessaires
- [ ] Endpoint `createCircle(amount, duration, max_members)`
- [ ] Endpoint `requestMembership(circle_id)`
- [ ] Endpoint `voteForMember(circle_id, candidate, approve)`
- [ ] Logic vote unanime pour admission
- [ ] Endpoint `contribute(circle_id)` avec validation montant
- [ ] Endpoint `distributeFunds(circle_id)` avec rotation
- [ ] Storage optimisé (SingleValueMapper, VecMapper)
- [ ] Events pour toutes les actions importantes
- [ ] Tests unitaires (>80% coverage)

**Livrables** :

- ✅ CircleManager contract déployé sur Devnet
- ✅ Tests passing (coverage >80%)
- ✅ Documentation technique complète

#### Token $XCIRCLE Contract

```rust
Fonctionnalités :
├─ Token ESDT standard
├─ Supply initial 100M
├─ Mécanisme de burn (0.5% par tx)
├─ Rôles & permissions
└─ Events
```

**Tasks** :

- [ ] Issue token ESDT sur Devnet
- [ ] Fonction `burn` automatique (0.5%)
- [ ] Fonction `transfer` avec burn intégré
- [ ] Gestion des rôles (minter, burner)
- [ ] Tests unitaires

**Livrables** :

- ✅ Token déployé sur Devnet
- ✅ Tests complets

### Milestone 1.3 : dApp MVP (Semaines 6-7)

#### Pages principales

- [ ] **Home** : Landing page explicative
- [ ] **Explorer** : Liste des cercles disponibles
- [ ] **Circle Details** : Détails d'un cercle
- [ ] **Dashboard** : Mes cercles, mes contributions
- [ ] **Create Circle** : Formulaire création

#### Fonctionnalités

- [ ] Connexion wallet xPortal (web + mobile)
- [ ] Lecture état blockchain (cercles, membres)
- [ ] Interactions smart contracts :
  - Créer un cercle
  - Demander adhésion
  - Voter pour un membre
  - Contribuer
- [ ] Notifications toast (succès/erreur)
- [ ] Loading states
- [ ] Gestion erreurs

**Livrables** :

- ✅ dApp fonctionnelle sur Devnet
- ✅ Toutes les interactions basiques working
- ✅ UI responsive (mobile + desktop)

### Milestone 1.4 : Tests & Documentation (Semaine 8)

#### Tests

- [ ] Tests end-to-end (Playwright ou Cypress)
- [ ] Tests d'intégration contracts ↔ dApp
- [ ] Tests de sécurité basiques
- [ ] Bug fixes

#### Documentation

- [ ] Guide utilisateur (USER_GUIDE.md)
- [ ] Guide développeur (DEVELOPER_GUIDE.md)
- [ ] Architecture détaillée (ARCHITECTURE.md)
- [ ] README vidéo démo

**Livrables** :

- ✅ Tests E2E passing
- ✅ Documentation complète
- ✅ Vidéo démo 3-5 minutes

---

## 🟢 Phase 2 : Beta (Q2 2026)

### Objectif principal

**Tests utilisateurs sur Testnet avec early adopters**

### Milestone 2.1 : NFT de Réputation (Semaines 9-10)

#### ReputationNFT Contract

```rust
Fonctionnalités :
├─ Mint NFT à l'adhésion
├─ Métadonnées dynamiques
├─ Mise à jour post-cycle
├─ Traits : cycles_completed, score_ponctualité
└─ Visuels évolutifs
```

**Tasks** :

- [ ] Structure NFT SFT (Semi-Fungible Token)
- [ ] Génération métadonnées JSON
- [ ] Intégration avec CircleManager
- [ ] Auto-update après chaque cycle
- [ ] Système de score (algorithme)
- [ ] Design des NFTs (5 niveaux)

**Design NFT** :

- Niveau 1 (Bronze) : 1-5 cycles
- Niveau 2 (Silver) : 6-15 cycles
- Niveau 3 (Gold) : 16-30 cycles
- Niveau 4 (Platinum) : 31-50 cycles
- Niveau 5 (Diamond) : 51+ cycles

**Livrables** :

- ✅ NFT contract déployé Testnet
- ✅ 5 designs NFT créés
- ✅ Intégration dApp

### Milestone 2.2 : Gouvernance DAO V1 (Semaines 11-12)

#### Governance Contract

```rust
Fonctionnalités :
├─ Création de propositions
├─ Vote pondéré (token + réputation)
├─ Quorum minimum
├─ Timelock (48h avant exécution)
└─ Exécution automatique
```

**Types de propositions** :

1. Paramètres protocole (frais, durées)
2. Budget DAO
3. Upgrade contracts
4. Partenariats

**Tasks** :

- [ ] Struct `Proposal`
- [ ] Endpoint `createProposal`
- [ ] Endpoint `vote(proposal_id, yes/no)`
- [ ] Calcul vote pondéré
- [ ] Timelock mécanique
- [ ] Auto-execution si approuvé
- [ ] Interface dApp gouvernance

**Livrables** :

- ✅ Contract Governance Testnet
- ✅ Page dApp pour vote
- ✅ Documentation processus DAO

### Milestone 2.3 : Staking $XCIRCLE (Semaines 13-14)

#### Staking Module

```rust
Fonctionnalités :
├─ Stake tokens (30/90/180/365 jours)
├─ Calcul rewards (APY variable)
├─ Unstake avec respect période
├─ Distribution rewards depuis frais
└─ Compound automatique (optionnel)
```

**APY par durée** :

- 30 jours : 5% APY
- 90 jours : 10% APY
- 180 jours : 15% APY
- 365 jours : 25% APY

**Tasks** :

- [ ] Logic staking dans Token contract
- [ ] Calcul APY en temps réel
- [ ] Distribution rewards depuis Treasury
- [ ] Pénalités unstake précoce
- [ ] Interface staking dApp

**Livrables** :

- ✅ Staking fonctionnel
- ✅ Dashboard staking dans dApp
- ✅ Calculateur de rewards

### Milestone 2.4 : Programme Ambassadeurs (Semaines 15-16)

#### Objectif

Recruter **50 early adopters** pour tester en conditions réelles

**Actions** :

- [ ] Création kit ambassadeur (docs, ressources)
- [ ] Campagne de recrutement (Twitter, Discord, Telegram)
- [ ] Onboarding 50 testeurs
- [ ] Distribution tokens test
- [ ] Sessions de formation (webinars)
- [ ] Formulaires de feedback
- [ ] Analyse retours et itérations

**Métriques de succès** :

- 50 ambassadeurs actifs
- 10+ cercles créés et complétés
- 100+ transactions test
- Feedback collecté et analysé

**Livrables** :

- ✅ 50 ambassadeurs recrutés
- ✅ 10 cercles testés
- ✅ Rapport de bugs et améliorations

### Milestone 2.5 : Audit Sécurité Interne (Semaines 17-18)

**Audit complet** :

- [ ] Review code tous les contracts
- [ ] Tests attaques connues :
  - Reentrancy
  - Integer overflow/underflow
  - Front-running
  - Sybil attacks
- [ ] Fuzzing tests
- [ ] Gas optimization
- [ ] Corrections bugs trouvés

**Livrables** :

- ✅ Rapport d'audit interne
- ✅ Tous bugs critiques résolus
- ✅ Code optimisé

---

## 🟡 Phase 3 : Mainnet Launch (Q3 2026)

### Objectif principal

**Lancement production sur Mainnet MultiversX**

### Milestone 3.1 : Audit Externe (Semaines 19-22)

**Audit professionnel** par société reconnue :

- Options : CertiK, Hacken, Trail of Bits, OpenZeppelin
- Coût estimé : 30,000 - 50,000 USD

**Process** :

- [ ] Sélection société d'audit
- [ ] Soumission code final
- [ ] Review et échanges
- [ ] Corrections issues trouvées
- [ ] Re-audit si nécessaire
- [ ] Rapport public

**Timeline** : 4 semaines

**Livrables** :

- ✅ Rapport d'audit public
- ✅ Badge "Audited by [Company]"
- ✅ Tous findings résolus

### Milestone 3.2 : Déploiement Mainnet (Semaine 23)

**Préparation** :

- [ ] Revue finale code
- [ ] Tests sur Testnet (dernière vérification)
- [ ] Préparation wallets Mainnet
- [ ] Scripts de déploiement
- [ ] Monitoring setup

**Déploiement** :

- [ ] Deploy CircleManager
- [ ] Deploy Token $XCIRCLE
- [ ] Deploy ReputationNFT
- [ ] Deploy Governance
- [ ] Deploy Treasury
- [ ] Vérification tous contracts

**Configuration** :

- [ ] Paramètres initiaux (frais, durées)
- [ ] Permissions et rôles
- [ ] Trésorerie initiale
- [ ] Multi-sig xSafe setup

**Livrables** :

- ✅ Tous contracts Mainnet
- ✅ Vérifiés sur Explorer
- ✅ Monitoring actif

### Milestone 3.3 : IDO Token $XCIRCLE (Semaines 24-25)

**Préparation IDO** :

- [ ] Choix plateforme (xExchange, Maiar Launchpad, autre)
- [ ] Legal opinion (token utility/security)
- [ ] Whitelist early supporters
- [ ] Marketing campagne pre-IDO

**IDO Details** :

- 20% du supply = 20M $XCIRCLE
- Prix : TBD selon market conditions
- Vesting : Unlock immédiat
- Allocation : First-come first-served ou lottery

**Post-IDO** :

- [ ] Listing sur xExchange (DEX)
- [ ] Provision liquidité (10M tokens)
- [ ] Monitoring prix et liquidité

**Livrables** :

- ✅ IDO complétée avec succès
- ✅ Token tradable sur DEX
- ✅ Liquidité stable

### Milestone 3.4 : Marketing Launch (Semaines 26-27)

**Campagne massive** :

**1. Réseaux sociaux** :

- [ ] Twitter/X : Thread storm, AMAs
- [ ] Discord : Serveur communautaire actif
- [ ] Telegram : Groupes FR/EN
- [ ] YouTube : Tutoriels, démos

**2. Partenariats** :

- [ ] MultiversX officiel (grant ?)
- [ ] Protocoles DeFi (collaborations)
- [ ] Influenceurs crypto

**3. Médias** :

- [ ] Articles Medium/Substack
- [ ] Podcasts crypto
- [ ] Interviews
- [ ] Communiqués de presse

**4. Communauté** :

- [ ] Airdrops pour early adopters
- [ ] Concours création contenu
- [ ] Hackathon xCircle

**Métriques ciblées** :

- 1,000 utilisateurs actifs
- 100 cercles créés
- $500,000 TVL (Total Value Locked)

**Livrables** :

- ✅ Métriques atteintes
- ✅ Communauté active
- ✅ Couverture médiatique

---

## 🟠 Phase 4 : Expansion (Q4 2026 - Q1 2027)

### Objectif principal

**Scale et nouvelles fonctionnalités avancées**

### Milestone 4.1 : Fonctionnalités Avancées

#### 1. Prêts P2P (Peer-to-Peer)

**Concept** : Membres avec bonne réputation peuvent emprunter/prêter

```rust
Fonctionnalités :
├─ Demande de prêt (montant, durée, taux)
├─ Offres de prêt par autres membres
├─ Matching automatique
├─ Garantie via NFT réputation
├─ Remboursements automatiques
└─ Pénalités défaut
```

**Timeline** : 3 semaines

#### 2. Épargne Collective

**Concept** : Groupes épargnent pour projet commun

```rust
Fonctionnalités :
├─ Objectif d'épargne
├─ Contributions libres
├─ Atteinte objectif → déblocage
├─ Vote pour utilisation fonds
└─ Intérêts partagés
```

**Timeline** : 2 semaines

#### 3. Multi-Cercles par Utilisateur

Permettre aux utilisateurs de participer à plusieurs cercles simultanément

**Timeline** : 1 semaine

### Milestone 4.2 : Mobile App Native

**Développement apps** :

- [ ] iOS (React Native ou Flutter)
- [ ] Android (React Native ou Flutter)
- [ ] Notifications push
- [ ] Biometric auth
- [ ] Deep linking

**Features** :

- Toutes fonctionnalités web
- Scan QR code
- Contacts integration
- Notifications cycles

**Timeline** : 8 semaines

**Livrables** :

- ✅ App iOS sur App Store
- ✅ App Android sur Play Store

### Milestone 4.3 : Internationalization

**Multi-langues** :

- [ ] Français (par défaut)
- [ ] Anglais
- [ ] Espagnol
- [ ] Portugais
- [ ] Arabe (si marché africain)

**Localisation** :

- Traduction complète UI
- Documentation multi-langues
- Support communauté par région

**Timeline** : 3 semaines

### Milestone 4.4 : Analytics & Insights

**Dashboard avancé** :

- [ ] Statistiques personnelles
- [ ] Performance cercles
- [ ] Comparaisons (benchmarks)
- [ ] Prédictions (ML ?)
- [ ] Rapports exportables (PDF)

**Métriques globales** :

- TVL par région
- Nombre cercles actifs
- Taux de succès
- Volume transactions

**Timeline** : 2 semaines

---

## 🔴 Phase 5 : Écosystème (2027+)

### Vision long-terme

#### 1. Bridge Multi-Chaînes

Expansion sur Ethereum, BSC, Polygon, etc.

#### 2. Assurance Décentralisée

Couverture automatique défauts via pool d'assurance

#### 3. Investissement Collectif

Cercles investissent ensemble (DeFi, NFTs, Real Estate)

#### 4. Propriété Fractionnée

Acquisition immobilier via DAO

#### 5. SDK pour Développeurs

API et SDK pour intégrations tierces

---

## 📊 Métriques de Succès

### Phase 1 (Fondations)

- ✅ MVP déployé Devnet
- ✅ Tests >80% coverage
- ✅ Documentation complète

### Phase 2 (Beta)

- ✅ 50 early adopters
- ✅ 10+ cercles testés
- ✅ 100+ transactions

### Phase 3 (Mainnet)

- ✅ Audit externe passé
- ✅ 1,000 utilisateurs
- ✅ $500k TVL

### Phase 4 (Expansion)

- ✅ 10,000 utilisateurs
- ✅ $5M TVL
- ✅ Apps mobiles publiées

### Phase 5 (Écosystème)

- ✅ 100,000+ utilisateurs
- ✅ $50M+ TVL
- ✅ Multi-chaînes actif

---

## 🎯 Prochaines Actions Immédiates

### Cette semaine :

1. ✅ Structure projet complète
2. ✅ Documentation de base

3. [ ] Setup environnement développement
4. [ ] Premier smart contract (CircleManager structure)

### La semaine prochaine :

1. [ ] Implémenter logique création cercle
2. [ ] Tests unitaires CircleManager
3. [ ] Setup dApp React

### Ce mois :

1. [ ] CircleManager contract complet
2. [ ] Token contract
3. [ ] dApp MVP

---

**Ce document est vivant et sera mis à jour régulièrement selon les progrès et les retours communauté.**

**Dernière révision** : Octobre 2025
**Prochaine révision** : Décembre 2025
