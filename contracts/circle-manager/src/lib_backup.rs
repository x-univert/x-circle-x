#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Représente l'état actuel d'un cercle
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Eq, Clone, Copy, Debug)]
pub enum CircleStatus {
    /// Cercle en formation (attend membres)
    Forming,
    /// Cercle actif (cycles en cours)
    Active,
    /// Cercle complété avec succès
    Completed,
    /// Cercle annulé/échoué
    Cancelled,
}

/// Structure représentant un cercle d'épargne
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode)]
pub struct Circle<M: ManagedTypeApi> {
    /// ID unique du cercle
    pub id: u64,

    /// Créateur du cercle
    pub creator: ManagedAddress<M>,

    /// Liste des membres actuels
    pub members: ManagedVec<M, ManagedAddress<M>>,

    /// Montant de contribution par cycle (en EGLD)
    pub contribution_amount: BigUint<M>,

    /// Durée d'un cycle en secondes (ex: 2592000 = 30 jours)
    pub cycle_duration: u64,

    /// Nombre maximum de membres
    pub max_members: u32,

    /// Cycle actuel (commence à 1)
    pub current_cycle: u32,

    /// Ordre de rotation (qui reçoit à quel cycle)
    pub rotation_order: ManagedVec<M, ManagedAddress<M>>,

    /// Timestamp de début du cycle actuel
    pub cycle_start_timestamp: u64,

    /// Statut du cercle
    pub status: CircleStatus,

    /// Contributions reçues pour le cycle actuel (adresse -> montant)
    pub current_contributions: ManagedVec<M, ManagedAddress<M>>,
}

/// Structure pour stocker un vote
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, ManagedVecItem)]
pub struct Vote<M: ManagedTypeApi> {
    pub voter: ManagedAddress<M>,
    pub approve: bool,
}

/// Structure pour les demandes d'adhésion
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode)]
pub struct MembershipRequest<M: ManagedTypeApi> {
    /// Adresse du candidat
    pub candidate: ManagedAddress<M>,

    /// Timestamp de la demande
    pub timestamp: u64,

    /// Votes enregistrés
    pub votes: ManagedVec<M, Vote<M>>,

    /// Nombre de votes positifs
    pub yes_votes: u32,

    /// Nombre de votes négatifs
    pub no_votes: u32,
}
