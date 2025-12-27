#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Staking position info
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct StakePosition<M: ManagedTypeApi> {
    pub amount: BigUint<M>,
    pub lock_level: u8,           // 1-12 (30 days to 360 days)
    pub start_epoch: u64,
    pub end_epoch: u64,
    pub last_claim_epoch: u64,
    pub accumulated_rewards: BigUint<M>,
}

/// Staking level configuration
#[type_abi]
#[derive(TopEncode, TopDecode, NestedEncode, NestedDecode, Clone)]
pub struct StakingLevel {
    pub level: u8,
    pub lock_days: u64,
    pub apy_basis_points: u64,  // APY in basis points (500 = 5%)
}

/// ============================================================================
/// XCIRCLEX STAKING 360° SMART CONTRACT
/// ============================================================================
///
/// 12 niveaux de staking basés sur la symbolique du cercle:
/// - Niveau 1: 30 jours = 30° → 5% APY
/// - Niveau 2: 60 jours = 60° → 8% APY
/// - ...
/// - Niveau 12: 360 jours = 360° → 42% APY (Cercle Parfait)
///
/// Après épuisement de la pool initiale, les récompenses proviennent
/// des frais du protocole (Cercle de Vie, pénalités, trading).
/// ============================================================================

#[multiversx_sc::contract]
pub trait XCirclexStaking {

    // =========================================================================
    // INIT
    // =========================================================================

    #[init]
    fn init(&self, token_id: TokenIdentifier) {
        self.xcirclex_token_id().set(&token_id);
        self.total_staked().set(BigUint::zero());
        self.total_rewards_distributed().set(BigUint::zero());

        // Initialize the 12 staking levels
        self.init_staking_levels();
    }

    #[upgrade]
    fn upgrade(&self) {}

    /// Initialize the 12 staking levels with their APY
    fn init_staking_levels(&self) {
        // Level: (days, APY in basis points)
        // 500 = 5%, 4200 = 42%
        let levels: [(u8, u64, u64); 12] = [
            (1, 30, 500),     // 30 days = 5%
            (2, 60, 800),     // 60 days = 8%
            (3, 90, 1200),    // 90 days = 12%
            (4, 120, 1500),   // 120 days = 15%
            (5, 150, 1800),   // 150 days = 18%
            (6, 180, 2200),   // 180 days = 22%
            (7, 210, 2500),   // 210 days = 25%
            (8, 240, 2800),   // 240 days = 28%
            (9, 270, 3200),   // 270 days = 32%
            (10, 300, 3500),  // 300 days = 35%
            (11, 330, 3800),  // 330 days = 38%
            (12, 360, 4200),  // 360 days = 42% (Cercle Parfait)
        ];

        for (level, days, apy) in levels.iter() {
            let staking_level = StakingLevel {
                level: *level,
                lock_days: *days,
                apy_basis_points: *apy,
            };
            self.staking_levels(*level).set(&staking_level);
        }
    }

    // =========================================================================
    // STAKING ENDPOINTS
    // =========================================================================

    /// Stake XCIRCLEX tokens with a specific lock level (1-12)
    /// Level 0 = Flexible staking (no lock, 3% APY)
    #[payable("*")]
    #[endpoint(stake)]
    fn stake(&self, lock_level: u8) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().single_esdt();

        // Verify token
        let token_id = self.xcirclex_token_id().get();
        require!(
            payment.token_identifier == token_id,
            "Invalid token. Only XCIRCLEX accepted."
        );
        require!(payment.amount > 0, "Amount must be greater than 0");
        require!(lock_level <= 12, "Invalid lock level. Must be 0-12.");

        let current_epoch = self.blockchain().get_block_epoch();
        let epochs_per_day = 1u64; // On MultiversX, 1 epoch ≈ 1 day

        // Calculate lock duration
        let lock_epochs = if lock_level == 0 {
            0u64 // Flexible - no lock
        } else {
            let level_info = self.staking_levels(lock_level).get();
            level_info.lock_days * epochs_per_day
        };

        let end_epoch = current_epoch + lock_epochs;

        // Create stake position
        let position = StakePosition {
            amount: payment.amount.clone(),
            lock_level,
            start_epoch: current_epoch,
            end_epoch,
            last_claim_epoch: current_epoch,
            accumulated_rewards: BigUint::zero(),
        };

        // Get existing position ID or create new one
        let position_id = self.get_next_position_id(&caller);
        self.stake_positions(&caller, position_id).set(&position);
        self.user_position_count(&caller).update(|count| *count += 1);

        // Update total staked
        self.total_staked().update(|total| *total += &payment.amount);

        // Emit event
        self.stake_event(&caller, position_id, lock_level, &payment.amount);
    }

    /// Claim pending rewards for a position
    #[endpoint(claimRewards)]
    fn claim_rewards(&self, position_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(
            !self.stake_positions(&caller, position_id).is_empty(),
            "Position not found"
        );

        let mut position = self.stake_positions(&caller, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        // Calculate rewards (with NFT bonus if applicable)
        let rewards = self.calculate_rewards(&position, current_epoch, &caller);

        require!(rewards > 0, "No rewards to claim");

        // Check if we have enough rewards in pool
        let rewards_pool = self.rewards_pool().get();
        require!(rewards_pool >= rewards, "Insufficient rewards in pool");

        // Update position
        position.last_claim_epoch = current_epoch;
        position.accumulated_rewards = BigUint::zero();
        self.stake_positions(&caller, position_id).set(&position);

        // Update rewards pool
        self.rewards_pool().update(|pool| *pool -= &rewards);
        self.total_rewards_distributed().update(|total| *total += &rewards);

        // Send rewards
        let token_id = self.xcirclex_token_id().get();
        self.send().direct_esdt(&caller, &token_id, 0, &rewards);

        // Emit event
        self.claim_rewards_event(&caller, position_id, &rewards);
    }

    /// Unstake tokens (only after lock period ends)
    #[endpoint(unstake)]
    fn unstake(&self, position_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(
            !self.stake_positions(&caller, position_id).is_empty(),
            "Position not found"
        );

        let position = self.stake_positions(&caller, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        // Check if lock period has ended (flexible staking can unstake anytime)
        if position.lock_level > 0 {
            require!(
                current_epoch >= position.end_epoch,
                "Lock period not ended. Cannot unstake yet."
            );
        }

        // Calculate and send any pending rewards (with NFT bonus if applicable)
        let rewards = self.calculate_rewards(&position, current_epoch, &caller);
        let token_id = self.xcirclex_token_id().get();

        if rewards > 0 {
            let rewards_pool = self.rewards_pool().get();
            if rewards_pool >= rewards {
                self.rewards_pool().update(|pool| *pool -= &rewards);
                self.total_rewards_distributed().update(|total| *total += &rewards);
                self.send().direct_esdt(&caller, &token_id, 0, &rewards);
            }
        }

        // Return staked amount
        self.send().direct_esdt(&caller, &token_id, 0, &position.amount);

        // Update total staked
        self.total_staked().update(|total| *total -= &position.amount);

        // Clear position
        self.stake_positions(&caller, position_id).clear();

        // Emit event
        self.unstake_event(&caller, position_id, &position.amount);
    }

    /// Emergency unstake (forfeit rewards, proportional penalty based on remaining lock time)
    /// Penalty = (remaining_time / total_lock_time) * 100%
    /// Example: 30 day lock, withdraw at day 1 = 96.7% penalty, day 15 = 50% penalty, day 29 = 3.3% penalty
    #[endpoint(emergencyUnstake)]
    fn emergency_unstake(&self, position_id: u64) {
        let caller = self.blockchain().get_caller();

        require!(
            !self.stake_positions(&caller, position_id).is_empty(),
            "Position not found"
        );

        let position = self.stake_positions(&caller, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        // Calculate proportional penalty based on remaining lock time
        // penalty = (remaining / total_lock) * 100% of amount
        let penalty_amount = if position.lock_level > 0 && current_epoch < position.end_epoch {
            let total_lock_duration = position.end_epoch - position.start_epoch;
            let remaining_duration = position.end_epoch - current_epoch;

            if total_lock_duration > 0 {
                // penalty = amount * (remaining / total)
                // Full penalty if withdrawing immediately, 0% if withdrawing at end
                &position.amount * remaining_duration / total_lock_duration
            } else {
                BigUint::zero()
            }
        } else {
            BigUint::zero()
        };

        let return_amount = &position.amount - &penalty_amount;

        // Send penalty to rewards pool (benefits other stakers)
        if penalty_amount > 0 {
            self.rewards_pool().update(|pool| *pool += &penalty_amount);
        }

        // Return remaining amount
        let token_id = self.xcirclex_token_id().get();
        self.send().direct_esdt(&caller, &token_id, 0, &return_amount);

        // Update total staked
        self.total_staked().update(|total| *total -= &position.amount);

        // Clear position
        self.stake_positions(&caller, position_id).clear();

        // Emit event
        self.emergency_unstake_event(&caller, position_id, &return_amount, &penalty_amount);
    }

    // =========================================================================
    // ADMIN ENDPOINTS
    // =========================================================================

    /// Add rewards to the pool (from protocol fees, Circle of Life, etc.)
    #[payable("*")]
    #[endpoint(addRewards)]
    fn add_rewards(&self) {
        let payment = self.call_value().single_esdt();
        let token_id = self.xcirclex_token_id().get();

        require!(
            payment.token_identifier == token_id,
            "Invalid token. Only XCIRCLEX accepted."
        );

        self.rewards_pool().update(|pool| *pool += &payment.amount);

        self.add_rewards_event(&payment.amount);
    }

    /// Update APY for a level (owner only)
    #[only_owner]
    #[endpoint(updateLevelApy)]
    fn update_level_apy(&self, level: u8, new_apy_basis_points: u64) {
        require!(level >= 1 && level <= 12, "Invalid level");
        require!(new_apy_basis_points <= 10000, "APY cannot exceed 100%");

        let mut level_info = self.staking_levels(level).get();
        level_info.apy_basis_points = new_apy_basis_points;
        self.staking_levels(level).set(&level_info);
    }

    /// Set NFT contract address for bonus multiplier (owner only)
    #[only_owner]
    #[endpoint(setNftContract)]
    fn set_nft_contract(&self, nft_address: ManagedAddress) {
        self.nft_contract().set(&nft_address);
    }

    // =========================================================================
    // INTERNAL FUNCTIONS
    // =========================================================================

    fn calculate_rewards(&self, position: &StakePosition<Self::Api>, current_epoch: u64, user: &ManagedAddress) -> BigUint {
        let epochs_staked = current_epoch - position.last_claim_epoch;

        if epochs_staked == 0 {
            return BigUint::zero();
        }

        // Get APY for this level
        let apy_basis_points = if position.lock_level == 0 {
            300u64 // Flexible = 3%
        } else {
            let level_info = self.staking_levels(position.lock_level).get();
            level_info.apy_basis_points
        };

        // Calculate base rewards: amount * (APY / 10000) * (epochs / 365)
        let yearly_rewards = &position.amount * apy_basis_points / 10000u64;
        let daily_rewards = yearly_rewards / 365u64;
        let base_rewards = daily_rewards * epochs_staked;

        // Apply NFT bonus if NFT contract is configured
        let total_rewards = if !self.nft_contract().is_empty() {
            let nft_address = self.nft_contract().get();
            let bonus_basis_points: u64 = self.nft_proxy(nft_address)
                .get_bonus_multiplier(user.clone())
                .execute_on_dest_context();

            if bonus_basis_points > 0 {
                // Apply bonus: base_rewards * (1 + bonus/10000)
                // bonus_basis_points: 500 = 5%, 5000 = 50%
                let bonus_amount = &base_rewards * bonus_basis_points / 10000u64;
                &base_rewards + &bonus_amount
            } else {
                base_rewards
            }
        } else {
            base_rewards
        };

        total_rewards + &position.accumulated_rewards
    }

    /// Get NFT bonus for a user (in basis points, 500 = 5%)
    fn get_nft_bonus(&self, user: &ManagedAddress) -> u64 {
        if self.nft_contract().is_empty() {
            return 0;
        }

        let nft_address = self.nft_contract().get();
        self.nft_proxy(nft_address)
            .get_bonus_multiplier(user.clone())
            .execute_on_dest_context()
    }

    fn get_next_position_id(&self, user: &ManagedAddress) -> u64 {
        let count = self.user_position_count(user).get();
        count + 1
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    #[view(getStakePosition)]
    fn get_stake_position(&self, user: ManagedAddress, position_id: u64) -> StakePosition<Self::Api> {
        self.stake_positions(&user, position_id).get()
    }

    #[view(getPendingRewards)]
    fn get_pending_rewards(&self, user: ManagedAddress, position_id: u64) -> BigUint {
        if self.stake_positions(&user, position_id).is_empty() {
            return BigUint::zero();
        }

        let position = self.stake_positions(&user, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();
        self.calculate_rewards(&position, current_epoch, &user)
    }

    #[view(getUserPositionCount)]
    fn get_user_position_count(&self, user: ManagedAddress) -> u64 {
        self.user_position_count(&user).get()
    }

    #[view(getStakingLevel)]
    fn get_staking_level(&self, level: u8) -> StakingLevel {
        self.staking_levels(level).get()
    }

    #[view(getTotalStaked)]
    fn get_total_staked(&self) -> BigUint {
        self.total_staked().get()
    }

    #[view(getRewardsPool)]
    fn get_rewards_pool(&self) -> BigUint {
        self.rewards_pool().get()
    }

    #[view(getTotalRewardsDistributed)]
    fn get_total_rewards_distributed(&self) -> BigUint {
        self.total_rewards_distributed().get()
    }

    #[view(getTokenId)]
    fn get_token_id(&self) -> TokenIdentifier {
        self.xcirclex_token_id().get()
    }

    #[view(canUnstake)]
    fn can_unstake(&self, user: ManagedAddress, position_id: u64) -> bool {
        if self.stake_positions(&user, position_id).is_empty() {
            return false;
        }

        let position = self.stake_positions(&user, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        position.lock_level == 0 || current_epoch >= position.end_epoch
    }

    #[view(getTimeUntilUnlock)]
    fn get_time_until_unlock(&self, user: ManagedAddress, position_id: u64) -> u64 {
        if self.stake_positions(&user, position_id).is_empty() {
            return 0;
        }

        let position = self.stake_positions(&user, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        if current_epoch >= position.end_epoch {
            0
        } else {
            position.end_epoch - current_epoch
        }
    }

    /// Get current emergency unstake penalty percentage (in basis points, 10000 = 100%)
    /// Penalty is proportional to remaining lock time
    #[view(getEmergencyPenalty)]
    fn get_emergency_penalty(&self, user: ManagedAddress, position_id: u64) -> u64 {
        if self.stake_positions(&user, position_id).is_empty() {
            return 0;
        }

        let position = self.stake_positions(&user, position_id).get();
        let current_epoch = self.blockchain().get_block_epoch();

        if position.lock_level == 0 || current_epoch >= position.end_epoch {
            return 0;
        }

        let total_lock_duration = position.end_epoch - position.start_epoch;
        let remaining_duration = position.end_epoch - current_epoch;

        if total_lock_duration > 0 {
            // Return penalty in basis points (max 10000 = 100%)
            (remaining_duration * 10000u64) / total_lock_duration
        } else {
            0
        }
    }

    /// Get effective APY for a user at a specific level (base APY + NFT bonus)
    /// Returns APY in basis points (500 = 5%, 4200 = 42%)
    #[view(getEffectiveApy)]
    fn get_effective_apy(&self, user: ManagedAddress, lock_level: u8) -> u64 {
        // Get base APY
        let base_apy = if lock_level == 0 {
            300u64 // Flexible = 3%
        } else if lock_level <= 12 {
            let level_info = self.staking_levels(lock_level).get();
            level_info.apy_basis_points
        } else {
            return 0;
        };

        // Get NFT bonus (in basis points)
        let nft_bonus = self.get_nft_bonus(&user);

        // Calculate effective APY: base_apy * (1 + bonus/10000)
        // Example: base=4200, bonus=5000 -> 4200 * 15000 / 10000 = 6300 (63%)
        if nft_bonus > 0 {
            base_apy * (10000 + nft_bonus) / 10000
        } else {
            base_apy
        }
    }

    /// Get NFT bonus percentage for a user (in basis points, 500 = 5%)
    #[view(getNftBonus)]
    fn get_nft_bonus_view(&self, user: ManagedAddress) -> u64 {
        self.get_nft_bonus(&user)
    }

    /// Get NFT contract address
    #[view(getNftContract)]
    fn get_nft_contract(&self) -> ManagedAddress {
        if self.nft_contract().is_empty() {
            ManagedAddress::zero()
        } else {
            self.nft_contract().get()
        }
    }

    /// Get total staked amount by a user across all positions (for DAO voting power)
    #[view(getTotalStakedByUser)]
    fn get_total_staked_by_user(&self, user: ManagedAddress) -> BigUint {
        let position_count = self.user_position_count(&user).get();
        let mut total = BigUint::zero();

        for position_id in 1..=position_count {
            if !self.stake_positions(&user, position_id).is_empty() {
                let position = self.stake_positions(&user, position_id).get();
                total += position.amount;
            }
        }

        total
    }

    // =========================================================================
    // STORAGE
    // =========================================================================

    #[storage_mapper("xcirclex_token_id")]
    fn xcirclex_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    #[storage_mapper("stake_positions")]
    fn stake_positions(&self, user: &ManagedAddress, position_id: u64) -> SingleValueMapper<StakePosition<Self::Api>>;

    #[storage_mapper("user_position_count")]
    fn user_position_count(&self, user: &ManagedAddress) -> SingleValueMapper<u64>;

    #[storage_mapper("staking_levels")]
    fn staking_levels(&self, level: u8) -> SingleValueMapper<StakingLevel>;

    #[storage_mapper("total_staked")]
    fn total_staked(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("rewards_pool")]
    fn rewards_pool(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("total_rewards_distributed")]
    fn total_rewards_distributed(&self) -> SingleValueMapper<BigUint>;

    /// NFT contract address for bonus multiplier
    #[storage_mapper("nft_contract")]
    fn nft_contract(&self) -> SingleValueMapper<ManagedAddress>;

    // =========================================================================
    // EVENTS
    // =========================================================================

    #[event("stake")]
    fn stake_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] position_id: u64,
        #[indexed] lock_level: u8,
        amount: &BigUint,
    );

    #[event("claim_rewards")]
    fn claim_rewards_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] position_id: u64,
        rewards: &BigUint,
    );

    #[event("unstake")]
    fn unstake_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] position_id: u64,
        amount: &BigUint,
    );

    #[event("emergency_unstake")]
    fn emergency_unstake_event(
        &self,
        #[indexed] user: &ManagedAddress,
        #[indexed] position_id: u64,
        #[indexed] penalty: &BigUint,
        returned: &BigUint,
    );

    #[event("add_rewards")]
    fn add_rewards_event(&self, amount: &BigUint);

    // =========================================================================
    // NFT PROXY
    // =========================================================================

    #[proxy]
    fn nft_proxy(&self, sc_address: ManagedAddress) -> nft_proxy::Proxy<Self::Api>;
}

// Module proxy pour appeler le contrat NFT
mod nft_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait NftContract {
        #[view(getBonusMultiplier)]
        fn get_bonus_multiplier(&self, member: ManagedAddress) -> u64;
    }
}
