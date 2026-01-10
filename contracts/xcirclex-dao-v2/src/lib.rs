#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

mod staking_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait StakingContractProxy {
        #[view(getTotalStakedByUser)]
        fn get_total_staked_by_user(&self, user: ManagedAddress) -> BigUint;
    }
}

/// Proposal status
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum ProposalStatus {
    Pending,    // Waiting for voting to start
    Active,     // Voting in progress
    Passed,     // Passed, waiting for execution
    Executed,   // Successfully executed
    Rejected,   // Rejected by voters
    Cancelled,  // Cancelled by proposer or admin
    Expired,    // Timelock expired without execution
}

/// Proposal type - V2 includes EGLD transfers
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum ProposalType {
    TransferFunds,      // Transfer XCIRCLEX tokens from treasury
    TransferEgld,       // NEW: Transfer EGLD from treasury
    ChangeParameter,    // Change DAO parameters
    AddMember,          // Add council member
    RemoveMember,       // Remove council member
    UpgradeContract,    // Upgrade a contract
    Custom,             // Custom proposal (text only)
}

/// Proposal data
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Proposal<M: ManagedTypeApi> {
    pub id: u64,
    pub proposer: ManagedAddress<M>,
    pub title: ManagedBuffer<M>,
    pub description: ManagedBuffer<M>,
    pub proposal_type: ProposalType,
    pub status: ProposalStatus,
    pub votes_for: BigUint<M>,
    pub votes_against: BigUint<M>,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub execution_time: u64,        // When it can be executed (after timelock)
    pub target_address: ManagedAddress<M>,  // For transfers/upgrades
    pub amount: BigUint<M>,                 // For fund transfers
    pub executed: bool,
}

/// Vote record
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Vote<M: ManagedTypeApi> {
    pub voter: ManagedAddress<M>,
    pub voting_power: BigUint<M>,
    pub support: bool,  // true = for, false = against
    pub timestamp: u64,
}

/// ============================================================================
/// XCIRCLEX DAO V2 SMART CONTRACT
/// ============================================================================
///
/// Version 2 avec support EGLD:
/// - Peut recevoir EGLD depuis Circle of Life Center (SC0)
/// - Gestion de deux treasuries: XCIRCLEX et EGLD
/// - Propositions pour transferts EGLD
/// - Vote pondéré par tokens XCIRCLEX
///
/// Distribution depuis SC0:
/// - 30% des EGLD (après 3.14% treasury) vont au DAO
/// ============================================================================

#[multiversx_sc::contract]
pub trait XCirclexDaoV2 {

    // =========================================================================
    // INIT
    // =========================================================================

    #[init]
    fn init(&self, token_id: TokenIdentifier) {
        self.xcirclex_token_id().set(&token_id);
        self.proposal_count().set(0u64);
        self.egld_treasury().set(BigUint::zero());
        self.total_egld_received().set(BigUint::zero());

        // Default parameters
        self.min_proposal_threshold().set(BigUint::from(100_000u64) * BigUint::from(10u64).pow(18)); // 100K tokens
        self.voting_period().set(7u64 * 24u64 * 60u64 * 60u64); // 7 days
        self.timelock_period().set(2u64 * 24u64 * 60u64 * 60u64); // 2 days
        self.quorum_percentage().set(400u64); // 4% quorum
        self.pass_threshold().set(5000u64); // 50% to pass
    }

    #[upgrade]
    fn upgrade(&self) {}

    // =========================================================================
    // TREASURY MANAGEMENT - XCIRCLEX
    // =========================================================================

    /// Deposit XCIRCLEX tokens to the DAO treasury (anyone can deposit)
    #[payable("*")]
    #[endpoint(depositToTreasury)]
    fn deposit_to_treasury(&self) {
        let payment = self.call_value().single_esdt();
        let token_id = self.xcirclex_token_id().get();

        require!(
            payment.token_identifier == token_id,
            "Only XCIRCLEX tokens accepted"
        );

        self.treasury_deposited_event(&self.blockchain().get_caller(), &payment.amount);
    }

    /// Get XCIRCLEX treasury balance
    #[view(getTreasuryBalance)]
    fn get_treasury_balance(&self) -> BigUint {
        let token_id = self.xcirclex_token_id().get();
        self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::esdt(token_id), 0)
    }

    // =========================================================================
    // TREASURY MANAGEMENT - EGLD (NEW IN V2)
    // =========================================================================

    /// Deposit EGLD to the DAO treasury (anyone can deposit)
    #[payable("EGLD")]
    #[endpoint(depositEgldToTreasury)]
    fn deposit_egld_to_treasury(&self) {
        let payment = self.call_value().egld_value().clone_value();

        require!(payment > 0, "Must send EGLD");

        // Update EGLD treasury tracking
        let current = self.egld_treasury().get();
        self.egld_treasury().set(&(&current + &payment));

        let total = self.total_egld_received().get();
        self.total_egld_received().set(&(&total + &payment));

        self.egld_deposited_event(&self.blockchain().get_caller(), &payment);
    }

    /// Receive EGLD from Circle of Life Center (SC0)
    /// Only callable by the configured SC0 address
    #[payable("EGLD")]
    #[endpoint(receiveFromCircleOfLife)]
    fn receive_from_circle_of_life(&self) {
        let caller = self.blockchain().get_caller();
        let sc0_address = self.circle_of_life_address().get();

        require!(
            !self.circle_of_life_address().is_empty(),
            "Circle of Life address not configured"
        );
        require!(
            caller == sc0_address,
            "Only Circle of Life Center can send EGLD via this endpoint"
        );

        let payment = self.call_value().egld_value().clone_value();

        require!(payment > 0, "Must send EGLD");

        // Update EGLD treasury
        let current = self.egld_treasury().get();
        self.egld_treasury().set(&(&current + &payment));

        let total = self.total_egld_received().get();
        self.total_egld_received().set(&(&total + &payment));

        self.egld_received_from_sc0_event(&payment);
    }

    /// Get EGLD treasury balance
    #[view(getEgldTreasuryBalance)]
    fn get_egld_treasury_balance(&self) -> BigUint {
        self.egld_treasury().get()
    }

    // =========================================================================
    // PROPOSAL MANAGEMENT
    // =========================================================================

    /// Create a new proposal
    /// Council members can create proposals without sending tokens
    /// Regular users must send minimum tokens as proof of stake (tokens are returned)
    #[payable("*")]
    #[endpoint(createProposal)]
    fn create_proposal(
        &self,
        title: ManagedBuffer,
        description: ManagedBuffer,
        proposal_type: ProposalType,
        target_address: ManagedAddress,
        amount: BigUint,
    ) -> u64 {
        let caller = self.blockchain().get_caller();
        let token_id = self.xcirclex_token_id().get();
        let min_threshold = self.min_proposal_threshold().get();
        let is_council = self.council_members().contains(&caller);

        // Validate proposal type specific requirements
        if proposal_type == ProposalType::TransferEgld {
            let egld_balance = self.egld_treasury().get();
            require!(
                amount <= egld_balance,
                "EGLD amount exceeds treasury balance"
            );
        }

        // Council members can create proposals without token requirement
        if !is_council {
            let payment = self.call_value().single_esdt();
            require!(
                payment.token_identifier == token_id,
                "Must send XCIRCLEX tokens"
            );
            require!(
                payment.amount >= min_threshold,
                "Insufficient tokens sent - minimum required for proposal"
            );

            // Return tokens to caller immediately
            self.send().direct_esdt(&caller, &token_id, 0, &payment.amount);
        }

        let current_time = self.blockchain().get_block_timestamp();
        let voting_period = self.voting_period().get();
        let timelock = self.timelock_period().get();

        let proposal_id = self.proposal_count().get() + 1;
        self.proposal_count().set(proposal_id);

        let proposal = Proposal {
            id: proposal_id,
            proposer: caller.clone(),
            title,
            description,
            proposal_type,
            status: ProposalStatus::Active,
            votes_for: BigUint::zero(),
            votes_against: BigUint::zero(),
            created_at: current_time,
            voting_ends_at: current_time + voting_period,
            execution_time: current_time + voting_period + timelock,
            target_address,
            amount,
            executed: false,
        };

        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().insert(proposal_id);

        self.proposal_created_event(proposal_id, &caller);

        proposal_id
    }

    /// Vote on a proposal (send tokens as voting power - tokens are returned after vote)
    #[payable("*")]
    #[endpoint(vote)]
    fn vote(&self, proposal_id: u64, support: bool) {
        let caller = self.blockchain().get_caller();
        let token_id = self.xcirclex_token_id().get();

        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();
        let current_time = self.blockchain().get_block_timestamp();

        require!(
            proposal.status == ProposalStatus::Active,
            "Proposal is not active"
        );
        require!(
            current_time <= proposal.voting_ends_at,
            "Voting period has ended"
        );
        require!(
            !self.has_voted(proposal_id, &caller).get(),
            "Already voted"
        );

        // Get voting power from sent tokens
        let payment = self.call_value().single_esdt();
        require!(
            payment.token_identifier == token_id,
            "Must send XCIRCLEX tokens to vote"
        );
        let voting_power = payment.amount.clone();

        require!(voting_power > 0, "Must send tokens to vote");

        // Return tokens to caller immediately
        self.send().direct_esdt(&caller, &token_id, 0, &payment.amount);

        // Record vote
        if support {
            proposal.votes_for += &voting_power;
        } else {
            proposal.votes_against += &voting_power;
        }

        self.proposals(proposal_id).set(&proposal);
        self.has_voted(proposal_id, &caller).set(true);

        let vote_record = Vote {
            voter: caller.clone(),
            voting_power: voting_power.clone(),
            support,
            timestamp: current_time,
        };
        self.votes(proposal_id, &caller).set(&vote_record);

        self.vote_cast_event(proposal_id, &caller, support, &voting_power);
    }

    /// Finalize voting and determine outcome
    #[endpoint(finalizeProposal)]
    fn finalize_proposal(&self, proposal_id: u64) {
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();
        let current_time = self.blockchain().get_block_timestamp();

        require!(
            proposal.status == ProposalStatus::Active,
            "Proposal is not active"
        );
        require!(
            current_time > proposal.voting_ends_at,
            "Voting period not ended"
        );

        // Calculate total votes
        let total_votes = &proposal.votes_for + &proposal.votes_against;

        // Check quorum
        let token_id = self.xcirclex_token_id().get();
        let total_supply = self.get_total_token_supply(&token_id);
        let quorum_percentage = self.quorum_percentage().get();
        let required_quorum = &total_supply * quorum_percentage / 10000u64;

        if total_votes < required_quorum {
            proposal.status = ProposalStatus::Rejected;
            self.proposals(proposal_id).set(&proposal);
            self.active_proposals().swap_remove(&proposal_id);
            self.proposal_finalized_event(proposal_id, false);
            return;
        }

        // Check if passed (>50% for votes)
        let pass_threshold = self.pass_threshold().get();
        let votes_for_percentage = if total_votes > 0 {
            &proposal.votes_for * 10000u64 / &total_votes
        } else {
            BigUint::zero()
        };

        if votes_for_percentage >= pass_threshold {
            proposal.status = ProposalStatus::Passed;
            self.proposals(proposal_id).set(&proposal);
            self.proposal_finalized_event(proposal_id, true);
        } else {
            proposal.status = ProposalStatus::Rejected;
            self.proposals(proposal_id).set(&proposal);
            self.active_proposals().swap_remove(&proposal_id);
            self.proposal_finalized_event(proposal_id, false);
        }
    }

    /// Execute a passed proposal (after timelock)
    #[endpoint(executeProposal)]
    fn execute_proposal(&self, proposal_id: u64) {
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();
        let current_time = self.blockchain().get_block_timestamp();

        require!(
            proposal.status == ProposalStatus::Passed,
            "Proposal not passed"
        );
        require!(
            !proposal.executed,
            "Already executed"
        );
        require!(
            current_time >= proposal.execution_time,
            "Timelock not expired"
        );

        // Execute based on proposal type
        match proposal.proposal_type {
            ProposalType::TransferFunds => {
                self.execute_xcirclex_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::TransferEgld => {
                self.execute_egld_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::ChangeParameter => {
                // Parameters are changed via separate admin functions
            },
            ProposalType::AddMember => {
                self.council_members().insert(proposal.target_address.clone());
            },
            ProposalType::RemoveMember => {
                self.council_members().swap_remove(&proposal.target_address);
            },
            ProposalType::UpgradeContract => {
                // Contract upgrades handled externally
            },
            ProposalType::Custom => {
                // Custom proposals are informational only
            },
        }

        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;
        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().swap_remove(&proposal_id);

        self.proposal_executed_event(proposal_id);
    }

    /// Cancel a proposal (only proposer or owner)
    #[endpoint(cancelProposal)]
    fn cancel_proposal(&self, proposal_id: u64) {
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();
        let caller = self.blockchain().get_caller();
        let owner = self.blockchain().get_owner_address();

        require!(
            caller == proposal.proposer || caller == owner,
            "Not authorized to cancel"
        );
        require!(
            proposal.status == ProposalStatus::Active || proposal.status == ProposalStatus::Passed,
            "Cannot cancel"
        );

        proposal.status = ProposalStatus::Cancelled;
        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().swap_remove(&proposal_id);

        self.proposal_cancelled_event(proposal_id);
    }

    /// Veto a proposal (council members only)
    #[endpoint(vetoProposal)]
    fn veto_proposal(&self, proposal_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(
            self.council_members().contains(&caller),
            "Only council members can veto"
        );
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();

        require!(
            proposal.status == ProposalStatus::Active || proposal.status == ProposalStatus::Passed,
            "Can only veto active or passed proposals"
        );

        proposal.status = ProposalStatus::Cancelled;
        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().swap_remove(&proposal_id);

        self.proposal_vetoed_event(proposal_id, &caller);
    }

    /// Emergency execute a proposal (council members only)
    #[endpoint(councilExecute)]
    fn council_execute(&self, proposal_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(
            self.council_members().contains(&caller),
            "Only council members can emergency execute"
        );
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();

        require!(
            proposal.status == ProposalStatus::Passed,
            "Proposal must be passed to execute"
        );
        require!(
            !proposal.executed,
            "Already executed"
        );

        // Execute based on proposal type (bypasses timelock)
        match proposal.proposal_type {
            ProposalType::TransferFunds => {
                self.execute_xcirclex_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::TransferEgld => {
                self.execute_egld_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::ChangeParameter => {},
            ProposalType::AddMember => {
                self.council_members().insert(proposal.target_address.clone());
            },
            ProposalType::RemoveMember => {
                self.council_members().swap_remove(&proposal.target_address);
            },
            ProposalType::UpgradeContract => {},
            ProposalType::Custom => {},
        }

        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;
        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().swap_remove(&proposal_id);

        self.council_executed_event(proposal_id, &caller);
    }

    // =========================================================================
    // INTERNAL FUNCTIONS
    // =========================================================================

    fn execute_xcirclex_transfer(&self, to: &ManagedAddress, amount: &BigUint) {
        let token_id = self.xcirclex_token_id().get();
        let treasury_balance = self.get_treasury_balance();

        require!(treasury_balance >= *amount, "Insufficient XCIRCLEX treasury balance");

        self.send().direct_esdt(to, &token_id, 0, amount);

        self.funds_transferred_event(to, amount);
    }

    fn execute_egld_transfer(&self, to: &ManagedAddress, amount: &BigUint) {
        let egld_balance = self.egld_treasury().get();

        require!(egld_balance >= *amount, "Insufficient EGLD treasury balance");

        // Update treasury tracking
        self.egld_treasury().set(&(&egld_balance - amount));

        // Send EGLD
        self.send().direct_egld(to, amount);

        self.egld_transferred_event(to, amount);
    }

    fn get_total_token_supply(&self, _token_id: &TokenIdentifier) -> BigUint {
        // PI * 10^8 with 18 decimals
        BigUint::from(314_159_265u64) * BigUint::from(10u64).pow(18)
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================

    #[only_owner]
    #[endpoint(setMinProposalThreshold)]
    fn set_min_proposal_threshold(&self, threshold: BigUint) {
        self.min_proposal_threshold().set(&threshold);
    }

    #[only_owner]
    #[endpoint(setVotingPeriod)]
    fn set_voting_period(&self, period_seconds: u64) {
        require!(period_seconds >= 86400, "Minimum 1 day voting period");
        self.voting_period().set(period_seconds);
    }

    #[only_owner]
    #[endpoint(setTimelockPeriod)]
    fn set_timelock_period(&self, period_seconds: u64) {
        self.timelock_period().set(period_seconds);
    }

    #[only_owner]
    #[endpoint(setQuorumPercentage)]
    fn set_quorum_percentage(&self, percentage_bp: u64) {
        require!(percentage_bp <= 10000, "Invalid percentage");
        self.quorum_percentage().set(percentage_bp);
    }

    #[only_owner]
    #[endpoint(setPassThreshold)]
    fn set_pass_threshold(&self, threshold_bp: u64) {
        require!(threshold_bp <= 10000, "Invalid threshold");
        self.pass_threshold().set(threshold_bp);
    }

    /// Emergency withdraw XCIRCLEX (only owner)
    #[only_owner]
    #[endpoint(emergencyWithdraw)]
    fn emergency_withdraw(&self, to: ManagedAddress, amount: BigUint) {
        let token_id = self.xcirclex_token_id().get();
        self.send().direct_esdt(&to, &token_id, 0, &amount);
        self.emergency_withdraw_event(&to, &amount);
    }

    /// Emergency withdraw EGLD (only owner)
    #[only_owner]
    #[endpoint(emergencyWithdrawEgld)]
    fn emergency_withdraw_egld(&self, to: ManagedAddress, amount: BigUint) {
        let egld_balance = self.egld_treasury().get();
        require!(egld_balance >= amount, "Insufficient EGLD balance");

        self.egld_treasury().set(&(&egld_balance - &amount));
        self.send().direct_egld(&to, &amount);

        self.emergency_withdraw_egld_event(&to, &amount);
    }

    /// Force execute a proposal (only owner, for testing)
    #[only_owner]
    #[endpoint(forceExecute)]
    fn force_execute(&self, proposal_id: u64) {
        require!(
            !self.proposals(proposal_id).is_empty(),
            "Proposal not found"
        );

        let mut proposal = self.proposals(proposal_id).get();

        require!(
            proposal.status == ProposalStatus::Active || proposal.status == ProposalStatus::Passed,
            "Proposal must be Active or Passed"
        );
        require!(
            !proposal.executed,
            "Already executed"
        );

        match proposal.proposal_type {
            ProposalType::TransferFunds => {
                self.execute_xcirclex_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::TransferEgld => {
                self.execute_egld_transfer(&proposal.target_address, &proposal.amount);
            },
            ProposalType::ChangeParameter => {},
            ProposalType::AddMember => {
                self.council_members().insert(proposal.target_address.clone());
            },
            ProposalType::RemoveMember => {
                self.council_members().swap_remove(&proposal.target_address);
            },
            ProposalType::UpgradeContract => {},
            ProposalType::Custom => {},
        }

        proposal.executed = true;
        proposal.status = ProposalStatus::Executed;
        self.proposals(proposal_id).set(&proposal);
        self.active_proposals().swap_remove(&proposal_id);

        self.proposal_executed_event(proposal_id);
    }

    #[only_owner]
    #[endpoint(setStakingContract)]
    fn set_staking_contract(&self, staking_address: ManagedAddress) {
        self.staking_contract_address().set(&staking_address);
    }

    /// Set Circle of Life Center address (SC0)
    #[only_owner]
    #[endpoint(setCircleOfLifeAddress)]
    fn set_circle_of_life_address(&self, sc0_address: ManagedAddress) {
        self.circle_of_life_address().set(&sc0_address);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    #[view(getProposal)]
    fn get_proposal(&self, proposal_id: u64) -> Proposal<Self::Api> {
        self.proposals(proposal_id).get()
    }

    #[view(getProposalCount)]
    fn get_proposal_count(&self) -> u64 {
        self.proposal_count().get()
    }

    #[view(getActiveProposals)]
    fn get_active_proposals(&self) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for id in self.active_proposals().iter() {
            result.push(id);
        }
        result
    }

    #[view(getVotingPower)]
    fn get_voting_power(&self, address: ManagedAddress) -> BigUint {
        let token_id = self.xcirclex_token_id().get();
        let wallet_balance = self.blockchain().get_esdt_balance(&address, &token_id, 0);

        let staked_balance = if !self.staking_contract_address().is_empty() {
            let staking_address = self.staking_contract_address().get();
            self.staking_contract_proxy(staking_address)
                .get_total_staked_by_user(address)
                .execute_on_dest_context::<BigUint>()
        } else {
            BigUint::zero()
        };

        wallet_balance + staked_balance
    }

    #[proxy]
    fn staking_contract_proxy(&self, address: ManagedAddress) -> staking_proxy::StakingContractProxy<Self::Api>;

    #[view(getStakingContractAddress)]
    fn get_staking_contract_address(&self) -> ManagedAddress {
        self.staking_contract_address().get()
    }

    #[view(getCircleOfLifeAddress)]
    fn get_circle_of_life_address(&self) -> ManagedAddress {
        self.circle_of_life_address().get()
    }

    #[view(hasVoted)]
    fn has_voted_view(&self, proposal_id: u64, voter: ManagedAddress) -> bool {
        self.has_voted(proposal_id, &voter).get()
    }

    #[view(getVote)]
    fn get_vote(&self, proposal_id: u64, voter: ManagedAddress) -> Vote<Self::Api> {
        self.votes(proposal_id, &voter).get()
    }

    #[view(getMinProposalThreshold)]
    fn get_min_proposal_threshold(&self) -> BigUint {
        self.min_proposal_threshold().get()
    }

    #[view(getVotingPeriod)]
    fn get_voting_period(&self) -> u64 {
        self.voting_period().get()
    }

    #[view(getTimelockPeriod)]
    fn get_timelock_period(&self) -> u64 {
        self.timelock_period().get()
    }

    #[view(getQuorumPercentage)]
    fn get_quorum_percentage(&self) -> u64 {
        self.quorum_percentage().get()
    }

    #[view(getPassThreshold)]
    fn get_pass_threshold(&self) -> u64 {
        self.pass_threshold().get()
    }

    #[view(getTokenId)]
    fn get_token_id(&self) -> TokenIdentifier {
        self.xcirclex_token_id().get()
    }

    #[view(isCouncilMember)]
    fn is_council_member(&self, address: ManagedAddress) -> bool {
        self.council_members().contains(&address)
    }

    #[view(getCouncilMembers)]
    fn get_council_members(&self) -> MultiValueEncoded<ManagedAddress> {
        let mut result = MultiValueEncoded::new();
        for member in self.council_members().iter() {
            result.push(member);
        }
        result
    }

    #[view(getCouncilMemberCount)]
    fn get_council_member_count(&self) -> usize {
        self.council_members().len()
    }

    // =========================================================================
    // STORAGE
    // =========================================================================

    #[storage_mapper("xcirclex_token_id")]
    fn xcirclex_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("proposals")]
    fn proposals(&self, proposal_id: u64) -> SingleValueMapper<Proposal<Self::Api>>;

    #[storage_mapper("proposal_count")]
    fn proposal_count(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("active_proposals")]
    fn active_proposals(&self) -> UnorderedSetMapper<u64>;

    #[storage_mapper("has_voted")]
    fn has_voted(&self, proposal_id: u64, voter: &ManagedAddress) -> SingleValueMapper<bool>;

    #[storage_mapper("votes")]
    fn votes(&self, proposal_id: u64, voter: &ManagedAddress) -> SingleValueMapper<Vote<Self::Api>>;

    #[storage_mapper("council_members")]
    fn council_members(&self) -> UnorderedSetMapper<ManagedAddress>;

    // Parameters
    #[storage_mapper("min_proposal_threshold")]
    fn min_proposal_threshold(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("voting_period")]
    fn voting_period(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("timelock_period")]
    fn timelock_period(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("quorum_percentage")]
    fn quorum_percentage(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("pass_threshold")]
    fn pass_threshold(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("staking_contract_address")]
    fn staking_contract_address(&self) -> SingleValueMapper<ManagedAddress>;

    // V2: Circle of Life and EGLD storage
    #[storage_mapper("circle_of_life_address")]
    fn circle_of_life_address(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("egld_treasury")]
    fn egld_treasury(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("total_egld_received")]
    fn total_egld_received(&self) -> SingleValueMapper<BigUint>;

    // =========================================================================
    // EVENTS
    // =========================================================================

    #[event("treasury_deposited")]
    fn treasury_deposited_event(
        &self,
        #[indexed] depositor: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("egld_deposited")]
    fn egld_deposited_event(
        &self,
        #[indexed] depositor: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("egld_received_from_sc0")]
    fn egld_received_from_sc0_event(
        &self,
        #[indexed] amount: &BigUint,
    );

    #[event("proposal_created")]
    fn proposal_created_event(
        &self,
        #[indexed] proposal_id: u64,
        #[indexed] proposer: &ManagedAddress,
    );

    #[event("vote_cast")]
    fn vote_cast_event(
        &self,
        #[indexed] proposal_id: u64,
        #[indexed] voter: &ManagedAddress,
        #[indexed] support: bool,
        #[indexed] voting_power: &BigUint,
    );

    #[event("proposal_finalized")]
    fn proposal_finalized_event(
        &self,
        #[indexed] proposal_id: u64,
        #[indexed] passed: bool,
    );

    #[event("proposal_executed")]
    fn proposal_executed_event(
        &self,
        #[indexed] proposal_id: u64,
    );

    #[event("proposal_cancelled")]
    fn proposal_cancelled_event(
        &self,
        #[indexed] proposal_id: u64,
    );

    #[event("funds_transferred")]
    fn funds_transferred_event(
        &self,
        #[indexed] recipient: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("egld_transferred")]
    fn egld_transferred_event(
        &self,
        #[indexed] recipient: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("emergency_withdraw")]
    fn emergency_withdraw_event(
        &self,
        #[indexed] recipient: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("emergency_withdraw_egld")]
    fn emergency_withdraw_egld_event(
        &self,
        #[indexed] recipient: &ManagedAddress,
        #[indexed] amount: &BigUint,
    );

    #[event("proposal_vetoed")]
    fn proposal_vetoed_event(
        &self,
        #[indexed] proposal_id: u64,
        #[indexed] vetoed_by: &ManagedAddress,
    );

    #[event("council_executed")]
    fn council_executed_event(
        &self,
        #[indexed] proposal_id: u64,
        #[indexed] executed_by: &ManagedAddress,
    );
}
