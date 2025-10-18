#![no_std]

/// xCircle DAO - Circle Manager Smart Contract
///
/// Ce contrat gère la création et l'orchestration des cercles d'épargne rotative (ROSCA).
/// Il permet aux utilisateurs de créer des cercles, de voter pour de nouveaux membres,
/// de contribuer automatiquement et de recevoir des distributions selon un ordre rotatif.
///
/// Termes importants:
/// - ROSCA: Rotating Savings and Credit Association (tontine)
/// - Circle: Un groupe de personnes qui épargnent ensemble
/// - Cycle: Une période durant laquelle un membre reçoit la somme collective
/// - Contribution: Montant que chaque membre verse par cycle

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Représente l'état actuel d'un cercle
#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode, PartialEq, Eq, Clone, Copy, Debug)]
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
#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode)]
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

/// Structure pour les demandes d'adhésion
#[derive(TypeAbi, TopEncode, TopDecode, NestedEncode, NestedDecode)]
pub struct MembershipRequest<M: ManagedTypeApi> {
    /// Adresse du candidat
    pub candidate: ManagedAddress<M>,

    /// Timestamp de la demande
    pub timestamp: u64,

    /// Votes pour (true) ou contre (false)
    pub votes: ManagedVec<M, (ManagedAddress<M>, bool)>,

    /// Nombre de votes positifs
    pub yes_votes: u32,

    /// Nombre de votes négatifs
    pub no_votes: u32,
}

#[multiversx_sc::contract]
pub trait CircleManagerContract {
    /// Constructeur du contrat
    /// Initialise le compteur de cercles à 0
    #[init]
    fn init(&self) {
        self.next_circle_id().set(1u64);
        self.protocol_fee_percentage().set(300u64); // 3% = 300 basis points
    }

    /// Crée un nouveau cercle d'épargne rotative
    ///
    /// # Arguments
    /// * `contribution_amount` - Montant que chaque membre doit verser par cycle
    /// * `cycle_duration` - Durée d'un cycle en secondes
    /// * `max_members` - Nombre maximum de membres (minimum 3, maximum 50)
    ///
    /// # Returns
    /// ID du cercle créé
    ///
    /// # Errors
    /// - Si contribution_amount est 0
    /// - Si max_members < 3 ou > 50
    /// - Si cycle_duration < 1 jour
    #[endpoint(createCircle)]
    fn create_circle(
        &self,
        contribution_amount: BigUint,
        cycle_duration: u64,
        max_members: u32,
    ) -> u64 {
        // Validations
        require!(contribution_amount > 0u64, "Contribution must be greater than 0");
        require!(max_members >= 3 && max_members <= 50, "Members must be between 3 and 50");
        require!(cycle_duration >= 86400, "Cycle must be at least 1 day"); // 86400 seconds = 1 day

        let creator = self.blockchain().get_caller();
        let circle_id = self.next_circle_id().get();

        // Créer le cercle
        let mut circle = Circle {
            id: circle_id,
            creator: creator.clone(),
            members: ManagedVec::new(),
            contribution_amount,
            cycle_duration,
            max_members,
            current_cycle: 0,
            rotation_order: ManagedVec::new(),
            cycle_start_timestamp: 0,
            status: CircleStatus::Forming,
            current_contributions: ManagedVec::new(),
        };

        // Le créateur est automatiquement membre
        circle.members.push(creator.clone());
        circle.rotation_order.push(creator.clone());

        // Sauvegarder le cercle
        self.circles(circle_id).set(&circle);
        self.next_circle_id().set(circle_id + 1);

        // Émettre événement
        self.circle_created_event(
            circle_id,
            &creator,
            &contribution_amount,
            cycle_duration,
            max_members,
        );

        circle_id
    }

    /// Demande d'adhésion à un cercle
    ///
    /// # Arguments
    /// * `circle_id` - ID du cercle à rejoindre
    ///
    /// # Errors
    /// - Si le cercle n'existe pas
    /// - Si le cercle est complet ou pas en formation
    /// - Si le candidat est déjà membre
    /// - Si une demande est déjà en cours
    #[endpoint(requestMembership)]
    fn request_membership(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();

        // Vérifier que le cercle existe et est en formation
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");

        let circle = self.circles(circle_id).get();
        require!(circle.status == CircleStatus::Forming, "Circle is not accepting members");
        require!(
            circle.members.len() < circle.max_members as usize,
            "Circle is full"
        );

        // Vérifier que le candidat n'est pas déjà membre
        for member in circle.members.iter() {
            require!(member != caller, "Already a member");
        }

        // Vérifier qu'il n'y a pas déjà une demande en cours
        let request_key = (circle_id, caller.clone());
        require!(
            self.membership_requests(&request_key).is_empty(),
            "Request already pending"
        );

        // Créer la demande
        let request = MembershipRequest {
            candidate: caller.clone(),
            timestamp: self.blockchain().get_block_timestamp(),
            votes: ManagedVec::new(),
            yes_votes: 0,
            no_votes: 0,
        };

        self.membership_requests(&request_key).set(&request);

        // Émettre événement
        self.membership_requested_event(circle_id, &caller);
    }

    /// Vote pour ou contre un candidat
    /// Seuls les membres actuels peuvent voter
    /// L'admission requiert l'unanimité (tous votent OUI)
    ///
    /// # Arguments
    /// * `circle_id` - ID du cercle
    /// * `candidate` - Adresse du candidat
    /// * `approve` - true pour approuver, false pour rejeter
    #[endpoint(voteForMember)]
    fn vote_for_member(&self, circle_id: u64, candidate: ManagedAddress, approve: bool) {
        let voter = self.blockchain().get_caller();

        // Vérifier que le cercle existe
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        let circle = self.circles(circle_id).get();

        // Vérifier que le votant est membre
        let mut is_member = false;
        for member in circle.members.iter() {
            if member == voter {
                is_member = true;
                break;
            }
        }
        require!(is_member, "Only members can vote");

        // Récupérer la demande
        let request_key = (circle_id, candidate.clone());
        require!(
            !self.membership_requests(&request_key).is_empty(),
            "No pending request"
        );

        let mut request = self.membership_requests(&request_key).get();

        // Vérifier que le votant n'a pas déjà voté
        for (voted_address, _) in request.votes.iter() {
            require!(voted_address != voter, "Already voted");
        }

        // Enregistrer le vote
        request.votes.push((voter.clone(), approve));
        if approve {
            request.yes_votes += 1;
        } else {
            request.no_votes += 1;
        }

        // Vérifier si tous les membres ont voté
        let total_votes = request.yes_votes + request.no_votes;
        let current_members = circle.members.len() as u32;

        if total_votes == current_members {
            // Tous ont voté - vérifier l'unanimité
            if request.yes_votes == current_members {
                // Unanimité ! Ajouter le membre
                self.add_member_to_circle(circle_id, candidate.clone());

                // Supprimer la demande
                self.membership_requests(&request_key).clear();

                // Émettre événement
                self.member_approved_event(circle_id, &candidate);
            } else {
                // Rejeté
                self.membership_requests(&request_key).clear();
                self.member_rejected_event(circle_id, &candidate);
            }
        } else {
            // Sauvegarder les votes en cours
            self.membership_requests(&request_key).set(&request);
        }

        // Émettre événement de vote
        self.vote_cast_event(circle_id, &voter, &candidate, approve);
    }

    /// Ajoute un membre au cercle
    /// Fonction privée appelée après vote unanime
    fn add_member_to_circle(&self, circle_id: u64, new_member: ManagedAddress) {
        let mut circle = self.circles(circle_id).get();

        circle.members.push(new_member.clone());
        circle.rotation_order.push(new_member);

        // Si le cercle atteint le nombre de membres, le démarrer
        if circle.members.len() == circle.max_members as usize {
            circle.status = CircleStatus::Active;
            circle.current_cycle = 1;
            circle.cycle_start_timestamp = self.blockchain().get_block_timestamp();

            self.circle_started_event(circle_id);
        }

        self.circles(circle_id).set(&circle);
    }

    /// Contribution au cercle pour le cycle actuel
    /// Chaque membre doit contribuer le montant défini
    ///
    /// # Arguments
    /// * `circle_id` - ID du cercle
    ///
    /// # Payment
    /// Montant EGLD = contribution_amount du cercle
    #[payable("EGLD")]
    #[endpoint(contribute)]
    fn contribute(&self, circle_id: u64) {
        let contributor = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();

        // Vérifier que le cercle existe et est actif
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        let mut circle = self.circles(circle_id).get();
        require!(circle.status == CircleStatus::Active, "Circle is not active");

        // Vérifier que le contributeur est membre
        let mut is_member = false;
        for member in circle.members.iter() {
            if member == contributor {
                is_member = true;
                break;
            }
        }
        require!(is_member, "Not a member");

        // Vérifier le montant
        require!(
            payment == circle.contribution_amount,
            "Incorrect contribution amount"
        );

        // Vérifier que le membre n'a pas déjà contribué ce cycle
        for contributed_member in circle.current_contributions.iter() {
            require!(contributed_member != contributor, "Already contributed this cycle");
        }

        // Enregistrer la contribution
        circle.current_contributions.push(contributor.clone());

        // Vérifier si tous ont contribué
        if circle.current_contributions.len() == circle.members.len() {
            // Distribuer les fonds
            self.distribute_funds(circle_id, &mut circle);
        } else {
            self.circles(circle_id).set(&circle);
        }

        // Émettre événement
        self.contribution_made_event(circle_id, &contributor, &payment);
    }

    /// Distribue les fonds collectés au bénéficiaire du cycle
    /// Fonction privée appelée quand tous ont contribué
    fn distribute_funds(&self, circle_id: u64, circle: &mut Circle<Self::Api>) {
        // Calculer le montant total
        let total = &circle.contribution_amount * circle.members.len();

        // Calculer les frais du protocole (3%)
        let fee_percentage = self.protocol_fee_percentage().get();
        let protocol_fee = &total * fee_percentage / 10000u64; // 300 / 10000 = 3%
        let amount_to_distribute = total - &protocol_fee;

        // Déterminer le bénéficiaire (basé sur current_cycle)
        let beneficiary_index = (circle.current_cycle - 1) as usize % circle.rotation_order.len();
        let beneficiary = circle.rotation_order.get(beneficiary_index);

        // Transférer les fonds
        self.send().direct_egld(&beneficiary, &amount_to_distribute);

        // Accumuler les frais dans la trésorerie
        let mut treasury_balance = self.treasury_balance().get();
        treasury_balance += protocol_fee;
        self.treasury_balance().set(&treasury_balance);

        // Préparer le cycle suivant
        circle.current_cycle += 1;
        circle.current_contributions.clear();
        circle.cycle_start_timestamp = self.blockchain().get_block_timestamp();

        // Vérifier si tous les cycles sont complétés
        if circle.current_cycle > circle.members.len() as u32 {
            circle.status = CircleStatus::Completed;
            self.circle_completed_event(circle_id);
        }

        self.circles(circle_id).set(circle);

        // Émettre événement
        self.funds_distributed_event(
            circle_id,
            &beneficiary,
            &amount_to_distribute,
            &protocol_fee,
        );
    }

    // ========== VIEW FUNCTIONS (Lecture seule) ==========

    /// Récupère les informations d'un cercle
    #[view(getCircle)]
    fn get_circle(&self, circle_id: u64) -> Circle<Self::Api> {
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        self.circles(circle_id).get()
    }

    /// Récupère le prochain ID de cercle
    #[view(getNextCircleId)]
    fn get_next_circle_id(&self) -> u64 {
        self.next_circle_id().get()
    }

    /// Récupère le solde de la trésorerie
    #[view(getTreasuryBalance)]
    fn get_treasury_balance(&self) -> BigUint {
        self.treasury_balance().get()
    }

    /// Récupère le pourcentage de frais du protocole
    #[view(getProtocolFee)]
    fn get_protocol_fee(&self) -> u64 {
        self.protocol_fee_percentage().get()
    }

    // ========== STORAGE ==========

    /// Mappage des cercles par ID
    #[view]
    #[storage_mapper("circles")]
    fn circles(&self, circle_id: u64) -> SingleValueMapper<Circle<Self::Api>>;

    /// Prochain ID de cercle disponible
    #[view]
    #[storage_mapper("nextCircleId")]
    fn next_circle_id(&self) -> SingleValueMapper<u64>;

    /// Demandes d'adhésion en attente
    #[view]
    #[storage_mapper("membershipRequests")]
    fn membership_requests(
        &self,
        key: &(u64, ManagedAddress),
    ) -> SingleValueMapper<MembershipRequest<Self::Api>>;

    /// Solde de la trésorerie du protocole
    #[view]
    #[storage_mapper("treasuryBalance")]
    fn treasury_balance(&self) -> SingleValueMapper<BigUint>;

    /// Pourcentage de frais (en basis points, 300 = 3%)
    #[view]
    #[storage_mapper("protocolFeePercentage")]
    fn protocol_fee_percentage(&self) -> SingleValueMapper<u64>;

    // ========== EVENTS ==========

    #[event("circleCreated")]
    fn circle_created_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] creator: &ManagedAddress,
        contribution_amount: &BigUint,
        cycle_duration: u64,
        max_members: u32,
    );

    #[event("membershipRequested")]
    fn membership_requested_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] candidate: &ManagedAddress,
    );

    #[event("voteCast")]
    fn vote_cast_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] voter: &ManagedAddress,
        #[indexed] candidate: &ManagedAddress,
        approve: bool,
    );

    #[event("memberApproved")]
    fn member_approved_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
    );

    #[event("memberRejected")]
    fn member_rejected_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] candidate: &ManagedAddress,
    );

    #[event("circleStarted")]
    fn circle_started_event(&self, #[indexed] circle_id: u64);

    #[event("contributionMade")]
    fn contribution_made_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] contributor: &ManagedAddress,
        amount: &BigUint,
    );

    #[event("fundsDistributed")]
    fn funds_distributed_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] beneficiary: &ManagedAddress,
        amount: &BigUint,
        protocol_fee: &BigUint,
    );

    #[event("circleCompleted")]
    fn circle_completed_event(&self, #[indexed] circle_id: u64);
}
