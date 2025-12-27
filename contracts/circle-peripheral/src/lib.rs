#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Circle Peripheral Contract (SC1, SC2, SC3...)
///
/// Ce smart contract est cree par SC0 pour chaque membre du cercle.
/// Il peut recevoir et envoyer des EGLD dans le cadre des cycles.
///
/// Caracteristiques:
/// - Owner: l'utilisateur qui a rejoint le cercle
/// - Co-owner: SC0 (peut forcer des transferts en cas de timeout)
/// - Peut recevoir des EGLD
/// - Peut signer et transferer au SC suivant
#[multiversx_sc::contract]
pub trait CirclePeripheral {

    /// Initialise le contrat peripherique
    /// Appele par SC0 lors du deploiement
    #[init]
    fn init(&self, owner: ManagedAddress, sc0_address: ManagedAddress) {
        self.owner().set(&owner);
        self.sc0_address().set(&sc0_address);
        self.is_active().set(true);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // PAYABLE - Recevoir des fonds
    // ═══════════════════════════════════════════════════════════════

    /// Permet au contrat de recevoir des EGLD
    #[payable("EGLD")]
    #[endpoint(deposit)]
    fn deposit(&self) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld().clone_value();
        self.deposit_event(&caller, &payment);
    }

    /// Endpoint par defaut pour recevoir des EGLD
    #[payable("EGLD")]
    #[endpoint]
    fn receive(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // TRANSFERS
    // ═══════════════════════════════════════════════════════════════

    /// Transfere des EGLD vers une adresse (owner ou SC0 seulement)
    #[endpoint(transfer)]
    fn transfer(&self, to: ManagedAddress, amount: BigUint) {
        self.require_owner_or_sc0();

        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance >= amount, "Solde insuffisant");

        self.send().direct_egld(&to, &amount);
        self.transfer_event(&to, &amount);
    }

    /// Transfere tout le solde vers SC0 (appele par SC0 en cas de timeout)
    #[endpoint(forceTransferToSC0)]
    fn force_transfer_to_sc0(&self) {
        self.require_sc0();

        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        if balance > BigUint::zero() {
            let sc0 = self.sc0_address().get();
            self.send().direct_egld(&sc0, &balance);
            self.force_transfer_event(&sc0, &balance);
        }
    }

    /// Signe et transfere au prochain SC dans le cycle
    #[endpoint(signAndForward)]
    fn sign_and_forward(&self, next_sc: ManagedAddress, amount: BigUint) {
        self.require_owner_or_sc0();

        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance >= amount, "Solde insuffisant");

        self.send().direct_egld(&next_sc, &amount);
        self.forward_event(&next_sc, &amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════

    /// Desactive le SC (owner seulement)
    #[endpoint(deactivate)]
    fn deactivate(&self) {
        self.require_owner();
        self.is_active().set(false);
    }

    /// Reactive le SC (owner seulement)
    #[endpoint(activate)]
    fn activate(&self) {
        self.require_owner();
        self.is_active().set(true);
    }

    // ═══════════════════════════════════════════════════════════════
    // ACCESS CONTROL
    // ═══════════════════════════════════════════════════════════════

    fn require_owner(&self) {
        let caller = self.blockchain().get_caller();
        let owner = self.owner().get();
        require!(caller == owner, "Owner seulement");
    }

    fn require_sc0(&self) {
        let caller = self.blockchain().get_caller();
        let sc0 = self.sc0_address().get();
        require!(caller == sc0, "SC0 seulement");
    }

    fn require_owner_or_sc0(&self) {
        let caller = self.blockchain().get_caller();
        let owner = self.owner().get();
        let sc0 = self.sc0_address().get();
        require!(caller == owner || caller == sc0, "Owner ou SC0 seulement");
    }

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("sc0_address")]
    fn sc0_address(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("is_active")]
    fn is_active(&self) -> SingleValueMapper<bool>;

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    #[view(getOwner)]
    fn get_owner(&self) -> ManagedAddress {
        self.owner().get()
    }

    #[view(getSC0Address)]
    fn get_sc0_address(&self) -> ManagedAddress {
        self.sc0_address().get()
    }

    #[view(isActive)]
    fn get_is_active(&self) -> bool {
        self.is_active().get()
    }

    #[view(getBalance)]
    fn get_balance(&self) -> BigUint {
        self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0)
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("deposit")]
    fn deposit_event(&self, #[indexed] from: &ManagedAddress, amount: &BigUint);

    #[event("transfer")]
    fn transfer_event(&self, #[indexed] to: &ManagedAddress, amount: &BigUint);

    #[event("forward")]
    fn forward_event(&self, #[indexed] to: &ManagedAddress, amount: &BigUint);

    #[event("force_transfer")]
    fn force_transfer_event(&self, #[indexed] to: &ManagedAddress, amount: &BigUint);
}
