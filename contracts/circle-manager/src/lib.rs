#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// xCircle DAO - CircleManager Smart Contract
/// Gère les cercles de tontine décentralisée (ROSCA)
#[multiversx_sc::contract]
pub trait CircleManager {
    /// Initialise le contrat
    #[init]
    fn init(&self) {
        self.circle_count().set(0u64);
    }

    /// Fonction appelée lors de l'upgrade du contrat
    #[upgrade]
    fn upgrade(&self) {}

    /// Crée un nouveau cercle avec configuration complète
    ///
    /// # Arguments
    /// * `contribution_amount` - Montant de contribution par cycle (en EGLD)
    /// * `cycle_duration` - Durée d'un cycle en secondes (ex: 2592000 = 30 jours)
    /// * `max_members` - Nombre maximum de membres (5-20 selon whitepaper)
    /// * `name` - Nom du cercle
    #[payable("EGLD")]
    #[endpoint(createCircle)]
    fn create_circle(
        &self,
        contribution_amount: BigUint,
        cycle_duration: u64,
        max_members: u32,
        name: ManagedBuffer,
    ) -> u64 {
        require!(contribution_amount > 0, "Contribution amount must be positive");
        require!(cycle_duration >= 86400, "Cycle duration must be at least 1 day"); // 86400 secondes = 1 jour
        require!(max_members >= 5 && max_members <= 20, "Max members must be between 5 and 20");
        require!(!name.is_empty(), "Circle name cannot be empty");

        let caller = self.blockchain().get_caller();
        let circle_id = self.circle_count().get() + 1;
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Créer le cercle
        let circle = Circle {
            id: circle_id,
            creator: caller.clone(),
            name,
            contribution_amount: contribution_amount.clone(),
            cycle_duration,
            max_members,
            current_cycle: 0u32,
            member_count: 0u32, // Sera incrémenté par add_member_to_circle
            is_active: true,
            created_at: current_timestamp,
            next_distribution_time: current_timestamp + cycle_duration,
        };

        self.circles(circle_id).set(circle);

        // Ajouter le créateur comme premier membre (incrémente member_count à 1)
        self.circle_members(circle_id).insert(caller.clone());
        let mut circle = self.circles(circle_id).get();
        circle.member_count = 1;
        self.circles(circle_id).set(circle);

        // Émettre un événement
        self.circle_created_event(
            circle_id,
            &caller,
            &contribution_amount,
        );

        self.circle_count().set(circle_id);
        circle_id
    }

    /// Demande d'adhésion à un cercle
    #[endpoint(requestMembership)]
    fn request_membership(&self, circle_id: u64) {
        require!(self.circles(circle_id).is_empty() == false, "Circle does not exist");

        let caller = self.blockchain().get_caller();
        let circle = self.circles(circle_id).get();

        require!(circle.is_active, "Circle is not active");
        require!(circle.member_count < circle.max_members, "Circle is full");
        require!(!self.is_member(circle_id, &caller), "Already a member");
        require!(!self.has_pending_request(circle_id, &caller), "Request already pending");

        // Ajouter la demande en attente
        self.pending_requests(circle_id).insert(caller.clone());

        self.membership_requested_event(circle_id, &caller);
    }

    /// Vote pour accepter ou rejeter un candidat
    #[endpoint(voteForMember)]
    fn vote_for_member(&self, circle_id: u64, candidate: ManagedAddress, approve: bool) {
        require!(self.circles(circle_id).is_empty() == false, "Circle does not exist");

        let caller = self.blockchain().get_caller();
        require!(self.is_member(circle_id, &caller), "Only members can vote");
        require!(self.has_pending_request(circle_id, &candidate), "No pending request for this candidate");

        // Enregistrer le vote
        let vote_key = self.get_vote_key(circle_id, &candidate, &caller);
        require!(self.votes(&vote_key).is_empty(), "Already voted for this candidate");

        self.votes(&vote_key).set(approve);

        // Compter les votes
        let (yes_votes, total_votes) = self.count_votes(circle_id, &candidate);
        let members = self.circle_members(circle_id);
        let member_count = members.len();

        // Si majorité simple atteinte (>50% des membres ont voté oui)
        // yes_votes * 2 > member_count signifie plus de 50% des membres
        if yes_votes * 2 > member_count {
            self.add_member_to_circle(circle_id, &candidate);
            self.pending_requests(circle_id).swap_remove(&candidate);
            self.member_approved_event(circle_id, &candidate);
        }
        // Si majorité de rejets (>50% des membres ont voté non)
        else if (total_votes - yes_votes) * 2 > member_count {
            self.pending_requests(circle_id).swap_remove(&candidate);
            self.member_rejected_event(circle_id, &candidate);
        }
    }

    /// Contribution au cercle pour le cycle en cours
    #[payable("EGLD")]
    #[endpoint(contribute)]
    fn contribute(&self, circle_id: u64) {
        require!(self.circles(circle_id).is_empty() == false, "Circle does not exist");

        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld();
        let circle = self.circles(circle_id).get();

        require!(circle.is_active, "Circle is not active");
        require!(self.is_member(circle_id, &caller), "Not a member of this circle");
        require!(payment.clone_value() == circle.contribution_amount, "Invalid contribution amount");

        let cycle = circle.current_cycle;
        require!(!self.has_contributed(circle_id, cycle, &caller), "Already contributed for this cycle");

        // Enregistrer la contribution
        self.contributions(circle_id, cycle, &caller).set(payment.clone_value());

        self.contribution_made_event(circle_id, cycle, &caller, &payment.clone_value());
    }

    /// Force la distribution des fonds (admin/créateur uniquement)
    /// Ignore la vérification du temps de distribution
    #[endpoint(forceDistribute)]
    fn force_distribute(&self, circle_id: u64) {
        require!(self.circles(circle_id).is_empty() == false, "Circle does not exist");

        let caller = self.blockchain().get_caller();
        let circle = self.circles(circle_id).get();

        // Seul le créateur peut forcer la distribution
        require!(caller == circle.creator, "Only creator can force distribute");
        require!(circle.is_active, "Circle is not active");

        // Appeler la logique interne de distribution
        self.internal_distribute(circle_id);
    }

    /// Distribue les fonds au bénéficiaire du cycle
    /// Seuls les membres ou le créateur du cercle peuvent distribuer
    #[endpoint(distributeFunds)]
    fn distribute_funds(&self, circle_id: u64) {
        require!(self.circles(circle_id).is_empty() == false, "Circle does not exist");

        let caller = self.blockchain().get_caller();
        let circle = self.circles(circle_id).get();
        let current_time = self.blockchain().get_block_timestamp();

        // Seuls les membres ou le créateur peuvent distribuer
        require!(
            self.is_member(circle_id, &caller) || caller == circle.creator,
            "Only members or creator can distribute funds"
        );

        require!(circle.is_active, "Circle is not active");
        require!(current_time >= circle.next_distribution_time, "Distribution time not reached");

        // Appeler la logique interne de distribution
        self.internal_distribute(circle_id);
    }

    /// Récupère les informations d'un cercle
    #[view(getCircle)]
    fn get_circle(&self, circle_id: u64) -> OptionalValue<Circle<Self::Api>> {
        if self.circles(circle_id).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.circles(circle_id).get())
        }
    }

    /// Récupère le nombre total de cercles
    #[view(getCircleCount)]
    fn get_circle_count(&self) -> u64 {
        self.circle_count().get()
    }

    /// Récupère les membres d'un cercle
    #[view(getCircleMembers)]
    fn get_circle_members(&self, circle_id: u64) -> ManagedVec<ManagedAddress> {
        self.circle_members(circle_id).iter().collect()
    }

    /// Vérifie si une adresse est membre d'un cercle
    #[view(isMember)]
    fn is_member(&self, circle_id: u64, address: &ManagedAddress) -> bool {
        self.circle_members(circle_id).contains(address)
    }

    /// Récupère le solde de la treasury
    #[view(getTreasuryBalance)]
    fn get_treasury_balance(&self) -> BigUint {
        self.treasury_balance().get()
    }

    /// Récupère les demandes d'adhésion en attente pour un cercle
    #[view(getPendingRequests)]
    fn get_pending_requests(&self, circle_id: u64) -> ManagedVec<ManagedAddress> {
        self.pending_requests(circle_id).iter().collect()
    }

    /// Récupère le créateur d'un cercle
    #[view(getCircleCreator)]
    fn get_circle_creator(&self, circle_id: u64) -> OptionalValue<ManagedAddress> {
        if self.circles(circle_id).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.circles(circle_id).get().creator)
        }
    }

    /// Vérifie si une adresse a une demande en attente
    #[view(hasPendingRequest)]
    fn has_pending_request_view(&self, circle_id: u64, address: ManagedAddress) -> bool {
        self.pending_requests(circle_id).contains(&address)
    }

    /// Vérifie si un membre a déjà voté pour un candidat
    #[view(hasVoted)]
    fn has_voted(&self, circle_id: u64, candidate: ManagedAddress, voter: ManagedAddress) -> bool {
        let vote_key = self.get_vote_key(circle_id, &candidate, &voter);
        !self.votes(&vote_key).is_empty()
    }

    /// Vérifie si un membre a contribué pour le cycle en cours
    #[view(hasContributed)]
    fn has_contributed_view(&self, circle_id: u64, member: ManagedAddress) -> bool {
        if self.circles(circle_id).is_empty() {
            return false;
        }
        let circle = self.circles(circle_id).get();
        self.has_contributed(circle_id, circle.current_cycle, &member)
    }

    /// Récupère la liste des contributeurs pour le cycle en cours
    #[view(getCycleContributors)]
    fn get_cycle_contributors(&self, circle_id: u64) -> ManagedVec<ManagedAddress> {
        let mut contributors = ManagedVec::new();

        if self.circles(circle_id).is_empty() {
            return contributors;
        }

        let circle = self.circles(circle_id).get();
        let members = self.get_circle_members(circle_id);

        for member in &members {
            if self.has_contributed(circle_id, circle.current_cycle, &member) {
                contributors.push(member.clone());
            }
        }

        contributors
    }

    /// Récupère le nombre de contributeurs pour le cycle en cours
    #[view(getCycleContributorCount)]
    fn get_cycle_contributor_count(&self, circle_id: u64) -> u32 {
        if self.circles(circle_id).is_empty() {
            return 0;
        }

        let circle = self.circles(circle_id).get();
        let members = self.get_circle_members(circle_id);
        let mut count = 0u32;

        for member in &members {
            if self.has_contributed(circle_id, circle.current_cycle, &member) {
                count += 1;
            }
        }

        count
    }

    // ========== Fonctions privées ==========

    /// Logique interne de distribution des fonds
    fn internal_distribute(&self, circle_id: u64) {
        let mut circle = self.circles(circle_id).get();
        let current_time = self.blockchain().get_block_timestamp();

        // Vérifier que tous les membres ont contribué
        let members = self.get_circle_members(circle_id);
        let mut total_collected = BigUint::zero();

        for member in &members {
            require!(self.has_contributed(circle_id, circle.current_cycle, &member), "Not all members have contributed");
            let contribution = self.contributions(circle_id, circle.current_cycle, &member).get();
            total_collected += contribution;
        }

        // Calculer les frais (2-5% selon whitepaper, ici 3%)
        let fee_percentage = BigUint::from(3u32);
        let fee = (&total_collected * &fee_percentage) / BigUint::from(100u32);
        let amount_to_distribute = total_collected - &fee;

        // Déterminer le bénéficiaire (rotation simple)
        let beneficiary_index = (circle.current_cycle as usize) % members.len();
        let beneficiary = members.get(beneficiary_index);

        // Transférer les fonds au bénéficiaire
        self.send().direct_egld(&beneficiary, &amount_to_distribute);

        // Stocker les frais pour la treasury
        let current_treasury = self.treasury_balance().get();
        self.treasury_balance().set(current_treasury + fee);

        // Passer au cycle suivant
        circle.current_cycle += 1;
        circle.next_distribution_time = current_time + circle.cycle_duration;

        // Si tous les membres ont reçu, terminer le cercle
        if circle.current_cycle >= circle.member_count {
            circle.is_active = false;
        }

        self.circles(circle_id).set(circle.clone());

        self.funds_distributed_event(
            circle_id,
            circle.current_cycle - 1,
            &beneficiary,
            &amount_to_distribute,
        );
    }

    fn add_member_to_circle(&self, circle_id: u64, member: &ManagedAddress) {
        self.circle_members(circle_id).insert(member.clone());

        let mut circle = self.circles(circle_id).get();
        circle.member_count += 1;
        self.circles(circle_id).set(circle);
    }

    fn has_pending_request(&self, circle_id: u64, address: &ManagedAddress) -> bool {
        self.pending_requests(circle_id).contains(address)
    }

    fn has_contributed(&self, circle_id: u64, cycle: u32, member: &ManagedAddress) -> bool {
        !self.contributions(circle_id, cycle, member).is_empty()
    }

    fn get_vote_key(&self, circle_id: u64, candidate: &ManagedAddress, voter: &ManagedAddress) -> ManagedBuffer {
        let mut key = ManagedBuffer::new();
        key.append(&ManagedBuffer::from(circle_id.to_be_bytes().as_ref()));
        key.append(&candidate.as_managed_buffer());
        key.append(&voter.as_managed_buffer());
        key
    }

    fn count_votes(&self, circle_id: u64, candidate: &ManagedAddress) -> (usize, usize) {
        let members = self.get_circle_members(circle_id);
        let mut yes_votes = 0;
        let mut total_votes = 0;

        for member in &members {
            let vote_key = self.get_vote_key(circle_id, candidate, &member);
            if !self.votes(&vote_key).is_empty() {
                total_votes += 1;
                if self.votes(&vote_key).get() {
                    yes_votes += 1;
                }
            }
        }

        (yes_votes, total_votes)
    }

    // ========== Events ==========

    #[event("circleCreated")]
    fn circle_created_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] creator: &ManagedAddress,
        #[indexed] contribution_amount: &BigUint,
    );

    #[event("membershipRequested")]
    fn membership_requested_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] candidate: &ManagedAddress,
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

    #[event("contributionMade")]
    fn contribution_made_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] cycle: u32,
        #[indexed] member: &ManagedAddress,
        amount: &BigUint,
    );

    #[event("fundsDistributed")]
    fn funds_distributed_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] cycle: u32,
        #[indexed] beneficiary: &ManagedAddress,
        amount: &BigUint,
    );

    // ========== Storage ==========

    #[storage_mapper("circle_count")]
    fn circle_count(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("circles")]
    fn circles(&self, circle_id: u64) -> SingleValueMapper<Circle<Self::Api>>;

    #[storage_mapper("circle_members")]
    fn circle_members(&self, circle_id: u64) -> UnorderedSetMapper<ManagedAddress>;

    #[storage_mapper("pending_requests")]
    fn pending_requests(&self, circle_id: u64) -> UnorderedSetMapper<ManagedAddress>;

    #[storage_mapper("contributions")]
    fn contributions(&self, circle_id: u64, cycle: u32, member: &ManagedAddress) -> SingleValueMapper<BigUint>;

    #[storage_mapper("votes")]
    fn votes(&self, vote_key: &ManagedBuffer) -> SingleValueMapper<bool>;

    #[storage_mapper("treasury_balance")]
    fn treasury_balance(&self) -> SingleValueMapper<BigUint>;
}

/// Structure représentant un cercle de tontine
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Circle<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    pub name: ManagedBuffer<M>,
    pub contribution_amount: BigUint<M>,
    pub cycle_duration: u64,
    pub max_members: u32,
    pub current_cycle: u32,
    pub member_count: u32,
    pub is_active: bool,
    pub created_at: u64,
    pub next_distribution_time: u64,
}
