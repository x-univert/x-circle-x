#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// IDO Contribution info
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct Contribution<M: ManagedTypeApi> {
    pub amount_egld: BigUint<M>,
    pub tokens_to_receive: BigUint<M>,
    pub claimed: bool,
    pub refunded: bool,
}

/// IDO Status
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum IdoStatus {
    NotStarted,
    Active,
    Ended,
    Finalized,
    Cancelled,
}

/// ============================================================================
/// XCIRCLEX IDO SMART CONTRACT
/// ============================================================================
///
/// Initial DEX Offering pour le token XCIRCLEX
/// - Collecte EGLD des participants
/// - Distribution automatique des tokens
/// - Gestion soft cap / hard cap
/// - Remboursement si soft cap non atteint
///
/// Configuration:
/// - Allocation: 5% du supply (~15.7M XCIRCLEX)
/// - Hard Cap: 360 EGLD
/// - Soft Cap: 180 EGLD
/// - Rate: 1 EGLD = 43,633 XCIRCLEX
/// - Min/Max par wallet: 0.5 - 20 EGLD
/// ============================================================================

#[multiversx_sc::contract]
pub trait XCirclexIdo {

    // =========================================================================
    // INIT
    // =========================================================================

    #[init]
    fn init(
        &self,
        token_id: TokenIdentifier,
        rate: BigUint,              // Tokens per EGLD (43633 * 10^18)
        soft_cap: BigUint,          // Minimum EGLD to raise (180 EGLD)
        hard_cap: BigUint,          // Maximum EGLD to raise (360 EGLD)
        min_contribution: BigUint,  // Min per wallet (0.5 EGLD)
        max_contribution: BigUint,  // Max per wallet (20 EGLD)
        start_time: u64,            // Unix timestamp
        end_time: u64,              // Unix timestamp
    ) {
        require!(soft_cap <= hard_cap, "Soft cap must be <= hard cap");
        require!(min_contribution <= max_contribution, "Min must be <= max");
        require!(start_time < end_time, "Start must be before end");

        self.xcirclex_token_id().set(&token_id);
        self.rate().set(&rate);
        self.soft_cap().set(&soft_cap);
        self.hard_cap().set(&hard_cap);
        self.min_contribution().set(&min_contribution);
        self.max_contribution().set(&max_contribution);
        self.start_time().set(start_time);
        self.end_time().set(end_time);
        self.total_raised().set(BigUint::zero());
        self.total_participants().set(0u64);
        self.ido_status().set(IdoStatus::NotStarted);
        self.is_finalized().set(false);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // =========================================================================
    // USER ENDPOINTS
    // =========================================================================

    /// Contribute EGLD to the IDO
    #[payable("EGLD")]
    #[endpoint(contribute)]
    fn contribute(&self) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld().clone_value();
        let current_time = self.blockchain().get_block_timestamp();

        // Check IDO is active
        let start_time = self.start_time().get();
        let end_time = self.end_time().get();
        require!(current_time >= start_time, "IDO not started yet");
        require!(current_time <= end_time, "IDO has ended");

        let status = self.ido_status().get();
        require!(status == IdoStatus::NotStarted || status == IdoStatus::Active, "IDO not active");

        // Update status if first contribution
        if status == IdoStatus::NotStarted {
            self.ido_status().set(IdoStatus::Active);
        }

        // Check contribution limits
        let min_contribution = self.min_contribution().get();
        let max_contribution = self.max_contribution().get();

        let existing_contribution = if self.contributions(&caller).is_empty() {
            BigUint::zero()
        } else {
            self.contributions(&caller).get().amount_egld
        };

        let new_total = &existing_contribution + &payment;
        require!(payment >= min_contribution || existing_contribution > 0,
            "Contribution below minimum");
        require!(new_total <= max_contribution, "Contribution exceeds maximum per wallet");

        // Check hard cap
        let total_raised = self.total_raised().get();
        let hard_cap = self.hard_cap().get();
        let remaining = &hard_cap - &total_raised;

        let actual_contribution = if &payment > &remaining {
            // Refund excess
            let excess = &payment - &remaining;
            self.send().direct_egld(&caller, &excess);
            remaining
        } else {
            payment
        };

        require!(actual_contribution > 0, "Hard cap reached");

        // Calculate tokens to receive
        let rate = self.rate().get();
        let tokens = &actual_contribution * &rate / BigUint::from(10u64).pow(18);

        // Update or create contribution
        if self.contributions(&caller).is_empty() {
            self.total_participants().update(|count| *count += 1);
            let contribution = Contribution {
                amount_egld: actual_contribution.clone(),
                tokens_to_receive: tokens.clone(),
                claimed: false,
                refunded: false,
            };
            self.contributions(&caller).set(&contribution);
        } else {
            let mut contribution = self.contributions(&caller).get();
            contribution.amount_egld += &actual_contribution;
            contribution.tokens_to_receive += &tokens;
            self.contributions(&caller).set(&contribution);
        }

        // Update total raised
        self.total_raised().update(|total| *total += &actual_contribution);

        // Check if hard cap reached
        let new_total_raised = self.total_raised().get();
        if new_total_raised >= hard_cap {
            self.ido_status().set(IdoStatus::Ended);
        }

        // Emit event
        self.contribute_event(&caller, &actual_contribution, &tokens);
    }

    /// Claim tokens after IDO is finalized (soft cap reached)
    #[endpoint(claimTokens)]
    fn claim_tokens(&self) {
        let caller = self.blockchain().get_caller();

        require!(self.is_finalized().get(), "IDO not finalized yet");

        let status = self.ido_status().get();
        require!(status == IdoStatus::Finalized, "IDO was cancelled or not successful");

        require!(!self.contributions(&caller).is_empty(), "No contribution found");

        let mut contribution = self.contributions(&caller).get();
        require!(!contribution.claimed, "Already claimed");
        require!(!contribution.refunded, "Already refunded");

        // Mark as claimed
        contribution.claimed = true;
        self.contributions(&caller).set(&contribution);

        // Send tokens
        let token_id = self.xcirclex_token_id().get();
        self.send().direct_esdt(&caller, &token_id, 0, &contribution.tokens_to_receive);

        // Emit event
        self.claim_event(&caller, &contribution.tokens_to_receive);
    }

    /// Request refund if IDO is cancelled (soft cap not reached)
    #[endpoint(refund)]
    fn refund(&self) {
        let caller = self.blockchain().get_caller();

        let status = self.ido_status().get();
        require!(status == IdoStatus::Cancelled, "Refunds only available if IDO cancelled");

        require!(!self.contributions(&caller).is_empty(), "No contribution found");

        let mut contribution = self.contributions(&caller).get();
        require!(!contribution.refunded, "Already refunded");
        require!(!contribution.claimed, "Already claimed");

        // Mark as refunded
        contribution.refunded = true;
        self.contributions(&caller).set(&contribution);

        // Refund EGLD
        self.send().direct_egld(&caller, &contribution.amount_egld);

        // Emit event
        self.refund_event(&caller, &contribution.amount_egld);
    }

    // =========================================================================
    // ADMIN ENDPOINTS
    // =========================================================================

    /// Deposit XCIRCLEX tokens for distribution
    #[only_owner]
    #[payable("*")]
    #[endpoint(depositTokens)]
    fn deposit_tokens(&self) {
        let payment = self.call_value().single_esdt();
        let token_id = self.xcirclex_token_id().get();

        require!(
            payment.token_identifier == token_id,
            "Invalid token. Only XCIRCLEX accepted."
        );

        self.tokens_deposited().update(|total| *total += &payment.amount);
    }

    /// Finalize IDO after end time
    /// If soft cap reached: IDO successful, tokens claimable
    /// If soft cap not reached: IDO cancelled, refunds available
    #[only_owner]
    #[endpoint(finalizeIdo)]
    fn finalize_ido(&self) {
        let current_time = self.blockchain().get_block_timestamp();
        let end_time = self.end_time().get();
        let status = self.ido_status().get();

        require!(
            current_time > end_time || status == IdoStatus::Ended,
            "IDO not ended yet"
        );
        require!(!self.is_finalized().get(), "Already finalized");

        let total_raised = self.total_raised().get();
        let soft_cap = self.soft_cap().get();

        if total_raised >= soft_cap {
            // Success! Soft cap reached
            self.ido_status().set(IdoStatus::Finalized);
            self.is_finalized().set(true);

            // Emit success event
            self.ido_finalized_event(true, &total_raised);
        } else {
            // Failed - soft cap not reached
            self.ido_status().set(IdoStatus::Cancelled);
            self.is_finalized().set(true);

            // Emit cancelled event
            self.ido_finalized_event(false, &total_raised);
        }
    }

    /// Withdraw raised EGLD after successful finalization
    #[only_owner]
    #[endpoint(withdrawFunds)]
    fn withdraw_funds(&self, recipient: ManagedAddress) {
        require!(self.is_finalized().get(), "IDO not finalized");

        let status = self.ido_status().get();
        require!(status == IdoStatus::Finalized, "IDO was not successful");

        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance > 0, "No funds to withdraw");

        self.send().direct_egld(&recipient, &balance);

        self.withdraw_event(&recipient, &balance);
    }

    /// Withdraw unsold tokens after finalization
    #[only_owner]
    #[endpoint(withdrawUnsoldTokens)]
    fn withdraw_unsold_tokens(&self, recipient: ManagedAddress) {
        require!(self.is_finalized().get(), "IDO not finalized");

        let token_id = self.xcirclex_token_id().get();
        let token_balance = self.blockchain().get_sc_balance(
            &EgldOrEsdtTokenIdentifier::esdt(token_id.clone()),
            0
        );

        if token_balance > 0 {
            self.send().direct_esdt(&recipient, &token_id, 0, &token_balance);
        }
    }

    /// Emergency cancel IDO (refunds available)
    #[only_owner]
    #[endpoint(emergencyCancel)]
    fn emergency_cancel(&self) {
        require!(!self.is_finalized().get(), "Already finalized");

        self.ido_status().set(IdoStatus::Cancelled);
        self.is_finalized().set(true);

        let total_raised = self.total_raised().get();
        self.ido_finalized_event(false, &total_raised);
    }

    /// Update IDO timing (only before start)
    #[only_owner]
    #[endpoint(updateTiming)]
    fn update_timing(&self, new_start: u64, new_end: u64) {
        let current_time = self.blockchain().get_block_timestamp();
        let current_start = self.start_time().get();

        require!(current_time < current_start, "IDO already started");
        require!(new_start < new_end, "Start must be before end");

        self.start_time().set(new_start);
        self.end_time().set(new_end);
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    #[view(getContribution)]
    fn get_contribution(&self, user: ManagedAddress) -> Contribution<Self::Api> {
        if self.contributions(&user).is_empty() {
            Contribution {
                amount_egld: BigUint::zero(),
                tokens_to_receive: BigUint::zero(),
                claimed: false,
                refunded: false,
            }
        } else {
            self.contributions(&user).get()
        }
    }

    #[view(getIdoStatus)]
    fn get_ido_status(&self) -> IdoStatus {
        let current_time = self.blockchain().get_block_timestamp();
        let start_time = self.start_time().get();
        let end_time = self.end_time().get();
        let stored_status = self.ido_status().get();

        // Return stored status if finalized
        if self.is_finalized().get() {
            return stored_status;
        }

        // Dynamic status based on time
        if current_time < start_time {
            IdoStatus::NotStarted
        } else if current_time <= end_time {
            if stored_status == IdoStatus::Ended {
                IdoStatus::Ended // Hard cap reached
            } else {
                IdoStatus::Active
            }
        } else {
            IdoStatus::Ended
        }
    }

    #[view(getIdoInfo)]
    fn get_ido_info(&self) -> (
        TokenIdentifier,  // token_id
        BigUint,          // rate
        BigUint,          // soft_cap
        BigUint,          // hard_cap
        BigUint,          // min_contribution
        BigUint,          // max_contribution
        u64,              // start_time
        u64,              // end_time
        BigUint,          // total_raised
        u64,              // total_participants
        bool,             // is_finalized
    ) {
        (
            self.xcirclex_token_id().get(),
            self.rate().get(),
            self.soft_cap().get(),
            self.hard_cap().get(),
            self.min_contribution().get(),
            self.max_contribution().get(),
            self.start_time().get(),
            self.end_time().get(),
            self.total_raised().get(),
            self.total_participants().get(),
            self.is_finalized().get(),
        )
    }

    #[view(getTotalRaised)]
    fn get_total_raised(&self) -> BigUint {
        self.total_raised().get()
    }

    #[view(getTotalParticipants)]
    fn get_total_participants(&self) -> u64 {
        self.total_participants().get()
    }

    #[view(getTimeRemaining)]
    fn get_time_remaining(&self) -> u64 {
        let current_time = self.blockchain().get_block_timestamp();
        let end_time = self.end_time().get();

        if current_time >= end_time {
            0
        } else {
            end_time - current_time
        }
    }

    #[view(getRemainingAllocation)]
    fn get_remaining_allocation(&self) -> BigUint {
        let total_raised = self.total_raised().get();
        let hard_cap = self.hard_cap().get();

        if total_raised >= hard_cap {
            BigUint::zero()
        } else {
            &hard_cap - &total_raised
        }
    }

    #[view(getTokensDeposited)]
    fn get_tokens_deposited(&self) -> BigUint {
        self.tokens_deposited().get()
    }

    #[view(isSoftCapReached)]
    fn is_soft_cap_reached(&self) -> bool {
        let total_raised = self.total_raised().get();
        let soft_cap = self.soft_cap().get();
        total_raised >= soft_cap
    }

    #[view(isHardCapReached)]
    fn is_hard_cap_reached(&self) -> bool {
        let total_raised = self.total_raised().get();
        let hard_cap = self.hard_cap().get();
        total_raised >= hard_cap
    }

    #[view(calculateTokensForEgld)]
    fn calculate_tokens_for_egld(&self, egld_amount: BigUint) -> BigUint {
        let rate = self.rate().get();
        &egld_amount * &rate / BigUint::from(10u64).pow(18)
    }

    // =========================================================================
    // STORAGE
    // =========================================================================

    #[storage_mapper("xcirclex_token_id")]
    fn xcirclex_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("rate")]
    fn rate(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("soft_cap")]
    fn soft_cap(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("hard_cap")]
    fn hard_cap(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("min_contribution")]
    fn min_contribution(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("max_contribution")]
    fn max_contribution(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("start_time")]
    fn start_time(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("end_time")]
    fn end_time(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("total_raised")]
    fn total_raised(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("total_participants")]
    fn total_participants(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("contributions")]
    fn contributions(&self, user: &ManagedAddress) -> SingleValueMapper<Contribution<Self::Api>>;

    #[storage_mapper("tokens_deposited")]
    fn tokens_deposited(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("ido_status")]
    fn ido_status(&self) -> SingleValueMapper<IdoStatus>;

    #[storage_mapper("is_finalized")]
    fn is_finalized(&self) -> SingleValueMapper<bool>;

    // =========================================================================
    // EVENTS
    // =========================================================================

    #[event("contribute")]
    fn contribute_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] egld_amount: &BigUint,
        tokens_amount: &BigUint,
    );

    #[event("claim")]
    fn claim_event(
        &self,
        #[indexed] user: &ManagedAddress,
        tokens_amount: &BigUint,
    );

    #[event("refund")]
    fn refund_event(
        &self,
        #[indexed] user: &ManagedAddress,
        egld_amount: &BigUint,
    );

    #[event("ido_finalized")]
    fn ido_finalized_event(
        &self,
        #[indexed] success: bool,
        total_raised: &BigUint,
    );

    #[event("withdraw")]
    fn withdraw_event(
        &self,
        #[indexed] recipient: &ManagedAddress,
        amount: &BigUint,
    );
}
