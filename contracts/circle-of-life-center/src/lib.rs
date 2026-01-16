#![no_std]

multiversx_sc::imports!();
multiversx_sc::derive_imports!();

/// Circle of Life Center Contract (SC0) - Version 3
///
/// Ce smart contract est le centre du Cercle de Vie.
/// Il deploie de vrais smart contracts peripheriques (SC1, SC2...) pour chaque membre.
///
/// Fonctionnement:
/// 1. Deployer d'abord le contrat template (circle-peripheral)
/// 2. Configurer SC0 avec l'adresse du template via setPeripheralTemplate
/// 3. Les utilisateurs peuvent rejoindre - SC0 deploie un vrai SC pour eux
///
/// === SYSTÈME DE RÉCOMPENSES π × 360 ===
/// - Base: 36,000 XCX par cycle (360 × 100)
/// - Halving: récompense divisée par 2 tous les 360 cycles
/// - Bonus π% (3.14%): pour celui qui complète les cycles #360, #720, #1080...
/// - Formule: base_reward = 36000 / 2^era où era = floor(cycles_completed / 360)

/// Constantes pour le système de récompenses π × 360
/// BASE_REWARD = 36000 * 10^18 (avec 18 décimales)
const BASE_REWARD_DECIMALS: u64 = 36_000;
/// Période de halving en cycles (360 cycles = 1 cercle complet)
const HALVING_PERIOD: u64 = 360;
/// Bonus π% en basis points (314 = 3.14%)
const PI_BONUS_BPS: u64 = 314;
/// Base pour les calculs de pourcentage (10000 = 100%)
const BPS_BASE: u64 = 10_000;
/// Bonus π% pour les pionniers (les 360 premiers SC) - 314 = 3.14%
const PIONEER_BONUS_BPS: u64 = 314;
/// Seuil de pionniers (les 360 premiers SC obtiennent le bonus π%)
const PIONEER_THRESHOLD: u64 = 360;
/// Bonus maximum pour les dépôts EGLD (360% = 36000 BPS)
const MAX_DEPOSIT_BONUS_BPS: u64 = 36_000;
/// 1 EGLD en wei (10^18) - unité pour le calcul du bonus (1 EGLD = 1% = 100 BPS)
const ONE_EGLD: u64 = 1_000_000_000_000_000_000;
/// Bonus par EGLD déposé en BPS (1 EGLD = 1% = 100 BPS)
const DEPOSIT_BONUS_PER_EGLD_BPS: u64 = 100;

/// ============================================================================
/// CONSTANTES DE DISTRIBUTION EGLD (V4)
/// ============================================================================
/// Pourcentage pour le treasury SC0 (montant circulant) - 314 BPS = 3.14%
const TREASURY_PERCENTAGE_BPS: u64 = 314;
/// Pourcentage pour la liquidité (du restant après treasury) - 7000 BPS = 70%
const LIQUIDITY_PERCENTAGE_BPS: u64 = 7000;
/// Pourcentage pour le DAO (du restant après treasury) - 3000 BPS = 30%
const DAO_PERCENTAGE_BPS: u64 = 3000;
/// Slippage par défaut pour xExchange - 100 BPS = 1%
const DEFAULT_SLIPPAGE_BPS: u64 = 100;
/// Slippage minimum - 50 BPS = 0.5%
const MIN_SLIPPAGE_BPS: u64 = 50;
/// Slippage maximum - 1000 BPS = 10%
const MAX_SLIPPAGE_BPS: u64 = 1000;

#[multiversx_sc::contract]
pub trait CircleOfLifeCenter {

    // ═══════════════════════════════════════════════════════════════
    // INIT & UPGRADE
    // ═══════════════════════════════════════════════════════════════

    #[init]
    fn init(&self) {
        let caller = self.blockchain().get_caller();
        self.owner().set(&caller);

        // Frais d'entree: 1 EGLD par defaut
        self.entry_fee().set(BigUint::from(1_000_000_000_000_000_000u64));

        // Montant circulant: 0.001 EGLD
        self.circulation_amount().set(BigUint::from(1_000_000_000_000_000u64));

        // Initialiser le cycle
        self.current_cycle_index().set(0usize);
        self.cycle_day().set(0u64);
        self.cycle_epoch().set(1u64); // Epoch commence a 1
        self.is_paused().set(false);

        // Initialiser les compteurs de cycles
        self.cycles_completed().set(0u64);
        self.cycles_failed().set(0u64);
    }

    #[upgrade]
    fn upgrade(&self) {}

    // ═══════════════════════════════════════════════════════════════
    // PAYABLE - Recevoir des fonds
    // ═══════════════════════════════════════════════════════════════

    #[payable("EGLD")]
    #[endpoint(deposit)]
    fn deposit(&self) {
        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld().clone_value();

        // Verifier que le caller est membre
        require!(
            !self.member_contract(&caller).is_empty(),
            "Must be a member to deposit for bonus"
        );

        // === DISTRIBUTION V4 ===
        // Distribuer les EGLD: 3.14% treasury, 70% liquidite, 30% DAO
        self.process_egld_distribution(&payment);

        // Accumuler les depots EGLD pour le bonus (1 EGLD = 1%)
        let current_deposits = self.member_egld_deposits(&caller).get();
        let new_deposits = &current_deposits + &payment;
        self.member_egld_deposits(&caller).set(&new_deposits);

        // Mettre a jour le total global
        let total = self.total_egld_deposits().get();
        self.total_egld_deposits().set(&(total + &payment));

        // Calculer le nouveau bonus en pourcentage (pour l'event)
        let bonus_percent = self.calculate_deposit_bonus_percent(&new_deposits);

        self.deposit_bonus_event(&caller, bonus_percent, &new_deposits);
        self.deposit_event(&caller, &payment);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════

    /// Configure l'adresse du contrat template pour les SC peripheriques
    #[endpoint(setPeripheralTemplate)]
    fn set_peripheral_template(&self, template_address: ManagedAddress) {
        self.require_owner();
        self.peripheral_template().set(&template_address);
    }

    #[endpoint(changeOwner)]
    fn change_owner(&self, new_owner: ManagedAddress) {
        self.require_owner();
        self.owner().set(&new_owner);
    }

    #[endpoint(pause)]
    fn pause(&self) {
        self.require_owner();
        self.is_paused().set(true);
    }

    #[endpoint(unpause)]
    fn unpause(&self) {
        self.require_owner();
        self.is_paused().set(false);
    }

    #[endpoint(setEntryFee)]
    fn set_entry_fee(&self, new_fee: BigUint) {
        self.require_owner();
        self.entry_fee().set(&new_fee);
    }

    #[endpoint(setCirculationAmount)]
    fn set_circulation_amount(&self, new_amount: BigUint) {
        self.require_owner();
        self.circulation_amount().set(&new_amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - DISTRIBUTION V4 CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    /// Active ou desactive la distribution automatique des EGLD
    #[endpoint(setDistributionEnabled)]
    fn set_distribution_enabled(&self, enabled: bool) {
        self.require_owner();
        self.distribution_enabled().set(enabled);
    }

    /// Configure l'adresse du contrat DAO V2
    #[endpoint(setDaoContract)]
    fn set_dao_contract(&self, dao_address: ManagedAddress) {
        self.require_owner();
        self.dao_contract_address().set(&dao_address);
    }

    /// Configure l'adresse de la paire xExchange XCIRCLEX/WEGLD
    #[endpoint(setXExchangePair)]
    fn set_xexchange_pair(&self, pair_address: ManagedAddress) {
        self.require_owner();
        self.xexchange_pair_address().set(&pair_address);
    }

    /// Configure l'adresse du contrat WEGLD
    #[endpoint(setWegldContract)]
    fn set_wegld_contract(&self, wegld_address: ManagedAddress, wegld_token: TokenIdentifier) {
        self.require_owner();
        self.wegld_contract_address().set(&wegld_address);
        self.wegld_token_id().set(&wegld_token);
    }

    /// Configure l'adresse du LP Locker
    #[endpoint(setLpLocker)]
    fn set_lp_locker(&self, locker_address: ManagedAddress) {
        self.require_owner();
        self.lp_locker_address().set(&locker_address);
    }

    /// Configure le slippage tolerance pour xExchange (en BPS, 100 = 1%)
    #[endpoint(setSlippageTolerance)]
    fn set_slippage_tolerance(&self, slippage_bps: u64) {
        self.require_owner();
        require!(
            slippage_bps >= MIN_SLIPPAGE_BPS && slippage_bps <= MAX_SLIPPAGE_BPS,
            "Slippage doit etre entre 0.5% et 10%"
        );
        self.slippage_tolerance_bps().set(slippage_bps);
    }

    /// Configure le seuil minimum pour declencher auto-processing de liquidite
    #[endpoint(setLiquidityThreshold)]
    fn set_liquidity_threshold(&self, threshold: BigUint) {
        self.require_owner();
        self.liquidity_threshold().set(&threshold);
    }

    /// Configure le LP token ID (obtenu apres premier addLiquidity)
    #[endpoint(setLpTokenId)]
    fn set_lp_token_id(&self, token_id: TokenIdentifier) {
        self.require_owner();
        self.lp_token_id().set(&token_id);
    }

    /// Configure le XCIRCLEX token ID
    #[endpoint(setXcirclexTokenId)]
    fn set_xcirclex_token_id(&self, token_id: TokenIdentifier) {
        self.require_owner();
        self.xcirclex_token_id().set(&token_id);
    }

    /// Unlock les LP tokens après expiration du lock (365 jours)
    /// Les LP tokens seront envoyés à l'adresse spécifiée
    #[endpoint(unlockLpTokens)]
    fn unlock_lp_tokens(&self, lock_id: u64, recipient: ManagedAddress) {
        self.require_owner();

        require!(!self.lp_locker_address().is_empty(), "LP Locker non configure");

        let locker_address = self.lp_locker_address().get();

        // Appeler unlock sur le LP Locker (Promises API)
        self.lp_locker_proxy(locker_address)
            .unlock(lock_id)
            .with_gas_limit(20_000_000u64)
            
            .with_callback(self.callbacks().unlock_lp_tokens_callback(recipient))
            .with_extra_gas_for_callback(10_000_000u64)
            .register_promise();
    }

    /// Retire les EGLD accumules pour la liquidite (traitement manuel)
    #[endpoint(withdrawPendingLiquidity)]
    fn withdraw_pending_liquidity(&self, to: ManagedAddress) {
        self.require_owner();

        let pending = self.pending_liquidity_egld().get();
        require!(pending > BigUint::zero(), "Pas de liquidite en attente");

        self.pending_liquidity_egld().set(BigUint::zero());
        self.send().direct_egld(&to, &pending);

        self.liquidity_withdrawn_event(&to, &pending);
    }

    // ═══════════════════════════════════════════════════════════════
    // XEXCHANGE LIQUIDITY PROCESSING
    // ═══════════════════════════════════════════════════════════════

    /// Admin: Etape 1 - Wrap EGLD -> WEGLD
    /// Utilise les EGLD en attente (pending_liquidity_egld)
    /// Apres succes, appeler liquidityStep2_Swap
    #[endpoint(liquidityStep1_WrapEgld)]
    fn liquidity_step1_wrap_egld(&self) {
        self.require_owner();
        self.do_process_liquidity();
    }

    /// DEPRECATED: Utiliser liquidityStep1_WrapEgld a la place
    #[endpoint(processLiquidity)]
    fn process_liquidity(&self) {
        self.require_owner();
        self.do_process_liquidity();
    }

    /// Admin: Etape 2 - Swap WEGLD -> XCIRCLEX (50%)
    /// Appeler apres que l'etape 1 (wrap) soit terminee
    #[endpoint(liquidityStep2_Swap)]
    fn liquidity_step2_swap(&self) {
        self.require_owner();

        // Verifier config
        require!(!self.wegld_token_id().is_empty(), "WEGLD token ID non configure");
        require!(!self.xexchange_pair_address().is_empty(), "xExchange non configure");
        require!(!self.xcirclex_token_id().is_empty(), "XCIRCLEX token ID non configure");
        require!(!self.lp_locker_address().is_empty(), "LP Locker non configure");

        // Recuperer le solde WEGLD du SC
        let wegld_token = self.wegld_token_id().get();
        let wegld_balance = self.blockchain().get_sc_balance(
            &EgldOrEsdtTokenIdentifier::esdt(wegld_token.clone()), 0
        );

        require!(wegld_balance > BigUint::zero(), "Pas de WEGLD dans le SC");

        // Marquer le processing comme en cours
        self.liquidity_processing_in_progress().set(true);

        // Split 50/50 le WEGLD disponible
        let half = &wegld_balance / 2u64;
        let other_half = &wegld_balance - &half;

        // Stocker les montants pour le tracking
        self.pending_wegld_for_swap().set(&half);
        self.pending_wegld_for_lp().set(&other_half);

        self.liquidity_processing_started_event(&wegld_balance);

        // Aller directement au swap (skip wrap)
        let xcirclex_token = self.xcirclex_token_id().get();
        let pair_address = self.xexchange_pair_address().get();
        let min_out = BigUint::from(1u64);

        let payment = EsdtTokenPayment::new(wegld_token, 0, half);

        self.xexchange_proxy(pair_address)
            .swap_tokens_fixed_input(xcirclex_token, min_out)
            .with_esdt_transfer(payment)
            .with_gas_limit(30_000_000u64)
            .with_callback(self.callbacks().swap_xcirclex_callback())
            .with_extra_gas_for_callback(50_000_000u64)
            .register_promise();
    }

    /// Admin: Etape 3 - Add Liquidity (WEGLD + XCIRCLEX)
    /// Appeler apres que l'etape 2 (swap) soit terminee
    #[endpoint(liquidityStep3_AddLiquidity)]
    fn liquidity_step3_add_liquidity(&self) {
        self.require_owner();

        // Verifier config
        require!(!self.wegld_token_id().is_empty(), "WEGLD token ID non configure");
        require!(!self.xcirclex_token_id().is_empty(), "XCIRCLEX token ID non configure");
        require!(!self.xexchange_pair_address().is_empty(), "xExchange non configure");
        require!(!self.lp_locker_address().is_empty(), "LP Locker non configure");
        require!(!self.lp_token_id().is_empty(), "LP Token ID non configure");

        // Recuperer les balances
        let wegld_token = self.wegld_token_id().get();
        let xcirclex_token = self.xcirclex_token_id().get();

        let wegld_balance = self.blockchain().get_sc_balance(
            &EgldOrEsdtTokenIdentifier::esdt(wegld_token.clone()), 0
        );
        let xcirclex_balance = self.blockchain().get_sc_balance(
            &EgldOrEsdtTokenIdentifier::esdt(xcirclex_token.clone()), 0
        );

        require!(wegld_balance > BigUint::zero(), "Pas de WEGLD dans le SC");
        require!(xcirclex_balance > BigUint::zero(), "Pas de XCIRCLEX dans le SC");

        // Marquer processing en cours
        self.liquidity_processing_in_progress().set(true);

        // Stocker pour tracking
        self.pending_xcirclex_for_lp().set(&xcirclex_balance);
        self.pending_wegld_for_lp().set(&wegld_balance);

        self.swap_executed_event(&wegld_balance, &xcirclex_balance);

        // Aller directement a addLiquidity
        let pair_address = self.xexchange_pair_address().get();

        let mut payments = ManagedVec::new();
        payments.push(EsdtTokenPayment::new(xcirclex_token, 0, xcirclex_balance));
        payments.push(EsdtTokenPayment::new(wegld_token, 0, wegld_balance));

        self.xexchange_proxy(pair_address)
            .add_liquidity(BigUint::from(1u64), BigUint::from(1u64))
            .with_multi_token_transfer(payments)
            .with_gas_limit(50_000_000u64)
            .with_callback(self.callbacks().add_liquidity_callback())
            .with_extra_gas_for_callback(80_000_000u64)
            .register_promise();
    }

    /// Admin: Etape 4 - Lock LP tokens pour 365 jours
    /// Appeler apres que l'etape 3 (addLiquidity) soit terminee
    #[endpoint(liquidityStep4_LockLp)]
    fn liquidity_step4_lock_lp(&self) {
        self.require_owner();

        // Verifier config
        require!(!self.lp_token_id().is_empty(), "LP Token ID non configure");
        require!(!self.lp_locker_address().is_empty(), "LP Locker non configure");

        // Recuperer le solde LP
        let lp_token = self.lp_token_id().get();
        let lp_balance = self.blockchain().get_sc_balance(
            &EgldOrEsdtTokenIdentifier::esdt(lp_token.clone()), 0
        );

        require!(lp_balance > BigUint::zero(), "Pas de LP tokens dans le SC");

        // Lock pour 365 jours
        let locker_address = self.lp_locker_address().get();
        let lock_duration = 365u64;

        let payment = EsdtTokenPayment::new(lp_token, 0, lp_balance.clone());

        self.lp_locker_proxy(locker_address)
            .lock_lp_tokens(lock_duration)
            .with_esdt_transfer(payment)
            .with_gas_limit(30_000_000u64)
            .with_callback(self.callbacks().lock_lp_callback(lp_balance, lock_duration))
            .with_extra_gas_for_callback(20_000_000u64)
            .register_promise();
    }

    // ══════════ ALIASES POUR COMPATIBILITE ══════════

    /// DEPRECATED: Utiliser liquidityStep2_Swap
    #[endpoint(resumeProcessingFromWegld)]
    fn resume_processing_from_wegld(&self) {
        self.liquidity_step2_swap();
    }

    /// DEPRECATED: Utiliser liquidityStep3_AddLiquidity
    #[endpoint(resumeFromAddLiquidity)]
    fn resume_from_add_liquidity(&self) {
        self.liquidity_step3_add_liquidity();
    }

    /// DEPRECATED: Utiliser liquidityStep4_LockLp
    #[endpoint(lockPendingLpTokens)]
    fn lock_pending_lp_tokens(&self) {
        self.liquidity_step4_lock_lp();
    }

    /// Fonction interne pour traiter la liquidite
    fn do_process_liquidity(&self) {
        let pending = self.pending_liquidity_egld().get();
        require!(pending > BigUint::zero(), "Pas de liquidite en attente");

        // Verifier qu'un processing n'est pas deja en cours
        require!(
            !self.liquidity_processing_in_progress().get(),
            "Processing deja en cours"
        );

        // Verifier que le montant circulant reste disponible apres processing
        let sc_balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        let circulation = self.circulation_amount().get();
        require!(
            sc_balance >= &pending + &circulation,
            "Solde insuffisant: le montant circulant doit rester disponible"
        );

        // Verifier config
        require!(!self.wegld_contract_address().is_empty(), "WEGLD non configure");
        require!(!self.xexchange_pair_address().is_empty(), "xExchange non configure");
        require!(!self.wegld_token_id().is_empty(), "WEGLD token ID non configure");
        require!(!self.xcirclex_token_id().is_empty(), "XCIRCLEX token ID non configure");
        require!(!self.lp_locker_address().is_empty(), "LP Locker non configure");

        // Marquer le processing comme en cours
        self.liquidity_processing_in_progress().set(true);

        // Split 50/50
        let half = &pending / 2u64;
        let other_half = &pending - &half;

        // Reset pending EGLD
        self.pending_liquidity_egld().clear();

        // Stocker les montants pour le tracking dans les callbacks
        self.pending_wegld_for_swap().set(&half);
        self.pending_wegld_for_lp().set(&other_half);

        self.liquidity_processing_started_event(&pending);

        // Etape 1: Wrap tout l'EGLD en WEGLD (utilise promises API)
        let wegld_contract = self.wegld_contract_address().get();
        self.wegld_proxy(wegld_contract)
            .wrap_egld()
            .with_egld_transfer(pending)
            .with_gas_limit(20_000_000u64)
            
            .with_callback(self.callbacks().wrap_egld_callback())
            .with_extra_gas_for_callback(50_000_000u64)
            .register_promise();
    }

    /// Distribue les EGLD existants dans SC0 selon la formule V4
    /// 3.14% treasury (reste), 70% liquidite, 30% DAO
    /// Utilise le solde EGLD actuel du contrat (moins le montant circulant requis)
    #[endpoint(distributeExistingEgld)]
    fn distribute_existing_egld(&self, amount: BigUint) {
        self.require_owner();

        // Verifier que la distribution est configuree
        require!(
            self.distribution_enabled().get(),
            "Distribution non activee"
        );
        require!(
            !self.dao_contract_address().is_empty(),
            "DAO non configure"
        );

        // Verifier le solde disponible
        let sc_balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        let circulation = self.circulation_amount().get();
        let available = if sc_balance > circulation {
            &sc_balance - &circulation
        } else {
            BigUint::zero()
        };

        require!(amount <= available, "Montant depasse le solde disponible");
        require!(amount > BigUint::zero(), "Montant doit etre > 0");

        // Distribuer selon la formule V4
        self.process_egld_distribution(&amount);

        self.existing_egld_distributed_event(&amount);
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - REWARDS CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    /// Configure le token de recompense (XCIRCLEX)
    #[endpoint(setRewardToken)]
    fn set_reward_token(&self, token_id: TokenIdentifier) {
        self.require_owner();
        self.reward_token_id().set(&token_id);
    }

    /// Configure la recompense par cycle complete
    /// Exemple: 100 tokens = 100 * 10^18
    #[endpoint(setRewardPerCycle)]
    fn set_reward_per_cycle(&self, amount: BigUint) {
        self.require_owner();
        self.reward_per_cycle().set(&amount);
    }

    /// Deposer des tokens XCIRCLEX dans le pool de recompenses
    #[payable("*")]
    #[endpoint(depositRewards)]
    fn deposit_rewards(&self) {
        self.require_owner();

        let payment = self.call_value().single_esdt();

        // Verifier que le token est configure
        require!(
            !self.reward_token_id().is_empty(),
            "Token de recompense non configure"
        );

        let reward_token = self.reward_token_id().get();
        require!(
            payment.token_identifier == reward_token,
            "Token incorrect - utilisez XCIRCLEX"
        );

        // Ajouter au pool
        let current_pool = self.rewards_pool().get();
        self.rewards_pool().set(&(current_pool + &payment.amount));

        self.rewards_deposited_event(&payment.amount);
    }

    /// Retirer des tokens du pool (owner only - urgence)
    #[endpoint(withdrawRewards)]
    fn withdraw_rewards(&self, amount: BigUint, to: ManagedAddress) {
        self.require_owner();

        require!(
            !self.reward_token_id().is_empty(),
            "Token de recompense non configure"
        );

        let pool = self.rewards_pool().get();
        require!(pool >= amount, "Pool insuffisant");

        let token_id = self.reward_token_id().get();
        self.send().direct_esdt(&to, &token_id, 0, &amount);
        self.rewards_pool().set(&(pool - &amount));
    }

    // ═══════════════════════════════════════════════════════════════
    // ADMIN - BURN CONFIGURATION
    // ═══════════════════════════════════════════════════════════════

    /// Configure le montant de burn par SC actif pour chaque cycle reussi
    /// Defaut: 1 XCIRCLEX (1 * 10^18 avec 18 decimales)
    #[endpoint(setBurnPerSc)]
    fn set_burn_per_sc(&self, amount: BigUint) {
        self.require_owner();
        self.burn_per_sc().set(&amount);
    }

    /// Configure le bonus percentage pour celui qui demarre le cycle
    /// Ex: 1000 = 10%, 500 = 5%, max 5000 = 50%
    /// Base 10000 (pour permettre des decimales: 150 = 1.5%)
    #[endpoint(setStarterBonusPercentage)]
    fn set_starter_bonus_percentage(&self, percentage: u64) {
        self.require_owner();
        require!(percentage <= 5000, "Bonus max 50%");
        self.starter_bonus_percentage().set(percentage);
    }

    /// Configure l'adresse du contrat NFT pour la synchronisation automatique des cycles
    #[endpoint(setNftContract)]
    fn set_nft_contract(&self, address: ManagedAddress) {
        self.require_owner();
        self.nft_contract().set(&address);
    }

    /// Reset le cycle pour permettre de redemarrer (TEST ONLY)
    #[endpoint(resetCycle)]
    fn reset_cycle(&self) {
        self.require_owner();
        // Incrementer l'epoch pour invalider les anciennes signatures
        let current_epoch = self.cycle_epoch().get();
        self.cycle_epoch().set(current_epoch + 1);
        self.cycle_day().clear();
        self.current_cycle_index().set(0usize);
        self.cycle_holder().clear();
    }

    /// Initialise les index pionniers pour les SC existants (MIGRATION)
    /// A appeler une seule fois apres l'upgrade pour attribuer les index aux SC deja deployes
    #[endpoint(initializePioneerIndices)]
    fn initialize_pioneer_indices(&self) {
        self.require_owner();

        let total = self.peripheral_contracts().len();
        for i in 1..=total {
            let sc = self.peripheral_contracts().get(i);
            // Ne mettre a jour que si l'index n'est pas deja defini
            if self.peripheral_index(&sc).is_empty() || self.peripheral_index(&sc).get() == 0 {
                self.peripheral_index(&sc).set(i as u64);
            }
        }

        self.pioneer_indices_initialized_event(total as u64);
    }

    /// Simule le passage au jour suivant (TEST ONLY - pour tester failCycle et ban)
    /// Decremente cycle_day de 1 pour que current_day > cycle_day
    /// NE PAS effacer cycle_holder ni current_cycle_index - ils sont necessaires pour failCycle
    #[endpoint(simulateNextDay)]
    fn simulate_next_day(&self) {
        self.require_owner();
        let current_day = self.cycle_day().get();
        if current_day > 0 {
            self.cycle_day().set(current_day - 1);
        }
        // NE PAS incrementer l'epoch ici - il sera incremente par failCycle ou startDailyCycle
        // NE PAS effacer cycle_holder - il est necessaire pour identifier le SC responsable dans failCycle
        // NE PAS effacer current_cycle_index - il est necessaire pour identifier le SC qui a bloque
    }

    /// Force la fin d'un cycle echoue (timeout) - les fonds vont a SC0
    /// Peut etre appele par n'importe qui si le cycle est bloque depuis trop longtemps
    /// Le SC qui a bloque le cycle est automatiquement banni selon le systeme progressif:
    /// 1ère infraction = 30 jours, 2ème = 60 jours, 3ème = 90 jours, etc.
    /// Le compteur d'infractions est remis a zero apres 360 jours consecutifs sans infraction.
    #[endpoint(failCycle)]
    fn fail_cycle(&self) {
        self.require_not_paused();

        // Verifier qu'il y a un cycle en cours
        require!(!self.cycle_holder().is_empty(), "Pas de cycle en cours");

        let current_day = self.get_current_day();
        let cycle_day = self.cycle_day().get();

        // Le cycle peut etre declare echoue si on est au jour suivant
        require!(current_day > cycle_day, "Le cycle n'est pas encore en timeout");

        let cycle_holder = self.cycle_holder().get();
        let amount = self.circulation_amount().get();
        let sc0_address = self.blockchain().get_sc_address();

        // Recuperer les fonds du holder actuel vers SC0
        self.call_peripheral_transfer(&cycle_holder, &sc0_address, &amount);

        // Incrementer le compteur de cycles echoues (global)
        let failed = self.cycles_failed().get();
        self.cycles_failed().set(failed + 1);

        // Incrementer le compteur de cycles echoues pour le SC responsable
        let sc_failed = self.sc_cycles_failed(&cycle_holder).get();
        self.sc_cycles_failed(&cycle_holder).set(sc_failed + 1);

        // ═══════════════════════════════════════════════════════════════
        // SYSTEME DE BAN PROGRESSIF
        // ═══════════════════════════════════════════════════════════════
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Verifier si le compteur doit etre remis a zero (360 jours sans infraction)
        let last_infraction = self.sc_last_infraction(&cycle_holder).get();
        let days_since_last_infraction = if last_infraction > 0 {
            (current_timestamp - last_infraction) / 86400
        } else {
            0
        };

        // Reset le compteur si 360+ jours sans infraction
        let mut infraction_count = if days_since_last_infraction >= 360 {
            0u64
        } else {
            self.sc_infraction_count(&cycle_holder).get()
        };

        // Incrementer le compteur d'infractions
        infraction_count += 1;
        self.sc_infraction_count(&cycle_holder).set(infraction_count);

        // Enregistrer la date de cette infraction
        self.sc_last_infraction(&cycle_holder).set(current_timestamp);

        // Calculer la duree du ban: N × 30 jours (N = nombre d'infractions)
        let ban_days = infraction_count * 30;
        let ban_duration: u64 = ban_days * 24 * 60 * 60; // En secondes
        let ban_until = current_timestamp + ban_duration;

        self.sc_ban_until(&cycle_holder).set(ban_until);

        // Desactiver automatiquement le SC
        self.contract_active(&cycle_holder).set(false);

        // Emettre l'evenement de ban avec infos detaillees
        self.sc_banned_progressive_event(&cycle_holder, ban_until, infraction_count, ban_days);

        // Reset le cycle
        let current_epoch = self.cycle_epoch().get();
        self.cycle_epoch().set(current_epoch + 1);
        self.cycle_holder().clear();
        self.current_cycle_index().set(0usize);

        self.cycle_failed_event(cycle_day, &cycle_holder);
    }

    #[endpoint(withdraw)]
    fn withdraw(&self, amount: BigUint, to: ManagedAddress) {
        self.require_owner();
        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance >= amount, "Solde insuffisant");
        self.send().direct_egld(&to, &amount);
    }

    /// Recupere les fonds d'un SC peripherique bloque vers SC0
    /// Utilisable uniquement par l'owner en cas de cycle bloque
    #[endpoint(recoverFundsFromPeripheral)]
    fn recover_funds_from_peripheral(&self, peripheral_sc: ManagedAddress) {
        self.require_owner();

        // Appeler forceTransferToSC0 sur le SC peripherique
        let _: IgnoreValue = self.peripheral_proxy(peripheral_sc.clone())
            .force_transfer_to_sc0()
            .execute_on_dest_context();

        self.funds_recovered_event(&peripheral_sc);
    }

    fn require_owner(&self) {
        let caller = self.blockchain().get_caller();
        let owner = self.owner().get();
        require!(caller == owner, "Owner only");
    }

    fn require_not_paused(&self) {
        require!(!self.is_paused().get(), "Contract paused");
    }

    // ═══════════════════════════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════════════════════════

    #[storage_mapper("owner")]
    fn owner(&self) -> SingleValueMapper<ManagedAddress>;

    #[storage_mapper("is_paused")]
    fn is_paused(&self) -> SingleValueMapper<bool>;

    /// Adresse du contrat template pour les SC peripheriques
    #[storage_mapper("peripheral_template")]
    fn peripheral_template(&self) -> SingleValueMapper<ManagedAddress>;

    /// Liste des SC peripheriques actifs
    #[storage_mapper("peripheral_contracts")]
    fn peripheral_contracts(&self) -> VecMapper<ManagedAddress>;

    /// Mapping: adresse membre -> son SC peripherique
    #[storage_mapper("member_contract")]
    fn member_contract(&self, member: &ManagedAddress) -> SingleValueMapper<ManagedAddress>;

    /// Mapping: adresse SC -> son proprietaire
    #[storage_mapper("contract_owner")]
    fn contract_owner(&self, sc: &ManagedAddress) -> SingleValueMapper<ManagedAddress>;

    /// Mapping: adresse SC -> est actif
    #[storage_mapper("contract_active")]
    fn contract_active(&self, sc: &ManagedAddress) -> SingleValueMapper<bool>;

    #[storage_mapper("current_cycle_index")]
    fn current_cycle_index(&self) -> SingleValueMapper<usize>;

    #[storage_mapper("cycle_day")]
    fn cycle_day(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("circulation_amount")]
    fn circulation_amount(&self) -> SingleValueMapper<BigUint>;

    #[storage_mapper("entry_fee")]
    fn entry_fee(&self) -> SingleValueMapper<BigUint>;

    /// Epoch du cycle - increment a chaque reset pour invalider les signatures
    #[storage_mapper("cycle_epoch")]
    fn cycle_epoch(&self) -> SingleValueMapper<u64>;

    #[storage_mapper("last_signature")]
    fn last_signature(&self, sc: &ManagedAddress, epoch: u64) -> SingleValueMapper<u64>;

    /// SC qui detient actuellement le montant circulant
    #[storage_mapper("cycle_holder")]
    fn cycle_holder(&self) -> SingleValueMapper<ManagedAddress>;

    /// Pre-signatures: SC a signe a l'avance pour cet epoch
    #[storage_mapper("pre_signed")]
    fn pre_signed(&self, sc: &ManagedAddress, epoch: u64) -> SingleValueMapper<bool>;

    /// Auto-sign permanent: si true, le SC est considere comme pre-signe pour tous les cycles
    #[storage_mapper("auto_sign_enabled")]
    fn auto_sign_enabled(&self, sc: &ManagedAddress) -> SingleValueMapper<bool>;

    /// Auto-sign jusqu'a un epoch specifique (0 = desactive)
    /// Si > 0, le SC est considere comme pre-signe jusqu'a cet epoch (inclus)
    #[storage_mapper("auto_sign_until")]
    fn auto_sign_until(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Compteur de cycles complets (reussis)
    #[storage_mapper("cycles_completed")]
    fn cycles_completed(&self) -> SingleValueMapper<u64>;

    /// Compteur de cycles echoues (timeout ou abandon)
    #[storage_mapper("cycles_failed")]
    fn cycles_failed(&self) -> SingleValueMapper<u64>;

    /// Compteur de cycles reussis par SC peripherique
    #[storage_mapper("sc_cycles_completed")]
    fn sc_cycles_completed(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Compteur de cycles echoues par SC peripherique (le SC a bloque le cycle)
    #[storage_mapper("sc_cycles_failed")]
    fn sc_cycles_failed(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Date de fin de ban d'un SC (timestamp en secondes)
    #[storage_mapper("sc_ban_until")]
    fn sc_ban_until(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Compteur d'infractions pour ban progressif (1ère = 30j, 2ème = 60j, etc.)
    #[storage_mapper("sc_infraction_count")]
    fn sc_infraction_count(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Date de la dernière infraction (pour reset après 360 jours sans infraction)
    #[storage_mapper("sc_last_infraction")]
    fn sc_last_infraction(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    /// Numéro d'index du SC périphérique (1 = premier SC, 2 = deuxième, etc.)
    /// Les 360 premiers SC obtiennent un bonus x3 sur leurs récompenses
    #[storage_mapper("peripheral_index")]
    fn peripheral_index(&self, sc: &ManagedAddress) -> SingleValueMapper<u64>;

    // ═══════════════════════════════════════════════════════════════
    // STORAGE - REWARDS XCIRCLEX
    // ═══════════════════════════════════════════════════════════════

    /// Token ID pour les recompenses (XCIRCLEX)
    #[storage_mapper("reward_token_id")]
    fn reward_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    /// Pool de recompenses disponible
    #[storage_mapper("rewards_pool")]
    fn rewards_pool(&self) -> SingleValueMapper<BigUint>;

    /// Recompense par cycle complete (en tokens)
    #[storage_mapper("reward_per_cycle")]
    fn reward_per_cycle(&self) -> SingleValueMapper<BigUint>;

    /// Recompenses en attente pour chaque SC peripherique
    #[storage_mapper("pending_rewards")]
    fn pending_rewards(&self, sc: &ManagedAddress) -> SingleValueMapper<BigUint>;

    /// Total des recompenses distribuees
    #[storage_mapper("total_rewards_distributed")]
    fn total_rewards_distributed(&self) -> SingleValueMapper<BigUint>;

    /// Total des tokens brules
    #[storage_mapper("total_burned")]
    fn total_burned(&self) -> SingleValueMapper<BigUint>;

    /// Montant de burn par SC actif (defaut: 1 token avec 18 decimales)
    #[storage_mapper("burn_per_sc")]
    fn burn_per_sc(&self) -> SingleValueMapper<BigUint>;

    // ═══════════════════════════════════════════════════════════════
    // STORAGE - DEPOSIT BONUS (1 EGLD = 1%, max 360%)
    // ═══════════════════════════════════════════════════════════════

    /// Total des EGLD deposes par chaque membre (cumulatif)
    /// Chaque EGLD depose donne +1% de bonus sur les recompenses (max 360%)
    #[storage_mapper("member_egld_deposits")]
    fn member_egld_deposits(&self, member: &ManagedAddress) -> SingleValueMapper<BigUint>;

    /// Total global des EGLD deposes pour le bonus
    #[storage_mapper("total_egld_deposits")]
    fn total_egld_deposits(&self) -> SingleValueMapper<BigUint>;

    // ═══════════════════════════════════════════════════════════════
    // STORAGE - STARTER BONUS
    // ═══════════════════════════════════════════════════════════════

    /// Adresse de celui qui a demarre le cycle actuel
    #[storage_mapper("cycle_starter")]
    fn cycle_starter(&self) -> SingleValueMapper<ManagedAddress>;

    /// Bonus percentage pour le starter (ex: 1000 = 10%, base 10000)
    /// Defaut: 0 (pas de bonus)
    #[storage_mapper("starter_bonus_percentage")]
    fn starter_bonus_percentage(&self) -> SingleValueMapper<u64>;

    /// Total des bonus starter distribues
    #[storage_mapper("total_starter_bonus_distributed")]
    fn total_starter_bonus_distributed(&self) -> SingleValueMapper<BigUint>;

    /// Adresse du contrat NFT pour la synchronisation des cycles
    #[storage_mapper("nft_contract")]
    fn nft_contract(&self) -> SingleValueMapper<ManagedAddress>;

    // ═══════════════════════════════════════════════════════════════
    // STORAGE - DISTRIBUTION V4 (DAO + LIQUIDITÉ)
    // ═══════════════════════════════════════════════════════════════

    /// Adresse du contrat DAO V2 (recoit 30% des EGLD apres treasury)
    #[storage_mapper("dao_contract_address")]
    fn dao_contract_address(&self) -> SingleValueMapper<ManagedAddress>;

    /// Adresse de la paire xExchange XCIRCLEX/WEGLD
    #[storage_mapper("xexchange_pair_address")]
    fn xexchange_pair_address(&self) -> SingleValueMapper<ManagedAddress>;

    /// Adresse du contrat WEGLD pour wrapping
    #[storage_mapper("wegld_contract_address")]
    fn wegld_contract_address(&self) -> SingleValueMapper<ManagedAddress>;

    /// Token ID du WEGLD
    #[storage_mapper("wegld_token_id")]
    fn wegld_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    /// Adresse du LP Locker pour verrouiller les LP tokens
    #[storage_mapper("lp_locker_address")]
    fn lp_locker_address(&self) -> SingleValueMapper<ManagedAddress>;

    /// Slippage tolerance en BPS (default 100 = 1%)
    #[storage_mapper("slippage_tolerance_bps")]
    fn slippage_tolerance_bps(&self) -> SingleValueMapper<u64>;

    /// Distribution activee (true = active, false = desactivee)
    #[storage_mapper("distribution_enabled")]
    fn distribution_enabled(&self) -> SingleValueMapper<bool>;

    /// Total distribue au treasury (3.14%)
    #[storage_mapper("total_distributed_treasury")]
    fn total_distributed_treasury(&self) -> SingleValueMapper<BigUint>;

    /// Total distribue a la liquidite (70% du restant)
    #[storage_mapper("total_distributed_liquidity")]
    fn total_distributed_liquidity(&self) -> SingleValueMapper<BigUint>;

    /// Total distribue au DAO (30% du restant)
    #[storage_mapper("total_distributed_dao")]
    fn total_distributed_dao(&self) -> SingleValueMapper<BigUint>;

    /// EGLD en attente pour la liquidite (accumule avant swap)
    #[storage_mapper("pending_liquidity_egld")]
    fn pending_liquidity_egld(&self) -> SingleValueMapper<BigUint>;

    /// Seuil minimum pour declencher auto-processing de liquidite
    #[storage_mapper("liquidity_threshold")]
    fn liquidity_threshold(&self) -> SingleValueMapper<BigUint>;

    /// LP token ID recu apres addLiquidity
    #[storage_mapper("lp_token_id")]
    fn lp_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    /// XCIRCLEX token ID
    #[storage_mapper("xcirclex_token_id")]
    fn xcirclex_token_id(&self) -> SingleValueMapper<TokenIdentifier>;

    /// Tracking WEGLD temporaire pendant le process (pour swap)
    #[storage_mapper("pending_wegld_for_swap")]
    fn pending_wegld_for_swap(&self) -> SingleValueMapper<BigUint>;

    /// Tracking WEGLD temporaire pendant le process (pour LP)
    #[storage_mapper("pending_wegld_for_lp")]
    fn pending_wegld_for_lp(&self) -> SingleValueMapper<BigUint>;

    /// XCIRCLEX recu apres swap, en attente pour LP
    #[storage_mapper("pending_xcirclex_for_lp")]
    fn pending_xcirclex_for_lp(&self) -> SingleValueMapper<BigUint>;

    /// LP tokens en attente de lock (apres addLiquidity)
    #[storage_mapper("pending_lp_tokens")]
    fn pending_lp_tokens(&self) -> SingleValueMapper<BigUint>;

    /// Flag indiquant si un processing de liquidite est en cours
    #[storage_mapper("liquidity_processing_in_progress")]
    fn liquidity_processing_in_progress(&self) -> SingleValueMapper<bool>;

    // ═══════════════════════════════════════════════════════════════
    // REJOINDRE LE CERCLE - Deployer un vrai SC
    // ═══════════════════════════════════════════════════════════════

    /// Rejoindre le cercle en payant les frais d'entree
    /// SC0 deploie un nouveau smart contract pour le membre
    #[payable("EGLD")]
    #[endpoint(joinCircle)]
    fn join_circle(&self) -> ManagedAddress {
        self.require_not_paused();

        let caller = self.blockchain().get_caller();
        let payment = self.call_value().egld().clone_value();

        // Verifier le paiement
        let fee = self.entry_fee().get();
        require!(payment >= fee, "Paiement insuffisant");

        // Verifier que l'utilisateur n'est pas deja membre
        require!(
            self.member_contract(&caller).is_empty(),
            "Vous etes deja membre du cercle"
        );

        // Verifier que le template est configure
        require!(
            !self.peripheral_template().is_empty(),
            "Template non configure"
        );

        // === DISTRIBUTION V4 ===
        // Distribuer les frais d'entree: 3.14% treasury, 70% liquidite, 30% DAO
        self.process_egld_distribution(&payment);

        let template = self.peripheral_template().get();
        let sc0_address = self.blockchain().get_sc_address();

        // Deployer un nouveau SC peripherique depuis le template
        let mut args = ManagedArgBuffer::new();
        args.push_arg(&caller);
        args.push_arg(&sc0_address);

        let (new_sc_address, _) = self.send_raw().deploy_from_source_contract(
            self.blockchain().get_gas_left(),
            &BigUint::zero(),
            &template,
            CodeMetadata::UPGRADEABLE | CodeMetadata::READABLE | CodeMetadata::PAYABLE | CodeMetadata::PAYABLE_BY_SC,
            &args
        );

        // Enregistrer le nouveau SC
        self.peripheral_contracts().push(&new_sc_address);
        self.member_contract(&caller).set(&new_sc_address);
        self.contract_owner(&new_sc_address).set(&caller);
        self.contract_active(&new_sc_address).set(true);

        // Enregistrer l'index du SC (1-based: le premier SC a l'index 1)
        let sc_index = self.peripheral_contracts().len() as u64;
        self.peripheral_index(&new_sc_address).set(sc_index);

        // Emettre l'evenement avec indication si c'est un pionnier
        let is_pioneer = sc_index <= PIONEER_THRESHOLD;
        self.contract_created_event(&new_sc_address, &caller);
        if is_pioneer {
            self.pioneer_registered_event(&new_sc_address, sc_index);
        }

        new_sc_address
    }

    // ═══════════════════════════════════════════════════════════════
    // TRANSACTIONS CIRCULAIRES
    // ═══════════════════════════════════════════════════════════════

    /// Demarre le cycle quotidien - envoie le circulation_amount au premier SC
    /// Le caller recoit un bonus XCIRCLEX si le cycle se termine avec succes
    #[endpoint(startDailyCycle)]
    fn start_daily_cycle(&self) {
        self.require_not_paused();

        let caller = self.blockchain().get_caller();
        let current_day = self.get_current_day();
        let last_day = self.cycle_day().get();

        require!(current_day > last_day, "Cycle deja demarre aujourd'hui");

        let active_contracts = self.get_active_contracts();
        require!(!active_contracts.is_empty(), "Aucun SC actif");

        // Utiliser le circulation_amount defini (pas le solde total)
        let circulation = self.circulation_amount().get();
        require!(circulation > BigUint::zero(), "Montant circulant non defini");

        let balance = self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0);
        require!(balance >= circulation, "Solde SC0 insuffisant pour le montant circulant");

        // Enregistrer qui a demarre le cycle (pour le bonus)
        self.cycle_starter().set(&caller);

        // NOTE: L'epoch est incremente quand le cycle se termine (succes ou echec)
        // donc PAS besoin de l'incrementer ici - les pre-signatures faites apres
        // la fin du cycle precedent restent valides pour ce nouveau cycle

        // Envoyer uniquement le circulation_amount au premier SC actif
        let first_sc = active_contracts.get(0).clone();
        self.send().direct_egld(&first_sc, &circulation);

        self.current_cycle_index().set(0usize);
        self.cycle_day().set(current_day);
        self.cycle_holder().set(&first_sc);

        self.cycle_started_event(current_day, &circulation);
        self.cycle_starter_event(&caller, current_day);
        self.transfer_event(&self.blockchain().get_sc_address(), &first_sc, &circulation);
    }

    /// Pre-signe pour participer au cycle (peut etre fait a l'avance)
    /// Le transfert s'executera automatiquement quand c'est le tour du membre
    #[endpoint(preSign)]
    fn pre_sign(&self) {
        self.require_not_paused();

        let caller = self.blockchain().get_caller();
        let current_epoch = self.cycle_epoch().get();

        // Verifier que le caller a un SC
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'avez pas de SC"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Verifier que le SC est actif
        require!(
            self.contract_active(&caller_sc).get(),
            "Votre SC n'est pas actif"
        );

        // Verifier que pas deja pre-signe pour cet epoch
        require!(
            !self.pre_signed(&caller_sc, current_epoch).get(),
            "Deja pre-signe pour ce cycle"
        );

        // Verifier que pas deja signe (execution deja faite)
        require!(
            self.last_signature(&caller_sc, current_epoch).is_empty(),
            "Deja signe dans ce cycle"
        );

        // Enregistrer la pre-signature
        self.pre_signed(&caller_sc, current_epoch).set(true);

        self.pre_signed_event(&caller_sc, current_epoch);
    }

    // ═══════════════════════════════════════════════════════════════
    // AUTO-SIGN - Pre-signature automatique pour plusieurs cycles
    // ═══════════════════════════════════════════════════════════════

    /// Active l'auto-sign permanent (pre-signature automatique pour tous les cycles futurs)
    /// Peut etre desactive a tout moment avec disableAutoSign
    #[endpoint(enableAutoSign)]
    fn enable_auto_sign(&self) {
        self.require_not_paused();

        let caller = self.blockchain().get_caller();

        // Verifier que le caller a un SC
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'avez pas de SC"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Verifier que le SC est actif
        require!(
            self.contract_active(&caller_sc).get(),
            "Votre SC n'est pas actif"
        );

        // Activer l'auto-sign permanent
        self.auto_sign_enabled(&caller_sc).set(true);
        // Reset auto_sign_until car on passe en mode permanent
        self.auto_sign_until(&caller_sc).clear();

        self.auto_sign_enabled_event(&caller_sc);
    }

    /// Active l'auto-sign pour les N prochains cycles
    /// @param num_cycles: nombre de cycles a pre-signer (1-365)
    #[endpoint(enableAutoSignForCycles)]
    fn enable_auto_sign_for_cycles(&self, num_cycles: u64) {
        self.require_not_paused();

        require!(num_cycles >= 1 && num_cycles <= 365, "Nombre de cycles invalide (1-365)");

        let caller = self.blockchain().get_caller();

        // Verifier que le caller a un SC
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'avez pas de SC"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Verifier que le SC est actif
        require!(
            self.contract_active(&caller_sc).get(),
            "Votre SC n'est pas actif"
        );

        let current_epoch = self.cycle_epoch().get();
        let until_epoch = current_epoch + num_cycles;

        // Desactiver l'auto-sign permanent si actif
        self.auto_sign_enabled(&caller_sc).set(false);
        // Definir la limite d'epoch
        self.auto_sign_until(&caller_sc).set(until_epoch);

        self.auto_sign_until_event(&caller_sc, until_epoch, num_cycles);
    }

    /// Desactive l'auto-sign (permanent et limite)
    #[endpoint(disableAutoSign)]
    fn disable_auto_sign(&self) {
        let caller = self.blockchain().get_caller();

        // Verifier que le caller a un SC
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'avez pas de SC"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Desactiver les deux modes
        self.auto_sign_enabled(&caller_sc).set(false);
        self.auto_sign_until(&caller_sc).clear();

        self.auto_sign_disabled_event(&caller_sc);
    }

    /// Verifie si un SC est considere comme pre-signe (manuellement ou auto-sign)
    fn is_effectively_pre_signed(&self, sc: &ManagedAddress, epoch: u64) -> bool {
        // 1. Pre-signature manuelle pour cet epoch
        if self.pre_signed(sc, epoch).get() {
            return true;
        }

        // 2. Auto-sign permanent active
        if self.auto_sign_enabled(sc).get() {
            return true;
        }

        // 3. Auto-sign avec limite d'epoch
        let until_epoch = self.auto_sign_until(sc).get();
        if until_epoch > 0 && epoch <= until_epoch {
            return true;
        }

        false
    }

    /// Traite les transferts en attente pour les membres qui ont pre-signe
    /// Peut etre appele par n'importe qui (permissionless)
    #[endpoint(processNextTransfer)]
    fn process_next_transfer(&self) {
        self.require_not_paused();

        let current_day = self.cycle_day().get();
        require!(current_day > 0, "Cycle non demarre - appelez startDailyCycle");

        // Verifier qu'il y a un holder actuel (cycle en cours)
        require!(!self.cycle_holder().is_empty(), "Pas de cycle en cours");

        let active_contracts = self.get_active_contracts();
        require!(!active_contracts.is_empty(), "Aucun SC actif");

        let current_index = self.current_cycle_index().get();
        let current_epoch = self.cycle_epoch().get();

        let expected_index = current_index % active_contracts.len();
        let current_sc = active_contracts.get(expected_index).clone();

        // Verifier que le SC actuel a pre-signe (manuellement ou auto-sign)
        require!(
            self.is_effectively_pre_signed(&current_sc, current_epoch),
            "Le membre actuel n'a pas pre-signe"
        );

        // Verifier qu'il n'a pas deja ete traite
        require!(
            self.last_signature(&current_sc, current_epoch).is_empty(),
            "Deja traite dans ce cycle"
        );

        // Executer le transfert
        self.execute_transfer(&current_sc, expected_index, &active_contracts, current_epoch, current_day);
    }

    /// Traite TOUS les transferts en attente en une seule transaction
    /// Boucle sur tous les SC qui ont pre-signe (manuellement ou auto-sign) et execute leurs transferts
    /// Retourne le nombre de transferts effectues
    #[endpoint(processAllPendingTransfers)]
    fn process_all_pending_transfers(&self) -> u32 {
        self.require_not_paused();

        let current_day = self.cycle_day().get();
        require!(current_day > 0, "Cycle non demarre - appelez startDailyCycle");

        // Verifier qu'il y a un holder actuel (cycle en cours)
        if self.cycle_holder().is_empty() {
            return 0u32; // Cycle termine, rien a faire
        }

        let active_contracts = self.get_active_contracts();
        if active_contracts.is_empty() {
            return 0u32;
        }

        let current_epoch = self.cycle_epoch().get();
        let mut transfers_done = 0u32;
        let max_iterations = active_contracts.len(); // Securite: max une iteration par SC actif

        for _ in 0..max_iterations {
            // Verifier si le cycle est toujours en cours
            if self.cycle_holder().is_empty() {
                break; // Cycle termine
            }

            let current_index = self.current_cycle_index().get();
            let expected_index = current_index % active_contracts.len();
            let current_sc = active_contracts.get(expected_index).clone();

            // Verifier que le SC actuel a pre-signe (manuellement ou auto-sign)
            if !self.is_effectively_pre_signed(&current_sc, current_epoch) {
                break; // Le SC actuel n'a pas pre-signe, on s'arrete
            }

            // Verifier qu'il n'a pas deja ete traite
            if !self.last_signature(&current_sc, current_epoch).is_empty() {
                break; // Deja traite, on s'arrete
            }

            // Executer le transfert
            self.execute_transfer(&current_sc, expected_index, &active_contracts, current_epoch, current_day);
            transfers_done += 1;
        }

        transfers_done
    }

    /// Signe et transfere au prochain SC (version classique - doit etre son tour)
    #[endpoint(signAndForward)]
    fn sign_and_forward(&self) {
        self.require_not_paused();

        let caller = self.blockchain().get_caller();
        let current_day = self.cycle_day().get();
        let current_index = self.current_cycle_index().get();
        let current_epoch = self.cycle_epoch().get();

        require!(current_day > 0, "Cycle non demarre - appelez startDailyCycle");

        // Verifier que le caller a un SC
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'avez pas de SC"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Verifier que c'est le tour de ce SC
        let active_contracts = self.get_active_contracts();
        require!(!active_contracts.is_empty(), "Aucun SC actif");

        let expected_index = current_index % active_contracts.len();
        let expected_sc = active_contracts.get(expected_index).clone();

        require!(caller_sc == expected_sc, "Ce n'est pas votre tour");

        // Verifier que pas deja signe (utilise epoch pour permettre reset)
        require!(
            self.last_signature(&caller_sc, current_epoch).is_empty(),
            "Deja signe dans ce cycle"
        );

        // Executer le transfert
        self.execute_transfer(&caller_sc, expected_index, &active_contracts, current_epoch, current_day);

        // Apres le transfert, verifier si le prochain a deja pre-signe
        // et traiter automatiquement en chaine
        self.process_pending_transfers();
    }

    /// Execute le transfert pour un SC donne
    fn execute_transfer(
        &self,
        from_sc: &ManagedAddress,
        from_index: usize,
        active_contracts: &ManagedVec<ManagedAddress>,
        current_epoch: u64,
        current_day: u64
    ) {
        // Enregistrer la signature avec l'epoch actuel
        self.last_signature(from_sc, current_epoch).set(self.blockchain().get_block_timestamp());

        // Calculer le suivant
        let next_index = (from_index + 1) % active_contracts.len();
        let amount = self.circulation_amount().get();

        // Determiner la destination
        let next_sc = if next_index == 0 {
            // Cycle complet - retour a SC0
            self.blockchain().get_sc_address()
        } else {
            active_contracts.get(next_index).clone()
        };

        // Transferer depuis le SC peripherique vers le suivant
        self.call_peripheral_transfer(from_sc, &next_sc, &amount);

        // Mettre a jour l'index et le holder
        if next_index == 0 {
            // Cycle complet - incrementer le compteur de cycles reussis
            let completed = self.cycles_completed().get();
            self.cycles_completed().set(completed + 1);

            // Incrementer le compteur de cycles reussis pour TOUS les SC qui ont participe
            // ET distribuer les recompenses
            let reward_per_sc = self.calculate_reward_per_participant(active_contracts.len());

            // ═══════════════════════════════════════════════════════════════
            // BONUS π% - Pour celui qui complete un cycle "cercle complet" (360, 720, ...)
            // ═══════════════════════════════════════════════════════════════
            let cycles_now = completed + 1; // Le cycle vient d'etre complete
            if cycles_now > 0 && cycles_now % HALVING_PERIOD == 0 {
                // C'est un cycle cercle complet! Donner le bonus π% a celui qui l'a complete
                let reward_per_cycle = self.calculate_option_f_reward();
                let pi_bonus = &reward_per_cycle * PI_BONUS_BPS / BPS_BASE;

                if pi_bonus > BigUint::zero() {
                    let pool = self.rewards_pool().get();
                    if pool >= pi_bonus {
                        // Le dernier SC (from_sc) est celui qui a complete le cercle
                        let current_pending = self.pending_rewards(from_sc).get();
                        self.pending_rewards(from_sc).set(&(current_pending + &pi_bonus));

                        // Deduire du pool
                        self.rewards_pool().set(&(pool - &pi_bonus));

                        // Emettre l'evenement du bonus cercle complet
                        self.circle_complete_bonus_event(from_sc, cycles_now, &pi_bonus);
                    }
                }
            }

            // Verifier si le contrat NFT est configure pour la synchronisation
            let nft_configured = !self.nft_contract().is_empty();

            for i in 0..active_contracts.len() {
                let sc = active_contracts.get(i).clone();
                let sc_completed = self.sc_cycles_completed(&sc).get();
                let new_cycles = sc_completed + 1;
                self.sc_cycles_completed(&sc).set(new_cycles);

                // Ajouter les recompenses en attente pour ce SC
                // Bonus appliques:
                // - Pioneer: +3.14% pour les 360 premiers SC
                // - Deposit: +1% par EGLD depose (max 360%)
                if reward_per_sc > BigUint::zero() {
                    let final_reward = self.calculate_final_reward_with_bonuses(&reward_per_sc, &sc);

                    let current_pending = self.pending_rewards(&sc).get();
                    self.pending_rewards(&sc).set(&(current_pending + &final_reward));
                }

                // Synchroniser les cycles vers le contrat NFT si configure
                if nft_configured {
                    if !self.contract_owner(&sc).is_empty() {
                        let member_wallet = self.contract_owner(&sc).get();
                        let nft_address = self.nft_contract().get();
                        // Appel async pour ne pas bloquer si le contrat NFT echoue
                        let _: IgnoreValue = self.nft_proxy(nft_address)
                            .update_member_cycles(member_wallet, new_cycles)
                            .execute_on_dest_context();
                    }
                }
            }

            // ═══════════════════════════════════════════════════════════════
            // STARTER BONUS - Recompense pour celui qui a demarre le cycle
            // ═══════════════════════════════════════════════════════════════
            if !self.cycle_starter().is_empty() {
                let starter = self.cycle_starter().get();
                let bonus_percentage = self.starter_bonus_percentage().get();

                // Verifier que le bonus est configure et que le starter est membre
                if bonus_percentage > 0 && !self.member_contract(&starter).is_empty() {
                    let starter_sc = self.member_contract(&starter).get();

                    // Calculer le bonus: (reward_per_cycle / nb_SC) * bonus_percentage / 10000
                    // Le bonus est base sur la recompense par SC, comme les autres bonus
                    let reward_per_cycle = self.calculate_option_f_reward();
                    let active_count = self.get_active_contracts().len() as u64;
                    let base_per_sc = if active_count > 0 {
                        &reward_per_cycle / active_count
                    } else {
                        reward_per_cycle.clone()
                    };
                    let starter_bonus = &base_per_sc * bonus_percentage / 10000u64;

                    if starter_bonus > BigUint::zero() {
                        // Verifier qu'il y a assez dans le pool
                        let pool = self.rewards_pool().get();
                        if pool >= starter_bonus {
                            // Ajouter le bonus aux recompenses en attente du starter
                            let current_pending = self.pending_rewards(&starter_sc).get();
                            self.pending_rewards(&starter_sc).set(&(current_pending + &starter_bonus));

                            // Deduire du pool
                            self.rewards_pool().set(&(pool - &starter_bonus));

                            // Mettre a jour le total des bonus distribues
                            let total_bonus = self.total_starter_bonus_distributed().get();
                            self.total_starter_bonus_distributed().set(&(total_bonus + &starter_bonus));

                            // Emettre l'evenement
                            self.starter_bonus_distributed_event(&starter, &starter_bonus);
                        }
                    }
                }

                // Effacer le starter pour le prochain cycle
                self.cycle_starter().clear();
            }

            self.cycle_completed_event(current_day);
            self.cycle_holder().clear();

            // IMPORTANT: Incrementer l'epoch pour invalider les anciennes pre-signatures
            // Cela permet aux membres de pre-signer pour le prochain cycle
            let epoch = self.cycle_epoch().get();
            self.cycle_epoch().set(epoch + 1);
        } else {
            self.current_cycle_index().set(next_index);
            self.cycle_holder().set(&next_sc);
        }

        self.signature_event(from_sc, &next_sc, &amount);
    }

    /// Traite automatiquement les transferts en chaine pour les membres qui ont pre-signe
    fn process_pending_transfers(&self) {
        let current_epoch = self.cycle_epoch().get();
        let current_day = self.cycle_day().get();

        // Obtenir le nombre de contrats actifs pour la limite d'iterations
        let active_contracts = self.get_active_contracts();
        if active_contracts.is_empty() {
            return;
        }

        // Maximum = nombre de contrats actifs (pour couvrir tout le cycle)
        let mut iterations = 0usize;
        let max_iterations = active_contracts.len();

        while iterations < max_iterations {
            // Verifier si le cycle est toujours en cours
            if self.cycle_holder().is_empty() {
                break;
            }

            let current_index = self.current_cycle_index().get();
            let expected_index = current_index % active_contracts.len();
            let current_sc = active_contracts.get(expected_index).clone();

            // Verifier si le prochain membre a pre-signe (manuel ou auto) ET n'a pas encore ete traite
            if !self.is_effectively_pre_signed(&current_sc, current_epoch) {
                break;
            }

            if !self.last_signature(&current_sc, current_epoch).is_empty() {
                break;
            }

            // Executer le transfert automatiquement
            self.execute_transfer(&current_sc, expected_index, &active_contracts, current_epoch, current_day);

            iterations += 1;
        }
    }

    /// Appelle le SC peripherique pour transferer vers une destination
    fn call_peripheral_transfer(&self, from_sc: &ManagedAddress, to_sc: &ManagedAddress, amount: &BigUint) {
        // Appel synchrone au SC peripherique pour transferer
        let _: IgnoreValue = self.peripheral_proxy(from_sc.clone())
            .transfer(to_sc.clone(), amount.clone())
            .execute_on_dest_context();

        self.transfer_event(from_sc, to_sc, amount);
    }

    #[proxy]
    fn peripheral_proxy(&self, sc_address: ManagedAddress) -> peripheral_proxy::Proxy<Self::Api>;

    #[proxy]
    fn nft_proxy(&self, sc_address: ManagedAddress) -> nft_proxy::Proxy<Self::Api>;

    #[proxy]
    fn dao_proxy(&self, sc_address: ManagedAddress) -> dao_proxy::Proxy<Self::Api>;

    #[proxy]
    fn wegld_proxy(&self, sc_address: ManagedAddress) -> wegld_proxy::Proxy<Self::Api>;

    #[proxy]
    fn xexchange_proxy(&self, sc_address: ManagedAddress) -> xexchange_proxy::Proxy<Self::Api>;

    #[proxy]
    fn lp_locker_proxy(&self, sc_address: ManagedAddress) -> lp_locker_proxy::Proxy<Self::Api>;

    // ═══════════════════════════════════════════════════════════════
    // DISTRIBUTION V4 - HELPERS
    // ═══════════════════════════════════════════════════════════════

    /// Calcule la distribution des EGLD recus
    /// Retourne (treasury_amount, liquidity_amount, dao_amount)
    fn calculate_distribution(&self, total: &BigUint) -> (BigUint, BigUint, BigUint) {
        // 3.14% pour treasury
        let treasury = total * TREASURY_PERCENTAGE_BPS / BPS_BASE;

        // Reste apres treasury (96.86%)
        let remaining = total - &treasury;

        // 70% du reste pour liquidite
        let liquidity = &remaining * LIQUIDITY_PERCENTAGE_BPS / BPS_BASE;

        // 30% du reste pour DAO
        let dao = &remaining * DAO_PERCENTAGE_BPS / BPS_BASE;

        (treasury, liquidity, dao)
    }

    /// Traite la distribution du treasury (3.14% reste dans SC0)
    fn process_treasury_distribution(&self, amount: &BigUint) {
        if amount == &BigUint::zero() {
            return;
        }

        // Le treasury reste simplement dans SC0 comme montant circulant
        let current = self.total_distributed_treasury().get();
        self.total_distributed_treasury().set(&(&current + amount));

        self.treasury_distribution_event(amount);
    }

    /// Envoie les EGLD au DAO V2
    fn send_to_dao(&self, amount: &BigUint) {
        if amount == &BigUint::zero() {
            return;
        }

        if self.dao_contract_address().is_empty() {
            // Si pas de DAO configure, accumuler dans SC0
            return;
        }

        let dao_address = self.dao_contract_address().get();

        // Transfert direct EGLD au DAO (payable, pas d'appel de fonction)
        // Plus economique en gas qu'un appel synchrone cross-shard
        self.send().direct_egld(&dao_address, amount);

        // Tracker la distribution
        let current = self.total_distributed_dao().get();
        self.total_distributed_dao().set(&(&current + amount));

        self.dao_distribution_event(&dao_address, amount);
    }

    /// Accumule les EGLD pour la liquidite (swap + LP via xExchange)
    /// Note: Le processing est manuel via processLiquidity() pour eviter les problemes de gas
    fn accumulate_for_liquidity(&self, amount: &BigUint) {
        if amount == &BigUint::zero() {
            return;
        }

        let current = self.pending_liquidity_egld().get();
        let new_total = &current + amount;
        self.pending_liquidity_egld().set(&new_total);

        let total_distributed = self.total_distributed_liquidity().get();
        self.total_distributed_liquidity().set(&(&total_distributed + amount));

        self.liquidity_accumulated_event(amount);

        // Note: Pas d'auto-trigger - le processing est fait manuellement via processLiquidity()
        // car les appels async cross-shard necessitent ~200M gas
    }

    /// Traite la distribution complete d'un paiement EGLD
    fn process_egld_distribution(&self, payment: &BigUint) {
        // Verifier si la distribution est activee
        if !self.distribution_enabled().get() {
            return;
        }

        // Calculer les montants
        let (treasury, liquidity, dao) = self.calculate_distribution(payment);

        // 1. Treasury (3.14%) - reste dans SC0
        self.process_treasury_distribution(&treasury);

        // 2. DAO (30% du restant)
        self.send_to_dao(&dao);

        // 3. Liquidite (70% du restant) - accumule pour traitement
        self.accumulate_for_liquidity(&liquidity);

        self.distribution_processed_event(payment, &treasury, &liquidity, &dao);
    }

    // ═══════════════════════════════════════════════════════════════
    // GESTION DES STATUTS
    // ═══════════════════════════════════════════════════════════════

    #[endpoint(setInactive)]
    fn set_inactive(&self) {
        let caller = self.blockchain().get_caller();
        require!(!self.member_contract(&caller).is_empty(), "Pas membre");

        let sc = self.member_contract(&caller).get();
        self.contract_active(&sc).set(false);
        self.status_changed_event(&sc, false);
    }

    #[endpoint(setActive)]
    fn set_active(&self) {
        let caller = self.blockchain().get_caller();
        require!(!self.member_contract(&caller).is_empty(), "Pas membre");

        let sc = self.member_contract(&caller).get();

        // Verifier que le SC n'est pas banni
        let ban_until = self.sc_ban_until(&sc).get();
        let current_timestamp = self.blockchain().get_block_timestamp();
        require!(current_timestamp >= ban_until, "Votre SC est temporairement banni");

        self.contract_active(&sc).set(true);
        self.status_changed_event(&sc, true);
    }

    #[endpoint(leaveCircle)]
    fn leave_circle(&self) {
        let caller = self.blockchain().get_caller();
        require!(!self.member_contract(&caller).is_empty(), "Pas membre");

        let sc = self.member_contract(&caller).get();
        self.contract_active(&sc).set(false);
        self.member_contract(&caller).clear();

        self.member_left_event(&caller, &sc);
    }

    // ═══════════════════════════════════════════════════════════════
    // REWARDS - CLAIM
    // ═══════════════════════════════════════════════════════════════

    /// Reclamer les recompenses XCIRCLEX accumulees (uniquement le dimanche)
    #[endpoint(claimRewards)]
    fn claim_rewards(&self) {
        let caller = self.blockchain().get_caller();

        // Verifier que c'est dimanche (jour 0 de la semaine)
        require!(
            self.is_sunday(),
            "Les recompenses ne peuvent etre reclamees que le dimanche"
        );

        // Verifier que le caller est membre
        require!(
            !self.member_contract(&caller).is_empty(),
            "Vous n'etes pas membre du cercle"
        );

        let caller_sc = self.member_contract(&caller).get();

        // Verifier les recompenses en attente
        let pending = self.pending_rewards(&caller_sc).get();
        require!(pending > BigUint::zero(), "Aucune recompense a reclamer");

        // Verifier que le token est configure
        require!(
            !self.reward_token_id().is_empty(),
            "Token de recompense non configure"
        );

        let token_id = self.reward_token_id().get();

        // Transferer les recompenses au membre (pas au SC peripherique)
        self.send().direct_esdt(&caller, &token_id, 0, &pending);

        // Mettre a jour le total distribue
        let total = self.total_rewards_distributed().get();
        self.total_rewards_distributed().set(&(total + &pending));

        // Reset les recompenses en attente
        self.pending_rewards(&caller_sc).clear();

        self.rewards_claimed_event(&caller, &pending);
    }

    /// Verifie si le jour actuel est un dimanche
    /// Epoch (1 Jan 1970) etait un jeudi, donc (days + 4) % 7 = jour de la semaine
    /// 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
    fn is_sunday(&self) -> bool {
        let timestamp = self.blockchain().get_block_timestamp();
        let days_since_epoch = timestamp / 86400;
        // Epoch etait jeudi (4), donc on ajoute 4 et on module par 7
        let day_of_week = (days_since_epoch + 4) % 7;
        day_of_week == 0 // 0 = Dimanche
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════

    fn get_current_day(&self) -> u64 {
        self.blockchain().get_block_timestamp() / 86400
    }

    /// Calcule la recompense par participant pour un cycle
    /// Utilise le systeme π × 360 avec halving tous les 360 cycles
    /// Effectue aussi le burn de tokens: burn_per_sc * num_participants
    fn calculate_reward_per_participant(&self, num_participants: usize) -> BigUint {
        // Verifier que les recompenses sont configurees
        if self.reward_token_id().is_empty() {
            return BigUint::zero();
        }

        let pool = self.rewards_pool().get();

        // Calculer la recompense avec la formule π × 360 (halving)
        let reward_per_cycle = self.calculate_option_f_reward();

        // Calculer le montant a burn (burn_per_sc * nombre de participants)
        let burn_per_sc = self.burn_per_sc().get();
        let total_burn = &burn_per_sc * (num_participants as u64);

        // Calculer le total requis (recompenses + burn)
        let total_required = &reward_per_cycle + &total_burn;

        // Verifier qu'il y a assez dans le pool
        if pool < total_required {
            return BigUint::zero();
        }

        // Effectuer le burn si burn_per_sc est configure et > 0
        if total_burn > BigUint::zero() {
            let token_id = self.reward_token_id().get();
            // Burn les tokens depuis le pool
            self.send().esdt_local_burn(&token_id, 0, &total_burn);

            // Mettre a jour le total brule
            let current_burned = self.total_burned().get();
            self.total_burned().set(&(current_burned + &total_burn));

            // Emettre l'evenement de burn
            self.tokens_burned_event(&total_burn, num_participants as u64);
        }

        // Diviser la recompense par le nombre de participants
        let reward_per_sc = &reward_per_cycle / (num_participants as u64);

        // Deduire du pool (recompenses + burn)
        let total_reward = &reward_per_sc * (num_participants as u64);
        self.rewards_pool().set(&(pool - &total_reward - &total_burn));

        reward_per_sc
    }

    /// Calcule la recompense pour le cycle actuel selon π × 360
    /// Formule: base_reward = 36000 * 10^18 / 2^era où era = floor(cycles_completed / 360)
    fn calculate_option_f_reward(&self) -> BigUint {
        let cycles_completed = self.cycles_completed().get();

        // Calculer l'ere (nombre de halvings effectues)
        // era = cycles_completed / 360
        let era = cycles_completed / HALVING_PERIOD;

        // Calculer la recompense de base avec 18 decimales
        // base_reward = 36000 * 10^18
        let decimals = BigUint::from(10u64).pow(18u32);
        let base_reward = BigUint::from(BASE_REWARD_DECIMALS) * &decimals;

        // Appliquer le halving: diviser par 2^era
        // Note: On limite era a 10 pour eviter les debordements (apres ~3600 cycles, reward ~35 XCX)
        let capped_era = if era > 10 { 10u64 } else { era };
        let divisor = 1u64 << capped_era; // 2^era

        let halved_reward = &base_reward / divisor;

        halved_reward
    }

    /// Verifie si le cycle qui vient d'etre complete est un "cercle complet" (multiple de 360)
    /// Si oui, retourne le bonus π% a ajouter
    fn calculate_pi_bonus(&self, base_reward: &BigUint) -> BigUint {
        let cycles_completed = self.cycles_completed().get();

        // Verifier si c'est un cycle cercle complet (360, 720, 1080, ...)
        if cycles_completed > 0 && cycles_completed % HALVING_PERIOD == 0 {
            // Bonus π% = 3.14% = 314 basis points
            let bonus = base_reward * PI_BONUS_BPS / BPS_BASE;
            return bonus;
        }

        BigUint::zero()
    }

    /// Retourne l'ere actuelle (nombre de halvings effectues)
    fn get_current_era(&self) -> u64 {
        let cycles_completed = self.cycles_completed().get();
        cycles_completed / HALVING_PERIOD
    }

    fn get_active_contracts(&self) -> ManagedVec<ManagedAddress> {
        let mut active = ManagedVec::new();
        for i in 1..=self.peripheral_contracts().len() {
            let sc = self.peripheral_contracts().get(i);
            if self.contract_active(&sc).get() {
                active.push(sc);
            }
        }
        active
    }

    /// Calcule le bonus de depot en pourcentage (1-360%)
    /// 1 EGLD = 1%, max 360 EGLD = 360%
    fn calculate_deposit_bonus_percent(&self, deposits: &BigUint) -> u64 {
        // Convertir les depots en nombre d'EGLD entiers
        let one_egld = BigUint::from(ONE_EGLD);
        let egld_count = deposits / &one_egld;

        // Convertir en u64 de maniere sure
        let egld_u64 = egld_count.to_u64().unwrap_or(0);

        // Limiter a 360%
        if egld_u64 > 360 {
            360
        } else {
            egld_u64
        }
    }

    /// Calcule le bonus de depot en basis points (100-36000 BPS)
    /// 1 EGLD = 100 BPS (1%), max 360 EGLD = 36000 BPS (360%)
    fn calculate_deposit_bonus_bps(&self, deposits: &BigUint) -> u64 {
        let percent = self.calculate_deposit_bonus_percent(deposits);
        // 1% = 100 BPS
        let bps = percent * DEPOSIT_BONUS_PER_EGLD_BPS;

        // Limiter au max
        if bps > MAX_DEPOSIT_BONUS_BPS {
            MAX_DEPOSIT_BONUS_BPS
        } else {
            bps
        }
    }

    /// Calcule la recompense finale avec tous les bonus (pioneer + deposit)
    fn calculate_final_reward_with_bonuses(
        &self,
        base_reward: &BigUint,
        sc: &ManagedAddress
    ) -> BigUint {
        let mut final_reward = base_reward.clone();

        // 1. Bonus Pioneer (3.14% pour les 360 premiers SC)
        let sc_index = self.peripheral_index(sc).get();
        if sc_index > 0 && sc_index <= PIONEER_THRESHOLD {
            let pioneer_bonus = base_reward * PIONEER_BONUS_BPS / BPS_BASE;
            final_reward += &pioneer_bonus;
        }

        // 2. Bonus Depot EGLD (1 EGLD = 1%, max 360%)
        // On doit obtenir l'adresse du membre (owner du SC)
        if !self.contract_owner(sc).is_empty() {
            let member = self.contract_owner(sc).get();
            let deposits = self.member_egld_deposits(&member).get();

            if deposits > BigUint::zero() {
                let deposit_bonus_bps = self.calculate_deposit_bonus_bps(&deposits);
                if deposit_bonus_bps > 0 {
                    let deposit_bonus = base_reward * deposit_bonus_bps / BPS_BASE;
                    final_reward += &deposit_bonus;
                }
            }
        }

        final_reward
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════════════════════════

    #[view(getCircleInfo)]
    fn get_circle_info(&self) -> MultiValue6<usize, usize, BigUint, BigUint, u64, usize> {
        let total = self.peripheral_contracts().len();
        let active = self.get_active_contracts().len();
        let fee = self.entry_fee().get();
        let amount = self.circulation_amount().get();
        let day = self.cycle_day().get();
        let index = self.current_cycle_index().get();

        (total, active, fee, amount, day, index).into()
    }

    #[view(getMyContract)]
    fn get_my_contract(&self, member: ManagedAddress) -> OptionalValue<ManagedAddress> {
        if self.member_contract(&member).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.member_contract(&member).get())
        }
    }

    #[view(isMember)]
    fn is_member(&self, addr: ManagedAddress) -> bool {
        !self.member_contract(&addr).is_empty()
    }

    #[view(isActive)]
    fn is_active(&self, member: ManagedAddress) -> bool {
        if self.member_contract(&member).is_empty() {
            return false;
        }
        let sc = self.member_contract(&member).get();
        self.contract_active(&sc).get()
    }

    #[view(isMyTurn)]
    fn is_my_turn(&self, member: ManagedAddress) -> bool {
        // Verifier que le cycle est actif (cycle_holder est set)
        if self.cycle_holder().is_empty() {
            return false;
        }

        if self.member_contract(&member).is_empty() {
            return false;
        }

        let sc = self.member_contract(&member).get();
        if !self.contract_active(&sc).get() {
            return false;
        }

        let active_contracts = self.get_active_contracts();
        if active_contracts.is_empty() {
            return false;
        }

        // Verifier que c'est bien le tour de ce SC
        let cycle_holder = self.cycle_holder().get();
        sc == cycle_holder
    }

    #[view(getActiveContracts)]
    fn get_active_contracts_view(&self) -> MultiValueEncoded<ManagedAddress> {
        let active = self.get_active_contracts();
        let mut result = MultiValueEncoded::new();
        for i in 0..active.len() {
            result.push(active.get(i).clone());
        }
        result
    }

    #[view(getAllContracts)]
    fn get_all_contracts(&self) -> MultiValueEncoded<ManagedAddress> {
        let mut result = MultiValueEncoded::new();
        for i in 1..=self.peripheral_contracts().len() {
            result.push(self.peripheral_contracts().get(i));
        }
        result
    }

    #[view(getPeripheralTemplate)]
    fn get_peripheral_template(&self) -> OptionalValue<ManagedAddress> {
        if self.peripheral_template().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.peripheral_template().get())
        }
    }

    #[view(getOwner)]
    fn get_owner(&self) -> ManagedAddress {
        self.owner().get()
    }

    #[view(isPaused)]
    fn get_is_paused(&self) -> bool {
        self.is_paused().get()
    }

    #[view(getContractBalance)]
    fn get_contract_balance(&self) -> BigUint {
        self.blockchain().get_sc_balance(&EgldOrEsdtTokenIdentifier::egld(), 0)
    }

    #[view(getCycleHolder)]
    fn get_cycle_holder(&self) -> OptionalValue<ManagedAddress> {
        if self.cycle_holder().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.cycle_holder().get())
        }
    }

    #[view(getCycleDay)]
    fn get_cycle_day(&self) -> u64 {
        self.cycle_day().get()
    }

    #[view(getCurrentDay)]
    fn get_current_day_view(&self) -> u64 {
        self.get_current_day()
    }

    #[view(getCycleEpoch)]
    fn get_cycle_epoch(&self) -> u64 {
        self.cycle_epoch().get()
    }

    #[view(getCyclesCompleted)]
    fn get_cycles_completed(&self) -> u64 {
        self.cycles_completed().get()
    }

    #[view(getCyclesFailed)]
    fn get_cycles_failed(&self) -> u64 {
        self.cycles_failed().get()
    }

    #[view(getCycleStats)]
    fn get_cycle_stats(&self) -> MultiValue3<u64, u64, u64> {
        let completed = self.cycles_completed().get();
        let failed = self.cycles_failed().get();
        let total = completed + failed;
        (completed, failed, total).into()
    }

    /// Verifie si un membre a pre-signe pour le cycle actuel (manuel ou auto-sign)
    #[view(hasPreSigned)]
    fn has_pre_signed(&self, member: ManagedAddress) -> bool {
        if self.member_contract(&member).is_empty() {
            return false;
        }
        let sc = self.member_contract(&member).get();
        let current_epoch = self.cycle_epoch().get();
        self.is_effectively_pre_signed(&sc, current_epoch)
    }

    /// Verifie si un membre a deja signe/transfere dans ce cycle
    #[view(hasSignedThisCycle)]
    fn has_signed_this_cycle(&self, member: ManagedAddress) -> bool {
        if self.member_contract(&member).is_empty() {
            return false;
        }
        let sc = self.member_contract(&member).get();
        let current_epoch = self.cycle_epoch().get();
        !self.last_signature(&sc, current_epoch).is_empty()
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - AUTO-SIGN STATUS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne le statut complet de l'auto-sign pour un membre
    /// (is_auto_sign_permanent, auto_sign_until_epoch, remaining_cycles)
    #[view(getAutoSignStatus)]
    fn get_auto_sign_status(&self, member: ManagedAddress) -> MultiValue3<bool, u64, u64> {
        if self.member_contract(&member).is_empty() {
            return (false, 0u64, 0u64).into();
        }
        let sc = self.member_contract(&member).get();
        let is_permanent = self.auto_sign_enabled(&sc).get();
        let until_epoch = self.auto_sign_until(&sc).get();

        let current_epoch = self.cycle_epoch().get();
        let remaining = if until_epoch > current_epoch {
            until_epoch - current_epoch
        } else {
            0u64
        };

        (is_permanent, until_epoch, remaining).into()
    }

    /// Verifie si l'auto-sign permanent est active pour un membre
    #[view(isAutoSignEnabled)]
    fn is_auto_sign_enabled(&self, member: ManagedAddress) -> bool {
        if self.member_contract(&member).is_empty() {
            return false;
        }
        let sc = self.member_contract(&member).get();
        self.auto_sign_enabled(&sc).get()
    }

    /// Retourne l'epoch jusqu'a laquelle l'auto-sign est actif (0 si desactive)
    #[view(getAutoSignUntil)]
    fn get_auto_sign_until(&self, member: ManagedAddress) -> u64 {
        if self.member_contract(&member).is_empty() {
            return 0;
        }
        let sc = self.member_contract(&member).get();
        self.auto_sign_until(&sc).get()
    }

    /// Retourne le nombre de cycles restants pour l'auto-sign limite
    #[view(getAutoSignRemainingCycles)]
    fn get_auto_sign_remaining_cycles(&self, member: ManagedAddress) -> u64 {
        if self.member_contract(&member).is_empty() {
            return 0;
        }
        let sc = self.member_contract(&member).get();
        let until_epoch = self.auto_sign_until(&sc).get();
        let current_epoch = self.cycle_epoch().get();

        if until_epoch > current_epoch {
            until_epoch - current_epoch
        } else {
            0
        }
    }

    /// Retourne le proprietaire d'un contrat peripherique
    #[view(getContractOwner)]
    fn get_contract_owner(&self, sc_address: ManagedAddress) -> OptionalValue<ManagedAddress> {
        if self.contract_owner(&sc_address).is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.contract_owner(&sc_address).get())
        }
    }

    /// Retourne tous les contrats avec leurs proprietaires
    #[view(getAllContractsWithOwners)]
    fn get_all_contracts_with_owners(&self) -> MultiValueEncoded<MultiValue2<ManagedAddress, ManagedAddress>> {
        let mut result = MultiValueEncoded::new();
        for i in 1..=self.peripheral_contracts().len() {
            let sc = self.peripheral_contracts().get(i);
            if !self.contract_owner(&sc).is_empty() {
                let owner = self.contract_owner(&sc).get();
                result.push(MultiValue2::from((sc, owner)));
            }
        }
        result
    }

    /// Retourne la liste des membres qui ont pre-signe pour le cycle actuel
    #[view(getPreSignedMembers)]
    fn get_pre_signed_members(&self) -> MultiValueEncoded<ManagedAddress> {
        let mut result = MultiValueEncoded::new();
        let current_epoch = self.cycle_epoch().get();

        for i in 1..=self.peripheral_contracts().len() {
            let sc = self.peripheral_contracts().get(i);
            if self.is_effectively_pre_signed(&sc, current_epoch) {
                // Retourner l'adresse du owner du SC
                if !self.contract_owner(&sc).is_empty() {
                    result.push(self.contract_owner(&sc).get());
                }
            }
        }
        result
    }

    /// Retourne les statistiques d'un SC peripherique (cycles reussis, echoues, ban until, is_banned, infraction_count)
    #[view(getScStats)]
    fn get_sc_stats(&self, sc_address: ManagedAddress) -> MultiValue5<u64, u64, u64, bool, u64> {
        let completed = self.sc_cycles_completed(&sc_address).get();
        let failed = self.sc_cycles_failed(&sc_address).get();
        let ban_until = self.sc_ban_until(&sc_address).get();
        let current_timestamp = self.blockchain().get_block_timestamp();
        let is_banned = ban_until > current_timestamp;
        let infraction_count = self.sc_infraction_count(&sc_address).get();
        (completed, failed, ban_until, is_banned, infraction_count).into()
    }

    /// Retourne les informations detaillees du ban progressif pour un SC
    /// (infraction_count, last_infraction_timestamp, ban_until, remaining_ban_days, days_until_reset)
    #[view(getInfractionInfo)]
    fn get_infraction_info(&self, sc_address: ManagedAddress) -> MultiValue5<u64, u64, u64, u64, u64> {
        let infraction_count = self.sc_infraction_count(&sc_address).get();
        let last_infraction = self.sc_last_infraction(&sc_address).get();
        let ban_until = self.sc_ban_until(&sc_address).get();
        let current_timestamp = self.blockchain().get_block_timestamp();

        // Calculer les jours restants de ban
        let remaining_ban_days = if ban_until > current_timestamp {
            (ban_until - current_timestamp) / 86400
        } else {
            0
        };

        // Calculer les jours restants avant reset du compteur (360 jours sans infraction)
        let days_until_reset = if last_infraction > 0 {
            let days_since = (current_timestamp - last_infraction) / 86400;
            if days_since >= 360 {
                0 // Deja reset
            } else {
                360 - days_since
            }
        } else {
            0 // Pas d'infraction
        };

        (infraction_count, last_infraction, ban_until, remaining_ban_days, days_until_reset).into()
    }

    /// Verifie si le compteur d'infractions sera remis a zero (360 jours sans infraction)
    #[view(willInfractionReset)]
    fn will_infraction_reset(&self, sc_address: ManagedAddress) -> bool {
        let last_infraction = self.sc_last_infraction(&sc_address).get();
        if last_infraction == 0 {
            return true; // Pas d'infraction = pas de compteur
        }
        let current_timestamp = self.blockchain().get_block_timestamp();
        let days_since = (current_timestamp - last_infraction) / 86400;
        days_since >= 360
    }

    /// Verifie si un SC est banni et retourne la date de fin de ban
    #[view(isBanned)]
    fn is_banned(&self, sc_address: ManagedAddress) -> MultiValue2<bool, u64> {
        let ban_until = self.sc_ban_until(&sc_address).get();
        let current_timestamp = self.blockchain().get_block_timestamp();
        let is_banned = ban_until > current_timestamp;
        (is_banned, ban_until).into()
    }

    /// Retourne les statistiques de tous les SC avec leurs stats (incluant infraction_count)
    #[view(getAllScStats)]
    fn get_all_sc_stats(&self) -> MultiValueEncoded<MultiValue6<ManagedAddress, u64, u64, u64, bool, u64>> {
        let mut result = MultiValueEncoded::new();
        let current_timestamp = self.blockchain().get_block_timestamp();

        for i in 1..=self.peripheral_contracts().len() {
            let sc = self.peripheral_contracts().get(i);
            let completed = self.sc_cycles_completed(&sc).get();
            let failed = self.sc_cycles_failed(&sc).get();
            let ban_until = self.sc_ban_until(&sc).get();
            let is_banned = ban_until > current_timestamp;
            let infraction_count = self.sc_infraction_count(&sc).get();
            result.push(MultiValue6::from((sc, completed, failed, ban_until, is_banned, infraction_count)));
        }
        result
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - REWARDS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne le token ID de recompense
    #[view(getRewardTokenId)]
    fn get_reward_token_id(&self) -> OptionalValue<TokenIdentifier> {
        if self.reward_token_id().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.reward_token_id().get())
        }
    }

    /// Retourne le pool de recompenses disponible
    #[view(getRewardsPool)]
    fn get_rewards_pool(&self) -> BigUint {
        self.rewards_pool().get()
    }

    /// Retourne la recompense par cycle (calculee avec π × 360)
    #[view(getRewardPerCycle)]
    fn get_reward_per_cycle(&self) -> BigUint {
        // Utilise le systeme π × 360 avec halving
        self.calculate_option_f_reward()
    }

    /// Retourne la recompense de base configuree manuellement (ancienne methode - deprecated)
    #[view(getBaseRewardConfig)]
    fn get_base_reward_config(&self) -> BigUint {
        self.reward_per_cycle().get()
    }

    /// Retourne les recompenses en attente pour un membre
    #[view(getPendingRewards)]
    fn get_pending_rewards(&self, member: ManagedAddress) -> BigUint {
        if self.member_contract(&member).is_empty() {
            return BigUint::zero();
        }
        let sc = self.member_contract(&member).get();
        self.pending_rewards(&sc).get()
    }

    /// Retourne le total des recompenses distribuees
    #[view(getTotalRewardsDistributed)]
    fn get_total_rewards_distributed(&self) -> BigUint {
        self.total_rewards_distributed().get()
    }

    /// Retourne les informations de recompense completes
    #[view(getRewardsInfo)]
    fn get_rewards_info(&self) -> MultiValue4<BigUint, BigUint, BigUint, bool> {
        let pool = self.rewards_pool().get();
        let per_cycle = self.reward_per_cycle().get();
        let total_distributed = self.total_rewards_distributed().get();
        let is_configured = !self.reward_token_id().is_empty();
        (pool, per_cycle, total_distributed, is_configured).into()
    }

    /// Verifie si c'est dimanche (jour ou on peut claim les recompenses)
    #[view(isSunday)]
    fn is_sunday_view(&self) -> bool {
        self.is_sunday()
    }

    /// Retourne le jour de la semaine (0=Dimanche, 1=Lundi, ..., 6=Samedi)
    #[view(getDayOfWeek)]
    fn get_day_of_week(&self) -> u64 {
        let timestamp = self.blockchain().get_block_timestamp();
        let days_since_epoch = timestamp / 86400;
        (days_since_epoch + 4) % 7
    }

    /// Verifie si un membre peut claim ses recompenses maintenant
    #[view(canClaimRewards)]
    fn can_claim_rewards(&self, member: ManagedAddress) -> MultiValue3<bool, BigUint, bool> {
        let is_sunday = self.is_sunday();
        let pending = self.get_pending_rewards(member);
        let has_rewards = pending > BigUint::zero();
        (is_sunday, pending, has_rewards).into()
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - OPTION F REWARD SYSTEM (π × 360)
    // ═══════════════════════════════════════════════════════════════

    /// Retourne la recompense actuelle pour un cycle (avec halving applique)
    #[view(getCurrentCycleReward)]
    fn get_current_cycle_reward(&self) -> BigUint {
        self.calculate_option_f_reward()
    }

    /// Retourne l'ere actuelle (nombre de halvings effectues)
    #[view(getCurrentEra)]
    fn get_current_era_view(&self) -> u64 {
        self.get_current_era()
    }

    /// Retourne le prochain cycle qui declenchera un bonus cercle complet
    #[view(getNextCircleCompleteCycle)]
    fn get_next_circle_complete_cycle(&self) -> u64 {
        let cycles_completed = self.cycles_completed().get();
        let current_circle = cycles_completed / HALVING_PERIOD;
        (current_circle + 1) * HALVING_PERIOD
    }

    /// Retourne les cycles restants avant le prochain halving
    #[view(getCyclesUntilNextHalving)]
    fn get_cycles_until_next_halving(&self) -> u64 {
        let cycles_completed = self.cycles_completed().get();
        let next_halving = ((cycles_completed / HALVING_PERIOD) + 1) * HALVING_PERIOD;
        next_halving - cycles_completed
    }

    /// Retourne les informations completes du systeme π × 360
    /// (current_reward, current_era, next_circle_complete, cycles_until_halving, pi_bonus_amount)
    #[view(getOptionFInfo)]
    fn get_option_f_info(&self) -> MultiValue5<BigUint, u64, u64, u64, BigUint> {
        let current_reward = self.calculate_option_f_reward();
        let current_era = self.get_current_era();
        let next_circle = self.get_next_circle_complete_cycle();
        let cycles_until = self.get_cycles_until_next_halving();

        // Calculer le bonus π% potentiel
        let pi_bonus = &current_reward * PI_BONUS_BPS / BPS_BASE;

        (current_reward, current_era, next_circle, cycles_until, pi_bonus).into()
    }

    /// Verifie si le prochain cycle complete sera un "cercle complet" (360, 720, ...)
    #[view(isNextCycleCircleComplete)]
    fn is_next_cycle_circle_complete(&self) -> bool {
        let cycles_completed = self.cycles_completed().get();
        (cycles_completed + 1) % HALVING_PERIOD == 0
    }

    /// Retourne la table des recompenses par ere (pour affichage)
    /// Retourne les 5 prochaines eres avec leurs recompenses
    #[view(getRewardSchedule)]
    fn get_reward_schedule(&self) -> MultiValueEncoded<MultiValue3<u64, u64, BigUint>> {
        let mut result = MultiValueEncoded::new();
        let decimals = BigUint::from(10u64).pow(18u32);
        let base_reward = BigUint::from(BASE_REWARD_DECIMALS) * &decimals;

        for era in 0u64..5u64 {
            let start_cycle = era * HALVING_PERIOD;
            let divisor = 1u64 << era;
            let reward = &base_reward / divisor;
            result.push(MultiValue3::from((era, start_cycle, reward)));
        }
        result
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - BURN STATS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne le total de tokens brules
    #[view(getTotalBurned)]
    fn get_total_burned(&self) -> BigUint {
        self.total_burned().get()
    }

    /// Retourne le montant de burn par SC actif
    #[view(getBurnPerSc)]
    fn get_burn_per_sc(&self) -> BigUint {
        self.burn_per_sc().get()
    }

    /// Retourne les statistiques de burn completes
    /// (total_burned, burn_per_sc, estimated_next_burn basé sur le nombre de SC actifs)
    #[view(getBurnStats)]
    fn get_burn_stats(&self) -> MultiValue3<BigUint, BigUint, BigUint> {
        let total_burned = self.total_burned().get();
        let burn_per_sc = self.burn_per_sc().get();
        let active_count = self.get_active_contracts().len() as u64;
        let estimated_next_burn = &burn_per_sc * active_count;
        (total_burned, burn_per_sc, estimated_next_burn).into()
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - DISTRIBUTION STATS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne le total distribue au treasury (3.14%)
    #[view(getTotalDistributedTreasury)]
    fn get_total_distributed_treasury(&self) -> BigUint {
        self.total_distributed_treasury().get()
    }

    /// Retourne le total distribue au DAO (30% du restant)
    #[view(getTotalDistributedDao)]
    fn get_total_distributed_dao(&self) -> BigUint {
        self.total_distributed_dao().get()
    }

    /// Retourne les EGLD en attente pour la liquidite (70% du restant)
    #[view(getPendingLiquidityEgld)]
    fn get_pending_liquidity_egld(&self) -> BigUint {
        self.pending_liquidity_egld().get()
    }

    /// Verifie si la distribution est activee
    #[view(isDistributionEnabled)]
    fn is_distribution_enabled(&self) -> bool {
        self.distribution_enabled().get()
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - STARTER BONUS
    // ═══════════════════════════════════════════════════════════════

    /// Retourne les informations du bonus starter
    /// (percentage, current_starter, potential_bonus, total_distributed)
    #[view(getStarterBonusInfo)]
    fn get_starter_bonus_info(&self) -> MultiValue4<u64, OptionalValue<ManagedAddress>, BigUint, BigUint> {
        let percentage = self.starter_bonus_percentage().get();
        let starter = if self.cycle_starter().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.cycle_starter().get())
        };

        // Calculer le bonus potentiel: (reward_per_cycle / nb_SC) * percentage / 10000
        let potential_bonus = if percentage > 0 {
            let reward_per_cycle = self.calculate_option_f_reward();
            let active_count = self.get_active_contracts().len() as u64;
            let base_per_sc = if active_count > 0 {
                &reward_per_cycle / active_count
            } else {
                reward_per_cycle
            };
            &base_per_sc * percentage / 10000u64
        } else {
            BigUint::zero()
        };

        let total_distributed = self.total_starter_bonus_distributed().get();

        (percentage, starter, potential_bonus, total_distributed).into()
    }

    /// Retourne le pourcentage de bonus starter configure
    #[view(getStarterBonusPercentage)]
    fn get_starter_bonus_percentage(&self) -> u64 {
        self.starter_bonus_percentage().get()
    }

    /// Retourne l'adresse de celui qui a demarre le cycle actuel
    #[view(getCycleStarter)]
    fn get_cycle_starter(&self) -> OptionalValue<ManagedAddress> {
        if self.cycle_starter().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.cycle_starter().get())
        }
    }

    /// Retourne le total des bonus starter distribues
    #[view(getTotalStarterBonusDistributed)]
    fn get_total_starter_bonus_distributed(&self) -> BigUint {
        self.total_starter_bonus_distributed().get()
    }

    /// Retourne l'adresse du contrat NFT configure pour la synchronisation
    #[view(getNftContract)]
    fn get_nft_contract(&self) -> OptionalValue<ManagedAddress> {
        if self.nft_contract().is_empty() {
            OptionalValue::None
        } else {
            OptionalValue::Some(self.nft_contract().get())
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - PIONEER STATUS (Bonus π% pour les 360 premiers SC)
    // ═══════════════════════════════════════════════════════════════

    /// Verifie si un membre est un pionnier (parmi les 360 premiers)
    #[view(isPioneer)]
    fn is_pioneer(&self, member: ManagedAddress) -> bool {
        if self.member_contract(&member).is_empty() {
            return false;
        }
        let sc = self.member_contract(&member).get();
        let index = self.peripheral_index(&sc).get();
        index > 0 && index <= PIONEER_THRESHOLD
    }

    /// Retourne l'index du SC d'un membre (0 si pas membre)
    #[view(getPeripheralIndex)]
    fn get_peripheral_index(&self, member: ManagedAddress) -> u64 {
        if self.member_contract(&member).is_empty() {
            return 0;
        }
        let sc = self.member_contract(&member).get();
        self.peripheral_index(&sc).get()
    }

    /// Retourne les infos pionnier pour un membre
    /// (is_pioneer, index, bonus_percentage, remaining_pioneer_slots)
    #[view(getPioneerInfo)]
    fn get_pioneer_info(&self, member: ManagedAddress) -> MultiValue4<bool, u64, u64, u64> {
        let total_contracts = self.peripheral_contracts().len() as u64;
        let remaining_slots = if total_contracts < PIONEER_THRESHOLD {
            PIONEER_THRESHOLD - total_contracts
        } else {
            0
        };

        if self.member_contract(&member).is_empty() {
            return (false, 0u64, 0u64, remaining_slots).into();
        }

        let sc = self.member_contract(&member).get();
        let index = self.peripheral_index(&sc).get();
        let is_pioneer = index > 0 && index <= PIONEER_THRESHOLD;
        let bonus_pct = if is_pioneer { PIONEER_BONUS_BPS } else { 0 };

        (is_pioneer, index, bonus_pct, remaining_slots).into()
    }

    /// Retourne le nombre de places pionniers restantes
    #[view(getRemainingPioneerSlots)]
    fn get_remaining_pioneer_slots(&self) -> u64 {
        let total_contracts = self.peripheral_contracts().len() as u64;
        if total_contracts < PIONEER_THRESHOLD {
            PIONEER_THRESHOLD - total_contracts
        } else {
            0
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // VIEWS - DEPOSIT BONUS (1 EGLD = 1%, max 360%)
    // ═══════════════════════════════════════════════════════════════

    /// Retourne les infos de bonus de depot pour un membre
    /// (total_deposits, bonus_percent, bonus_bps, max_bonus_percent)
    #[view(getDepositBonusInfo)]
    fn get_deposit_bonus_info(&self, member: ManagedAddress) -> MultiValue4<BigUint, u64, u64, u64> {
        let deposits = self.member_egld_deposits(&member).get();
        let bonus_percent = self.calculate_deposit_bonus_percent(&deposits);
        let bonus_bps = self.calculate_deposit_bonus_bps(&deposits);

        (deposits, bonus_percent, bonus_bps, 360u64).into()
    }

    /// Retourne le total des EGLD deposes par un membre
    #[view(getMemberEgldDeposits)]
    fn get_member_egld_deposits(&self, member: ManagedAddress) -> BigUint {
        self.member_egld_deposits(&member).get()
    }

    /// Retourne le bonus de depot en pourcentage (1-360%)
    #[view(getDepositBonusPercent)]
    fn get_deposit_bonus_percent(&self, member: ManagedAddress) -> u64 {
        let deposits = self.member_egld_deposits(&member).get();
        self.calculate_deposit_bonus_percent(&deposits)
    }

    /// Retourne le total global des EGLD deposes
    #[view(getTotalEgldDeposits)]
    fn get_total_egld_deposits(&self) -> BigUint {
        self.total_egld_deposits().get()
    }

    /// Retourne les bonus totaux pour un membre (pioneer + deposit)
    /// (is_pioneer, pioneer_bonus_bps, deposit_bonus_bps, total_bonus_bps)
    #[view(getAllBonuses)]
    fn get_all_bonuses(&self, member: ManagedAddress) -> MultiValue4<bool, u64, u64, u64> {
        if self.member_contract(&member).is_empty() {
            return (false, 0u64, 0u64, 0u64).into();
        }

        let sc = self.member_contract(&member).get();
        let index = self.peripheral_index(&sc).get();
        let is_pioneer = index > 0 && index <= PIONEER_THRESHOLD;
        let pioneer_bonus_bps = if is_pioneer { PIONEER_BONUS_BPS } else { 0 };

        let deposits = self.member_egld_deposits(&member).get();
        let deposit_bonus_bps = self.calculate_deposit_bonus_bps(&deposits);

        let total_bonus_bps = pioneer_bonus_bps + deposit_bonus_bps;

        (is_pioneer, pioneer_bonus_bps, deposit_bonus_bps, total_bonus_bps).into()
    }

    /// Verifie combien de transferts peuvent etre traites automatiquement
    #[view(getPendingAutoTransfers)]
    fn get_pending_auto_transfers(&self) -> usize {
        if self.cycle_holder().is_empty() {
            return 0;
        }

        let active_contracts = self.get_active_contracts();
        if active_contracts.is_empty() {
            return 0;
        }

        let current_epoch = self.cycle_epoch().get();
        let mut current_index = self.current_cycle_index().get();
        let mut count = 0usize;

        // Compter combien de transferts consecutifs peuvent etre traites
        for _ in 0..active_contracts.len() {
            let expected_index = current_index % active_contracts.len();
            let current_sc = active_contracts.get(expected_index).clone();

            // Verifier si pre-signe (manuel ou auto) ET pas encore traite
            if self.is_effectively_pre_signed(&current_sc, current_epoch)
                && self.last_signature(&current_sc, current_epoch).is_empty()
            {
                count += 1;
                current_index += 1;
            } else {
                break;
            }
        }

        count
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════

    #[event("contract_created")]
    fn contract_created_event(&self, #[indexed] sc_address: &ManagedAddress, #[indexed] owner: &ManagedAddress);

    #[event("cycle_started")]
    fn cycle_started_event(&self, #[indexed] day: u64, amount: &BigUint);

    #[event("cycle_completed")]
    fn cycle_completed_event(&self, #[indexed] day: u64);

    #[event("cycle_failed")]
    fn cycle_failed_event(&self, #[indexed] day: u64, #[indexed] failed_at: &ManagedAddress);

    #[event("signature")]
    fn signature_event(&self, #[indexed] from: &ManagedAddress, #[indexed] next: &ManagedAddress, amount: &BigUint);

    #[event("transfer")]
    fn transfer_event(&self, #[indexed] from: &ManagedAddress, #[indexed] to: &ManagedAddress, amount: &BigUint);

    #[event("status_changed")]
    fn status_changed_event(&self, #[indexed] sc: &ManagedAddress, active: bool);

    #[event("member_left")]
    fn member_left_event(&self, #[indexed] member: &ManagedAddress, #[indexed] sc: &ManagedAddress);

    #[event("deposit")]
    fn deposit_event(&self, #[indexed] from: &ManagedAddress, amount: &BigUint);

    #[event("deposit_bonus")]
    fn deposit_bonus_event(
        &self,
        #[indexed] member: &ManagedAddress,
        #[indexed] bonus_percent: u64,
        total_deposits: &BigUint
    );

    #[event("pre_signed")]
    fn pre_signed_event(&self, #[indexed] sc: &ManagedAddress, #[indexed] epoch: u64);

    #[event("funds_recovered")]
    fn funds_recovered_event(&self, #[indexed] from_sc: &ManagedAddress);

    #[event("sc_banned")]
    fn sc_banned_event(&self, #[indexed] sc: &ManagedAddress, #[indexed] ban_until: u64);

    #[event("sc_banned_progressive")]
    fn sc_banned_progressive_event(
        &self,
        #[indexed] sc: &ManagedAddress,
        #[indexed] ban_until: u64,
        #[indexed] infraction_count: u64,
        ban_days: u64
    );

    #[event("rewards_deposited")]
    fn rewards_deposited_event(&self, amount: &BigUint);

    #[event("rewards_claimed")]
    fn rewards_claimed_event(&self, #[indexed] member: &ManagedAddress, amount: &BigUint);

    #[event("tokens_burned")]
    fn tokens_burned_event(&self, amount: &BigUint, #[indexed] num_sc: u64);

    #[event("auto_sign_enabled")]
    fn auto_sign_enabled_event(&self, #[indexed] sc: &ManagedAddress);

    #[event("auto_sign_until")]
    fn auto_sign_until_event(&self, #[indexed] sc: &ManagedAddress, #[indexed] until_epoch: u64, num_cycles: u64);

    #[event("auto_sign_disabled")]
    fn auto_sign_disabled_event(&self, #[indexed] sc: &ManagedAddress);

    #[event("cycle_starter")]
    fn cycle_starter_event(&self, #[indexed] starter: &ManagedAddress, #[indexed] day: u64);

    #[event("starter_bonus_distributed")]
    fn starter_bonus_distributed_event(&self, #[indexed] starter: &ManagedAddress, amount: &BigUint);

    #[event("circle_complete_bonus")]
    fn circle_complete_bonus_event(&self, #[indexed] completer: &ManagedAddress, #[indexed] cycle_number: u64, amount: &BigUint);

    #[event("pioneer_registered")]
    fn pioneer_registered_event(&self, #[indexed] sc: &ManagedAddress, #[indexed] index: u64);

    #[event("pioneer_indices_initialized")]
    fn pioneer_indices_initialized_event(&self, #[indexed] total_count: u64);

    // ═══════════════════════════════════════════════════════════════
    // EVENTS - DISTRIBUTION V4
    // ═══════════════════════════════════════════════════════════════

    #[event("treasury_distribution")]
    fn treasury_distribution_event(&self, #[indexed] amount: &BigUint);

    #[event("dao_distribution")]
    fn dao_distribution_event(&self, #[indexed] dao_address: &ManagedAddress, #[indexed] amount: &BigUint);

    #[event("liquidity_accumulated")]
    fn liquidity_accumulated_event(&self, #[indexed] amount: &BigUint);

    #[event("liquidity_withdrawn")]
    fn liquidity_withdrawn_event(&self, #[indexed] to: &ManagedAddress, #[indexed] amount: &BigUint);

    #[event("distribution_processed")]
    fn distribution_processed_event(
        &self,
        #[indexed] total: &BigUint,
        #[indexed] treasury: &BigUint,
        #[indexed] liquidity: &BigUint,
        dao: &BigUint
    );

    #[event("existing_egld_distributed")]
    fn existing_egld_distributed_event(&self, #[indexed] amount: &BigUint);

    // ═══════════════════════════════════════════════════════════════
    // EVENTS - XEXCHANGE LIQUIDITY PROCESSING
    // ═══════════════════════════════════════════════════════════════

    #[event("liquidity_processing_started")]
    fn liquidity_processing_started_event(&self, #[indexed] amount: &BigUint);

    #[event("wegld_wrapped")]
    fn wegld_wrapped_event(&self, #[indexed] amount: &BigUint);

    #[event("swap_executed")]
    fn swap_executed_event(&self, #[indexed] wegld_in: &BigUint, #[indexed] xcirclex_out: &BigUint);

    #[event("liquidity_added")]
    fn liquidity_added_event(&self, #[indexed] lp_amount: &BigUint);

    #[event("lp_locked")]
    fn lp_locked_event(&self, #[indexed] amount: &BigUint, #[indexed] duration_days: u64);

    #[event("lp_unlocked_and_sent")]
    fn lp_unlocked_and_sent_event(&self, #[indexed] recipient: &ManagedAddress, #[indexed] amount: &BigUint);

    #[event("liquidity_processing_completed")]
    fn liquidity_processing_completed_event(&self);

    #[event("liquidity_processing_error")]
    fn liquidity_processing_error_event(&self, #[indexed] step: &ManagedBuffer, error: &ManagedBuffer);

    #[event("liquidity_step_completed")]
    fn liquidity_step_completed_event(&self, #[indexed] step: &ManagedBuffer);

    // ═══════════════════════════════════════════════════════════════
    // CALLBACKS - XEXCHANGE LIQUIDITY PROCESSING (Promises API)
    // ═══════════════════════════════════════════════════════════════

    /// Callback apres wrap EGLD -> WEGLD
    /// NOTE: Ne chaine PAS d'autre appel async - l'utilisateur doit appeler l'etape suivante
    #[promises_callback]
    fn wrap_egld_callback(&self, #[call_result] result: ManagedAsyncCallResult<()>) {
        match result {
            ManagedAsyncCallResult::Ok(()) => {
                // WEGLD recu avec succes
                let wegld_for_swap = self.pending_wegld_for_swap().get();
                let total_wegld = &wegld_for_swap + &self.pending_wegld_for_lp().get();
                self.wegld_wrapped_event(&total_wegld);

                // Marquer l'etape comme terminee - PAS de chaining async
                self.liquidity_processing_in_progress().set(false);
                self.liquidity_step_completed_event(&ManagedBuffer::from(b"wrap"));
                // L'utilisateur doit maintenant appeler liquidityStep2_Swap
            },
            ManagedAsyncCallResult::Err(err) => {
                self.liquidity_processing_error_event(
                    &ManagedBuffer::from(b"wrap"),
                    &err.err_msg
                );
                self.cleanup_failed_processing();
            }
        }
    }

    /// Callback apres swap WEGLD -> XCIRCLEX
    /// NOTE: Ne chaine PAS d'autre appel async - l'utilisateur doit appeler l'etape suivante
    #[promises_callback]
    fn swap_xcirclex_callback(&self, #[call_result] result: ManagedAsyncCallResult<()>) {
        match result {
            ManagedAsyncCallResult::Ok(()) => {
                // Recuperer le XCIRCLEX recu (balance du SC)
                let xcirclex_token = self.xcirclex_token_id().get();
                let xcirclex_balance = self.blockchain().get_sc_balance(
                    &EgldOrEsdtTokenIdentifier::esdt(xcirclex_token.clone()), 0
                );

                let wegld_swapped = self.pending_wegld_for_swap().get();
                self.swap_executed_event(&wegld_swapped, &xcirclex_balance);

                // Stocker pour LP
                self.pending_xcirclex_for_lp().set(&xcirclex_balance);

                // Marquer l'etape comme terminee - PAS de chaining async
                self.liquidity_processing_in_progress().set(false);
                self.liquidity_step_completed_event(&ManagedBuffer::from(b"swap"));
                // L'utilisateur doit maintenant appeler liquidityStep3_AddLiquidity
            },
            ManagedAsyncCallResult::Err(err) => {
                self.liquidity_processing_error_event(
                    &ManagedBuffer::from(b"swap"),
                    &err.err_msg
                );
                self.cleanup_failed_processing();
            }
        }
    }

    /// Callback apres addLiquidity
    #[promises_callback]
    fn add_liquidity_callback(&self, #[call_result] result: ManagedAsyncCallResult<()>) {
        match result {
            ManagedAsyncCallResult::Ok(()) => {
                // Recuperer les LP tokens recus
                let lp_token = self.lp_token_id().get();
                let lp_balance = self.blockchain().get_sc_balance(
                    &EgldOrEsdtTokenIdentifier::esdt(lp_token.clone()), 0
                );

                self.liquidity_added_event(&lp_balance);

                // Stocker les LP tokens en attente de lock (multi-level async pas permis)
                self.pending_lp_tokens().set(&lp_balance);

                self.cleanup_processing();
                // Note: Appeler lockPendingLpTokens() manuellement apres
                self.liquidity_processing_completed_event();
            },
            ManagedAsyncCallResult::Err(err) => {
                self.liquidity_processing_error_event(
                    &ManagedBuffer::from(b"addLiquidity"),
                    &err.err_msg
                );
                self.cleanup_failed_processing();
            }
        }
    }

    /// Callback apres lock LP tokens
    #[promises_callback]
    fn lock_lp_callback(
        &self,
        lp_amount: BigUint,
        duration: u64,
        #[call_result] result: ManagedAsyncCallResult<()>
    ) {
        match result {
            ManagedAsyncCallResult::Ok(()) => {
                self.lp_locked_event(&lp_amount, duration);
                self.cleanup_processing();
                self.liquidity_processing_completed_event();
            },
            ManagedAsyncCallResult::Err(err) => {
                self.liquidity_processing_error_event(
                    &ManagedBuffer::from(b"lockLp"),
                    &err.err_msg
                );
                self.cleanup_failed_processing();
            }
        }
    }

    /// Callback apres unlock LP tokens du LP Locker
    #[promises_callback]
    fn unlock_lp_tokens_callback(
        &self,
        recipient: ManagedAddress,
        #[call_result] result: ManagedAsyncCallResult<()>
    ) {
        match result {
            ManagedAsyncCallResult::Ok(()) => {
                // Les LP tokens ont été envoyés à SC0 par le LP Locker
                // Maintenant on les transfère au recipient
                let lp_token = self.lp_token_id().get();
                let lp_balance = self.blockchain().get_sc_balance(
                    &EgldOrEsdtTokenIdentifier::esdt(lp_token.clone()), 0
                );

                if lp_balance > BigUint::zero() {
                    self.send().direct_esdt(&recipient, &lp_token, 0, &lp_balance);
                    self.lp_unlocked_and_sent_event(&recipient, &lp_balance);
                }
            },
            ManagedAsyncCallResult::Err(err) => {
                self.liquidity_processing_error_event(
                    &ManagedBuffer::from(b"unlockLp"),
                    &err.err_msg
                );
            }
        }
    }

    /// Nettoyer les storage temporaires apres processing reussi
    fn cleanup_processing(&self) {
        self.pending_wegld_for_swap().clear();
        self.pending_wegld_for_lp().clear();
        self.pending_xcirclex_for_lp().clear();
        self.liquidity_processing_in_progress().set(false);
    }

    /// Nettoyer apres echec (garde les tokens dans le SC pour retry manuel)
    fn cleanup_failed_processing(&self) {
        self.liquidity_processing_in_progress().set(false);
        // Note: Les tokens WEGLD/XCIRCLEX restent dans le SC
        // L'admin peut les recuperer ou retenter
    }
}

// Module proxy pour appeler les contrats peripheriques
mod peripheral_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait PeripheralContract {
        #[endpoint(transfer)]
        fn transfer(&self, to: ManagedAddress, amount: BigUint);

        #[endpoint(forceTransferToSC0)]
        fn force_transfer_to_sc0(&self);
    }
}

// Module proxy pour appeler le contrat NFT
mod nft_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait NftContract {
        #[endpoint(updateMemberCycles)]
        fn update_member_cycles(&self, member: ManagedAddress, cycles: u64);
    }
}

// Module proxy pour appeler le DAO V2
mod dao_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait DaoV2Contract {
        /// Recevoir EGLD depuis Circle of Life Center
        #[payable("EGLD")]
        #[endpoint(receiveFromCircleOfLife)]
        fn receive_from_circle_of_life(&self);
    }
}

// Module proxy pour le contrat WEGLD (wrap/unwrap)
mod wegld_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait WegldContract {
        /// Wrap EGLD en WEGLD
        #[payable("EGLD")]
        #[endpoint(wrapEgld)]
        fn wrap_egld(&self);

        /// Unwrap WEGLD en EGLD
        #[payable("*")]
        #[endpoint(unwrapEgld)]
        fn unwrap_egld(&self);
    }
}

// Module proxy pour xExchange pair (swap + liquidity)
mod xexchange_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait XExchangePairContract {
        /// Swap tokens avec input fixe
        #[payable("*")]
        #[endpoint(swapTokensFixedInput)]
        fn swap_tokens_fixed_input(
            &self,
            token_out: TokenIdentifier,
            amount_out_min: BigUint,
        );

        /// Ajouter de la liquidite
        #[payable("*")]
        #[endpoint(addLiquidity)]
        fn add_liquidity(
            &self,
            first_token_amount_min: BigUint,
            second_token_amount_min: BigUint,
        );

        /// Obtenir les reserves de la paire
        #[view(getReservesAndTotalSupply)]
        fn get_reserves_and_total_supply(&self) -> MultiValue3<BigUint, BigUint, BigUint>;
    }
}

// Module proxy pour le LP Locker
mod lp_locker_proxy {
    multiversx_sc::imports!();

    #[multiversx_sc::proxy]
    pub trait LpLockerContract {
        /// Verrouiller des LP tokens
        #[payable("*")]
        #[endpoint(lockLpTokens)]
        fn lock_lp_tokens(&self, lock_duration_days: u64);

        /// Déverrouiller des LP tokens après expiration
        #[endpoint(unlock)]
        fn unlock(&self, lock_id: u64);
    }
}
