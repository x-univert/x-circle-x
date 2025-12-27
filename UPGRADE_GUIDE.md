# 🔄 Guide des Upgrades - Smart Contracts X-CIRCLE-X

## ✅ Fonction Upgrade Ajoutée

Tous les contrats X-CIRCLE-X ont maintenant la fonction `#[upgrade]` comme DEMOCRATIX, permettant de mettre à jour le code du contrat sans perdre les données stockées.

---

## 📋 Status des Contrats

| Contract | Fonction #[upgrade] | Type | Status |
|----------|---------------------|------|--------|
| **circle-manager** | ✅ Ajoutée | Vide | Prêt |
| **test-adder** | ✅ Existait déjà | Appelle init() | Prêt |

---

## 🔍 Implémentations

### Circle Manager

```rust
/// Fonction appelée lors de l'upgrade du contrat
#[upgrade]
fn upgrade(&self) {}
```

**Type:** Upgrade vide (comme DEMOCRATIX)
**Utilité:** Permet de mettre à jour le code du contrat sans réinitialiser les données
**Note:** Les données dans le storage (circles, members, treasury) sont préservées

---

### Test Adder

```rust
#[upgrade]
fn upgrade(&self, initial_value: BigUint) {
    self.init(initial_value);
}
```

**Type:** Upgrade avec réinitialisation
**Utilité:** Permet de changer la valeur initiale lors d'un upgrade
**Note:** Appelle la fonction init() pour réinitialiser la somme

---

## 🚀 Comment Upgrader un Contrat

### 1. Prérequis

- Avoir déployé le contrat initialement
- Avoir l'adresse du contrat déployé
- Avoir le PEM du wallet qui a déployé le contrat (owner)
- Avoir compilé la nouvelle version du code

### 2. Compiler la Nouvelle Version

```bash
cd contracts/circle-manager
sc-meta all build

# Optionnel: Optimiser
wasm-opt -Oz --enable-bulk-memory --enable-sign-ext --enable-mutable-globals \
  output/circle-manager.wasm -o output/circle-manager-v2.wasm
```

### 3. Upgrader sur Devnet

```bash
mxpy contract upgrade erd1qqqqqqqqqqqqqpgq... \
  --bytecode=output/circle-manager.wasm \
  --pem=~/wallet.pem \
  --gas-limit=100000000 \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com \
  --recall-nonce
```

**Remplacer** `erd1qqqqqqqqqqqqqpgq...` par l'adresse réelle du contrat déployé.

### 4. Upgrader sur Mainnet

```bash
mxpy contract upgrade erd1qqqqqqqqqqqqqpgq... \
  --bytecode=output/circle-manager.wasm \
  --pem=~/wallet.pem \
  --gas-limit=100000000 \
  --chain=1 \
  --proxy=https://gateway.multiversx.com \
  --recall-nonce
```

---

## 🔐 Sécurité des Upgrades

### Circle Manager

**Données Préservées lors de l'upgrade:**
- ✅ Tous les cercles créés (`circles` storage mapper)
- ✅ Tous les membres de chaque cercle (`circle_members`)
- ✅ Toutes les contributions par membre et cycle (`contributions`)
- ✅ L'état des contributions (`has_contributed`)
- ✅ Les demandes d'adhésion en attente (`pending_members`)
- ✅ Les votes pour les candidats (`member_votes`)
- ✅ Le compteur de cercles (`circle_count`)
- ✅ Le solde de la treasury (`treasury_balance`)

**Ce qui peut être modifié:**
- ✅ Logique des fonctions (fix bugs, optimisations)
- ✅ Ajouter de nouvelles fonctions
- ✅ Modifier les calculs (frais, distribution, etc.)
- ✅ Ajouter de nouveaux événements

**Ce qui NE PEUT PAS être modifié:**
- ❌ Structure des storage mappers existants
- ❌ Types des données stockées (incompatibilité)

---

## 📊 Comparaison avec DEMOCRATIX

### Similitudes ✅

| Aspect | DEMOCRATIX | X-CIRCLE-X |
|--------|-----------|------------|
| Fonction #[upgrade] | ✓ Vide | ✓ Vide (circle-manager) |
| Préservation storage | ✓ | ✓ |
| MultiversX SC v0.62 | ✓ | ✓ |
| Build avec sc-meta | ✓ | ✓ |

### Différences

| Aspect | DEMOCRATIX | X-CIRCLE-X |
|--------|-----------|------------|
| Admin global | ✓ (budget.admin) | Créateur par cercle |
| Fonctions admin | Validation, allocation, etc. | Distribution automatique |
| Permissions | require!(caller == admin) | Logique métier + votes |

---

## 🛡️ Bonnes Pratiques

### 1. Tester avant l'Upgrade

```bash
# Toujours tester sur Devnet d'abord
mxpy contract upgrade <devnet-address> \
  --bytecode=output/circle-manager.wasm \
  --pem=~/wallet-test.pem \
  --chain=D \
  --proxy=https://devnet-gateway.multiversx.com
```

### 2. Versionner les Upgrades

```bash
# Conserver les versions précédentes
cp output/circle-manager.wasm output/circle-manager-v1.0.0.wasm
sc-meta all build
cp output/circle-manager.wasm output/circle-manager-v1.1.0.wasm
```

### 3. Documenter les Changements

Créer un CHANGELOG.md pour chaque upgrade :

```markdown
# v1.1.0 - 2025-11-16

## Changements
- Fix du calcul des frais (3% au lieu de 5%)
- Ajout de l'événement `cycleCompleted`
- Optimisation du gaz pour `distributeFunds`

## Migration
Aucune action requise - upgrade automatique
```

### 4. Communiquer avec les Utilisateurs

Avant un upgrade important :
- Annoncer à l'avance
- Expliquer les changements
- Tester en profondeur sur Devnet
- Avoir un plan de rollback si nécessaire

---

## 🔄 Scénarios d'Upgrade Typiques

### Scénario 1: Fix de Bug Simple

**Problème:** Calcul des frais incorrect
**Solution:**
1. Corriger le code dans `src/lib.rs`
2. Compiler
3. Upgrader le contrat
4. ✅ Aucune perte de données

### Scénario 2: Nouvelle Fonctionnalité

**Ajout:** Fonction pour retirer des fonds d'urgence
**Solution:**
1. Ajouter la nouvelle fonction `#[endpoint]`
2. Compiler
3. Upgrader le contrat
4. ✅ Les anciennes fonctions continuent de marcher
5. ✅ Nouvelle fonction disponible immédiatement

### Scénario 3: Modification du Storage ⚠️

**Attention:** Modifier la structure `Circle` est DANGEREUX

**Exemple SAFE:**
```rust
// AVANT
pub struct Circle<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    // ... autres champs
}

// APRÈS - Ajouter un champ OPTIONNEL à la fin
pub struct Circle<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    // ... autres champs existants
    pub new_optional_field: Option<u64>, // OK à la fin
}
```

**Exemple DANGEREUX ❌:**
```rust
// NE PAS FAIRE - Changer l'ordre ou le type
pub struct Circle<M: ManagedTypeApi> {
    pub creator: ManagedAddress<M>, // ❌ Ordre changé
    pub id: u32, // ❌ Type changé de u64 à u32
}
```

---

## 📚 Ressources

- [MultiversX Upgradeable Contracts](https://docs.multiversx.com/developers/developer-reference/contract-upgrades/)
- [Storage Persistence](https://docs.multiversx.com/developers/best-practices/storage-mappers/)
- [mxpy Upgrade Command](https://docs.multiversx.com/sdk-and-tools/sdk-py/mxpy-cli/)

---

## ✅ Checklist avant Upgrade Production

- [ ] Testé sur Devnet pendant au moins 1 semaine
- [ ] Tous les tests passent
- [ ] Audit de sécurité si changements majeurs
- [ ] CHANGELOG rédigé
- [ ] Backup des données critiques si possible
- [ ] Communication aux utilisateurs
- [ ] Plan de rollback préparé
- [ ] Gas estimé et suffisant
- [ ] Version du code taggée dans Git

---

**✅ Les contrats X-CIRCLE-X sont maintenant upgradables comme DEMOCRATIX !**

*Dernière mise à jour: 16 Novembre 2025*
