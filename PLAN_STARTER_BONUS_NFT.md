# Plan d'Implementation: Starter Bonus + NFT Evolutif

## Vue d'ensemble

Ce plan couvre deux fonctionnalites majeures:
1. **Starter Bonus**: Recompense bonus pour celui qui demarre le cycle quotidien
2. **NFT Evolutif**: Collection NFT dynamique basee sur les cycles reussis

---

## Partie 1: Starter Bonus (Cycle Initiator Reward)

### 1.1 Concept
Celui qui appelle `startDailyCycle()` recoit un bonus supplementaire en XCIRCLEX lorsque le cycle se termine avec succes.

### 1.2 Modifications Smart Contract (circle-of-life-center)

#### Nouveaux Storage Mappers:
```rust
/// Adresse de celui qui a demarre le cycle actuel
#[storage_mapper("cycle_starter")]
fn cycle_starter(&self) -> SingleValueMapper<ManagedAddress>;

/// Bonus percentage pour le starter (ex: 1000 = 10%, base 10000)
#[storage_mapper("starter_bonus_percentage")]
fn starter_bonus_percentage(&self) -> SingleValueMapper<u64>;
```

#### Modification de `start_daily_cycle()`:
```rust
// Apres la ligne: let balance = self.blockchain().get_sc_balance(...)
let caller = self.blockchain().get_caller();
self.cycle_starter().set(&caller);

// Emettre un evenement
self.cycle_starter_event(&caller, current_day);
```

#### Modification de `execute_transfer()` (quand cycle complet):
```rust
// Dans le bloc if next_index == 0 (cycle complet)
// Apres la distribution des recompenses normales

// Bonus pour le starter
if !self.cycle_starter().is_empty() {
    let starter = self.cycle_starter().get();
    let bonus_percentage = self.starter_bonus_percentage().get();

    if bonus_percentage > 0 && !self.member_contract(&starter).is_empty() {
        let starter_sc = self.member_contract(&starter).get();
        let starter_bonus = &reward_per_cycle * bonus_percentage / 10000u64;

        // Verifier qu'il y a assez dans le pool
        let pool = self.rewards_pool().get();
        if pool >= starter_bonus {
            let current_pending = self.pending_rewards(&starter_sc).get();
            self.pending_rewards(&starter_sc).set(&(current_pending + &starter_bonus));
            self.rewards_pool().set(&(pool - &starter_bonus));
            self.starter_bonus_distributed_event(&starter, &starter_bonus);
        }
    }
    self.cycle_starter().clear();
}
```

#### Nouvel endpoint Admin:
```rust
#[endpoint(setStarterBonusPercentage)]
fn set_starter_bonus_percentage(&self, percentage: u64) {
    self.require_owner();
    require!(percentage <= 5000, "Bonus max 50%"); // Limite a 50%
    self.starter_bonus_percentage().set(percentage);
}
```

#### Nouveaux Events:
```rust
#[event("cycle_starter")]
fn cycle_starter_event(&self, #[indexed] starter: &ManagedAddress, #[indexed] day: u64);

#[event("starter_bonus_distributed")]
fn starter_bonus_distributed_event(&self, #[indexed] starter: &ManagedAddress, amount: &BigUint);
```

#### Nouvelle View:
```rust
#[view(getStarterBonusInfo)]
fn get_starter_bonus_info(&self) -> MultiValue3<u64, OptionalValue<ManagedAddress>, BigUint> {
    let percentage = self.starter_bonus_percentage().get();
    let starter = if self.cycle_starter().is_empty() {
        OptionalValue::None
    } else {
        OptionalValue::Some(self.cycle_starter().get())
    };
    let potential_bonus = if !self.reward_per_cycle().is_empty() {
        &self.reward_per_cycle().get() * percentage / 10000u64
    } else {
        BigUint::zero()
    };
    (percentage, starter, potential_bonus).into()
}
```

### 1.3 Modifications Frontend

#### circleOfLifeService.ts:
- Ajouter `setStarterBonusPercentage()` pour l'admin
- Ajouter `getStarterBonusInfo()` view

#### CircleOfLife.tsx:
- Afficher qui a demarre le cycle actuel
- Afficher le bonus potentiel pour le starter
- Indiquer dans le popup si l'utilisateur est le starter du cycle

---

## Partie 2: NFT Evolutif - Cercle de Reputation

### 2.1 Architecture

Nouveau smart contract: `xcirclex-nft` (SFT Collection)

### 2.2 Structure du Smart Contract NFT

```rust
#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// XCIRCLEX NFT - Cercle de Reputation Evolutif
#[multiversx_sc::contract]
pub trait XCirclexNft {

    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(&caller);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - SETUP COLLECTION
    // ═══════════════════════════════════════════════════════════════

    /// Issue la collection NFT (SFT)
    #[payable("EGLD")]
    #[endpoint(issueCollection)]
    fn issue_collection(&self, collection_name: ManagedBuffer, collection_ticker: ManagedBuffer);

    /// Configure l'adresse du Circle of Life Center
    #[endpoint(setCircleOfLifeContract)]
    fn set_circle_of_life_contract(&self, address: ManagedAddress);

    // ═══════════════════════════════════════════════════════════════
    // MINT NFT
    // ═══════════════════════════════════════════════════════════════

    /// Mint un NFT pour un membre du Cercle de Vie
    /// Appele par Circle of Life quand quelqu'un rejoint
    #[endpoint(mintForMember)]
    fn mint_for_member(&self, member: ManagedAddress) -> u64;

    // ═══════════════════════════════════════════════════════════════
    // UPDATE NFT (Dynamic)
    // ═══════════════════════════════════════════════════════════════

    /// Met a jour les attributs du NFT base sur les cycles completes
    /// Peut etre appele par n'importe qui (permissionless)
    #[endpoint(updateNftAttributes)]
    fn update_nft_attributes(&self, member: ManagedAddress);

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("nft_token_id")]
    fn nft_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("circle_of_life_contract")]
    fn circle_of_life_contract(&self) -> SingleValueMapper<ManagedAddress>;

    /// Nonce du NFT pour chaque membre
    #[storage_mapper("member_nft_nonce")]
    fn member_nft_nonce(&self, member: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Dernier niveau enregistre pour le NFT
    #[storage_mapper("nft_level")]
    fn nft_level(&self, nonce: u64) -> SingleValueMapper<u8>;
}
```

### 2.3 Structure des Attributs NFT

```rust
#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct NftAttributes<M: ManagedTypeApi> {
    /// Nombre de cycles completes
    pub cycles_completed: u64,
    /// Niveau du NFT (0-12)
    pub level: u8,
    /// Nombre de points peripheriques (0-12)
    pub peripheral_points: u8,
    /// Rarete (Commun, PeuCommun, Rare, Epique, Legendaire, Mythique, CercleParfait)
    pub rarity: u8,
    /// Timestamp de creation
    pub created_at: u64,
    /// Adresse du proprietaire original
    pub original_owner: ManagedAddress<M>,
}
```

### 2.4 Niveaux et Rarete

| Cycles | Niveau | Points | Rarete | Code |
|--------|--------|--------|--------|------|
| 0-29   | 0      | 0      | Commun | 0    |
| 30+    | 1      | 1      | Peu commun | 1 |
| 60+    | 2      | 2      | Peu commun | 1 |
| 90+    | 3      | 3      | Rare | 2 |
| 120+   | 4      | 4      | Rare | 2 |
| 150+   | 5      | 5      | Epique | 3 |
| 180+   | 6      | 6      | Epique | 3 |
| 210+   | 7      | 7      | Legendaire | 4 |
| 240+   | 8      | 8      | Legendaire | 4 |
| 270+   | 9      | 9      | Mythique | 5 |
| 300+   | 10     | 10     | Mythique | 5 |
| 330+   | 11     | 11     | Transcendant | 6 |
| 360+   | 12     | 12     | CERCLE PARFAIT | 7 |

### 2.5 Logique de calcul du niveau

```rust
fn calculate_level(&self, cycles: u64) -> (u8, u8, u8) {
    // Retourne (level, points, rarity)
    let level = if cycles >= 360 { 12 }
        else if cycles >= 330 { 11 }
        else if cycles >= 300 { 10 }
        else if cycles >= 270 { 9 }
        else if cycles >= 240 { 8 }
        else if cycles >= 210 { 7 }
        else if cycles >= 180 { 6 }
        else if cycles >= 150 { 5 }
        else if cycles >= 120 { 4 }
        else if cycles >= 90 { 3 }
        else if cycles >= 60 { 2 }
        else if cycles >= 30 { 1 }
        else { 0 };

    let points = level;

    let rarity = match level {
        0 => 0,      // Commun
        1..=2 => 1,  // Peu commun
        3..=4 => 2,  // Rare
        5..=6 => 3,  // Epique
        7..=8 => 4,  // Legendaire
        9..=10 => 5, // Mythique
        11 => 6,     // Transcendant
        12 => 7,     // Cercle Parfait
        _ => 0,
    };

    (level, points, rarity)
}
```

### 2.6 Integration avec Circle of Life

#### Option A: Mint automatique lors du join
Dans `joinCircle()` du Circle of Life:
```rust
// Apres creation du SC peripherique
// Appeler le contrat NFT pour mint
if !self.nft_contract().is_empty() {
    let nft_contract = self.nft_contract().get();
    let _: IgnoreValue = self.nft_proxy(nft_contract)
        .mint_for_member(caller.clone())
        .execute_on_dest_context();
}
```

#### Option B: Claim manuel par l'utilisateur
Endpoint dans le contrat NFT:
```rust
#[endpoint(claimNft)]
fn claim_nft(&self) -> u64 {
    let caller = self.blockchain().get_caller();
    // Verifier que le caller est membre du Circle of Life
    // Mint le NFT
}
```

### 2.7 Bonus NFT (Integration Staking)

Le contrat Staking peut verifier le niveau NFT pour appliquer des bonus:

```rust
/// Dans xcirclex-staking
fn get_nft_bonus_multiplier(&self, member: &ManagedAddress) -> u64 {
    // Appeler le contrat NFT pour obtenir le niveau
    // Retourner le multiplicateur de bonus
    // 0: 0%, 1-2: +5%, 3-4: +10%, 5-6: +15%, 7-8: +25%, 9-10: +35%, 11: +40%, 12: +50%
}
```

---

## Partie 3: Structure des Fichiers

### Nouveaux fichiers a creer:

```
contracts/
  xcirclex-nft/
    Cargo.toml
    multiversx.json
    src/
      lib.rs
      attributes.rs
    meta/
      Cargo.toml
      src/main.rs
    wasm/
      Cargo.toml
      src/lib.rs
```

### Fichiers a modifier:

```
contracts/circle-of-life-center/src/lib.rs  (Starter bonus + integration NFT)
frontend/src/services/circleOfLifeService.ts (Nouvelles fonctions)
frontend/src/pages/CircleOfLife.tsx (Affichage starter bonus)
frontend/src/components/tabs/NftTab.tsx (NOUVEAU - Affichage NFT)
```

---

## Partie 4: Plan d'Execution

### Phase 1: Starter Bonus (Priorite haute)
1. [ ] Modifier circle-of-life-center pour ajouter le starter bonus
2. [ ] Compiler et tester le smart contract
3. [ ] Upgrade le contrat sur devnet
4. [ ] Mettre a jour le frontend

### Phase 2: NFT Smart Contract
1. [ ] Creer la structure du contrat xcirclex-nft
2. [ ] Implementer les fonctions de mint et update
3. [ ] Compiler et deployer sur devnet
4. [ ] Configurer l'integration avec Circle of Life

### Phase 3: Frontend NFT
1. [ ] Creer NftTab.tsx pour afficher les NFTs
2. [ ] Integrer la visualisation SVG dynamique
3. [ ] Ajouter les animations des points peripheriques

### Phase 4: Bonus Integration
1. [ ] Modifier Staking pour lire le niveau NFT
2. [ ] Modifier DAO pour les bonus de vote
3. [ ] Tests complets

---

## Estimation de Complexite

| Tache | Complexite | Fichiers |
|-------|------------|----------|
| Starter Bonus SC | Moyenne | 1 |
| Starter Bonus Frontend | Faible | 2 |
| NFT Smart Contract | Elevee | 5+ |
| NFT Frontend | Elevee | 3+ |
| Integration Staking/DAO | Moyenne | 2 |

---

## Questions a Clarifier

1. Le NFT doit-il etre mint automatiquement lors du join ou claim manuel?
2. Le NFT peut-il etre transfere/vendu?
3. Les bonus de Staking doivent-ils etre calcules on-chain ou off-chain?
4. Faut-il un marketplace NFT integre?
