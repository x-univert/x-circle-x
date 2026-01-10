import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetIsLoggedIn, useGetAccountInfo } from 'lib';
import {
  getDaoStats,
  getVotingPower,
  getActiveProposals,
  getProposals,
  getAllProposals,
  hasVoted,
  vote,
  createProposal,
  createProposalAsCouncil,
  finalizeProposal,
  executeProposal,
  depositToTreasury,
  getUserTokenBalance,
  forceExecute,
  getDaoOwner,
  isCouncilMember as checkIsCouncilMember,
  getCouncilMembers,
  getCouncilMemberCount,
  vetoProposal,
  councilExecute,
  DaoStats,
  Proposal,
  ProposalStatus
} from '../../services/daoService';
import { getTotalStakedByUser } from '../../services/stakingService';
import { DAO_CONTRACT_ADDRESS } from '../../config/contracts';

interface ProposalDisplay {
  id: number;
  canVote: boolean;
  userVoted: boolean;
}

export function DaoTab() {
  const { t } = useTranslation();
  const isLoggedIn = useGetIsLoggedIn();
  const { address } = useGetAccountInfo();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daoStats, setDaoStats] = useState<DaoStats | null>(null);
  const [votingPower, setVotingPower] = useState('0');
  const [userBalance, setUserBalance] = useState('0');
  const [stakedBalance, setStakedBalance] = useState('0');
  const [activeProposalIds, setActiveProposalIds] = useState<number[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalVotes, setProposalVotes] = useState<Map<number, boolean>>(new Map());

  // Modal states
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalType, setProposalType] = useState(5); // Default to Custom (5)
  const [proposalTargetAddress, setProposalTargetAddress] = useState('');
  const [proposalAmount, setProposalAmount] = useState('');
  const [isCreatingProposal, setIsCreatingProposal] = useState(false);

  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // History state
  const [allProposals, setAllProposals] = useState<Proposal[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Owner state
  const [daoOwner, setDaoOwner] = useState('');
  const [isForceExecuting, setIsForceExecuting] = useState(false);

  // Council state
  const [isUserCouncilMember, setIsUserCouncilMember] = useState(false);
  const [councilMembers, setCouncilMembers] = useState<string[]>([]);
  const [councilMemberCount, setCouncilMemberCount] = useState(0);
  const [isVetoing, setIsVetoing] = useState(false);
  const [isCouncilExecuting, setIsCouncilExecuting] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stats, owner, members, memberCount] = await Promise.all([
        getDaoStats(),
        getDaoOwner(),
        getCouncilMembers(),
        getCouncilMemberCount()
      ]);
      setDaoStats(stats);
      setDaoOwner(owner);
      setCouncilMembers(members);
      setCouncilMemberCount(memberCount);

      const proposalIds = await getActiveProposals();
      console.log('Active proposal IDs:', proposalIds);
      setActiveProposalIds(proposalIds);

      // Fetch full proposal details
      if (proposalIds.length > 0) {
        console.log('Fetching proposal details for IDs:', proposalIds);
        const proposalDetails = await getProposals(proposalIds);
        console.log('Fetched proposal details:', proposalDetails);
        setProposals(proposalDetails);
      } else {
        console.log('No proposal IDs to fetch');
        setProposals([]);
      }

      // Fetch all proposals for history
      const allProps = await getAllProposals();
      setAllProposals(allProps);

      if (address) {
        const [power, balance, staked, isCouncil] = await Promise.all([
          getVotingPower(address),
          getUserTokenBalance(address),
          getTotalStakedByUser(address),
          checkIsCouncilMember(address)
        ]);
        setVotingPower(power);
        setUserBalance(balance);
        setStakedBalance(staked);
        setIsUserCouncilMember(isCouncil);

        // Check votes for active proposals
        const votes = new Map<number, boolean>();
        for (const proposalId of proposalIds) {
          const voted = await hasVoted(address, proposalId);
          votes.set(proposalId, voted);
        }
        setProposalVotes(votes);
      }
    } catch (err) {
      console.error('Error fetching DAO data:', err);
      setError('Error loading DAO data');
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handlers
  const handleDeposit = async () => {
    if (!address || !depositAmount) return;

    setIsDepositing(true);
    try {
      await depositToTreasury(depositAmount, address);
      setShowDepositModal(false);
      setDepositAmount('');
      fetchData();
    } catch (err) {
      console.error('Deposit error:', err);
      setError('Deposit failed');
    } finally {
      setIsDepositing(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!address || !proposalTitle || !proposalDescription) return;

    // Determine target address: use provided address or sender's address as fallback
    const targetAddr = proposalTargetAddress.trim() || address;

    // Validate target address format for proposals that need it
    const needsTargetAddress = proposalType === 0 || proposalType === 2 || proposalType === 3; // TransferFunds, AddMember, RemoveMember
    if (needsTargetAddress && !proposalTargetAddress.trim()) {
      setError('Une adresse cible est requise pour ce type de proposition');
      return;
    }

    // Validate amount for TransferFunds proposals
    if (proposalType === 0 && (!proposalAmount || parseFloat(proposalAmount) <= 0)) {
      setError('Un montant est requis pour les transferts de fonds');
      return;
    }

    setIsCreatingProposal(true);
    try {
      if (isUserCouncilMember) {
        // Council members don't need to send tokens
        await createProposalAsCouncil(
          proposalTitle,
          proposalDescription,
          proposalType,
          targetAddr,
          proposalAmount || '0',
          address
        );
      } else {
        // Check if user has enough tokens for proposal threshold (100K minimum)
        const minThreshold = parseFloat(daoStats?.minProposalThreshold || '100000');
        const userBalanceNum = parseFloat(userBalance);
        if (userBalanceNum < minThreshold) {
          setError(`Solde insuffisant. Minimum requis: ${minThreshold.toLocaleString()} XCIRCLEX`);
          setIsCreatingProposal(false);
          return;
        }

        // Send 100K tokens as proof (will be returned immediately by the contract)
        const tokenProofAmount = Math.max(minThreshold, 100000).toString();
        await createProposal(
          proposalTitle,
          proposalDescription,
          proposalType,
          targetAddr,
          proposalAmount || '0',
          address,
          tokenProofAmount // Send tokens as proof of ownership
        );
      }
      setShowProposalModal(false);
      setProposalTitle('');
      setProposalDescription('');
      setProposalType(5);
      setProposalTargetAddress('');
      setProposalAmount('');
      fetchData();
    } catch (err) {
      console.error('Create proposal error:', err);
      setError('Failed to create proposal');
    } finally {
      setIsCreatingProposal(false);
    }
  };

  const handleVote = async (voteFor: boolean) => {
    if (!address || selectedProposalId === null) return;

    // Check if user has tokens to vote with
    const userBalanceNum = parseFloat(userBalance);
    if (userBalanceNum <= 0) {
      setError('Vous devez avoir des tokens XCIRCLEX pour voter');
      return;
    }

    setIsVoting(true);
    try {
      // Send wallet balance as voting power (tokens are returned immediately)
      await vote(selectedProposalId, voteFor, address, userBalance);
      setShowVoteModal(false);
      setSelectedProposalId(null);
      fetchData();
    } catch (err) {
      console.error('Vote error:', err);
      setError('Vote failed');
    } finally {
      setIsVoting(false);
    }
  };

  const handleForceExecute = async (proposalId: number) => {
    if (!address) return;

    setIsForceExecuting(true);
    try {
      await forceExecute(proposalId, address);
      fetchData();
    } catch (err) {
      console.error('Force execute error:', err);
      setError('Force execute failed');
    } finally {
      setIsForceExecuting(false);
    }
  };

  const handleVeto = async (proposalId: number) => {
    if (!address) return;

    setIsVetoing(true);
    try {
      await vetoProposal(proposalId, address);
      fetchData();
    } catch (err) {
      console.error('Veto error:', err);
      setError('Veto failed');
    } finally {
      setIsVetoing(false);
    }
  };

  const handleCouncilExecute = async (proposalId: number) => {
    if (!address) return;

    setIsCouncilExecuting(true);
    try {
      await councilExecute(proposalId, address);
      fetchData();
    } catch (err) {
      console.error('Council execute error:', err);
      setError('Council execute failed');
    } finally {
      setIsCouncilExecuting(false);
    }
  };

  // Check if current user is the DAO owner
  const isOwner = address && daoOwner && address.toLowerCase() === daoOwner.toLowerCase();

  const formatNumber = (num: string | number) => {
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    return n.toFixed(2);
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
  };

  if (isLoading && !daoStats) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="animate-spin text-4xl mb-4">&#x1F300;</div>
        <p className="text-gray-300">{t('daoTab.loading', 'Loading DAO...')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white">&times;</button>
        </div>
      )}

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Treasury */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">&#x1F3E6;</span>
            <div>
              <p className="text-gray-400 text-sm">{t('daoTab.treasury', 'Treasury')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(daoStats?.treasuryBalance || '0')}</p>
            </div>
          </div>
          <p className="text-purple-300 text-sm">XCIRCLEX</p>
        </div>

        {/* Proposals */}
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md rounded-2xl p-6 border border-blue-500/30">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">&#x1F4DC;</span>
            <div>
              <p className="text-gray-400 text-sm">{t('daoTab.proposals', 'Proposals')}</p>
              <p className="text-2xl font-bold text-white">{daoStats?.proposalCount || 0}</p>
            </div>
          </div>
          <p className="text-blue-300 text-sm">{t('daoTab.activeCount', '{{count}} active', { count: activeProposalIds.length })}</p>
        </div>

        {/* Voting Power */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-2xl p-6 border border-green-500/30">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">&#x1F5F3;</span>
            <div>
              <p className="text-gray-400 text-sm">{t('daoTab.votingPower', 'Voting Power')}</p>
              <p className="text-2xl font-bold text-white">{formatNumber(votingPower)}</p>
            </div>
          </div>
          <div className="text-green-300 text-xs space-y-1">
            <p>{t('daoTab.wallet', 'Wallet')}: {formatNumber(userBalance)}</p>
            <p>{t('daoTab.stake', 'Stake')}: {formatNumber(stakedBalance)}</p>
          </div>
        </div>

        {/* Council Status / Your Balance */}
        <div className={`bg-gradient-to-br ${isUserCouncilMember ? 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30' : 'from-amber-500/20 to-orange-500/20 border-amber-500/30'} backdrop-blur-md rounded-2xl p-6 border`}>
          <div className="flex items-center gap-3 mb-2">
            {isUserCouncilMember ? (
              <span className="text-3xl">&#x1F451;</span>
            ) : (
              <span className="text-3xl">&#x1F4B0;</span>
            )}
            <div>
              <p className="text-gray-400 text-sm">{isUserCouncilMember ? t('daoTab.councilMember', 'Council Member') : t('daoTab.yourBalance', 'Your Balance')}</p>
              <p className="text-2xl font-bold text-white">{isUserCouncilMember ? t('daoTab.active', 'Active') : formatNumber(userBalance)}</p>
            </div>
          </div>
          {isUserCouncilMember ? (
            <p className="text-yellow-300 text-sm">{t('daoTab.specialPrivilegesActive', 'Special privileges active')}</p>
          ) : (
            <p className="text-amber-300 text-sm">XCIRCLEX</p>
          )}
        </div>
      </div>

      {/* Council Member Banner */}
      {isUserCouncilMember && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">&#x1F451;</span>
            <div>
              <p className="text-yellow-300 font-semibold">{t('daoTab.youAreCouncilMember', 'You are a Council Member')}</p>
              <p className="text-gray-400 text-sm">
                {t('daoTab.councilPrivileges', 'Privileges: Create proposals without threshold | Veto | Emergency execution')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Actions & Parameters */}
        <div className="space-y-6">
          {/* Actions */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">{t('daoTab.actions', 'Actions')}</h3>

            <div className="space-y-3">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => setShowDepositModal(true)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    &#x1F4B8; {t('daoTab.depositToTreasury', 'Deposit to Treasury')}
                  </button>

                  <button
                    onClick={() => setShowProposalModal(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    &#x1F4DD; {t('daoTab.createProposal', 'Create Proposal')}
                  </button>

                  <button
                    onClick={fetchData}
                    disabled={isLoading}
                    className="w-full bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                  >
                    {isLoading ? t('daoTab.loadingBtn', 'Loading...') : t('daoTab.refresh', 'Refresh')}
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400">{t('daoTab.connectToParticipate', 'Connect to participate in the DAO')}</p>
                </div>
              )}
            </div>
          </div>

          {/* How to Join */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-3">{t('daoTab.howToParticipate', 'How to participate?')}</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-green-400">&#x2713;</span>
                <span><strong>{t('daoTab.vote', 'Vote')}:</strong> {t('daoTab.voteDesc', 'Hold XCIRCLEX (1 token = 1 vote)')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">&#x2713;</span>
                <span><strong>{t('daoTab.propose', 'Propose')}:</strong> {t('daoTab.proposeDesc', 'Minimum 100K XCIRCLEX required')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-400">&#x2713;</span>
                <span><strong>{t('daoTab.staking', 'Staking')}:</strong> {t('daoTab.stakingDesc', 'Staked tokens also count for voting!')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400">&#x2139;</span>
                <span>{t('daoTab.votingPowerFormula', 'Voting power = Wallet + Staked tokens')}</span>
              </li>
            </ul>
          </div>

          {/* DAO Parameters */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">{t('daoTab.daoParameters', 'DAO Parameters')}</h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400">{t('daoTab.proposalThreshold', 'Proposal threshold')}</span>
                <span className="text-white font-semibold">{formatNumber(daoStats?.minProposalThreshold || '0')} XCIRCLEX</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400">{t('daoTab.votingPeriod', 'Voting period')}</span>
                <span className="text-white font-semibold">{Math.round((daoStats?.votingPeriod || 0) / 86400)} {t('daoTab.days', 'days')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400">{t('daoTab.timelockPeriod', 'Timelock period')}</span>
                <span className="text-white font-semibold">{Math.round((daoStats?.timelockPeriod || 0) / 86400)} {t('daoTab.days', 'days')}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-gray-400">{t('daoTab.requiredQuorum', 'Required quorum')}</span>
                <span className="text-white font-semibold">{(daoStats?.quorumPercentage || 0) / 100}%</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-gray-400">{t('daoTab.passThreshold', 'Pass threshold')}</span>
                <span className="text-white font-semibold">{(daoStats?.passThreshold || 0) / 100}%</span>
              </div>
            </div>
          </div>

          {/* Council Members */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span>&#x1F451;</span> {t('daoTab.council', 'Council')} ({councilMemberCount})
            </h3>

            {councilMembers.length === 0 ? (
              <p className="text-gray-400 text-sm">{t('daoTab.noCouncilMembers', 'No council members')}</p>
            ) : (
              <div className="space-y-2">
                {councilMembers.map((member, index) => (
                  <div key={index} className="flex items-center gap-2 py-2 border-b border-white/10 last:border-0">
                    <span className="text-yellow-400">&#x2605;</span>
                    <span className="text-white font-mono text-xs">{formatAddress(member)}</span>
                    {member.toLowerCase() === address?.toLowerCase() && (
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded">{t('daoTab.you', 'You')}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-gray-400 text-xs">
                <span className="text-yellow-400">{t('daoTab.privileges', 'Privileges')}:</span> {t('daoTab.councilPrivilegesShort', 'No threshold proposals, Veto, Emergency execution')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Proposals */}
        <div className="lg:col-span-2">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
            <h3 className="text-xl font-bold text-white mb-4">
              {t('daoTab.activeProposals', 'Active Proposals')} ({proposals.length})
            </h3>

            {proposals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">&#x1F4ED;</div>
                <p className="text-gray-400 mb-2">{t('daoTab.noActiveProposals', 'No active proposals')}</p>
                <p className="text-gray-500 text-sm">
                  {t('daoTab.beFirstToPropose', 'Be the first to create a proposal for the community!')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposals.map((proposal) => {
                  const userHasVoted = proposalVotes.get(proposal.id) || false;
                  const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst);
                  const forPercentage = totalVotes > 0 ? (parseFloat(proposal.votesFor) / totalVotes) * 100 : 0;
                  const againstPercentage = totalVotes > 0 ? (parseFloat(proposal.votesAgainst) / totalVotes) * 100 : 0;
                  const now = Math.floor(Date.now() / 1000);
                  const timeRemaining = proposal.votingEndsAt - now;
                  const daysRemaining = Math.max(0, Math.floor(timeRemaining / 86400));
                  const hoursRemaining = Math.max(0, Math.floor((timeRemaining % 86400) / 3600));

                  const getProposalTypeName = (type: number) => {
                    switch (type) {
                      case 0: return t('daoTab.proposalTypeFunds', 'Transfer Funds');
                      case 1: return t('daoTab.proposalTypeParams', 'Change Parameters');
                      case 2: return t('daoTab.proposalTypeAddMember', 'Add Member');
                      case 3: return t('daoTab.proposalTypeRemoveMember', 'Remove Member');
                      case 4: return t('daoTab.proposalTypeUpgrade', 'Contract Upgrade');
                      case 5: return t('daoTab.proposalTypeCustom', 'Custom');
                      default: return t('daoTab.proposalTypeOther', 'Other');
                    }
                  };

                  const getStatusBadge = (status: ProposalStatus) => {
                    switch (status) {
                      case ProposalStatus.Active:
                        return 'bg-green-500/20 text-green-300';
                      case ProposalStatus.Passed:
                        return 'bg-blue-500/20 text-blue-300';
                      case ProposalStatus.Executed:
                        return 'bg-purple-500/20 text-purple-300';
                      case ProposalStatus.Failed:
                        return 'bg-red-500/20 text-red-300';
                      case ProposalStatus.Cancelled:
                        return 'bg-gray-500/20 text-gray-300';
                      case ProposalStatus.Expired:
                        return 'bg-orange-500/20 text-orange-300';
                      default:
                        return 'bg-gray-500/20 text-gray-300';
                    }
                  };

                  const getStatusName = (status: ProposalStatus) => {
                    switch (status) {
                      case ProposalStatus.Active: return t('daoTab.statusActive', 'Active');
                      case ProposalStatus.Passed: return t('daoTab.statusPassed', 'Approved');
                      case ProposalStatus.Executed: return t('daoTab.statusExecuted', 'Executed');
                      case ProposalStatus.Failed: return t('daoTab.statusFailed', 'Rejected');
                      case ProposalStatus.Cancelled: return t('daoTab.statusCancelled', 'Cancelled');
                      case ProposalStatus.Expired: return t('daoTab.statusExpired', 'Expired');
                      default: return t('daoTab.statusUnknown', 'Unknown');
                    }
                  };

                  return (
                    <div
                      key={proposal.id}
                      className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition"
                    >
                      {/* Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-500 text-xs">#{proposal.id}</span>
                            <span className="text-gray-600 text-xs">|</span>
                            <span className="text-gray-400 text-xs">{getProposalTypeName(proposal.proposalType)}</span>
                          </div>
                          <h4 className="text-white font-semibold text-lg">{proposal.title || `Proposition #${proposal.id}`}</h4>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(proposal.status)}`}>
                          {getStatusName(proposal.status)}
                        </span>
                      </div>

                      {/* Description */}
                      {proposal.description && (
                        <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                          {proposal.description}
                        </p>
                      )}

                      {/* Proposer */}
                      <div className="text-xs mb-3">
                        <span className="text-white">{t('daoTab.proposedBy', 'Proposed by')}:</span> <span className="text-gray-400 font-mono break-all">{proposal.proposer}</span>
                      </div>

                      {/* Transfer Details - show for TransferFunds, AddMember, RemoveMember */}
                      {(proposal.proposalType === 0 || proposal.proposalType === 2 || proposal.proposalType === 3) && proposal.targetAddress && (
                        <div className="bg-white/5 border border-white/10 rounded-lg p-3 mb-3">
                          <div className="text-xs space-y-2">
                            <div className="flex flex-col gap-1">
                              <span className="text-white">
                                {proposal.proposalType === 0 ? t('daoTab.beneficiary', 'Beneficiary') : t('daoTab.member', 'Member')}:
                              </span>
                              <span className="text-gray-400 font-mono break-all">{proposal.targetAddress}</span>
                            </div>
                            {proposal.proposalType === 0 && parseFloat(proposal.amount) > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-white">{t('daoTab.amount', 'Amount')}:</span>
                                <span className="text-amber-400 font-semibold">{formatNumber(proposal.amount)} XCIRCLEX</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vote Progress Bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-green-400">{t('daoTab.for', 'For')}: {formatNumber(proposal.votesFor)} ({forPercentage.toFixed(1)}%)</span>
                          <span className="text-red-400">{t('daoTab.against', 'Against')}: {formatNumber(proposal.votesAgainst)} ({againstPercentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                          <div
                            className="bg-green-500 h-full transition-all"
                            style={{ width: `${forPercentage}%` }}
                          />
                          <div
                            className="bg-red-500 h-full transition-all"
                            style={{ width: `${againstPercentage}%` }}
                          />
                        </div>
                        <div className="text-xs mt-1">
                          <span className="text-white">{t('daoTab.total', 'Total')}:</span> <span className="text-gray-300">{formatNumber(totalVotes.toString())} {t('daoTab.votes', 'votes')}</span>
                        </div>
                      </div>

                      {/* Time Remaining */}
                      {proposal.status === ProposalStatus.Active && timeRemaining > 0 && (
                        <div className="text-xs text-gray-400 mb-3">
                          {t('daoTab.timeRemaining', 'Time remaining')}: {daysRemaining > 0 ? `${daysRemaining}${t('daoTab.daysShort', 'd')} ` : ''}{hoursRemaining}{t('daoTab.hoursShort', 'h')}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        {userHasVoted ? (
                          <span className="px-4 py-2 rounded-lg text-sm bg-gray-500/30 text-gray-400">
                            &#x2713; {t('daoTab.voteRecorded', 'Vote recorded')}
                          </span>
                        ) : proposal.status === ProposalStatus.Active ? (
                          <button
                            onClick={() => {
                              setSelectedProposalId(proposal.id);
                              setShowVoteModal(true);
                            }}
                            className="px-4 py-2 rounded-lg text-sm bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition"
                          >
                            {t('daoTab.voteBtn', 'Vote')}
                          </button>
                        ) : (
                          <span className="px-4 py-2 rounded-lg text-sm bg-gray-500/30 text-gray-400">
                            {t('daoTab.voteEnded', 'Vote ended')}
                          </span>
                        )}

                        {/* Council Veto button */}
                        {isUserCouncilMember && (proposal.status === ProposalStatus.Active || proposal.status === ProposalStatus.Passed) && !proposal.executed && (
                          <button
                            onClick={() => handleVeto(proposal.id)}
                            disabled={isVetoing}
                            className="px-4 py-2 rounded-lg text-sm bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition border border-orange-500/30"
                          >
                            {isVetoing ? '...' : t('daoTab.veto', 'Veto')}
                          </button>
                        )}

                        {/* Council Emergency Execute button */}
                        {isUserCouncilMember && proposal.status === ProposalStatus.Passed && !proposal.executed && (
                          <button
                            onClick={() => handleCouncilExecute(proposal.id)}
                            disabled={isCouncilExecuting}
                            className="px-4 py-2 rounded-lg text-sm bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition border border-yellow-500/30"
                          >
                            {isCouncilExecuting ? '...' : t('daoTab.emergencyExec', 'Emergency Exec.')}
                          </button>
                        )}

                        {/* Force Execute button - only visible to owner */}
                        {isOwner && (proposal.status === ProposalStatus.Active || proposal.status === ProposalStatus.Passed) && !proposal.executed && (
                          <button
                            onClick={() => handleForceExecute(proposal.id)}
                            disabled={isForceExecuting}
                            className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-300 hover:bg-red-500/30 transition border border-red-500/30"
                          >
                            {isForceExecuting ? '...' : 'Force Execute'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* History Toggle Button */}
            <div className="mt-6 pt-4 border-t border-white/10">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                <span>{showHistory ? '&#x25B2;' : '&#x25BC;'}</span>
                <span>{showHistory ? t('daoTab.hideHistory', 'Hide history') : t('daoTab.viewProposalHistory', 'View proposal history')}</span>
                <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">{allProposals.filter(p => p.status !== ProposalStatus.Active).length}</span>
              </button>
            </div>
          </div>

          {/* Proposal History Section */}
          {showHistory && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl mt-6">
              <h3 className="text-xl font-bold text-white mb-4">
                {t('daoTab.proposalHistory', 'Proposal History')}
              </h3>

              {allProposals.filter(p => p.status !== ProposalStatus.Active).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">{t('daoTab.noProposalHistory', 'No proposals in history')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allProposals
                    .filter(p => p.status !== ProposalStatus.Active)
                    .sort((a, b) => b.id - a.id) // Most recent first
                    .map((proposal) => {
                      const totalVotes = parseFloat(proposal.votesFor) + parseFloat(proposal.votesAgainst);
                      const forPercentage = totalVotes > 0 ? (parseFloat(proposal.votesFor) / totalVotes) * 100 : 0;

                      const getProposalTypeName = (type: number) => {
                        switch (type) {
                          case 0: return t('daoTab.historyTransfer', 'Transfer');
                          case 1: return t('daoTab.historyParams', 'Parameters');
                          case 2: return t('daoTab.historyAddMember', 'Add Member');
                          case 3: return t('daoTab.historyRemoveMember', 'Remove Member');
                          case 4: return t('daoTab.historyUpgrade', 'Upgrade');
                          case 5: return t('daoTab.historyCustom', 'Custom');
                          default: return t('daoTab.historyOther', 'Other');
                        }
                      };

                      const getStatusBadge = (status: ProposalStatus) => {
                        switch (status) {
                          case ProposalStatus.Executed:
                            return 'bg-green-500/20 text-green-300';
                          case ProposalStatus.Passed:
                            return 'bg-blue-500/20 text-blue-300';
                          case ProposalStatus.Failed:
                            return 'bg-red-500/20 text-red-300';
                          case ProposalStatus.Cancelled:
                            return 'bg-gray-500/20 text-gray-300';
                          case ProposalStatus.Expired:
                            return 'bg-orange-500/20 text-orange-300';
                          default:
                            return 'bg-gray-500/20 text-gray-300';
                        }
                      };

                      const getStatusName = (status: ProposalStatus) => {
                        switch (status) {
                          case ProposalStatus.Executed: return t('daoTab.statusExecuted', 'Executed');
                          case ProposalStatus.Passed: return t('daoTab.statusPassed', 'Approved');
                          case ProposalStatus.Failed: return t('daoTab.statusFailed', 'Rejected');
                          case ProposalStatus.Cancelled: return t('daoTab.statusCancelled', 'Cancelled');
                          case ProposalStatus.Expired: return t('daoTab.statusExpired', 'Expired');
                          default: return t('daoTab.statusUnknown', 'Unknown');
                        }
                      };

                      return (
                        <div
                          key={proposal.id}
                          className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-gray-500 text-xs">#{proposal.id}</span>
                                <span className="text-gray-600 text-xs">|</span>
                                <span className="text-gray-400 text-xs">{getProposalTypeName(proposal.proposalType)}</span>
                              </div>
                              <h4 className="text-white font-medium">{proposal.title || `Proposition #${proposal.id}`}</h4>
                              {proposal.description && (
                                <p className="text-gray-400 text-sm mt-1 line-clamp-1">{proposal.description}</p>
                              )}
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(proposal.status)}`}>
                              {getStatusName(proposal.status)}
                            </span>
                          </div>

                          {/* Vote summary */}
                          <div className="mt-3 flex items-center gap-4 text-xs">
                            <span className="text-green-400">{t('daoTab.for', 'For')}: {formatNumber(proposal.votesFor)} ({forPercentage.toFixed(0)}%)</span>
                            <span className="text-red-400">{t('daoTab.against', 'Against')}: {formatNumber(proposal.votesAgainst)}</span>
                            {proposal.proposalType === 0 && parseFloat(proposal.amount) > 0 && (
                              <span className="text-amber-400">{t('daoTab.amount', 'Amount')}: {formatNumber(proposal.amount)} XCIRCLEX</span>
                            )}
                          </div>

                          {/* Force Execute for Passed proposals - owner only */}
                          {isOwner && proposal.status === ProposalStatus.Passed && !proposal.executed && (
                            <div className="mt-3">
                              <button
                                onClick={() => handleForceExecute(proposal.id)}
                                disabled={isForceExecuting}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 hover:bg-red-500/30 transition border border-red-500/30"
                              >
                                {isForceExecuting ? '...' : 'Force Execute'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contract Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-gray-400 text-sm">{t('daoTab.daoSmartContract', 'DAO Smart Contract')}</p>
            <p className="text-white font-mono text-xs md:text-sm break-all">{DAO_CONTRACT_ADDRESS}</p>
          </div>
          <a
            href={`https://devnet-explorer.multiversx.com/accounts/${DAO_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
          >
            {t('daoTab.viewOnExplorer', 'View on Explorer')} &#8599;
          </a>
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">{t('daoTab.depositToTreasury', 'Deposit to Treasury')}</h3>

            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">{t('daoTab.amountXcirclex', 'Amount (XCIRCLEX)')}</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
              <p className="text-gray-500 text-xs mt-1">{t('daoTab.availableBalance', 'Available balance')}: {formatNumber(userBalance)} XCIRCLEX</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDepositModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {t('daoTab.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {isDepositing ? t('daoTab.depositing', 'Depositing...') : t('daoTab.deposit', 'Deposit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Proposal Modal */}
      {showProposalModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-lg w-full border border-blue-500/30 my-8">
            <h3 className="text-xl font-bold text-white mb-4">{t('daoTab.createProposal', 'Create Proposal')}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('daoTab.proposalType', 'Proposal Type')}</label>
                <select
                  value={proposalType}
                  onChange={(e) => setProposalType(parseInt(e.target.value))}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={5}>{t('daoTab.optionCustom', 'Custom (Discussion/Vote)')}</option>
                  <option value={0}>{t('daoTab.optionTransferFunds', 'Transfer Funds')}</option>
                  <option value={1}>{t('daoTab.optionChangeParams', 'Change Parameters')}</option>
                  <option value={2}>{t('daoTab.optionAddMember', 'Add Council Member')}</option>
                  <option value={3}>{t('daoTab.optionRemoveMember', 'Remove Council Member')}</option>
                  <option value={4}>{t('daoTab.optionContractUpgrade', 'Contract Upgrade')}</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('daoTab.title', 'Title')}</label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  placeholder={t('daoTab.titlePlaceholder', 'Proposal title')}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">{t('daoTab.description', 'Description')}</label>
                <textarea
                  value={proposalDescription}
                  onChange={(e) => setProposalDescription(e.target.value)}
                  placeholder={t('daoTab.descriptionPlaceholder', 'Detailed description of the proposal...')}
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              {/* Target Address - show for TransferFunds, AddMember, RemoveMember */}
              {(proposalType === 0 || proposalType === 2 || proposalType === 3) && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    {proposalType === 0 ? t('daoTab.beneficiaryAddress', 'Beneficiary Address') : t('daoTab.memberAddress', 'Member Address')}
                  </label>
                  <input
                    type="text"
                    value={proposalTargetAddress}
                    onChange={(e) => setProposalTargetAddress(e.target.value)}
                    placeholder="erd1..."
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                </div>
              )}

              {/* Amount - show only for TransferFunds */}
              {proposalType === 0 && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">{t('daoTab.amountXcirclex', 'Amount (XCIRCLEX)')}</label>
                  <input
                    type="number"
                    value={proposalAmount}
                    onChange={(e) => setProposalAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    {t('daoTab.availableTreasury', 'Available treasury')}: {formatNumber(daoStats?.treasuryBalance || '0')} XCIRCLEX
                  </p>
                </div>
              )}

              {isUserCouncilMember ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm flex items-center gap-2">
                    <span>&#x1F451;</span> {t('daoTab.councilPrivilegeNoThreshold', 'Council Privilege: No threshold required')}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {t('daoTab.councilCanCreateWithoutTokens', 'As a council member, you can create proposals without sending tokens.')}
                  </p>
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    {t('daoTab.requiredThreshold', 'Required threshold')}: {formatNumber(daoStats?.minProposalThreshold || '0')} XCIRCLEX
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {t('daoTab.yourBalanceLabel', 'Your balance')}: {formatNumber(userBalance)} XCIRCLEX
                  </p>
                  <p className="text-yellow-400 text-xs mt-2">
                    {t('daoTab.tokenVerificationNote', 'Note: {{amount}} tokens will be sent for verification then returned immediately.', { amount: formatNumber(daoStats?.minProposalThreshold || '100000') })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowProposalModal(false);
                  setProposalTitle('');
                  setProposalDescription('');
                  setProposalType(5);
                  setProposalTargetAddress('');
                  setProposalAmount('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {t('daoTab.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreateProposal}
                disabled={isCreatingProposal || !proposalTitle || !proposalDescription}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
              >
                {isCreatingProposal ? t('daoTab.creating', 'Creating...') : t('daoTab.create', 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vote Modal */}
      {showVoteModal && selectedProposalId !== null && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 max-w-md w-full border border-green-500/30">
            <h3 className="text-xl font-bold text-white mb-4">{t('daoTab.voteOnProposal', 'Vote on Proposal')} #{selectedProposalId}</h3>

            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-green-300 text-sm">
                {t('daoTab.yourVotingPower', 'Your voting power')}: <span className="font-bold">{formatNumber(userBalance)} XCIRCLEX</span>
              </p>
              <p className="text-yellow-400 text-xs mt-2">
                {t('daoTab.voteTokenNote', 'Note: Your {{amount}} tokens will be sent as proof of vote then returned immediately.', { amount: formatNumber(userBalance) })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => handleVote(true)}
                disabled={isVoting}
                className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 font-semibold py-4 px-4 rounded-lg transition flex flex-col items-center gap-2"
              >
                <span className="text-3xl">&#x1F44D;</span>
                <span>{t('daoTab.forBtn', 'FOR')}</span>
              </button>

              <button
                onClick={() => handleVote(false)}
                disabled={isVoting}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-semibold py-4 px-4 rounded-lg transition flex flex-col items-center gap-2"
              >
                <span className="text-3xl">&#x1F44E;</span>
                <span>{t('daoTab.againstBtn', 'AGAINST')}</span>
              </button>
            </div>

            <button
              onClick={() => {
                setShowVoteModal(false);
                setSelectedProposalId(null);
              }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition"
            >
              {t('daoTab.cancel', 'Cancel')}
            </button>

            {isVoting && (
              <div className="mt-4 text-center">
                <div className="animate-spin inline-block text-2xl">&#x1F300;</div>
                <p className="text-gray-400 mt-2">{t('daoTab.votingInProgress', 'Voting in progress...')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DaoTab;
