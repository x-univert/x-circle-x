# Circle Manager Smart Contract

Contract intelligent pour la gestion des cercles d'épargne rotative (ROSCA) sur MultiversX.

## Description

Ce contrat permet de :
- ✅ Créer des cercles d'épargne avec paramètres personnalisés
- ✅ Voter pour l'admission de nouveaux membres (unanimité requise)
- ✅ Gérer les contributions automatiques
- ✅ Distribuer les fonds de manière rotative
- ✅ Prélever des frais pour la trésorerie DAO (3%)

## Endpoints Principaux

### createCircle
Crée un nouveau cercle d'épargne.

**Paramètres:**
- `contribution_amount: BigUint` - Montant par cycle en EGLD
- `cycle_duration: u64` - Durée d'un cycle en secondes (minimum 1 jour)
- `max_members: u32` - Nombre max de membres (3-50)

**Retourne:** ID du cercle créé

```rust
createCircle(
    BigUint::from(1000000000000000000u64), // 1 EGLD
    2592000u64,                              // 30 jours
    10u32                                    // 10 membres max
)
```

### requestMembership
Demande à rejoindre un cercle.

**Paramètres:**
- `circle_id: u64` - ID du cercle

### voteForMember
Vote pour ou contre un candidat.

**Paramètres:**
- `circle_id: u64` - ID du cercle
- `candidate: Address` - Adresse du candidat
- `approve: bool` - true = oui, false = non

### contribute
Contribue au cycle actuel (payable).

**Paramètres:**
- `circle_id: u64` - ID du cercle

**Payment:** Montant EGLD égal à `contribution_amount`

## View Functions (Lecture seule)

### getCircle
Récupère les informations complètes d'un cercle.

### getNextCircleId
Retourne le prochain ID de cercle disponible.

### getTreasuryBalance
Retourne le solde actuel de la trésorerie.

### getProtocolFee
Retourne le pourcentage de frais (en basis points, 300 = 3%).

## Build & Deploy

### Prérequis
```bash
# Installer mxpy
pip3 install multiversx-sdk-cli --upgrade

# Vérifier l'installation
mxpy --version
```

### Compiler le contrat
```bash
cd contracts/circle-manager
mxpy contract build
```

Le fichier `.wasm` sera généré dans `output/circle-manager.wasm`

### Tester localement
```bash
# Tests unitaires
cargo test
```

### Déployer sur Devnet
```bash
# Créer un wallet de test (une seule fois)
mxpy wallet derive ./wallet-dev.pem

# Obtenir des tokens test
# Aller sur https://devnet-wallet.multiversx.com et demander des EGLD

# Déployer
mxpy --verbose contract deploy \
    --bytecode=output/circle-manager.wasm \
    --pem=wallet-dev.pem \
    --gas-limit=60000000 \
    --proxy=https://devnet-gateway.multiversx.com \
    --recall-nonce \
    --send
```

### Interagir avec le contrat
```bash
# Créer un cercle
mxpy contract call <CONTRACT_ADDRESS> \
    --pem=wallet-dev.pem \
    --function=createCircle \
    --arguments 1000000000000000000 2592000 10 \
    --gas-limit=10000000 \
    --proxy=https://devnet-gateway.multiversx.com \
    --recall-nonce \
    --send

# Query (lecture)
mxpy contract query <CONTRACT_ADDRESS> \
    --function=getCircle \
    --arguments 1 \
    --proxy=https://devnet-gateway.multiversx.com
```

## Structure de données

### Circle
```rust
pub struct Circle {
    pub id: u64,
    pub creator: Address,
    pub members: Vec<Address>,
    pub contribution_amount: BigUint,
    pub cycle_duration: u64,
    pub max_members: u32,
    pub current_cycle: u32,
    pub rotation_order: Vec<Address>,
    pub cycle_start_timestamp: u64,
    pub status: CircleStatus,
    pub current_contributions: Vec<Address>,
}
```

### CircleStatus
```rust
pub enum CircleStatus {
    Forming,    // En formation
    Active,     // Actif
    Completed,  // Complété
    Cancelled,  // Annulé
}
```

## Events (Événements)

Tous les événements émis par le contrat :

- `circleCreated` - Nouveau cercle créé
- `membershipRequested` - Demande d'adhésion
- `voteCast` - Vote enregistré
- `memberApproved` - Membre approuvé
- `memberRejected` - Membre rejeté
- `circleStarted` - Cercle démarré (nombre max atteint)
- `contributionMade` - Contribution reçue
- `fundsDistributed` - Fonds distribués au bénéficiaire
- `circleCompleted` - Tous les cycles terminés

## Tests

Les tests couvrent :
- ✅ Création de cercle valide
- ✅ Validations des paramètres
- ✅ Flux complet d'admission membre
- ✅ Vote unanime requis
- ✅ Contributions et distributions
- ✅ Calcul des frais
- ✅ Complétion du cercle

```bash
cargo test
```

## Sécurité

### Validations
- Montants > 0
- Nombre de membres entre 3 et 50
- Durée cycle minimum 1 jour
- Vérification membre avant actions
- Protection double contribution
- Vérification paiements

### À venir (prochaines versions)
- [ ] Pénalités pour contributions tardives
- [ ] Pause d'urgence (circuit breaker)
- [ ] Timelock pour changements critiques
- [ ] Multi-signature pour admin
- [ ] Assurance pool pour défauts

## Licence

MIT
