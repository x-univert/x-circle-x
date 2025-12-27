#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// XCIRCLEX Token Protection Contract
///
/// Ce contrat gère les protections du token XCIRCLEX:
/// 1. Anti-Whale: Limite 2% du supply par wallet
/// 2. Sell Tax Progressive:
///    - Vente < 24h après achat: 10% tax
///    - Vente < 7 jours après achat: 5% tax
///    - Vente > 7 jours après achat: 0% tax
///
/// NOTE: Ce contrat fonctionne comme un registry/tracker.
/// Pour appliquer les règles, le contrat xExchange doit appeler verifyTransfer avant chaque swap.
/// Alternativement, les utilisateurs font leurs swaps via ce contrat.
#[multiversx_sc::contract]
pub trait XCirclexTokenProtection {

    // ═══════════════════════════════════════════════════════════════
    // INIT & UPGRADE
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self, token_id: TokenIdentifier, total_supply: BigUint) {
        let caller = self.blockchain().get_caller();
        self.owner().set(&caller);
        self.token_id().set(&token_id);
        self.total_supply().set(&total_supply);

        // Anti-Whale: 2% du supply max par wallet (200 basis points)
        self.max_wallet_percentage().set(200u64);

        // Sell Tax rates (en basis points: 1000 = 10%, 500 = 5%)
        self.sell_tax_24h().set(1000u64);  // 10% si vente < 24h
        self.sell_tax_7d().set(500u64);    // 5% si vente < 7 jours

        // Treasury pour recevoir les taxes
        self.treasury().set(&caller);

        // Activer les protections par défaut
        self.anti_whale_enabled().set(true);
        self.sell_tax_enabled().set(true);

        // Liste des adresses exemptées (contrats, LP, etc.)
        // Par défaut, l'owner est exempté
        self.is_exempt(&caller).set(true);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // CORE LOGIC
    // ═══════════════════════════════════════════════════════════════

    /// Enregistre un achat de tokens (appelé par le DEX ou manuellement)
    /// Ceci permet de tracker le timestamp d'achat pour le sell tax
    #[endpoint(recordPurchase)]
    fn record_purchase(&self, buyer: ManagedAddress, amount: BigUint) {
        self.require_authorized_caller();

        let current_timestamp = self.blockchain().get_block_timestamp();

        // Ajouter l'achat à l'historique
        let purchase_id = self.next_purchase_id(&buyer).get() + 1;
        self.next_purchase_id(&buyer).set(purchase_id);

        self.purchase_timestamp(&buyer, purchase_id).set(current_timestamp);
        self.purchase_amount(&buyer, purchase_id).set(&amount);

        // Mettre à jour le solde tracked
        let current_balance = self.tracked_balance(&buyer).get();
        self.tracked_balance(&buyer).set(&(current_balance + &amount));

        self.purchase_recorded_event(&buyer, current_timestamp, &amount);
    }

    /// Vérifie si un transfert est autorisé et calcule la taxe applicable
    /// Retourne (is_allowed, tax_amount, tax_percentage)
    #[view(verifyTransfer)]
    fn verify_transfer(
        &self,
        from: ManagedAddress,
        to: ManagedAddress,
        amount: BigUint
    ) -> MultiValue3<bool, BigUint, u64> {
        // Si désactivé ou exempté, tout est autorisé
        if !self.anti_whale_enabled().get() && !self.sell_tax_enabled().get() {
            return (true, BigUint::zero(), 0u64).into();
        }

        if self.is_exempt(&from).get() || self.is_exempt(&to).get() {
            return (true, BigUint::zero(), 0u64).into();
        }

        // ═══════════════════════════════════════════════════════════════
        // ANTI-WHALE CHECK
        // ═══════════════════════════════════════════════════════════════
        if self.anti_whale_enabled().get() {
            let max_percentage = self.max_wallet_percentage().get();
            let total_supply = self.total_supply().get();

            // Calculer le maximum autorisé: total_supply * max_percentage / 10000
            let max_amount = &total_supply * max_percentage / 10000u64;

            // Vérifier le solde du destinataire après transfert
            // Note: On utilise tracked_balance ou on fait confiance au montant déclaré
            let recipient_balance = self.tracked_balance(&to).get();
            let new_balance = &recipient_balance + &amount;

            if new_balance > max_amount {
                return (false, BigUint::zero(), 0u64).into(); // Transfer refusé
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // SELL TAX CALCULATION
        // ═══════════════════════════════════════════════════════════════
        let tax_amount: BigUint;
        let tax_percentage: u64;

        if self.sell_tax_enabled().get() {
            let current_timestamp = self.blockchain().get_block_timestamp();
            let oldest_purchase_time = self.get_oldest_purchase_time(&from);

            let seconds_since_purchase = if oldest_purchase_time > 0 {
                current_timestamp - oldest_purchase_time
            } else {
                // Pas d'historique d'achat = probablement un early holder ou airdrop
                // On considère comme > 7 jours
                u64::MAX
            };

            let hours_since_purchase = seconds_since_purchase / 3600;
            let days_since_purchase = seconds_since_purchase / 86400;

            if hours_since_purchase < 24 {
                // Moins de 24h = 10% tax
                tax_percentage = self.sell_tax_24h().get();
            } else if days_since_purchase < 7 {
                // Moins de 7 jours = 5% tax
                tax_percentage = self.sell_tax_7d().get();
            } else {
                // Plus de 7 jours = 0% tax
                tax_percentage = 0;
            }

            tax_amount = &amount * tax_percentage / 10000u64;
        } else {
            tax_amount = BigUint::zero();
            tax_percentage = 0;
        }

        (true, tax_amount, tax_percentage).into()
    }

    /// Effectue une vente avec application automatique de la taxe
    /// Les tokens doivent d'abord être envoyés à ce contrat
    #[payable("*")]
    #[endpoint(sellWithTax)]
    fn sell_with_tax(&self, recipient: ManagedAddress) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().single_esdt();

        require!(
            payment.token_identifier == self.token_id().get(),
            "Token incorrect"
        );

        // Vérifier et calculer la taxe
        let (is_allowed, tax_amount, tax_percentage) = self.verify_transfer(
            caller.clone(),
            recipient.clone(),
            payment.amount.clone()
        ).into_tuple();

        require!(is_allowed, "Transfert refuse - limite anti-whale depassee");

        // Calculer le montant net
        let net_amount = &payment.amount - &tax_amount;

        // Envoyer la taxe à la trésorerie
        if tax_amount > BigUint::zero() {
            let treasury = self.treasury().get();
            self.send().direct_esdt(&treasury, &payment.token_identifier, 0, &tax_amount);
            self.tax_collected_event(&caller, tax_percentage, &tax_amount);
        }

        // Envoyer le montant net au destinataire
        self.send().direct_esdt(&recipient, &payment.token_identifier, 0, &net_amount);

        // Mettre à jour les balances tracked
        let from_balance = self.tracked_balance(&caller).get();
        if from_balance >= payment.amount {
            self.tracked_balance(&caller).set(&(from_balance - &payment.amount));
        }

        let to_balance = self.tracked_balance(&recipient).get();
        self.tracked_balance(&recipient).set(&(to_balance + &net_amount));

        self.transfer_with_tax_event(&caller, &recipient, &payment.amount, &net_amount, &tax_amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne le timestamp de l'achat le plus ancien (FIFO)
    fn get_oldest_purchase_time(&self, user: &ManagedAddress) -> u64 {
        let purchase_count = self.next_purchase_id(user).get();
        if purchase_count == 0 {
            return 0;
        }

        // Trouver le premier achat non-nul
        for i in 1..=purchase_count {
            let amount = self.purchase_amount(user, i).get();
            if amount > BigUint::zero() {
                return self.purchase_timestamp(user, i).get();
            }
        }

        0
    }

    fn require_authorized_caller(&self) {
        let caller = self.blockchain().get_caller();
        require!(
            caller == self.owner().get() || self.is_authorized_recorder(&caller).get(),
            "Non autorise"
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    #[endpoint(setAntiWhaleEnabled)]
    fn set_anti_whale_enabled(&self, enabled: bool) {
        self.require_owner();
        self.anti_whale_enabled().set(enabled);
    }

    #[endpoint(setSellTaxEnabled)]
    fn set_sell_tax_enabled(&self, enabled: bool) {
        self.require_owner();
        self.sell_tax_enabled().set(enabled);
    }

    #[endpoint(setMaxWalletPercentage)]
    fn set_max_wallet_percentage(&self, percentage: u64) {
        self.require_owner();
        require!(percentage >= 50 && percentage <= 10000, "Percentage invalide (0.5% - 100%)");
        self.max_wallet_percentage().set(percentage);
    }

    #[endpoint(setSellTax24h)]
    fn set_sell_tax_24h(&self, tax: u64) {
        self.require_owner();
        require!(tax <= 2000, "Tax max 20%");
        self.sell_tax_24h().set(tax);
    }

    #[endpoint(setSellTax7d)]
    fn set_sell_tax_7d(&self, tax: u64) {
        self.require_owner();
        require!(tax <= 1000, "Tax max 10%");
        self.sell_tax_7d().set(tax);
    }

    #[endpoint(setTreasury)]
    fn set_treasury(&self, treasury: ManagedAddress) {
        self.require_owner();
        self.treasury().set(&treasury);
    }

    #[endpoint(setExempt)]
    fn set_exempt(&self, address: ManagedAddress, exempt: bool) {
        self.require_owner();
        self.is_exempt(&address).set(exempt);
    }

    #[endpoint(setAuthorizedRecorder)]
    fn set_authorized_recorder(&self, address: ManagedAddress, authorized: bool) {
        self.require_owner();
        self.is_authorized_recorder(&address).set(authorized);
    }

    #[endpoint(updateTotalSupply)]
    fn update_total_supply(&self, new_supply: BigUint) {
        self.require_owner();
        self.total_supply().set(&new_supply);
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

    #[storage_mapper("token_id")]
    fn token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("total_supply")]
    fn total_supply(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("treasury")]
    fn treasury(&self) -> SingleValueMapper<ManagedAddress>;

    // Anti-Whale settings
    #[storage_mapper("anti_whale_enabled")]
    fn anti_whale_enabled(&self) -> SingleValueMapper<bool>;

    #[storage_mapper("max_wallet_percentage")]
    fn max_wallet_percentage(&self) -> SingleValueMapper<u64>;

    // Sell Tax settings
    #[storage_mapper("sell_tax_enabled")]
    fn sell_tax_enabled(&self) -> SingleValueMapper<bool>;

    #[storage_mapper("sell_tax_24h")]
    fn sell_tax_24h(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("sell_tax_7d")]
    fn sell_tax_7d(&self) -> SingleValueMapper<u64>;

    // Exemptions
    #[storage_mapper("is_exempt")]
    fn is_exempt(&self, address: &ManagedAddress) -> SingleValueMapper<bool>;

    #[storage_mapper("is_authorized_recorder")]
    fn is_authorized_recorder(&self, address: &ManagedAddress) -> SingleValueMapper<bool>;

    // Purchase tracking for sell tax
    #[storage_mapper("next_purchase_id")]
    fn next_purchase_id(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    #[storage_mapper("purchase_timestamp")]
    fn purchase_timestamp(&self, user: &ManagedAddress, purchase_id: u64) -> SingleValueMapper<u64>;

    #[storage_mapper("purchase_amount")]
    fn purchase_amount(&self, user: &ManagedAddress, purchase_id: u64) -> SingleValueMapper<BigUint>;

    #[storage_mapper("tracked_balance")]
    fn tracked_balance(&self, user: &ManagedAddress) -> SingleValueMapper<BigUint>;

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    #[view(getProtectionSettings)]
    fn get_protection_settings(&self) -> MultiValue6<bool, u64, bool, u64, u64, ManagedAddress> {
        (
            self.anti_whale_enabled().get(),
            self.max_wallet_percentage().get(),
            self.sell_tax_enabled().get(),
            self.sell_tax_24h().get(),
            self.sell_tax_7d().get(),
            self.treasury().get()
        ).into()
    }

    #[view(getMaxWalletAmount)]
    fn get_max_wallet_amount(&self) -> BigUint {
        let total_supply = self.total_supply().get();
        let max_percentage = self.max_wallet_percentage().get();
        &total_supply * max_percentage / 10000u64
    }

    #[view(isExempt)]
    fn is_exempt_view(&self, address: ManagedAddress) -> bool {
        self.is_exempt(&address).get()
    }

    #[view(getTrackedBalance)]
    fn get_tracked_balance(&self, user: ManagedAddress) -> BigUint {
        self.tracked_balance(&user).get()
    }

    #[view(getSellTaxForUser)]
    fn get_sell_tax_for_user(&self, user: ManagedAddress) -> MultiValue2<u64, u64> {
        if self.is_exempt(&user).get() || !self.sell_tax_enabled().get() {
            return (0u64, 0u64).into();
        }

        let current_timestamp = self.blockchain().get_block_timestamp();
        let oldest_purchase = self.get_oldest_purchase_time(&user);

        if oldest_purchase == 0 {
            return (0u64, 0u64).into(); // Pas d'historique = 0% tax
        }

        let seconds_since = current_timestamp - oldest_purchase;
        let hours_since = seconds_since / 3600;
        let days_since = seconds_since / 86400;

        if hours_since < 24 {
            (self.sell_tax_24h().get(), 24 - hours_since).into()
        } else if days_since < 7 {
            (self.sell_tax_7d().get(), (7 - days_since) * 24).into()
        } else {
            (0u64, 0u64).into()
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("purchase_recorded")]
    fn purchase_recorded_event(
        &self,
        #[indexed] buyer: &ManagedAddress,
        #[indexed] timestamp: u64,
        amount: &BigUint
    );

    #[event("tax_collected")]
    fn tax_collected_event(
        &self,
        #[indexed] from: &ManagedAddress,
        #[indexed] percentage: u64,
        amount: &BigUint
    );

    #[event("transfer_with_tax")]
    fn transfer_with_tax_event(
        &self,
        #[indexed] from: &ManagedAddress,
        #[indexed] to: &ManagedAddress,
        #[indexed] gross_amount: &BigUint,
        #[indexed] net_amount: &BigUint,
        tax_amount: &BigUint
    );
}
