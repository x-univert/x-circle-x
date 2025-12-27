#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Vesting schedule for a beneficiary
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct VestingSchedule<M: ManagedTypeApi> {
    pub beneficiary: ManagedAddress<M>,
    pub total_amount: BigUint<M>,
    pub released_amount: BigUint<M>,
    pub start_epoch: u64,
    pub cliff_epochs: u64,          // Cliff period (no tokens released)
    pub vesting_duration_epochs: u64, // Total vesting duration after cliff
    pub category: VestingCategory,
    pub is_revoked: bool,
}

/// Vesting category
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, PartialEq)]
pub enum VestingCategory {
    Team,       // 24 months, 6 month cliff
    Advisors,   // 12 months, 3 month cliff
    Marketing,  // 12 months, no cliff
    Custom,     // Custom schedule
}

/// ============================================================================
/// XCIRCLEX VESTING SMART CONTRACT
/// ============================================================================
///
/// Gère le vesting des tokens pour:
/// - Équipe fondatrice: 24 mois, cliff 6 mois
/// - Conseillers: 12 mois, cliff 3 mois
/// - Marketing: 12 mois, pas de cliff
///
/// Les tokens sont libérés linéairement après la période de cliff.
/// L'owner peut révoquer un vesting (tokens non libérés retournent au SC).
/// ============================================================================

#[multiversx_sc::contract]
pub trait XCirclexVesting {

    // =========================================================================
    // INIT
    // =========================================================================

    #[init]
    fn init(&self, token_id: TokenIdentifier) {
        self.xcirclex_token_id().set(&token_id);
        self.total_vested().set(BigUint::zero());
        self.total_released().set(BigUint::zero());
    }

    #[upgrade]
    fn upgrade(&self) {}

    // =========================================================================
    // ADMIN ENDPOINTS
    // =========================================================================

    /// Deposit tokens for vesting distribution (owner only)
    #[only_owner]
    #[payable("*")]
    #[endpoint(depositTokens)]
    fn deposit_tokens(&self) {
        let payment = self.call_value().single_esdt();
        let token_id = self.xcirclex_token_id().get();

        require!(
            payment.token_identifier == token_id,
            "Only XCIRCLEX tokens accepted"
        );

        // Tokens are now in the contract balance
        // No additional action needed - the contract tracks via get_sc_balance()
    }

    /// Create a team vesting schedule (24 months, 6 month cliff)
    #[only_owner]
    #[endpoint(createTeamVesting)]
    fn create_team_vesting(&self, beneficiary: ManagedAddress, amount: BigUint) {
        let epochs_per_month = 30u64; // ~30 days per month

        self.create_vesting_internal(
            beneficiary,
            amount,
            6 * epochs_per_month,  // 6 month cliff
            24 * epochs_per_month, // 24 month total vesting
            VestingCategory::Team,
        );
    }

    /// Create an advisor vesting schedule (12 months, 3 month cliff)
    #[only_owner]
    #[endpoint(createAdvisorVesting)]
    fn create_advisor_vesting(&self, beneficiary: ManagedAddress, amount: BigUint) {
        let epochs_per_month = 30u64;

        self.create_vesting_internal(
            beneficiary,
            amount,
            3 * epochs_per_month,  // 3 month cliff
            12 * epochs_per_month, // 12 month total vesting
            VestingCategory::Advisors,
        );
    }

    /// Create a marketing vesting schedule (12 months, no cliff)
    #[only_owner]
    #[endpoint(createMarketingVesting)]
    fn create_marketing_vesting(&self, beneficiary: ManagedAddress, amount: BigUint) {
        let epochs_per_month = 30u64;

        self.create_vesting_internal(
            beneficiary,
            amount,
            0,                     // No cliff
            12 * epochs_per_month, // 12 month total vesting
            VestingCategory::Marketing,
        );
    }

    /// Create a custom vesting schedule
    #[only_owner]
    #[endpoint(createCustomVesting)]
    fn create_custom_vesting(
        &self,
        beneficiary: ManagedAddress,
        amount: BigUint,
        cliff_days: u64,
        vesting_days: u64,
    ) {
        self.create_vesting_internal(
            beneficiary,
            amount,
            cliff_days,
            vesting_days,
            VestingCategory::Custom,
        );
    }

    fn create_vesting_internal(
        &self,
        beneficiary: ManagedAddress,
        amount: BigUint,
        cliff_epochs: u64,
        vesting_duration_epochs: u64,
    category: VestingCategory,
    ) {
        require!(amount > 0, "Amount must be greater than 0");
        require!(vesting_duration_epochs > 0, "Vesting duration must be > 0");

        // Check we have enough tokens
        let token_id = self.xcirclex_token_id().get();
        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::esdt(token_id.clone()), 0);
        let total_vested = self.total_vested().get();
        let total_released = self.total_released().get();
        let available = &balance + &total_released - &total_vested;

        require!(available >= amount, "Insufficient tokens for vesting");

        let current_epoch = self.blockchain().get_block_epoch();

        let schedule = VestingSchedule {
            beneficiary: beneficiary.clone(),
            total_amount: amount.clone(),
            released_amount: BigUint::zero(),
            start_epoch: current_epoch,
            cliff_epochs,
            vesting_duration_epochs,
            category,
            is_revoked: false,
        };

        let schedule_id = self.get_next_schedule_id();
        self.vesting_schedules(schedule_id).set(&schedule);
        self.beneficiary_schedules(&beneficiary).insert(schedule_id);

        // Update totals
        self.total_vested().update(|total| *total += &amount);

        // Emit event
        self.vesting_created_event(schedule_id, &beneficiary, &amount);
    }

    /// Revoke a vesting schedule (owner only)
    /// Unreleased tokens stay in the contract
    #[only_owner]
    #[endpoint(revokeVesting)]
    fn revoke_vesting(&self, schedule_id: u64) {
        require!(
            !self.vesting_schedules(schedule_id).is_empty(),
            "Schedule not found"
        );

        let mut schedule = self.vesting_schedules(schedule_id).get();
        require!(!schedule.is_revoked, "Already revoked");

        // Calculate what can still be released
        let current_epoch = self.blockchain().get_block_epoch();
        let releasable = self.calculate_releasable(&schedule, current_epoch);

        // Release any pending tokens before revoking
        if releasable > 0 {
            let token_id = self.xcirclex_token_id().get();
            self.send().direct_esdt(&schedule.beneficiary, &token_id, 0, &releasable);

            schedule.released_amount += &releasable;
            self.total_released().update(|total| *total += &releasable);
        }

        // Mark as revoked
        schedule.is_revoked = true;
        self.vesting_schedules(schedule_id).set(&schedule);

        // Update total vested (reduce by unreleased amount)
        let unreleased = &schedule.total_amount - &schedule.released_amount;
        self.total_vested().update(|total| *total -= &unreleased);

        self.vesting_revoked_event(schedule_id, &schedule.beneficiary);
    }

    // =========================================================================
    // BENEFICIARY ENDPOINTS
    // =========================================================================

    /// Release vested tokens for a schedule
    #[endpoint(release)]
    fn release(&self, schedule_id: u64) {
        require!(
            !self.vesting_schedules(schedule_id).is_empty(),
            "Schedule not found"
        );

        let mut schedule = self.vesting_schedules(schedule_id).get();
        let caller = self.blockchain().get_caller();

        require!(
            schedule.beneficiary == caller,
            "Only beneficiary can release"
        );
        require!(!schedule.is_revoked, "Vesting has been revoked");

        let current_epoch = self.blockchain().get_block_epoch();
        let releasable = self.calculate_releasable(&schedule, current_epoch);

        require!(releasable > 0, "No tokens to release");

        // Update schedule
        schedule.released_amount += &releasable;
        self.vesting_schedules(schedule_id).set(&schedule);

        // Update totals
        self.total_released().update(|total| *total += &releasable);

        // Send tokens
        let token_id = self.xcirclex_token_id().get();
        self.send().direct_esdt(&caller, &token_id, 0, &releasable);

        // Emit event
        self.tokens_released_event(schedule_id, &caller, &releasable);
    }

    /// Release all vested tokens for all schedules of the caller
    #[endpoint(releaseAll)]
    fn release_all(&self) {
        let caller = self.blockchain().get_caller();
        let schedule_ids = self.beneficiary_schedules(&caller);

        let current_epoch = self.blockchain().get_block_epoch();
        let token_id = self.xcirclex_token_id().get();
        let mut total_released = BigUint::zero();

        for schedule_id in schedule_ids.iter() {
            if self.vesting_schedules(schedule_id).is_empty() {
                continue;
            }

            let mut schedule = self.vesting_schedules(schedule_id).get();

            if schedule.is_revoked {
                continue;
            }

            let releasable = self.calculate_releasable(&schedule, current_epoch);

            if releasable > 0 {
                schedule.released_amount += &releasable;
                self.vesting_schedules(schedule_id).set(&schedule);
                total_released += &releasable;
            }
        }

        if total_released > 0 {
            self.total_released().update(|total| *total += &total_released);
            self.send().direct_esdt(&caller, &token_id, 0, &total_released);
        }
    }

    // =========================================================================
    // INTERNAL FUNCTIONS
    // =========================================================================

    fn calculate_releasable(&self, schedule: &VestingSchedule<Self::Api>, current_epoch: u64) -> BigUint {
        if schedule.is_revoked {
            return BigUint::zero();
        }

        let cliff_end = schedule.start_epoch + schedule.cliff_epochs;

        // Still in cliff period
        if current_epoch < cliff_end {
            return BigUint::zero();
        }

        let vesting_end = schedule.start_epoch + schedule.cliff_epochs + schedule.vesting_duration_epochs;

        let vested_amount = if current_epoch >= vesting_end {
            // Fully vested
            schedule.total_amount.clone()
        } else {
            // Partially vested - linear vesting
            let elapsed = current_epoch - cliff_end;
            &schedule.total_amount * elapsed / schedule.vesting_duration_epochs
        };

        // Subtract already released
        if vested_amount > schedule.released_amount {
            vested_amount - &schedule.released_amount
        } else {
            BigUint::zero()
        }
    }

    fn get_next_schedule_id(&self) -> u64 {
        let id = self.next_schedule_id().get();
        self.next_schedule_id().set(id + 1);
        id
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    #[view(getVestingSchedule)]
    fn get_vesting_schedule(&self, schedule_id: u64) -> VestingSchedule<Self::Api> {
        self.vesting_schedules(schedule_id).get()
    }

    #[view(getReleasableAmount)]
    fn get_releasable_amount(&self, schedule_id: u64) -> BigUint {
        if self.vesting_schedules(schedule_id).is_empty() {
            return BigUint::zero();
        }

        let schedule = self.vesting_schedules(schedule_id).get();
        let current_epoch = self.blockchain().get_block_epoch();
        self.calculate_releasable(&schedule, current_epoch)
    }

    #[view(getVestedAmount)]
    fn get_vested_amount(&self, schedule_id: u64) -> BigUint {
        if self.vesting_schedules(schedule_id).is_empty() {
            return BigUint::zero();
        }

        let schedule = self.vesting_schedules(schedule_id).get();
        let current_epoch = self.blockchain().get_block_epoch();
        let cliff_end = schedule.start_epoch + schedule.cliff_epochs;

        if current_epoch < cliff_end {
            return BigUint::zero();
        }

        let vesting_end = schedule.start_epoch + schedule.cliff_epochs + schedule.vesting_duration_epochs;

        if current_epoch >= vesting_end {
            schedule.total_amount
        } else {
            let elapsed = current_epoch - cliff_end;
            &schedule.total_amount * elapsed / schedule.vesting_duration_epochs
        }
    }

    #[view(getBeneficiarySchedules)]
    fn get_beneficiary_schedules(&self, beneficiary: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for id in self.beneficiary_schedules(&beneficiary).iter() {
            result.push(id);
        }
        result
    }

    #[view(getTotalVested)]
    fn get_total_vested(&self) -> BigUint {
        self.total_vested().get()
    }

    #[view(getTotalReleased)]
    fn get_total_released(&self) -> BigUint {
        self.total_released().get()
    }

    #[view(getTimeUntilCliffEnd)]
    fn get_time_until_cliff_end(&self, schedule_id: u64) -> u64 {
        if self.vesting_schedules(schedule_id).is_empty() {
            return 0;
        }

        let schedule = self.vesting_schedules(schedule_id).get();
        let current_epoch = self.blockchain().get_block_epoch();
        let cliff_end = schedule.start_epoch + schedule.cliff_epochs;

        if current_epoch >= cliff_end {
            0
        } else {
            cliff_end - current_epoch
        }
    }

    #[view(getTimeUntilFullyVested)]
    fn get_time_until_fully_vested(&self, schedule_id: u64) -> u64 {
        if self.vesting_schedules(schedule_id).is_empty() {
            return 0;
        }

        let schedule = self.vesting_schedules(schedule_id).get();
        let current_epoch = self.blockchain().get_block_epoch();
        let vesting_end = schedule.start_epoch + schedule.cliff_epochs + schedule.vesting_duration_epochs;

        if current_epoch >= vesting_end {
            0
        } else {
            vesting_end - current_epoch
        }
    }

    #[view(getTokenId)]
    fn get_token_id(&self) -> TokenIdentifier {
        self.xcirclex_token_id().get()
    }

    // =========================================================================
    // STORAGE
    // =========================================================================

    #[storage_mapper("xcirclex_token_id")]
    fn xcirclex_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("vesting_schedules")]
    fn vesting_schedules(&self, schedule_id: u64) -> SingleValueMapper<VestingSchedule<Self::Api>>;

    #[storage_mapper("beneficiary_schedules")]
    fn beneficiary_schedules(&self, beneficiary: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[storage_mapper("next_schedule_id")]
    fn next_schedule_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("total_vested")]
    fn total_vested(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("total_released")]
    fn total_released(&self) -> SingleValueMapper<BigUint>;

    // =========================================================================
    // EVENTS
    // =========================================================================

    #[event("vesting_created")]
    fn vesting_created_event(
        &self,
        #[indexed] schedule_id: u64,
        #[indexed] beneficiary: &ManagedAddress,
        amount: &BigUint,
    );

    #[event("tokens_released")]
    fn tokens_released_event(
        &self,
        #[indexed] schedule_id: u64,
        #[indexed] beneficiary: &ManagedAddress,
        amount: &BigUint,
    );

    #[event("vesting_revoked")]
    fn vesting_revoked_event(
        &self,
        #[indexed] schedule_id: u64,
        #[indexed] beneficiary: &ManagedAddress,
    );
}
