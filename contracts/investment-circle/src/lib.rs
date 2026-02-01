#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Frequency of contributions
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Copy, PartialEq, Debug)]
pub enum ContributionFrequency {
    Weekly,      // 7 days
    BiWeekly,    // 14 days
    Monthly,     // 30 days
    Quarterly,   // 90 days
}

impl ContributionFrequency {
    pub fn to_seconds(&self) -> u64 {
        match self {
            ContributionFrequency::Weekly => 7 * 24 * 60 * 60,
            ContributionFrequency::BiWeekly => 14 * 24 * 60 * 60,
            ContributionFrequency::Monthly => 30 * 24 * 60 * 60,
            ContributionFrequency::Quarterly => 90 * 24 * 60 * 60,
        }
    }
}

/// Status of an investment circle
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Copy, PartialEq, Debug)]
pub enum CircleStatus {
    Pending,     // Waiting for members to join
    Active,      // Circle is running
    Completed,   // All contributions done
    Cancelled,   // Circle was cancelled
}

/// Information about a circle
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Debug)]
pub struct CircleInfo<M: ManagedTypeApi> {
    pub id: u64,
    pub creator: ManagedAddress<M>,
    pub name: ManagedBuffer<M>,
    pub contribution_amount: BigUint<M>,
    pub frequency: ContributionFrequency,
    pub total_contributions: u64,
    pub min_members: u64,
    pub max_members: u64,
    pub current_members: u64,
    pub current_period: u64,
    pub status: CircleStatus,
    pub created_at: u64,
    pub started_at: u64,
    pub next_contribution_deadline: u64,
}

/// Information about a member in a circle
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Debug)]
pub struct MemberInfo<M: ManagedTypeApi> {
    pub address: ManagedAddress<M>,
    pub collateral_deposited: BigUint<M>,
    pub collateral_used: BigUint<M>,
    pub collateral_unlocked: BigUint<M>,
    pub contributions_paid: u64,
    pub joined_at: u64,
    pub last_contribution_at: u64,
    pub is_active: bool,
}

/// Event data for circle creation
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Debug)]
pub struct CircleCreatedEventData<M: ManagedTypeApi> {
    pub contribution_amount: BigUint<M>,
    pub total_contributions: u64,
}

/// Event data for collateral used
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone, Debug)]
pub struct CollateralUsedEventData<M: ManagedTypeApi> {
    pub amount: BigUint<M>,
    pub missed_contributions: u64,
}

/// Investment Circle Smart Contract
///
/// Features:
/// - Members deposit collateral equal to total contributions when joining
/// - No voting needed - collateral proves commitment
/// - If a member doesn't pay, collateral is used automatically
/// - Collateral can be partially recovered as payments are successfully made
/// - At the end, remaining collateral is returned
#[multiversx_sc::contract]
pub trait InvestmentCircle {

    // ============ INIT ============

    #[init]
    fn init(&self) {
        self.next_circle_id().set(1u64);
        self.protocol_fee_percent().set(300u64); // 3%
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ============ OWNER FUNCTIONS ============

    /// Set protocol fee percentage (in basis points, 100 = 1%)
    #[only_owner]
    #[endpoint(setProtocolFee)]
    fn set_protocol_fee(&self, fee_percent: u64) {
        require!(fee_percent <= 1000, "Fee cannot exceed 10%");
        self.protocol_fee_percent().set(fee_percent);
    }

    /// Withdraw protocol fees
    #[only_owner]
    #[endpoint(withdrawFees)]
    fn withdraw_fees(&self) {
        let fees = self.collected_fees().get();
        require!(fees > 0, "No fees to withdraw");

        self.collected_fees().clear();
        self.send().direct_egld(&self.blockchain().get_caller(), &fees);
    }

    // ============ CIRCLE CREATION ============

    /// Create a new investment circle
    /// Creator must also deposit collateral
    #[payable("EGLD")]
    #[endpoint(createCircle)]
    fn create_circle(
        &self,
        name: ManagedBuffer,
        contribution_amount: BigUint,
        frequency: ContributionFrequency,
        total_contributions: u64,
        min_members: u64,
        max_members: u64,
    ) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();

        // Validations
        require!(contribution_amount > 0, "Contribution amount must be positive");
        require!(total_contributions >= 2, "Must have at least 2 contribution periods");
        require!(total_contributions <= 52, "Cannot exceed 52 contribution periods");
        require!(min_members >= 2, "Must have at least 2 members");
        require!(max_members >= min_members, "Max members must be >= min members");
        require!(max_members <= 100, "Cannot exceed 100 members");

        // Fair distribution validation: min_members must divide total_contributions
        // This ensures the circle can always start when min_members is reached
        // Additional members can join, but the circle can only start when current_members divides total_contributions
        require!(
            total_contributions % min_members == 0,
            "Periods must be divisible by min_members for fair distribution"
        );

        // Calculate required collateral
        let required_collateral = &contribution_amount * total_contributions;
        require!(payment == required_collateral, "Must deposit exact collateral amount");

        // Create circle
        let circle_id = self.next_circle_id().get();
        self.next_circle_id().set(circle_id + 1);

        let current_time = self.blockchain().get_block_timestamp();

        let circle_info = CircleInfo {
            id: circle_id,
            creator: caller.clone(),
            name,
            contribution_amount: contribution_amount.clone(),
            frequency,
            total_contributions,
            min_members,
            max_members,
            current_members: 1,
            current_period: 0,
            status: CircleStatus::Pending,
            created_at: current_time,
            started_at: 0,
            next_contribution_deadline: 0,
        };

        self.circles(circle_id).set(&circle_info);

        // Add creator as first member
        let member_info = MemberInfo {
            address: caller.clone(),
            collateral_deposited: required_collateral.clone(),
            collateral_used: BigUint::zero(),
            collateral_unlocked: BigUint::zero(),
            contributions_paid: 0,
            joined_at: current_time,
            last_contribution_at: 0,
            is_active: true,
        };

        self.circle_members(circle_id).insert(caller.clone());
        self.member_info(circle_id, &caller).set(&member_info);
        self.user_circles(&caller).insert(circle_id);

        // Emit event
        let event_data = CircleCreatedEventData {
            contribution_amount,
            total_contributions,
        };
        self.circle_created_event(circle_id, &caller, event_data);
    }

    // ============ JOIN CIRCLE ============

    /// Join an existing circle by depositing collateral
    /// No voting needed - collateral proves commitment
    #[payable("EGLD")]
    #[endpoint(joinCircle)]
    fn join_circle(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");

        let mut circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Pending, "Circle is not accepting new members");
        require!(circle_info.current_members < circle_info.max_members, "Circle is full");
        require!(!self.circle_members(circle_id).contains(&caller), "Already a member");

        // Calculate required collateral
        let required_collateral = &circle_info.contribution_amount * circle_info.total_contributions;
        require!(payment == required_collateral, "Must deposit exact collateral amount");

        let current_time = self.blockchain().get_block_timestamp();

        // Add member
        let member_info = MemberInfo {
            address: caller.clone(),
            collateral_deposited: required_collateral.clone(),
            collateral_used: BigUint::zero(),
            collateral_unlocked: BigUint::zero(),
            contributions_paid: 0,
            joined_at: current_time,
            last_contribution_at: 0,
            is_active: true,
        };

        self.circle_members(circle_id).insert(caller.clone());
        self.member_info(circle_id, &caller).set(&member_info);
        self.user_circles(&caller).insert(circle_id);

        circle_info.current_members += 1;
        self.circles(circle_id).set(&circle_info);

        // Emit event
        self.member_joined_event(circle_id, &caller, required_collateral);
    }

    // ============ START CIRCLE ============

    /// Start the circle when minimum members reached
    /// Can be called by any member
    /// Validates that total_contributions % current_members == 0 for fair distribution
    #[endpoint(startCircle)]
    fn start_circle(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        require!(self.circle_members(circle_id).contains(&caller), "Not a member");

        let mut circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Pending, "Circle already started or completed");
        require!(circle_info.current_members >= circle_info.min_members, "Not enough members");

        // Ensure fair distribution: total_contributions must be divisible by current_members
        // This guarantees each member receives the same number of payouts
        require!(
            circle_info.total_contributions % circle_info.current_members == 0,
            "Unfair distribution: periods must be divisible by member count"
        );

        let current_time = self.blockchain().get_block_timestamp();
        let period_duration = circle_info.frequency.to_seconds();

        circle_info.status = CircleStatus::Active;
        circle_info.started_at = current_time;
        circle_info.current_period = 1;
        circle_info.next_contribution_deadline = current_time + period_duration;

        self.circles(circle_id).set(&circle_info);

        // Emit event
        self.circle_started_event(circle_id, current_time);
    }

    // ============ CONTRIBUTIONS ============

    /// Make a contribution for the current period
    #[payable("EGLD")]
    #[endpoint(contribute)]
    fn contribute(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld_value().clone_value();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        require!(self.circle_members(circle_id).contains(&caller), "Not a member");

        let circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Active, "Circle is not active");
        require!(payment == circle_info.contribution_amount, "Must pay exact contribution amount");

        let mut member_info = self.member_info(circle_id, &caller).get();

        require!(member_info.is_active, "Member is not active");

        // Check if already contributed this period
        let expected_contributions = circle_info.current_period;
        require!(
            member_info.contributions_paid < expected_contributions,
            "Already contributed for this period"
        );

        let current_time = self.blockchain().get_block_timestamp();

        member_info.contributions_paid += 1;
        member_info.last_contribution_at = current_time;

        // Calculate unlockable collateral (proportional to contributions paid)
        // Formula: (contributions_paid / total_contributions) * collateral_deposited
        let unlock_ratio = BigUint::from(member_info.contributions_paid);
        let total_ratio = BigUint::from(circle_info.total_contributions);
        let potential_unlock = (&member_info.collateral_deposited - &member_info.collateral_used) * &unlock_ratio / &total_ratio;

        // Update unlocked amount (only increase, never decrease)
        if potential_unlock > member_info.collateral_unlocked {
            member_info.collateral_unlocked = potential_unlock;
        }

        self.member_info(circle_id, &caller).set(&member_info);

        // Add to pool
        let current_pool = self.circle_pool(circle_id).get();
        self.circle_pool(circle_id).set(&(current_pool + payment));

        // Emit event
        self.contribution_made_event(circle_id, &caller, member_info.contributions_paid);
    }

    // ============ PROCESS MISSED CONTRIBUTIONS ============

    /// Process a missed contribution by using member's collateral
    /// Can be called by anyone after the deadline
    #[endpoint(processMissedContribution)]
    fn process_missed_contribution(&self, circle_id: u64, member_address: ManagedAddress) {
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        require!(self.circle_members(circle_id).contains(&member_address), "Not a member");

        let circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Active, "Circle is not active");

        let current_time = self.blockchain().get_block_timestamp();
        require!(current_time > circle_info.next_contribution_deadline, "Deadline not passed yet");

        let mut member_info = self.member_info(circle_id, &member_address).get();

        require!(member_info.is_active, "Member is not active");

        // Check if member missed the contribution
        let expected_contributions = circle_info.current_period;
        if member_info.contributions_paid >= expected_contributions {
            return; // Member already contributed
        }

        // Calculate how many contributions are missing
        let missed = expected_contributions - member_info.contributions_paid;
        let missed_amount = &circle_info.contribution_amount * missed;

        // Check available collateral
        let available_collateral = &member_info.collateral_deposited - &member_info.collateral_used;

        if available_collateral >= missed_amount {
            // Use collateral to cover missed contributions
            member_info.collateral_used += &missed_amount;
            member_info.contributions_paid = expected_contributions;

            // Add to pool
            let current_pool = self.circle_pool(circle_id).get();
            self.circle_pool(circle_id).set(&(current_pool + &missed_amount));

            // Emit event
            let event_data = CollateralUsedEventData {
                amount: missed_amount,
                missed_contributions: missed,
            };
            self.collateral_used_event(circle_id, &member_address, event_data);
        } else {
            // Not enough collateral - use what's available and mark as inactive
            member_info.collateral_used += &available_collateral;
            member_info.is_active = false;

            // Add remaining collateral to pool
            let current_pool = self.circle_pool(circle_id).get();
            self.circle_pool(circle_id).set(&(current_pool + &available_collateral));

            // Emit event
            self.member_defaulted_event(circle_id, &member_address, available_collateral);
        }

        self.member_info(circle_id, &member_address).set(&member_info);
    }

    // ============ ADVANCE PERIOD ============

    /// Advance to the next contribution period
    /// Distributes pool to a recipient (rotating order)
    #[endpoint(advancePeriod)]
    fn advance_period(&self, circle_id: u64) {
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");

        let mut circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Active, "Circle is not active");

        let current_time = self.blockchain().get_block_timestamp();
        require!(current_time > circle_info.next_contribution_deadline, "Deadline not passed yet");

        // Process all missed contributions first
        for member_address in self.circle_members(circle_id).iter() {
            let member_info = self.member_info(circle_id, &member_address).get();
            if member_info.is_active && member_info.contributions_paid < circle_info.current_period {
                self.process_missed_contribution(circle_id, member_address);
            }
        }

        // Distribute pool to recipient
        let pool = self.circle_pool(circle_id).get();
        if pool > 0 {
            let recipient = self.get_period_recipient(circle_id, circle_info.current_period);

            // Calculate protocol fee
            let fee_percent = self.protocol_fee_percent().get();
            let fee = &pool * fee_percent / 10000u64;
            let amount_to_send = &pool - &fee;

            // Send to recipient
            self.send().direct_egld(&recipient, &amount_to_send);

            // Collect fee
            let current_fees = self.collected_fees().get();
            self.collected_fees().set(&(current_fees + fee));

            // Clear pool
            self.circle_pool(circle_id).clear();

            // Emit event
            self.pool_distributed_event(circle_id, circle_info.current_period, &recipient, amount_to_send);
        }

        // Advance period
        circle_info.current_period += 1;

        if circle_info.current_period > circle_info.total_contributions {
            // Circle completed
            circle_info.status = CircleStatus::Completed;
            self.circle_completed_event(circle_id);
        } else {
            // Set next deadline
            let period_duration = circle_info.frequency.to_seconds();
            circle_info.next_contribution_deadline = current_time + period_duration;
        }

        self.circles(circle_id).set(&circle_info);
    }

    // ============ CLAIM COLLATERAL ============

    /// Claim unlocked collateral
    /// Members can claim proportionally to their paid contributions
    #[endpoint(claimCollateral)]
    fn claim_collateral(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        require!(self.circle_members(circle_id).contains(&caller), "Not a member");

        let circle_info = self.circles(circle_id).get();
        let member_info = self.member_info(circle_id, &caller).get();

        // Calculate claimable amount
        let already_claimed = self.collateral_claimed(circle_id, &caller).get();
        let claimable = if circle_info.status == CircleStatus::Completed {
            // Circle completed - can claim all remaining collateral
            &member_info.collateral_deposited - &member_info.collateral_used - &already_claimed
        } else {
            // Circle in progress - can only claim unlocked portion minus already claimed
            if member_info.collateral_unlocked > already_claimed {
                &member_info.collateral_unlocked - &already_claimed
            } else {
                BigUint::zero()
            }
        };

        require!(claimable > 0, "No collateral to claim");

        // Update claimed amount
        self.collateral_claimed(circle_id, &caller).set(&(&already_claimed + &claimable));

        // Send collateral
        self.send().direct_egld(&caller, &claimable);

        // Emit event
        self.collateral_claimed_event(circle_id, &caller, claimable);
    }

    // ============ LEAVE CIRCLE ============

    /// Leave a pending circle and get full collateral back
    #[endpoint(leaveCircle)]
    fn leave_circle(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        require!(self.circle_members(circle_id).contains(&caller), "Not a member");

        let mut circle_info = self.circles(circle_id).get();

        require!(circle_info.status == CircleStatus::Pending, "Can only leave pending circles");
        require!(caller != circle_info.creator, "Creator cannot leave, must cancel");

        let member_info = self.member_info(circle_id, &caller).get();

        // Refund full collateral
        self.send().direct_egld(&caller, &member_info.collateral_deposited);

        // Remove member
        self.circle_members(circle_id).swap_remove(&caller);
        self.member_info(circle_id, &caller).clear();
        self.user_circles(&caller).swap_remove(&circle_id);

        circle_info.current_members -= 1;
        self.circles(circle_id).set(&circle_info);

        // Emit event
        self.member_left_event(circle_id, &caller);
    }

    /// Cancel a pending circle (creator only)
    #[endpoint(cancelCircle)]
    fn cancel_circle(&self, circle_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");

        let mut circle_info = self.circles(circle_id).get();

        require!(caller == circle_info.creator, "Only creator can cancel");
        require!(circle_info.status == CircleStatus::Pending, "Can only cancel pending circles");

        // Refund all members
        for member_address in self.circle_members(circle_id).iter() {
            let member_info = self.member_info(circle_id, &member_address).get();
            self.send().direct_egld(&member_address, &member_info.collateral_deposited);
            self.user_circles(&member_address).swap_remove(&circle_id);
        }

        circle_info.status = CircleStatus::Cancelled;
        self.circles(circle_id).set(&circle_info);

        // Emit event
        self.circle_cancelled_event(circle_id);
    }

    // ============ VIEW FUNCTIONS ============

    /// Get circle info
    #[view(getCircleInfo)]
    fn get_circle_info(&self, circle_id: u64) -> CircleInfo<Self::Api> {
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        self.circles(circle_id).get()
    }

    /// Get member info
    #[view(getMemberInfo)]
    fn get_member_info(&self, circle_id: u64, member: ManagedAddress) -> MemberInfo<Self::Api> {
        require!(self.circle_members(circle_id).contains(&member), "Not a member");
        self.member_info(circle_id, &member).get()
    }

    /// Get all circles for a user
    #[view(getUserCircles)]
    fn get_user_circles(&self, user: ManagedAddress) -> MultiValueEncoded<u64> {
        let mut result = MultiValueEncoded::new();
        for circle_id in self.user_circles(&user).iter() {
            result.push(circle_id);
        }
        result
    }

    /// Get all members of a circle
    #[view(getCircleMembers)]
    fn get_circle_members(&self, circle_id: u64) -> MultiValueEncoded<ManagedAddress> {
        let mut result = MultiValueEncoded::new();
        for member in self.circle_members(circle_id).iter() {
            result.push(member);
        }
        result
    }

    /// Get required collateral for a circle
    #[view(getRequiredCollateral)]
    fn get_required_collateral(&self, circle_id: u64) -> BigUint {
        require!(!self.circles(circle_id).is_empty(), "Circle does not exist");
        let circle_info = self.circles(circle_id).get();
        &circle_info.contribution_amount * circle_info.total_contributions
    }

    /// Get current pool balance
    #[view(getPoolBalance)]
    fn get_pool_balance(&self, circle_id: u64) -> BigUint {
        self.circle_pool(circle_id).get()
    }

    /// Get claimable collateral for a member
    #[view(getClaimableCollateral)]
    fn get_claimable_collateral(&self, circle_id: u64, member: ManagedAddress) -> BigUint {
        if !self.circle_members(circle_id).contains(&member) {
            return BigUint::zero();
        }

        let circle_info = self.circles(circle_id).get();
        let member_info = self.member_info(circle_id, &member).get();
        let already_claimed = self.collateral_claimed(circle_id, &member).get();

        if circle_info.status == CircleStatus::Completed {
            &member_info.collateral_deposited - &member_info.collateral_used - &already_claimed
        } else if member_info.collateral_unlocked > already_claimed {
            &member_info.collateral_unlocked - &already_claimed
        } else {
            BigUint::zero()
        }
    }

    /// Get total number of circles
    #[view(getTotalCircles)]
    fn get_total_circles(&self) -> u64 {
        self.next_circle_id().get() - 1
    }

    /// Check if the circle can start with current member count (fair distribution)
    #[view(canStartCircle)]
    fn can_start_circle(&self, circle_id: u64) -> bool {
        if self.circles(circle_id).is_empty() {
            return false;
        }

        let circle_info = self.circles(circle_id).get();

        circle_info.status == CircleStatus::Pending
            && circle_info.current_members >= circle_info.min_members
            && circle_info.total_contributions % circle_info.current_members == 0
    }

    /// Get how many payouts each member will receive
    #[view(getPayoutsPerMember)]
    fn get_payouts_per_member(&self, circle_id: u64) -> u64 {
        if self.circles(circle_id).is_empty() {
            return 0;
        }

        let circle_info = self.circles(circle_id).get();

        if circle_info.current_members == 0 {
            return 0;
        }

        circle_info.total_contributions / circle_info.current_members
    }

    /// Check if adding one more member would keep fair distribution possible
    #[view(canJoinFairly)]
    fn can_join_fairly(&self, circle_id: u64) -> bool {
        if self.circles(circle_id).is_empty() {
            return false;
        }

        let circle_info = self.circles(circle_id).get();

        if circle_info.status != CircleStatus::Pending {
            return false;
        }

        if circle_info.current_members >= circle_info.max_members {
            return false;
        }

        // Check if new member count would allow fair distribution
        let new_member_count = circle_info.current_members + 1;
        circle_info.total_contributions % new_member_count == 0
    }

    // ============ HELPER FUNCTIONS ============

    /// Get the recipient for a given period (rotating order)
    fn get_period_recipient(&self, circle_id: u64, period: u64) -> ManagedAddress {
        let members: ManagedVec<ManagedAddress> = self.circle_members(circle_id).iter().collect();
        let member_count = members.len();

        if member_count == 0 {
            sc_panic!("No members in circle");
        }

        let recipient_index = ((period - 1) as usize) % member_count;
        members.get(recipient_index).clone_value()
    }

    // ============ STORAGE ============

    #[storage_mapper("nextCircleId")]
    fn next_circle_id(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("protocolFeePercent")]
    fn protocol_fee_percent(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("collectedFees")]
    fn collected_fees(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("circles")]
    fn circles(&self, circle_id: u64) -> SingleValueMapper<CircleInfo<Self::Api>>;

    #[storage_mapper("circleMembers")]
    fn circle_members(&self, circle_id: u64) -> UnorderedSetMapper<ManagedAddress>;

    #[storage_mapper("memberInfo")]
    fn member_info(&self, circle_id: u64, member: &ManagedAddress) -> SingleValueMapper<MemberInfo<Self::Api>>;

    #[storage_mapper("userCircles")]
    fn user_circles(&self, user: &ManagedAddress) -> UnorderedSetMapper<u64>;

    #[storage_mapper("circlePool")]
    fn circle_pool(&self, circle_id: u64) -> SingleValueMapper<BigUint>;

    #[storage_mapper("collateralClaimed")]
    fn collateral_claimed(&self, circle_id: u64, member: &ManagedAddress) -> SingleValueMapper<BigUint>;

    // ============ EVENTS ============

    #[event("circleCreated")]
    fn circle_created_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] creator: &ManagedAddress,
        data: CircleCreatedEventData<Self::Api>,
    );

    #[event("memberJoined")]
    fn member_joined_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
        collateral: BigUint,
    );

    #[event("memberLeft")]
    fn member_left_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
    );

    #[event("circleStarted")]
    fn circle_started_event(
        &self,
        #[indexed] circle_id: u64,
        started_at: u64,
    );

    #[event("contributionMade")]
    fn contribution_made_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
        contribution_number: u64,
    );

    #[event("collateralUsed")]
    fn collateral_used_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
        data: CollateralUsedEventData<Self::Api>,
    );

    #[event("memberDefaulted")]
    fn member_defaulted_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
        collateral_used: BigUint,
    );

    #[event("poolDistributed")]
    fn pool_distributed_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] period: u64,
        #[indexed] recipient: &ManagedAddress,
        amount: BigUint,
    );

    #[event("collateralClaimed")]
    fn collateral_claimed_event(
        &self,
        #[indexed] circle_id: u64,
        #[indexed] member: &ManagedAddress,
        amount: BigUint,
    );

    #[event("circleCompleted")]
    fn circle_completed_event(&self, #[indexed] circle_id: u64);

    #[event("circleCancelled")]
    fn circle_cancelled_event(&self, #[indexed] circle_id: u64);
}
