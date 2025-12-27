#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Structure des attributs du NFT Evolutif
/// Format compatible avec les explorers MultiversX
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq, Debug)]
pub struct NftAttributes<M: ManagedTypeApi> {
    /// Niveau du NFT (0-12)
    pub level: u8,
    /// Nombre de cycles completes par ce membre
    pub cycles_completed: u64,
    /// Code de rarete (0-7)
    pub rarity: u8,
    /// Nom de la rarete
    pub rarity_name: ManagedBuffer<M>,
    /// Couleur de fond
    pub background: ManagedBuffer<M>,
    /// Nombre de points peripheriques (0-12)
    pub peripheral_points: u8,
    /// Timestamp de creation
    pub created_at: u64,
    /// Adresse du proprietaire original
    pub original_owner: ManagedAddress<M>,
}

/// Raretes
pub const RARITY_COMMON: u8 = 0;
pub const RARITY_UNCOMMON: u8 = 1;
pub const RARITY_RARE: u8 = 2;
pub const RARITY_EPIC: u8 = 3;
pub const RARITY_LEGENDARY: u8 = 4;
pub const RARITY_MYTHIC: u8 = 5;
pub const RARITY_TRANSCENDENT: u8 = 6;
pub const RARITY_PERFECT_CIRCLE: u8 = 7;

/// Royalties: 10% = 1000 (basis points)
pub const ROYALTIES_PERCENT: u64 = 1000;

/// XCIRCLEX NFT V2 - Collection NFT avec IPFS et Royalties
/// - True NFT (pas SFT)
/// - Royalties 10%
/// - Support IPFS pour GIFs
/// - Attributs enrichis
#[multiversx_sc::contract]
pub trait XCirclexNftV2 {

    // ═══════════════════════════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(&caller);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - SETUP COLLECTION (NFT avec Royalties)
    // ═══════════════════════════════════════════════════════════════

    /// Issue la collection NFT (Non-Fungible Token) avec royalties
    /// Necessite 0.05 EGLD pour les frais d'issue
    #[payable("EGLD")]
    #[endpoint(issueCollection)]
    fn issue_collection(&self, collection_name: ManagedBuffer, collection_ticker: ManagedBuffer) {
        self.require_owner();
        require!(self.nft_token_id().is_empty(), "Collection already issued");

        let payment = self.call_value().egld().clone_value();
        require!(payment >= 50000000000000000u64, "Need 0.05 EGLD for issue");

        // Utiliser issue_non_fungible pour avoir de vrais NFTs (pas SFT)
        self.send()
            .esdt_system_sc_proxy()
            .issue_non_fungible(
                payment.clone(),
                &collection_name,
                &collection_ticker,
                NonFungibleTokenProperties {
                    can_freeze: true,
                    can_wipe: true,
                    can_pause: true,
                    can_transfer_create_role: true,
                    can_change_owner: true,
                    can_upgrade: true,
                    can_add_special_roles: true,
                },
            )
            .with_callback(self.callbacks().issue_callback())
            .async_call_and_exit();
    }

    #[callback]
    fn issue_callback(&self, #[call_result] result: ManagedAsyncCallResult<TokenIdentifier>) {
        match result {
            ManagedAsyncCallResult::Ok(token_id) => {
                self.nft_token_id().set(&token_id);
            }
            ManagedAsyncCallResult::Err(_) => {
                // En cas d'echec, les fonds sont automatiquement retournes
            }
        }
    }

    /// Configure les roles de creation pour le contrat
    #[endpoint(setLocalRoles)]
    fn set_local_roles(&self) {
        self.require_owner();
        require!(!self.nft_token_id().is_empty(), "Collection not issued");

        let token_id = self.nft_token_id().get();
        let sc_address = self.blockchain().get_sc_address();

        self.send()
            .esdt_system_sc_proxy()
            .set_special_roles(
                &sc_address,
                &token_id,
                [
                    EsdtLocalRole::NftCreate,
                    EsdtLocalRole::NftBurn,
                    EsdtLocalRole::NftUpdateAttributes,
                    EsdtLocalRole::NftAddUri,
                ].iter().cloned(),
            )
            .async_call_and_exit();
    }

    /// Ajoute UNIQUEMENT le role NftAddUri (pour les mises a jour)
    #[endpoint(addUriRole)]
    fn add_uri_role(&self) {
        self.require_owner();
        require!(!self.nft_token_id().is_empty(), "Collection not issued");

        let token_id = self.nft_token_id().get();
        let sc_address = self.blockchain().get_sc_address();

        self.send()
            .esdt_system_sc_proxy()
            .set_special_roles(
                &sc_address,
                &token_id,
                [EsdtLocalRole::NftAddUri].iter().cloned(),
            )
            .async_call_and_exit();
    }

    /// Configure l'adresse du Circle of Life Center
    #[endpoint(setCircleOfLifeContract)]
    fn set_circle_of_life_contract(&self, address: ManagedAddress) {
        self.require_owner();
        self.circle_of_life_contract().set(&address);
    }

    /// Configure l'URI de base IPFS pour les GIFs
    /// Format: https://ipfs.io/ipfs/bafybei.../
    #[endpoint(setBaseUri)]
    fn set_base_uri(&self, uri: ManagedBuffer) {
        self.require_owner();
        self.base_uri().set(&uri);
    }

    /// Configure l'URI pour un niveau specifique
    /// Permet d'utiliser des URLs individuelles (ex: Imgur)
    #[endpoint(setLevelUri)]
    fn set_level_uri(&self, level: u8, uri: ManagedBuffer) {
        self.require_owner();
        require!(level <= 12, "Level must be 0-12");
        self.level_uri(level).set(&uri);
    }

    /// Configure toutes les URIs de niveau en une seule transaction
    #[endpoint(setAllLevelUris)]
    fn set_all_level_uris(&self, uris: MultiValueEncoded<ManagedBuffer>) {
        self.require_owner();
        let uris_vec: ManagedVec<ManagedBuffer> = uris.to_vec();
        require!(uris_vec.len() == 13, "Must provide exactly 13 URIs (levels 0-12)");

        for level in 0u8..13u8 {
            let uri = uris_vec.get(level as usize);
            self.level_uri(level).set(uri.clone_value());
        }
    }

    /// Configure l'adresse pour recevoir les royalties
    #[endpoint(setRoyaltiesAddress)]
    fn set_royalties_address(&self, address: ManagedAddress) {
        self.require_owner();
        self.royalties_address().set(&address);
    }

    // ═══════════════════════════════════════════════════════════════
    // MINT NFT
    // ═══════════════════════════════════════════════════════════════

    /// Mint un NFT pour un membre du Cercle de Vie
    #[endpoint(claimNft)]
    fn claim_nft(&self) -> u64 {
        let caller = self.blockchain().get_caller();

        // Verifier que le membre n'a pas deja un NFT
        require!(self.member_nft_nonce(&caller).is_empty(), "Already has NFT");

        self.mint_nft_for_member(&caller)
    }

    /// Mint un NFT pour un membre specifique (appele par Circle of Life)
    #[endpoint(mintForMember)]
    fn mint_for_member(&self, member: ManagedAddress) -> u64 {
        let caller = self.blockchain().get_caller();
        let circle_contract = self.circle_of_life_contract().get();
        require!(caller == circle_contract, "Only Circle of Life can mint");

        require!(self.member_nft_nonce(&member).is_empty(), "Already has NFT");

        self.mint_nft_for_member(&member)
    }

    fn mint_nft_for_member(&self, member: &ManagedAddress) -> u64 {
        require!(!self.nft_token_id().is_empty(), "Collection not issued");
        // Verifier qu'on a au moins une URI (base ou niveau 0)
        require!(!self.base_uri().is_empty() || !self.level_uri(0).is_empty(), "URIs not configured");

        let token_id = self.nft_token_id().get();

        // Incrementer le compteur de NFT
        let nft_number = self.nonce_counter().get() + 1;
        self.nonce_counter().set(nft_number);

        // Niveau initial 0
        let level: u8 = 0;
        let (_rarity, rarity_name, background) = self.get_rarity_info(level);

        // Attributs du NFT au format texte pour l'explorer MultiversX
        // Format: "tags:XCIRCLEX,Level0,Commun;metadata:Level=0,Rarity=Commun,Background=Grey,Cycles=0"
        let attributes = self.build_attributes_string(level, &rarity_name, &background, 0);

        // Nom du NFT: "Cercle #1", "Cercle #2", etc.
        let mut name = ManagedBuffer::new_from_bytes(b"Cercle #");
        name.append(&self.u64_to_buffer(nft_number));

        // Construire les URIs (GIF sur IPFS)
        let uri = self.build_nft_uri(level);
        let mut uris = ManagedVec::new();
        uris.push(uri);

        // Hash (vide)
        let hash = ManagedBuffer::new();

        // Royalties: 10% = 1000 (en basis points)
        let royalties = BigUint::from(ROYALTIES_PERCENT);

        // Creer le NFT avec quantite = 1 (true NFT)
        // Attributs au format ManagedBuffer texte pour l'explorer
        let nonce = self.send().esdt_nft_create(
            &token_id,
            &BigUint::from(1u64),
            &name,
            &royalties,
            &hash,
            &attributes,
            &uris,
        );

        // Enregistrer le mapping
        self.member_nft_nonce(member).set(nonce);
        self.nft_level(nonce).set(0);
        self.nft_number(nonce).set(nft_number);
        self.total_nfts_minted().update(|val| *val += 1);

        // Envoyer le NFT au membre
        self.send().direct_esdt(
            member,
            &token_id,
            nonce,
            &BigUint::from(1u64),
        );

        // Emettre l'evenement
        self.nft_minted_event(member, nonce, nft_number, 0);

        nonce
    }

    // ═══════════════════════════════════════════════════════════════
    // BURN & RECLAIM
    // ═══════════════════════════════════════════════════════════════

    /// Burn l'ancien NFT et en mint un nouveau AU BON NIVEAU
    /// Utilise les cycles stockes pour calculer le niveau correct
    #[payable("*")]
    #[endpoint(burnAndReclaim)]
    fn burn_and_reclaim(&self) -> u64 {
        let caller = self.blockchain().get_caller();

        require!(!self.member_nft_nonce(&caller).is_empty(), "No NFT to burn");

        let old_nonce = self.member_nft_nonce(&caller).get();
        let token_id = self.nft_token_id().get();

        // Verifier le paiement
        let payment = self.call_value().single_esdt();
        require!(payment.token_identifier == token_id, "Wrong token");
        require!(payment.token_nonce == old_nonce, "Wrong NFT nonce");
        require!(payment.amount == BigUint::from(1u64), "Must send exactly 1 NFT");

        // Recuperer les cycles du membre pour calculer le niveau
        let cycles = self.member_cycles_completed(&caller).get();
        let level = self.calculate_level_from_cycles(cycles);

        // Burn l'ancien NFT
        self.send().esdt_local_burn(&token_id, old_nonce, &BigUint::from(1u64));

        // Effacer l'ancien mapping
        self.member_nft_nonce(&caller).clear();
        self.nft_level(old_nonce).clear();

        // Mint un nouveau NFT au bon niveau
        self.mint_nft_for_member_at_level(&caller, level, cycles)
    }

    /// Mint un NFT a un niveau specifique (utilise par burnAndReclaim)
    fn mint_nft_for_member_at_level(&self, member: &ManagedAddress, level: u8, cycles: u64) -> u64 {
        require!(!self.nft_token_id().is_empty(), "Collection not issued");
        require!(!self.base_uri().is_empty() || !self.level_uri(level).is_empty(), "URIs not configured");

        let token_id = self.nft_token_id().get();

        // Incrementer le compteur de NFT
        let nft_number = self.nonce_counter().get() + 1;
        self.nonce_counter().set(nft_number);

        // Obtenir les infos de rarete pour ce niveau
        let (_rarity, rarity_name, background) = self.get_rarity_info(level);

        // Attributs du NFT au format texte pour l'explorer MultiversX
        let attributes = self.build_attributes_string(level, &rarity_name, &background, cycles);

        // Nom du NFT: "Cercle #1", "Cercle #2", etc.
        let mut name = ManagedBuffer::new_from_bytes(b"Cercle #");
        name.append(&self.u64_to_buffer(nft_number));

        // Construire l'URI pour ce niveau
        let uri = self.build_nft_uri(level);
        let mut uris = ManagedVec::new();
        uris.push(uri);

        // Hash (vide)
        let hash = ManagedBuffer::new();

        // Royalties: 10% = 1000 (en basis points)
        let royalties = BigUint::from(ROYALTIES_PERCENT);

        // Creer le NFT
        let nonce = self.send().esdt_nft_create(
            &token_id,
            &BigUint::from(1u64),
            &name,
            &royalties,
            &hash,
            &attributes,
            &uris,
        );

        // Enregistrer le mapping
        self.member_nft_nonce(member).set(nonce);
        self.nft_level(nonce).set(level);
        self.nft_number(nonce).set(nft_number);
        self.total_nfts_minted().update(|val| *val += 1);

        // Envoyer le NFT au membre
        self.send().direct_esdt(
            member,
            &token_id,
            nonce,
            &BigUint::from(1u64),
        );

        // Emettre l'evenement
        self.nft_minted_event(member, nonce, nft_number, level);

        nonce
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE NFT (Dynamic Evolution)
    // ═══════════════════════════════════════════════════════════════

    /// Met a jour les attributs du NFT base sur les cycles completes
    /// L'utilisateur doit envoyer son NFT au contrat qui le met a jour et le renvoie
    #[payable("*")]
    #[endpoint(evolveNft)]
    fn evolve_nft(&self) {
        let caller = self.blockchain().get_caller();
        let token_id = self.nft_token_id().get();

        // Verifier le paiement NFT
        let payment = self.call_value().single_esdt();
        require!(payment.token_identifier == token_id, "Wrong token");
        require!(payment.amount == BigUint::from(1u64), "Must send exactly 1 NFT");

        let nonce = payment.token_nonce;

        // Verifier que ce NFT appartient bien a ce membre
        require!(!self.member_nft_nonce(&caller).is_empty(), "Member has no registered NFT");
        let expected_nonce = self.member_nft_nonce(&caller).get();
        require!(nonce == expected_nonce, "NFT nonce mismatch");

        let current_level = self.nft_level(nonce).get();

        // Recuperer les cycles
        let cycles_completed = self.member_cycles_completed(&caller).get();

        // Calculer le nouveau niveau
        let new_level = self.calculate_level_from_cycles(cycles_completed);

        // Si le niveau a change, mettre a jour
        if new_level > current_level {
            let (_rarity, rarity_name, background) = self.get_rarity_info(new_level);

            // Attributs au format texte pour l'explorer
            let new_attributes = self.build_attributes_string(new_level, &rarity_name, &background, cycles_completed);

            // Mettre a jour les attributs
            self.send().nft_update_attributes(
                &token_id,
                nonce,
                &new_attributes,
            );

            // Ajouter la nouvelle URI pour le nouveau niveau
            let new_uri = self.build_nft_uri(new_level);
            let mut uris = ManagedVec::new();
            uris.push(new_uri);
            self.send().nft_add_multiple_uri(
                &token_id,
                nonce,
                &uris,
            );

            // Mettre a jour le storage
            self.nft_level(nonce).set(new_level);

            // Emettre l'evenement
            self.nft_evolved_event(&caller, nonce, current_level, new_level, cycles_completed);
        }

        // Renvoyer le NFT au proprietaire (meme si pas de changement de niveau)
        self.send().direct_esdt(
            &caller,
            &token_id,
            nonce,
            &BigUint::from(1u64),
        );
    }

    /// Version legacy - View seulement pour verifier le niveau potentiel
    #[view(checkEvolution)]
    fn check_evolution(&self, member: ManagedAddress) -> MultiValue3<u8, u8, u64> {
        if self.member_nft_nonce(&member).is_empty() {
            return (0, 0, 0).into();
        }

        let nonce = self.member_nft_nonce(&member).get();
        let current_level = self.nft_level(nonce).get();
        let cycles_completed = self.member_cycles_completed(&member).get();
        let potential_level = self.calculate_level_from_cycles(cycles_completed);

        (current_level, potential_level, cycles_completed).into()
    }

    /// Endpoint pour mettre a jour les cycles d'un membre
    #[endpoint(updateMemberCycles)]
    fn update_member_cycles(&self, member: ManagedAddress, cycles: u64) {
        let caller = self.blockchain().get_caller();
        let circle_contract = self.circle_of_life_contract().get();
        require!(caller == circle_contract || caller == self.owner().get(), "Not authorized");

        self.member_cycles_completed(&member).set(cycles);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    /// Construit les attributs au format texte pour l'explorer MultiversX
    /// Format: "tags:XCIRCLEX,Level0,Commun;metadata:Level=0,Rarity=Commun,Background=Grey,Cycles=0"
    fn build_attributes_string(
        &self,
        level: u8,
        rarity_name: &ManagedBuffer,
        background: &ManagedBuffer,
        cycles: u64,
    ) -> ManagedBuffer {
        let mut attrs = ManagedBuffer::new();

        // Tags section: tags:XCIRCLEX,Level0,Commun
        attrs.append(&ManagedBuffer::new_from_bytes(b"tags:XCIRCLEX,Level"));
        attrs.append(&self.u8_to_buffer(level));
        attrs.append(&ManagedBuffer::new_from_bytes(b","));
        attrs.append(rarity_name);

        // Metadata section: ;metadata:Level=0,Rarity=Commun,Background=Grey,Cycles=0
        attrs.append(&ManagedBuffer::new_from_bytes(b";metadata:Level="));
        attrs.append(&self.u8_to_buffer(level));
        attrs.append(&ManagedBuffer::new_from_bytes(b",Rarity="));
        attrs.append(rarity_name);
        attrs.append(&ManagedBuffer::new_from_bytes(b",Background="));
        attrs.append(background);
        attrs.append(&ManagedBuffer::new_from_bytes(b",Cycles="));
        attrs.append(&self.u64_to_buffer(cycles));

        attrs
    }

    /// Construit l'URI pour le GIF du niveau
    /// Priorite: 1) URI individuelle par niveau 2) Base URI + level.gif
    fn build_nft_uri(&self, level: u8) -> ManagedBuffer {
        // D'abord verifier s'il y a une URI specifique pour ce niveau
        if !self.level_uri(level).is_empty() {
            return self.level_uri(level).get();
        }

        // Sinon, utiliser le format base_uri + level.gif
        if !self.base_uri().is_empty() {
            let base = self.base_uri().get();
            let mut uri = base;
            uri.append(&self.u8_to_buffer(level));
            uri.append(&ManagedBuffer::new_from_bytes(b".gif"));
            return uri;
        }

        // Fallback: URI vide
        ManagedBuffer::new()
    }

    /// Retourne les infos de rarete pour un niveau
    fn get_rarity_info(&self, level: u8) -> (u8, ManagedBuffer, ManagedBuffer) {
        match level {
            0 => (RARITY_COMMON,
                  ManagedBuffer::new_from_bytes(b"Commun"),
                  ManagedBuffer::new_from_bytes(b"Grey")),
            1..=2 => (RARITY_UNCOMMON,
                      ManagedBuffer::new_from_bytes(b"Peu Commun"),
                      ManagedBuffer::new_from_bytes(b"Green")),
            3..=4 => (RARITY_RARE,
                      ManagedBuffer::new_from_bytes(b"Rare"),
                      ManagedBuffer::new_from_bytes(b"Blue")),
            5..=6 => (RARITY_EPIC,
                      ManagedBuffer::new_from_bytes(b"Epique"),
                      ManagedBuffer::new_from_bytes(b"Purple")),
            7..=8 => (RARITY_LEGENDARY,
                      ManagedBuffer::new_from_bytes(b"Legendaire"),
                      ManagedBuffer::new_from_bytes(b"Orange")),
            9..=10 => (RARITY_MYTHIC,
                       ManagedBuffer::new_from_bytes(b"Mythique"),
                       ManagedBuffer::new_from_bytes(b"Pink")),
            11 => (RARITY_TRANSCENDENT,
                   ManagedBuffer::new_from_bytes(b"Transcendant"),
                   ManagedBuffer::new_from_bytes(b"Cyan")),
            12 => (RARITY_PERFECT_CIRCLE,
                   ManagedBuffer::new_from_bytes(b"Cercle Parfait"),
                   ManagedBuffer::new_from_bytes(b"Gold")),
            _ => (RARITY_COMMON,
                  ManagedBuffer::new_from_bytes(b"Commun"),
                  ManagedBuffer::new_from_bytes(b"Grey")),
        }
    }

    /// Calcule le niveau a partir des cycles
    fn calculate_level_from_cycles(&self, cycles: u64) -> u8 {
        if cycles >= 360 { 12 }
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
        else { 0 }
    }

    fn get_member_cycles_from_circle(&self, _circle_address: &ManagedAddress, member: &ManagedAddress) -> u64 {
        self.member_cycles_completed(member).get()
    }

    fn require_owner(&self) {
        let caller = self.blockchain().get_caller();
        let owner = self.owner().get();
        require!(caller == owner, "Only owner can call this");
    }

    /// Convertir u8 en buffer texte
    fn u8_to_buffer(&self, val: u8) -> ManagedBuffer {
        if val == 0 {
            return ManagedBuffer::new_from_bytes(b"0");
        }
        let mut result = ManagedBuffer::new();
        let mut n = val;
        let mut digits = [0u8; 3];
        let mut i = 0;
        while n > 0 {
            digits[i] = b'0' + (n % 10);
            n /= 10;
            i += 1;
        }
        while i > 0 {
            i -= 1;
            result.append(&ManagedBuffer::new_from_bytes(&[digits[i]]));
        }
        result
    }

    /// Convertir u64 en buffer texte
    fn u64_to_buffer(&self, val: u64) -> ManagedBuffer {
        if val == 0 {
            return ManagedBuffer::new_from_bytes(b"0");
        }
        let mut result = ManagedBuffer::new();
        let mut n = val;
        let mut digits = [0u8; 20];
        let mut i = 0;
        while n > 0 {
            digits[i] = b'0' + (n % 10) as u8;
            n /= 10;
            i += 1;
        }
        while i > 0 {
            i -= 1;
            result.append(&ManagedBuffer::new_from_bytes(&[digits[i]]));
        }
        result
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne les informations du NFT d'un membre
    #[view(getNftInfo)]
    fn get_nft_info(&self, member: ManagedAddress) -> MultiValue6<u64, u64, u8, u8, u8, u64> {
        if self.member_nft_nonce(&member).is_empty() {
            return (0, 0, 0, 0, 0, 0).into();
        }

        let nonce = self.member_nft_nonce(&member).get();
        let nft_number = self.nft_number(nonce).get();
        let level = self.nft_level(nonce).get();
        let cycles = self.member_cycles_completed(&member).get();
        let (rarity, _, _) = self.get_rarity_info(level);

        (nonce, nft_number, level, level, rarity, cycles).into()
    }

    /// Verifie si un membre possede un NFT
    #[view(hasNft)]
    fn has_nft(&self, member: ManagedAddress) -> bool {
        !self.member_nft_nonce(&member).is_empty()
    }

    /// Retourne le niveau d'un NFT
    #[view(getNftLevel)]
    fn get_nft_level_view(&self, member: ManagedAddress) -> u8 {
        if self.member_nft_nonce(&member).is_empty() {
            return 0;
        }
        let nonce = self.member_nft_nonce(&member).get();
        self.nft_level(nonce).get()
    }

    /// Retourne le multiplicateur de bonus
    #[view(getBonusMultiplier)]
    fn get_bonus_multiplier(&self, member: ManagedAddress) -> u64 {
        if self.member_nft_nonce(&member).is_empty() {
            return 0;
        }
        let nonce = self.member_nft_nonce(&member).get();
        let level = self.nft_level(nonce).get();

        match level {
            0 => 0,
            1..=2 => 500,
            3..=4 => 1000,
            5..=6 => 1500,
            7..=8 => 2500,
            9..=10 => 3500,
            11 => 4000,
            12 => 5000,
            _ => 0,
        }
    }

    /// Retourne le nom de la rarete
    #[view(getRarityName)]
    fn get_rarity_name(&self, rarity: u8) -> ManagedBuffer {
        match rarity {
            0 => ManagedBuffer::new_from_bytes(b"Commun"),
            1 => ManagedBuffer::new_from_bytes(b"Peu Commun"),
            2 => ManagedBuffer::new_from_bytes(b"Rare"),
            3 => ManagedBuffer::new_from_bytes(b"Epique"),
            4 => ManagedBuffer::new_from_bytes(b"Legendaire"),
            5 => ManagedBuffer::new_from_bytes(b"Mythique"),
            6 => ManagedBuffer::new_from_bytes(b"Transcendant"),
            7 => ManagedBuffer::new_from_bytes(b"Cercle Parfait"),
            _ => ManagedBuffer::new_from_bytes(b"Inconnu"),
        }
    }

    /// Retourne le nombre total de NFTs mintes
    #[view(getTotalNftsMinted)]
    fn get_total_nfts_minted(&self) -> u64 {
        self.total_nfts_minted().get()
    }

    /// Retourne le token ID de la collection
    #[view(getNftTokenId)]
    fn get_nft_token_id(&self) -> TokenIdentifier {
        self.nft_token_id().get()
    }

    /// Retourne l'URI de base IPFS
    #[view(getBaseUri)]
    fn get_base_uri(&self) -> ManagedBuffer {
        self.base_uri().get()
    }

    /// Retourne l'URI pour un niveau specifique
    #[view(getLevelUri)]
    fn get_level_uri(&self, level: u8) -> ManagedBuffer {
        self.level_uri(level).get()
    }

    /// Retourne l'URI qui sera utilisee pour un niveau
    #[view(getNftUri)]
    fn get_nft_uri(&self, level: u8) -> ManagedBuffer {
        self.build_nft_uri(level)
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("nft_minted")]
    fn nft_minted_event(
        &self,
        #[indexed] member: &ManagedAddress,
        #[indexed] nonce: u64,
        #[indexed] nft_number: u64,
        level: u8
    );

    #[event("nft_evolved")]
    fn nft_evolved_event(
        &self,
        #[indexed] member: &ManagedAddress,
        #[indexed] nonce: u64,
        #[indexed] old_level: u8,
        #[indexed] new_level: u8,
        cycles: u64,
    );

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("nft_token_id")]
    fn nft_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("circle_of_life_contract")]
    fn circle_of_life_contract(&self) -> SingleValueMapper<ManagedAddress>;

    /// URI de base IPFS (ex: https://ipfs.io/ipfs/bafybei.../)
    #[storage_mapper("base_uri")]
    fn base_uri(&self) -> SingleValueMapper<ManagedBuffer>;

    /// URI individuelle par niveau (ex: Imgur URLs)
    #[storage_mapper("level_uri")]
    fn level_uri(&self, level: u8) -> SingleValueMapper<ManagedBuffer>;

    /// Adresse pour recevoir les royalties
    #[storage_mapper("royalties_address")]
    fn royalties_address(&self) -> SingleValueMapper<ManagedAddress>;

    /// Nonce du NFT pour chaque membre
    #[storage_mapper("member_nft_nonce")]
    fn member_nft_nonce(&self, member: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Niveau stocke pour chaque NFT
    #[storage_mapper("nft_level")]
    fn nft_level(&self, nonce: u64) -> SingleValueMapper<u8>;

    /// Numero du NFT (pour le nom)
    #[storage_mapper("nft_number")]
    fn nft_number(&self, nonce: u64) -> SingleValueMapper<u64>;

    /// Cycles completes par membre
    #[storage_mapper("member_cycles_completed")]
    fn member_cycles_completed(&self, member: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Compteur pour les numeros de NFT
    #[storage_mapper("nonce_counter")]
    fn nonce_counter(&self) -> SingleValueMapper<u64>;

    /// Nombre total de NFTs mintes
    #[storage_mapper("total_nfts_minted")]
    fn total_nfts_minted(&self) -> SingleValueMapper<u64>;
}
