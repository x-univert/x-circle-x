# X-CIRCLE-X : Cercle de Vie - Architecture des Smart Contracts Circulaires

## Vision Globale

Le **Cercle de Vie** est une nouvelle fonctionnalite de X-CIRCLE-X qui cree un ecosysteme de smart contracts interconnectes formant un cercle autour d'un smart contract central (SC0). L'argent transite quotidiennement de maniere circulaire entre tous les smart contracts, creant un flux perpetuel qui necessite la participation active de tous les membres.

```
                    ┌─────────┐
                    │   SC3   │
                   /│ Owner:  │\
                  / │ SC0+U3  │ \
                 /  └────┬────┘  \
                ↓        │        ↑
         ┌─────────┐     │     ┌─────────┐
         │   SC2   │     │     │   SC4   │
         │ Owner:  │     │     │ Owner:  │
         │ SC0+U2  │     │     │ SC0+U4  │
         └────┬────┘     │     └────┬────┘
              ↓          │          ↑
               \    ┌────┴────┐    /
                \   │   SC0   │   /
                 \  │ CENTRAL │  /
                  \ │ Master  │ /
                   \└────┬────┘/
                    ↓    │    ↑
              ┌─────────┐│┌─────────┐
              │   SC1   │││   SC5   │
              │ Owner:  │││ Owner:  │
              │ SC0+U1  │││ SC0+U5  │
              └─────────┘│└─────────┘
                         │
            FLUX CIRCULAIRE QUOTIDIEN:
         SC0 → SC1 → SC2 → SC3 → SC4 → SC5 → SC0
```

---

## 1. Smart Contract 0 (SC0) - Le Centre du Cercle

### Role
SC0 est le **coeur du systeme**, le smart contract "maitre" qui:
- Cree tous les autres smart contracts a la demande des utilisateurs
- Est **co-proprietaire** de tous les smart contracts crees
- Orchestre et **signe toutes les transactions circulaires**
- Verifie que les fonds transitent uniquement vers des smart contracts autorises
- Collecte les frais de creation (1 EGLD + gas)

### Fonctionnalites

```rust
#[multiversx_sc::contract]
pub trait CircleOfLifeCenter {

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    /// Liste ordonnee des smart contracts du cercle
    #[storage_mapper("circle_contracts")]
    fn circle_contracts(&self) -> VecMapper<ManagedAddress>;

    /// Mapping: adresse SC -> proprietaire co-owner
    #[storage_mapper("contract_owner")]
    fn contract_owner(&self, sc_address: &ManagedAddress) -> SingleValueMapper<ManagedAddress>;

    /// Index du prochain SC a recevoir les fonds dans le cycle
    #[storage_mapper("current_cycle_index")]
    fn current_cycle_index(&self) -> SingleValueMapper<usize>;

    /// Montant qui transite dans le cercle
    #[storage_mapper("circulation_amount")]
    fn circulation_amount(&self) -> SingleValueMapper<BigUint>;

    /// Timestamp du dernier cycle
    #[storage_mapper("last_cycle_timestamp")]
    fn last_cycle_timestamp(&self) -> SingleValueMapper<u64>;

    /// Signatures collectees pour le cycle en cours
    #[storage_mapper("cycle_signatures")]
    fn cycle_signatures(&self, cycle_id: u64) -> UnorderedSetMapper<ManagedAddress>;

    /// Frais de creation d'un smart contract (1 EGLD)
    #[storage_mapper("creation_fee")]
    fn creation_fee(&self) -> SingleValueMapper<BigUint>;

    // ═══════════════════════════════════════════════════════════════
    // CREATION DE SMART CONTRACTS
    // ═══════════════════════════════════════════════════════════════

    /// Cree un nouveau smart contract peripherique
    /// L'utilisateur paie 1 EGLD + gas
    /// SC0 devient co-proprietaire avec l'utilisateur
    #[payable("EGLD")]
    #[endpoint(createCircleContract)]
    fn create_circle_contract(&self) -> ManagedAddress {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value();

        // Verifier le paiement (1 EGLD minimum)
        let fee = self.creation_fee().get();
        require!(payment >= fee, "Paiement insuffisant: 1 EGLD requis");

        // Deployer le nouveau smart contract
        let new_sc_address = self.deploy_peripheral_contract(&caller);

        // Enregistrer le nouveau SC dans le cercle
        self.circle_contracts().push(&new_sc_address);
        self.contract_owner(&new_sc_address).set(&caller);

        // Emettre l'evenement
        self.contract_created_event(&new_sc_address, &caller);

        new_sc_address
    }

    /// Deploie un smart contract peripherique
    fn deploy_peripheral_contract(&self, co_owner: &ManagedAddress) -> ManagedAddress {
        // Code de deploiement du SC peripherique
        // SC0 (self) + co_owner sont les 2 proprietaires
        // ...
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTIONS CIRCULAIRES
    // ═══════════════════════════════════════════════════════════════

    /// Initie le cycle quotidien de transaction circulaire
    /// Envoie les fonds de SC0 vers SC1
    #[endpoint(startDailyCycle)]
    fn start_daily_cycle(&self) {
        let current_time = self.blockchain().get_block_timestamp();
        let last_cycle = self.last_cycle_timestamp().get();

        // Verifier qu'un jour s'est ecoule
        require!(
            current_time >= last_cycle + 86400, // 24h en secondes
            "Cycle deja effectue aujourd'hui"
        );

        let contracts = self.circle_contracts();
        require!(!contracts.is_empty(), "Aucun smart contract dans le cercle");

        // Envoyer au premier SC du cercle
        let first_sc = contracts.get(1); // Index 1 = SC1
        let amount = self.circulation_amount().get();

        self.send().direct_egld(&first_sc, &amount);

        self.current_cycle_index().set(1);
        self.last_cycle_timestamp().set(current_time);

        self.cycle_started_event(current_time, &amount);
    }

    /// Signe et autorise le transfert vers le prochain SC
    /// Doit etre appele par SC0 + le co-owner du SC actuel
    #[endpoint(signAndForward)]
    fn sign_and_forward(&self, from_sc: ManagedAddress) {
        let caller = self.blockchain().get_caller();
        let current_index = self.current_cycle_index().get();
        let contracts = self.circle_contracts();

        // Verifier que from_sc est bien le SC actuel du cycle
        let expected_sc = contracts.get(current_index);
        require!(from_sc == expected_sc, "Ce n'est pas le tour de ce SC");

        // Verifier que le caller est le co-owner de from_sc
        let co_owner = self.contract_owner(&from_sc).get();
        require!(caller == co_owner, "Seul le co-proprietaire peut signer");

        // Determiner le prochain SC (ou retour a SC0)
        let next_index = if current_index >= contracts.len() {
            0 // Retour a SC0
        } else {
            current_index + 1
        };

        let next_sc = if next_index == 0 {
            self.blockchain().get_sc_address() // SC0
        } else {
            contracts.get(next_index)
        };

        // Appeler le SC peripherique pour transferer
        self.forward_funds(&from_sc, &next_sc);

        self.current_cycle_index().set(next_index);

        self.funds_forwarded_event(&from_sc, &next_sc);
    }

    /// Appelle le SC peripherique pour transferer les fonds
    fn forward_funds(&self, from_sc: &ManagedAddress, to_sc: &ManagedAddress) {
        // SC0 signe la transaction en tant que co-owner
        // Le SC peripherique verifie la signature de SC0
        // ...
    }

    // ═══════════════════════════════════════════════════════════════
    // QUORUM & GOUVERNANCE
    // ═══════════════════════════════════════════════════════════════

    /// Verifie si toutes les signatures sont collectees pour un cycle
    #[view(isCycleComplete)]
    fn is_cycle_complete(&self, cycle_id: u64) -> bool {
        let required = self.circle_contracts().len();
        let collected = self.cycle_signatures(cycle_id).len();
        collected >= required
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("contract_created")]
    fn contract_created_event(&self, #[indexed] sc_address: &ManagedAddress, #[indexed] owner: &ManagedAddress);

    #[event("cycle_started")]
    fn cycle_started_event(&self, #[indexed] timestamp: u64, amount: &BigUint);

    #[event("funds_forwarded")]
    fn funds_forwarded_event(&self, #[indexed] from: &ManagedAddress, #[indexed] to: &ManagedAddress);
}
```

---

## 2. Smart Contracts Peripheriques (SC1, SC2, SC3...)

### Role
Chaque SC peripherique est un "point" sur le cercle qui:
- A **2 proprietaires**: SC0 (toujours) + l'utilisateur createur
- Recoit et transmet les fonds dans le cycle circulaire
- Peut effectuer des actions (envoyer tokens/NFTs) avec **quorum des 2 owners**
- Valide les transactions avec la signature de ses 2 proprietaires

### Fonctionnalites

```rust
#[multiversx_sc::contract]
pub trait CirclePeripheralContract {

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    /// Adresse du SC0 (toujours proprietaire)
    #[storage_mapper("master_contract")]
    fn master_contract(&self) -> SingleValueMapper<ManagedAddress>;

    /// Adresse du co-proprietaire (createur du SC)
    #[storage_mapper("co_owner")]
    fn co_owner(&self) -> SingleValueMapper<ManagedAddress>;

    /// Propositions d'actions en attente de quorum
    #[storage_mapper("pending_actions")]
    fn pending_actions(&self, action_id: u64) -> SingleValueMapper<Action<Self::Api>>;

    /// Signatures pour une action
    #[storage_mapper("action_signatures")]
    fn action_signatures(&self, action_id: u64) -> UnorderedSetMapper<ManagedAddress>;

    // ═══════════════════════════════════════════════════════════════
    // INITIALISATION
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self, master: ManagedAddress, co_owner: ManagedAddress) {
        self.master_contract().set(&master);
        self.co_owner().set(&co_owner);
    }

    // ═══════════════════════════════════════════════════════════════
    // RECEPTION & TRANSFERT DES FONDS CIRCULAIRES
    // ═══════════════════════════════════════════════════════════════

    /// Recoit les fonds du cycle circulaire
    #[payable("EGLD")]
    #[endpoint(receiveCircleFunds)]
    fn receive_circle_funds(&self) {
        let caller = self.blockchain().get_caller();
        let master = self.master_contract().get();

        // Seul SC0 ou un autre SC du cercle peut envoyer
        // La verification se fait via SC0
        require!(
            self.is_authorized_sender(&caller),
            "Expediteur non autorise"
        );

        self.funds_received_event(&caller);
    }

    /// Transfere les fonds au prochain SC du cercle
    /// Necessite la signature de SC0 + co_owner
    #[endpoint(forwardToNext)]
    fn forward_to_next(&self, next_sc: ManagedAddress, amount: BigUint) {
        let caller = self.blockchain().get_caller();

        // Verifier que c'est SC0 qui appelle (il a deja la signature du co_owner)
        let master = self.master_contract().get();
        require!(caller == master, "Seul SC0 peut initier le transfert");

        // Verifier que next_sc est autorise (fait partie du cercle)
        // Cette verification est faite par SC0

        self.send().direct_egld(&next_sc, &amount);

        self.funds_sent_event(&next_sc, &amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIONS AVEC QUORUM (2/2)
    // ═══════════════════════════════════════════════════════════════

    /// Propose une action (envoyer tokens, NFTs, etc.)
    #[endpoint(proposeAction)]
    fn propose_action(&self, action: Action<Self::Api>) -> u64 {
        let caller = self.blockchain().get_caller();
        require!(self.is_owner(&caller), "Seuls les proprietaires peuvent proposer");

        let action_id = self.get_next_action_id();
        self.pending_actions(action_id).set(&action);
        self.action_signatures(action_id).insert(caller.clone());

        self.action_proposed_event(action_id, &caller);

        action_id
    }

    /// Signe une action proposee
    #[endpoint(signAction)]
    fn sign_action(&self, action_id: u64) {
        let caller = self.blockchain().get_caller();
        require!(self.is_owner(&caller), "Seuls les proprietaires peuvent signer");
        require!(!self.pending_actions(action_id).is_empty(), "Action inexistante");

        self.action_signatures(action_id).insert(caller.clone());

        // Si quorum atteint (2/2), executer l'action
        if self.action_signatures(action_id).len() >= 2 {
            let action = self.pending_actions(action_id).get();
            self.execute_action(action);
            self.pending_actions(action_id).clear();
        }

        self.action_signed_event(action_id, &caller);
    }

    /// Execute une action apres quorum
    fn execute_action(&self, action: Action<Self::Api>) {
        match action {
            Action::SendEgld { to, amount } => {
                self.send().direct_egld(&to, &amount);
            },
            Action::SendToken { to, token, amount } => {
                self.send().direct_esdt(&to, &token, 0, &amount);
            },
            Action::SendNft { to, token, nonce } => {
                self.send().direct_esdt(&to, &token, nonce, &BigUint::from(1u32));
            },
        }
    }

    /// Verifie si une adresse est proprietaire
    fn is_owner(&self, address: &ManagedAddress) -> bool {
        let master = self.master_contract().get();
        let co_owner = self.co_owner().get();
        *address == master || *address == co_owner
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("funds_received")]
    fn funds_received_event(&self, #[indexed] from: &ManagedAddress);

    #[event("funds_sent")]
    fn funds_sent_event(&self, #[indexed] to: &ManagedAddress, amount: &BigUint);

    #[event("action_proposed")]
    fn action_proposed_event(&self, #[indexed] action_id: u64, #[indexed] proposer: &ManagedAddress);

    #[event("action_signed")]
    fn action_signed_event(&self, #[indexed] action_id: u64, #[indexed] signer: &ManagedAddress);
}

/// Types d'actions possibles
#[derive(TopEncode, TopDecode, TypeAbi)]
pub enum Action<M: ManagedTypeApi> {
    SendEgld { to: ManagedAddress<M>, amount: BigUint<M> },
    SendToken { to: ManagedAddress<M>, token: TokenIdentifier<M>, amount: BigUint<M> },
    SendNft { to: ManagedAddress<M>, token: TokenIdentifier<M>, nonce: u64 },
}
```

---

## 3. Flux de Transaction Circulaire

### Cycle Quotidien

```
JOUR 1 - Cycle complet:
═══════════════════════════════════════════════════════════════

1. [SC0] startDailyCycle()
   └── Envoie 0.1 EGLD a SC1

2. [User1] signAndForward(SC1)
   └── SC0 verifie la signature de User1 (co-owner de SC1)
   └── SC1 envoie 0.1 EGLD a SC2

3. [User2] signAndForward(SC2)
   └── SC0 verifie la signature de User2 (co-owner de SC2)
   └── SC2 envoie 0.1 EGLD a SC3

4. [User3] signAndForward(SC3)
   └── SC0 verifie la signature de User3 (co-owner de SC3)
   └── SC3 envoie 0.1 EGLD a SC0 (retour au centre)

═══════════════════════════════════════════════════════════════
CYCLE COMPLETE ! Tous les membres ont participe.
═══════════════════════════════════════════════════════════════
```

### Diagramme de Sequence

```
┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐     ┌──────┐
│  SC0 │     │  SC1 │     │  SC2 │     │  SC3 │     │  SC0 │
└──┬───┘     └──┬───┘     └──┬───┘     └──┬───┘     └──┬───┘
   │            │            │            │            │
   │ 0.1 EGLD   │            │            │            │
   │───────────>│            │            │            │
   │            │            │            │            │
   │  User1     │            │            │            │
   │  signe     │            │            │            │
   │<───────────│            │            │            │
   │            │ 0.1 EGLD   │            │            │
   │            │───────────>│            │            │
   │            │            │            │            │
   │  User2     │            │            │            │
   │  signe     │            │            │            │
   │<───────────────────────│            │            │
   │            │            │ 0.1 EGLD   │            │
   │            │            │───────────>│            │
   │            │            │            │            │
   │  User3     │            │            │            │
   │  signe     │            │            │            │
   │<───────────────────────────────────│            │
   │            │            │            │ 0.1 EGLD   │
   │            │            │            │───────────>│
   │            │            │            │            │
   ▼            ▼            ▼            ▼            ▼
              CYCLE COMPLETE - RETOUR A SC0
```

---

## 4. Modele Economique

### Frais de Creation

| Element | Montant | Destinataire |
|---------|---------|--------------|
| Frais de creation | 1 EGLD | SC0 (tresorerie) |
| Gas de deploiement | ~0.05 EGLD | Reseau MultiversX |
| **Total** | **~1.05 EGLD** | - |

### Flux Circulaire

| Parametre | Valeur | Description |
|-----------|--------|-------------|
| Montant circulant | 0.1 EGLD | Ajustable par gouvernance |
| Frequence | 1x/jour | Cycle quotidien |
| Participation | Obligatoire | Tous doivent signer |

### Benefices pour les Participants

1. **Appartenance** : Faire partie d'un ecosysteme connecte
2. **Liquidite** : Flux quotidien de fonds
3. **Gouvernance** : Co-propriete avec SC0
4. **Multi-sig** : Securite renforcee (2/2 pour actions)

---

## 5. Securite

### Verifications SC0

```rust
// SC0 verifie TOUJOURS:
// 1. L'expediteur est un SC autorise du cercle
// 2. Le destinataire est le PROCHAIN SC dans l'ordre
// 3. Le co-owner a signe la transaction
// 4. Le montant est correct
// 5. Le cycle n'a pas deja ete effectue aujourd'hui
```

### Protections

| Risque | Protection |
|--------|------------|
| Envoi a mauvaise adresse | SC0 valide le destinataire |
| Double depense | Timestamp du dernier cycle |
| Signature frauduleuse | Verification on-chain des owners |
| SC malveillant | Deploiement uniquement par SC0 |

---

## 6. Integration Frontend (X-CIRCLE-X dApp)

### Nouvelles Pages

1. **`/circle-of-life`** - Dashboard du Cercle de Vie
   - Visualisation du cercle (SC0 au centre, SCx autour)
   - Statut du cycle en cours
   - Historique des cycles

2. **`/circle-of-life/join`** - Rejoindre le Cercle
   - Formulaire de paiement (1 EGLD)
   - Confirmation de creation du SC
   - Attribution du co-ownership

3. **`/circle-of-life/my-contract`** - Mon Smart Contract
   - Statut du SC
   - Actions en attente de signature
   - Historique des transactions

4. **`/circle-of-life/sign`** - Signer le Cycle
   - Notification quand c'est son tour
   - Bouton de signature
   - Countdown avant timeout

### Composants UI

```typescript
// Visualisation du cercle
<CircleVisualization
  centerContract={sc0Address}
  peripheralContracts={[sc1, sc2, sc3, ...]}
  currentCycleIndex={2}
  cycleProgress={66} // 2/3 signatures
/>

// Statut du cycle
<CycleStatus
  isActive={true}
  nextSigner={user2Address}
  timeRemaining="12:34:56"
  amountCirculating="0.1 EGLD"
/>

// Carte de signature
<SignatureCard
  contractAddress={myScAddress}
  canSign={isMyTurn}
  onSign={handleSignAndForward}
/>
```

---

## 7. Roadmap d'Implementation

### Phase 1 : Smart Contracts (2-3 semaines)
- [ ] Developper SC0 (CircleOfLifeCenter)
- [ ] Developper template SC peripherique
- [ ] Tests unitaires
- [ ] Deploiement sur Devnet

### Phase 2 : Integration Backend (1-2 semaines)
- [ ] API pour suivi des cycles
- [ ] Notifications push pour signatures
- [ ] Historique des transactions

### Phase 3 : Frontend (2-3 semaines)
- [ ] Page Circle of Life
- [ ] Visualisation interactive du cercle
- [ ] Interface de signature
- [ ] Dashboard personnel

### Phase 4 : Tests & Lancement (1-2 semaines)
- [ ] Tests sur Devnet avec beta testers
- [ ] Audit de securite
- [ ] Deploiement Mainnet

---

## 8. Regles Definies

### Timeout (Minuit)
- **Regle**: Si un utilisateur ne signe pas avant **00:00 (minuit)**, les fonds sont envoyes directement a SC0
- Le cycle continue avec le prochain SC actif
- L'utilisateur en timeout n'est pas automatiquement penalise mais peut etre vote pour ejection

### Montant Circulant
- **Regle**: Envoyer le **montant minimum possible** pour le moment
- Valeur initiale: **0.001 EGLD** (le minimum pratique)
- Peut etre ajuste par gouvernance plus tard

### Statut et Retrait
- **Inactif**: Un utilisateur peut se mettre "inactif" temporairement
  - Ne participe plus aux cycles
  - Peut se remettre actif quand il veut
- **Quitter**: Un utilisateur peut quitter le cercle definitivement
  - Perd son smart contract
  - Ne peut plus revenir (doit recreer un nouveau SC)

### Ejection par Vote
- Si un utilisateur est **inactif trop longtemps**, les autres peuvent voter pour l'ejecter
- **Majorite requise**: 51% des SC actifs
- L'utilisateur ejete perd son SC et doit payer a nouveau pour rejoindre

### Ordre du Cercle
- **Regle**: Ordre des smart contracts **actifs uniquement**
- Les SC inactifs sont ignores dans le cycle
- Ordre: SC actif 1 → SC actif 2 → ... → SC0

---

## 9. Glossaire

| Terme | Definition |
|-------|------------|
| **SC0** | Smart Contract central (maitre) |
| **SCx** | Smart Contract peripherique (x = 1, 2, 3...) |
| **Cycle** | Un tour complet de transactions SC0→SC1→...→SC0 |
| **Co-owner** | Utilisateur proprietaire d'un SC avec SC0 |
| **Quorum** | 2/2 signatures requises pour actions |
| **Circle of Life** | Nom de la fonctionnalite |

---

## 10. Resume

Le **Cercle de Vie** transforme X-CIRCLE-X en un ecosysteme vivant ou :

1. **SC0** est le coeur qui pulse et orchestre tout
2. **Chaque utilisateur** cree son propre SC et devient co-proprietaire avec SC0
3. **L'argent circule** quotidiennement entre tous les SC
4. **Tous participent** en signant les transactions de leur SC
5. **Le cercle grandit** a chaque nouvel utilisateur qui rejoint

C'est une **tontine evolutive** ou le nombre de participants peut grandir indefiniment, creant un cercle de plus en plus grand autour du smart contract central.

---

*Document cree le 3 decembre 2025*
*Version 1.0*
*X-CIRCLE-X - Cercle de Vie*
