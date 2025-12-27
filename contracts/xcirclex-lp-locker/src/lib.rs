#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// XCIRCLEX LP Locker Contract
///
/// Ce contrat permet de verrouiller les tokens LP (Liquidity Provider)
/// pour une durée minimale de 12 mois, garantissant aux investisseurs
/// que la liquidité ne peut pas être retirée.
///
/// Fonctionnalités:
/// - Lock LP tokens pour 12 mois minimum
/// - Extension possible de la durée de lock
/// - Unlock automatique après expiration
/// - Transparence totale (dates visibles on-chain)
#[multiversx_sc::contract]
pub trait XCirclexLpLocker {

    // ═══════════════════════════════════════════════════════════════
    // INIT & UPGRADE
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(&caller);

        // Durée minimum de lock: 12 mois (365 jours en secondes)
        // Note: 12 mois = 365 jours pour simplifier
        self.min_lock_duration().set(365 * 24 * 60 * 60);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // LOCK FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /// Verrouille des tokens LP pour une durée spécifiée (minimum 12 mois)
    /// @param lock_duration_days: Durée du lock en jours (minimum 365)
    #[payable("*")]
    #[endpoint(lockLpTokens)]
    fn lock_lp_tokens(&self, lock_duration_days: u64) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().single_esdt();

        require!(payment.amount > 0, "Montant invalide");

        let min_days = 365u64; // 12 mois minimum
        require!(
            lock_duration_days >= min_days,
            "Duree minimum: 365 jours (12 mois)"
        );

        let current_timestamp = self.blockchain().get_block_timestamp();
        let lock_duration_seconds = lock_duration_days * 24 * 60 * 60;
        let unlock_timestamp = current_timestamp + lock_duration_seconds;

        // Créer un nouvel ID de lock
        let lock_id = self.next_lock_id().get() + 1;
        self.next_lock_id().set(lock_id);

        // Enregistrer le lock
        self.lock_owner(lock_id).set(&caller);
        self.lock_token_id(lock_id).set(&payment.token_identifier);
        self.lock_token_nonce(lock_id).set(payment.token_nonce);
        self.lock_amount(lock_id).set(&payment.amount);
        self.lock_timestamp(lock_id).set(current_timestamp);
        self.unlock_timestamp(lock_id).set(unlock_timestamp);
        self.lock_active(lock_id).set(true);

        // Ajouter à la liste des locks du owner
        self.user_locks(&caller).push(&lock_id);

        // Total locked
        let current_total = self.total_locked(&payment.token_identifier).get();
        self.total_locked(&payment.token_identifier).set(&(current_total + &payment.amount));

        self.lp_locked_event(
            lock_id,
            &caller,
            &payment.token_identifier,
            unlock_timestamp,
            &payment.amount
        );
    }

    /// Prolonge la durée d'un lock existant
    /// @param lock_id: ID du lock à prolonger
    /// @param additional_days: Jours supplémentaires à ajouter
    #[endpoint(extendLock)]
    fn extend_lock(&self, lock_id: u64, additional_days: u64) {
        let caller = self.blockchain().get_caller();

        require!(self.lock_active(lock_id).get(), "Lock inexistant ou inactif");
        require!(
            self.lock_owner(lock_id).get() == caller,
            "Vous n'etes pas le proprietaire de ce lock"
        );
        require!(additional_days > 0, "Duree additionnelle invalide");

        let current_unlock = self.unlock_timestamp(lock_id).get();
        let extension_seconds = additional_days * 24 * 60 * 60;
        let new_unlock = current_unlock + extension_seconds;

        self.unlock_timestamp(lock_id).set(new_unlock);

        self.lock_extended_event(lock_id, new_unlock, additional_days);
    }

    /// Déverrouille les tokens LP après expiration
    /// @param lock_id: ID du lock à débloquer
    #[endpoint(unlock)]
    fn unlock(&self, lock_id: u64) {
        let caller = self.blockchain().get_caller();
        let current_timestamp = self.blockchain().get_block_timestamp();

        require!(self.lock_active(lock_id).get(), "Lock inexistant ou inactif");
        require!(
            self.lock_owner(lock_id).get() == caller,
            "Vous n'etes pas le proprietaire de ce lock"
        );

        let unlock_timestamp = self.unlock_timestamp(lock_id).get();
        require!(
            current_timestamp >= unlock_timestamp,
            "Lock toujours actif - attendez la date d'expiration"
        );

        let token_id = self.lock_token_id(lock_id).get();
        let token_nonce = self.lock_token_nonce(lock_id).get();
        let amount = self.lock_amount(lock_id).get();

        // Marquer comme inactif
        self.lock_active(lock_id).set(false);

        // Mettre à jour le total locked
        let current_total = self.total_locked(&token_id).get();
        if current_total >= amount {
            self.total_locked(&token_id).set(&(current_total - &amount));
        }

        // Transférer les tokens au owner
        self.send().direct_esdt(&caller, &token_id, token_nonce, &amount);

        self.lp_unlocked_event(lock_id, &caller, &token_id, &amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════

    /// Change la durée minimum de lock (owner only)
    #[endpoint(setMinLockDuration)]
    fn set_min_lock_duration(&self, min_days: u64) {
        self.require_owner();
        require!(min_days >= 30, "Minimum 30 jours");
        self.min_lock_duration().set(min_days * 24 * 60 * 60);
    }

    fn require_owner(&self) {
        let caller = self.blockchain().get_caller();
        require!(caller == self.owner().get(), "Owner only");
    }

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("min_lock_duration")]
    fn min_lock_duration(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("next_lock_id")]
    fn next_lock_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("lock_owner")]
    fn lock_owner(&self, lock_id: u64) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("lock_token_id")]
    fn lock_token_id(&self, lock_id: u64) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("lock_token_nonce")]
    fn lock_token_nonce(&self, lock_id: u64) -> SingleValueMapper<u64>;

    #[storage_mapper("lock_amount")]
    fn lock_amount(&self, lock_id: u64) -> SingleValueMapper<BigUint>;

    #[storage_mapper("lock_timestamp")]
    fn lock_timestamp(&self, lock_id: u64) -> SingleValueMapper<u64>;

    #[storage_mapper("unlock_timestamp")]
    fn unlock_timestamp(&self, lock_id: u64) -> SingleValueMapper<u64>;

    #[storage_mapper("lock_active")]
    fn lock_active(&self, lock_id: u64) -> SingleValueMapper<bool>;

    #[storage_mapper("user_locks")]
    fn user_locks(&self, user: &ManagedAddress) -> VecMapper<u64>;

    #[storage_mapper("total_locked")]
    fn total_locked(&self, token_id: &TokenIdentifier) -> SingleValueMapper<BigUint>;

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    #[view(getLockInfo)]
    fn get_lock_info(&self, lock_id: u64) -> MultiValue7<
        ManagedAddress,      // owner
        TokenIdentifier,     // token_id
        u64,                 // token_nonce
        BigUint,             // amount
        u64,                 // lock_timestamp
        u64,                 // unlock_timestamp
        bool                 // is_active
    > {
        (
            self.lock_owner(lock_id).get(),
            self.lock_token_id(lock_id).get(),
            self.lock_token_nonce(lock_id).get(),
            self.lock_amount(lock_id).get(),
            self.lock_timestamp(lock_id).get(),
            self.unlock_timestamp(lock_id).get(),
            self.lock_active(lock_id).get()
        ).into()
    }

    #[view(getUserLocks)]
    fn get_user_locks(&self, user: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for i in 1..=self.user_locks(&user).len() {
            result.push(self.user_locks(&user).get(i));
        }
        result
    }

    #[view(isLockExpired)]
    fn is_lock_expired(&self, lock_id: u64) -> bool {
        if !self.lock_active(lock_id).get() {
            return true;
        }
        let current_timestamp = self.blockchain().get_block_timestamp();
        let unlock_timestamp = self.unlock_timestamp(lock_id).get();
        current_timestamp >= unlock_timestamp
    }

    #[view(getRemainingLockTime)]
    fn get_remaining_lock_time(&self, lock_id: u64) -> u64 {
        if !self.lock_active(lock_id).get() {
            return 0;
        }
        let current_timestamp = self.blockchain().get_block_timestamp();
        let unlock_timestamp = self.unlock_timestamp(lock_id).get();
        if current_timestamp >= unlock_timestamp {
            0
        } else {
            unlock_timestamp - current_timestamp
        }
    }

    #[view(getTotalLocked)]
    fn get_total_locked(&self, token_id: TokenIdentifier) -> BigUint {
        self.total_locked(&token_id).get()
    }

    #[view(getMinLockDuration)]
    fn get_min_lock_duration(&self) -> u64 {
        self.min_lock_duration().get()
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("lp_locked")]
    fn lp_locked_event(
        &self,
        #[indexed] lock_id: u64,
        #[indexed] owner: &ManagedAddress,
        #[indexed] token_id: &TokenIdentifier,
        #[indexed] unlock_timestamp: u64,
        amount: &BigUint
    );

    #[event("lp_unlocked")]
    fn lp_unlocked_event(
        &self,
        #[indexed] lock_id: u64,
        #[indexed] owner: &ManagedAddress,
        #[indexed] token_id: &TokenIdentifier,
        amount: &BigUint
    );

    #[event("lock_extended")]
    fn lock_extended_event(
        &self,
        #[indexed] lock_id: u64,
        #[indexed] new_unlock_timestamp: u64,
        additional_days: u64
    );
}
