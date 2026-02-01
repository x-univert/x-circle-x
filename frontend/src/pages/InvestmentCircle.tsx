import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetAccountInfo } from '../hooks/sdkDappHooks';
import { useInvestmentCircle } from '../hooks/useInvestmentCircle';
import {
  CircleInfo,
  CircleStatus,
  ContributionFrequency,
  getFrequencyLabel,
  getStatusLabel,
  getStatusColor,
  formatTimestamp,
  getTimeRemaining
} from '../services/investmentCircleService';
import { CONTRIBUTION_FREQUENCIES } from '../config/contracts';
import BigNumber from 'bignumber.js';

// ============================================================================
// CREATE CIRCLE MODAL
// ============================================================================

interface CreateCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    contributionAmount: string,
    frequency: ContributionFrequency,
    totalContributions: number,
    minMembers: number,
    maxMembers: number,
    description?: string
  ) => Promise<string[] | null>;
  isLoading: boolean;
}

const CreateCircleModal: React.FC<CreateCircleModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  isLoading
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contributionAmount, setContributionAmount] = useState('0.1');
  const [frequency, setFrequency] = useState<ContributionFrequency>(ContributionFrequency.Monthly);
  const [totalContributions, setTotalContributions] = useState(12);
  const [minMembers, setMinMembers] = useState(3);
  const [maxMembers, setMaxMembers] = useState(10);

  const requiredCollateral = useMemo(() => {
    return new BigNumber(contributionAmount).multipliedBy(totalContributions).toString();
  }, [contributionAmount, totalContributions]);

  // Check if distribution will be fair
  const isFairForMin = useMemo(() => {
    return totalContributions % minMembers === 0;
  }, [totalContributions, minMembers]);

  const isFairForMax = useMemo(() => {
    return totalContributions % maxMembers === 0;
  }, [totalContributions, maxMembers]);

  const payoutsPerMemberMin = useMemo(() => {
    return minMembers > 0 ? Math.floor(totalContributions / minMembers) : 0;
  }, [totalContributions, minMembers]);

  const validMemberCounts = useMemo(() => {
    const counts: number[] = [];
    for (let i = minMembers; i <= maxMembers; i++) {
      if (totalContributions % i === 0) {
        counts.push(i);
      }
    }
    return counts;
  }, [totalContributions, minMembers, maxMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onCreate(
      name,
      contributionAmount,
      frequency,
      totalContributions,
      minMembers,
      maxMembers,
      description
    );
    if (result) {
      onClose();
      setName('');
      setDescription('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-lg border border-purple-500/30">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">{t('investmentCircle.create.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              placeholder={t('investmentCircle.create.namePlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.description')} ({t('common.optional', 'optional')})</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none resize-none"
              placeholder={t('investmentCircle.create.descriptionPlaceholder')}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{description.length}/500</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.contributionAmount')}</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={contributionAmount}
                onChange={(e) => setContributionAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.frequency')}</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value) as ContributionFrequency)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
              >
                {CONTRIBUTION_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{t(`investmentCircle.frequencies.${f.label.toLowerCase().replace('-', '')}`, f.label)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.totalPeriods')}</label>
              <input
                type="number"
                min="2"
                max="52"
                value={totalContributions}
                onChange={(e) => setTotalContributions(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.minMembers')}</label>
              <input
                type="number"
                min="2"
                max="100"
                value={minMembers}
                onChange={(e) => setMinMembers(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">{t('investmentCircle.create.maxMembers')}</label>
              <input
                type="number"
                min="2"
                max="100"
                value={maxMembers}
                onChange={(e) => setMaxMembers(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-purple-900/30 rounded-lg p-4 border border-purple-500/30">
            <h4 className="text-purple-400 font-semibold mb-2">{t('investmentCircle.create.requiredCollateral')}</h4>
            <p className="text-2xl font-bold text-white">{requiredCollateral} EGLD</p>
            <p className="text-sm text-gray-400 mt-1">
              {contributionAmount} EGLD x {totalContributions} {t('investmentCircle.period', 'periods').toLowerCase()}
            </p>
          </div>

          {/* Distribution Fairness Indicator */}
          <div className={`rounded-lg p-4 border ${isFairForMin ? 'bg-green-900/30 border-green-500/30' : 'bg-orange-900/30 border-orange-500/30'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{isFairForMin ? '✅' : '⚠️'}</span>
              <div className="flex-1">
                <p className={`font-semibold ${isFairForMin ? 'text-green-400' : 'text-orange-400'}`}>
                  {t('investmentCircle.distribution.title', 'Distribution')}
                </p>
                {isFairForMin ? (
                  <p className="text-gray-300 text-sm">
                    {t('investmentCircle.distribution.fair', 'Each member receives {{count}} payout(s)').replace('{{count}}', String(payoutsPerMemberMin))}
                  </p>
                ) : (
                  <p className="text-orange-300 text-sm">
                    {t('investmentCircle.distribution.unfairCreate', 'Periods must be divisible by min members')}
                  </p>
                )}
              </div>
              {isFairForMin && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">{payoutsPerMemberMin}x</p>
                </div>
              )}
            </div>
            {validMemberCounts.length > 0 && (
              <p className="text-gray-400 text-xs mt-2">
                {t('investmentCircle.distribution.validCounts', 'Valid member counts')}: {validMemberCounts.join(', ')}
              </p>
            )}
            {!isFairForMin && (
              <p className="text-orange-300 text-xs mt-2">
                {t('investmentCircle.distribution.suggestion', 'Try {{periods}} periods for {{members}} members').replace('{{periods}}', String(minMembers)).replace('{{members}}', String(minMembers))}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !name || !isFairForMin}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? t('investmentCircle.create.creating') : t('investmentCircle.create.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// CIRCLE CARD
// ============================================================================

interface CircleCardProps {
  circle: CircleInfo;
  onClick: () => void;
  isUserMember: boolean;
}

const CircleCard: React.FC<CircleCardProps> = ({ circle, onClick, isUserMember }) => {
  const { t } = useTranslation();
  const totalPool = new BigNumber(circle.contributionAmount)
    .multipliedBy(circle.currentMembers)
    .toString();

  return (
    <div
      onClick={onClick}
      className="bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 rounded-xl p-5 cursor-pointer transition-all hover:transform hover:scale-[1.02]"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-bold text-white">{circle.name}</h3>
          <p className="text-sm text-gray-400">ID: #{circle.id}</p>
          {circle.description && (
            <p className="text-sm text-gray-300 mt-1 line-clamp-2">{circle.description}</p>
          )}
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(circle.status)} bg-gray-700/50`}>
          {t(`investmentCircle.status.${CircleStatus[circle.status].toLowerCase()}`)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-400">{t('investmentCircle.contribution')}</p>
          <p className="text-white font-semibold">{circle.contributionAmount} EGLD</p>
        </div>
        <div>
          <p className="text-gray-400">{t('investmentCircle.frequency')}</p>
          <p className="text-white font-semibold">{t(`investmentCircle.frequencies.${['weekly', 'biweekly', 'monthly', 'quarterly'][circle.frequency]}`)}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('investmentCircle.members')}</p>
          <p className="text-white font-semibold">{circle.currentMembers}/{circle.maxMembers}</p>
        </div>
        <div>
          <p className="text-gray-400">{t('investmentCircle.period')}</p>
          <p className="text-white font-semibold">{circle.currentPeriod}/{circle.totalContributions}</p>
        </div>
      </div>

      {circle.status === CircleStatus.Active && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-gray-400 text-xs">{t('investmentCircle.nextDeadline')}</p>
          <p className="text-yellow-500 font-semibold">{getTimeRemaining(circle.nextContributionDeadline)}</p>
        </div>
      )}

      {isUserMember && (
        <div className="mt-3">
          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
            {t('investmentCircle.youAreMember')}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// CIRCLE DETAILS
// ============================================================================

interface CircleDetailsProps {
  circle: CircleInfo;
  members: string[];
  poolBalance: string;
  userMemberInfo: any;
  claimableCollateral: string;
  userAddress: string;
  canStartFairly: boolean;
  payoutsPerMember: number;
  canJoinFairly: boolean;
  onJoin: () => Promise<string[] | null>;
  onStart: () => Promise<string[] | null>;
  onContribute: () => Promise<string[] | null>;
  onAdvancePeriod: () => Promise<string[] | null>;
  onClaimCollateral: () => Promise<string[] | null>;
  onLeave: () => Promise<string[] | null>;
  onCancel: () => Promise<string[] | null>;
  onBack: () => void;
  isLoading: boolean;
}

const CircleDetails: React.FC<CircleDetailsProps> = ({
  circle,
  members,
  poolBalance,
  userMemberInfo,
  claimableCollateral,
  userAddress,
  canStartFairly,
  payoutsPerMember,
  canJoinFairly,
  onJoin,
  onStart,
  onContribute,
  onAdvancePeriod,
  onClaimCollateral,
  onLeave,
  onCancel,
  onBack,
  isLoading
}) => {
  const { t } = useTranslation();
  const userAddressLower = userAddress?.toLowerCase() || '';
  const creatorLower = circle.creator?.toLowerCase() || '';
  const isCreator = creatorLower === userAddressLower;
  const isMember = members.some(m => m.toLowerCase() === userAddressLower) || isCreator; // Creator is always a member
  const canJoin = circle.status === CircleStatus.Pending && !isMember && circle.currentMembers < circle.maxMembers;
  const canStart = circle.status === CircleStatus.Pending && isMember && circle.currentMembers >= circle.minMembers && canStartFairly;
  const canContribute = circle.status === CircleStatus.Active && isMember && userMemberInfo?.contributionsPaid < circle.currentPeriod;
  const canAdvance = circle.status === CircleStatus.Active && Date.now() / 1000 > circle.nextContributionDeadline;
  const canClaim = parseFloat(claimableCollateral) > 0;
  const canLeave = circle.status === CircleStatus.Pending && isMember && !isCreator;
  const canCancel = circle.status === CircleStatus.Pending && isCreator;
  const isFairDistribution = circle.totalContributions % circle.currentMembers === 0;

  // Calculate expected payouts based on current vs target member count
  const actualPayoutsPerMember = circle.currentMembers > 0 ? Math.floor(circle.totalContributions / circle.currentMembers) : 0;
  const targetPayoutsPerMember = circle.minMembers > 0 ? Math.floor(circle.totalContributions / circle.minMembers) : 0;

  const requiredCollateral = new BigNumber(circle.contributionAmount)
    .multipliedBy(circle.totalContributions)
    .toString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white">{circle.name}</h2>
          <p className="text-gray-400">{t('investmentCircle.circleId')} #{circle.id}</p>
          {circle.description && (
            <p className="text-gray-300 mt-2">{circle.description}</p>
          )}
        </div>
        <span className={`ml-auto px-4 py-2 rounded-full font-semibold ${getStatusColor(circle.status)} bg-gray-700/50 self-start`}>
          {t(`investmentCircle.status.${CircleStatus[circle.status].toLowerCase()}`)}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">{t('investmentCircle.contribution')}</p>
          <p className="text-xl font-bold text-white">{circle.contributionAmount} EGLD</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">{t('investmentCircle.frequency')}</p>
          <p className="text-xl font-bold text-white">{t(`investmentCircle.frequencies.${['weekly', 'biweekly', 'monthly', 'quarterly'][circle.frequency]}`)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">{t('investmentCircle.period')}</p>
          <p className="text-xl font-bold text-white">{circle.currentPeriod}/{circle.totalContributions}</p>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-sm">{t('investmentCircle.currentPool')}</p>
          <p className="text-xl font-bold text-green-400">{poolBalance} EGLD</p>
        </div>
      </div>

      {/* Fair Distribution Info */}
      <div className={`rounded-xl p-4 border ${isFairDistribution ? 'bg-green-900/20 border-green-500/30' : 'bg-orange-900/20 border-orange-500/30'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{isFairDistribution ? '✅' : '⚠️'}</span>
            <div>
              <p className={`font-semibold ${isFairDistribution ? 'text-green-400' : 'text-orange-400'}`}>
                {t('investmentCircle.distribution.title', 'Distribution')}
              </p>
              <p className="text-gray-300 text-sm">
                {isFairDistribution
                  ? t('investmentCircle.distribution.fair', 'Each member receives {{count}} payout(s)').replace('{{count}}', String(actualPayoutsPerMember))
                  : t('investmentCircle.distribution.unfair', 'Current member count does not allow fair distribution')}
              </p>
              {/* Show target distribution when circle is pending and not yet at min members */}
              {circle.status === CircleStatus.Pending && circle.currentMembers < circle.minMembers && targetPayoutsPerMember > 0 && (
                <p className="text-gray-400 text-xs mt-1">
                  {t('investmentCircle.distribution.target', 'With {{min}} members: {{count}} payout(s) each')
                    .replace('{{min}}', String(circle.minMembers))
                    .replace('{{count}}', String(targetPayoutsPerMember))}
                </p>
              )}
            </div>
          </div>
          {isFairDistribution && (
            <div className="text-right">
              <p className="text-3xl font-bold text-green-400">{actualPayoutsPerMember}x</p>
              <p className="text-gray-400 text-sm">{t('investmentCircle.distribution.payouts', 'payouts/member')}</p>
            </div>
          )}
        </div>
        {!isFairDistribution && circle.status === CircleStatus.Pending && circle.currentMembers >= circle.minMembers && (
          <p className="text-orange-300 text-sm mt-2">
            {t('investmentCircle.distribution.waitMore', 'Wait for more members or adjust the circle. Valid counts: {{counts}}').replace('{{counts}}',
              [1,2,3,4,5,6,7,8,9,10,11,12].filter(n => n >= circle.minMembers && n <= circle.maxMembers && circle.totalContributions % n === 0).join(', ')
            )}
          </p>
        )}
      </div>

      {/* Timeline & Deadline */}
      {circle.status === CircleStatus.Active && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-yellow-400 font-semibold">{t('investmentCircle.nextDeadline')}</p>
              <p className="text-white">{formatTimestamp(circle.nextContributionDeadline)}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-yellow-400">{getTimeRemaining(circle.nextContributionDeadline)}</p>
              <p className="text-gray-400 text-sm">{t('investmentCircle.remaining')}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Member Info */}
      {userMemberInfo && (
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-5">
          <h3 className="text-lg font-bold text-purple-400 mb-4">{t('investmentCircle.details.membership')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm">{t('investmentCircle.details.collateralDeposited')}</p>
              <p className="text-white font-bold">{userMemberInfo.collateralDeposited} EGLD</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('investmentCircle.details.collateralUsed')}</p>
              <p className="text-red-400 font-bold">{userMemberInfo.collateralUsed} EGLD</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('investmentCircle.details.claimable')}</p>
              <p className="text-green-400 font-bold">{claimableCollateral} EGLD</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">{t('investmentCircle.details.contributionsPaid')}</p>
              <p className="text-white font-bold">{userMemberInfo.contributionsPaid}/{circle.totalContributions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">
          {t('investmentCircle.members')} ({circle.currentMembers}/{circle.maxMembers})
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {members.map((member, index) => (
            <div key={member} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {index + 1}
                </span>
                <span className="text-white font-mono text-sm">
                  {member.slice(0, 10)}...{member.slice(-6)}
                </span>
              </div>
              {member.toLowerCase() === circle.creator?.toLowerCase() && (
                <span className="text-purple-400 text-xs">{t('investmentCircle.details.creator')}</span>
              )}
              {member.toLowerCase() === userAddressLower && (
                <span className="text-green-400 text-xs">{t('common.you', 'You')}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {canJoin && (
          <button
            onClick={onJoin}
            disabled={isLoading}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-3 px-6 rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.joining') : `${t('investmentCircle.actions.join')} (${requiredCollateral} EGLD)`}
          </button>
        )}

        {canStart && (
          <button
            onClick={onStart}
            disabled={isLoading}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.starting') : t('investmentCircle.actions.start')}
          </button>
        )}

        {canContribute && (
          <button
            onClick={onContribute}
            disabled={isLoading}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all animate-pulse"
          >
            {isLoading ? t('investmentCircle.actions.contributing') : `${t('investmentCircle.actions.contribute')} (${circle.contributionAmount} EGLD)`}
          </button>
        )}

        {canAdvance && (
          <button
            onClick={onAdvancePeriod}
            disabled={isLoading}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:from-yellow-700 hover:to-orange-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.advancing') : t('investmentCircle.actions.advancePeriod')}
          </button>
        )}

        {canClaim && (
          <button
            onClick={onClaimCollateral}
            disabled={isLoading}
            className="flex-1 min-w-[200px] bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-lg hover:from-teal-700 hover:to-cyan-700 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.claiming') : `${t('investmentCircle.actions.claim')} ${claimableCollateral} EGLD`}
          </button>
        )}

        {canLeave && (
          <button
            onClick={onLeave}
            disabled={isLoading}
            className="bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.leaving') : t('investmentCircle.actions.leave')}
          </button>
        )}

        {canCancel && (
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="bg-red-600/20 border border-red-500 text-red-400 font-bold py-3 px-6 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition-all"
          >
            {isLoading ? t('investmentCircle.actions.cancelling') : t('investmentCircle.actions.cancel')}
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

const InvestmentCircle: React.FC = () => {
  const { t } = useTranslation();
  const { address: userAddress } = useGetAccountInfo();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    isLoading,
    isLoadingCircles,
    isLoadingUserCircles,
    error,
    allCircles,
    userCircles,
    selectedCircle,
    selectedCircleMembers,
    userMemberInfo,
    poolBalance,
    claimableCollateral,
    totalCircles,
    userEgldBalance,
    canStartFairly,
    payoutsPerMember,
    canJoinFairly,
    createCircle,
    joinCircle,
    startCircle,
    contribute,
    advancePeriod,
    claimCollateral,
    leaveCircle,
    cancelCircle,
    selectCircle
  } = useInvestmentCircle();

  const displayedCircles = activeTab === 'all' ? allCircles : userCircles;
  const userCircleIds = useMemo(() => userCircles.map(c => c.id), [userCircles]);

  // If a circle is selected, show details
  if (selectedCircle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <CircleDetails
            circle={selectedCircle}
            members={selectedCircleMembers}
            poolBalance={poolBalance}
            userMemberInfo={userMemberInfo}
            claimableCollateral={claimableCollateral}
            userAddress={userAddress}
            canStartFairly={canStartFairly}
            payoutsPerMember={payoutsPerMember}
            canJoinFairly={canJoinFairly}
            onJoin={() => joinCircle(selectedCircle.id)}
            onStart={() => startCircle(selectedCircle.id)}
            onContribute={() => contribute(selectedCircle.id)}
            onAdvancePeriod={() => advancePeriod(selectedCircle.id)}
            onClaimCollateral={() => claimCollateral(selectedCircle.id)}
            onLeave={() => leaveCircle(selectedCircle.id)}
            onCancel={() => cancelCircle(selectedCircle.id)}
            onBack={() => selectCircle(null)}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t('investmentCircle.title')}</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            {t('investmentCircle.subtitle')}
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">{t('investmentCircle.totalCircles')}</p>
            <p className="text-2xl font-bold text-white">{totalCircles}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">{t('investmentCircle.yourCircles')}</p>
            <p className="text-2xl font-bold text-purple-400">{userCircles.length}</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">{t('investmentCircle.yourBalance')}</p>
            <p className="text-2xl font-bold text-green-400">{parseFloat(userEgldBalance).toFixed(4)} EGLD</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 text-center">
            <p className="text-gray-400 text-sm">{t('investmentCircle.protocolFee')}</p>
            <p className="text-2xl font-bold text-white">3%</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation + Create Button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('investmentCircle.allCircles')} ({allCircles.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                activeTab === 'my'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t('investmentCircle.myCircles')} ({userCircles.length})
            </button>
          </div>

          {userAddress && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-6 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('investmentCircle.createCircle')}
            </button>
          )}
        </div>

        {/* Circles Grid */}
        {(isLoadingCircles || isLoadingUserCircles) ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : displayedCircles.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-xl font-bold text-white mb-2">
              {activeTab === 'all' ? t('investmentCircle.noCircles') : t('investmentCircle.noUserCircles')}
            </h3>
            <p className="text-gray-400 mb-6">
              {activeTab === 'all'
                ? t('investmentCircle.noCirclesDesc')
                : t('investmentCircle.noUserCirclesDesc')}
            </p>
            {userAddress && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-3 px-8 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                {t('investmentCircle.createFirst')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCircles.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                onClick={() => selectCircle(circle.id)}
                isUserMember={userCircleIds.includes(circle.id)}
              />
            ))}
          </div>
        )}

        {/* Not Connected Warning */}
        {!userAddress && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-yellow-500/20 border border-yellow-500 text-yellow-400 rounded-lg px-6 py-3">
            {t('investmentCircle.connectWallet')}
          </div>
        )}

        {/* Create Modal */}
        <CreateCircleModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={createCircle}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default InvestmentCircle;
