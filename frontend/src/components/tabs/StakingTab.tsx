import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useGetAccountInfo } from 'lib'
import { useStaking } from '../../hooks/useStaking'
import { STAKING_CONTRACT_ADDRESS, STAKING_LEVELS, NFT_CONTRACT_ADDRESS } from '../../config/contracts'
import { multiversxApiUrl, explorerUrl } from '../../config'
import { getPendingRewards, getTimeUntilUnlock, getEmergencyPenalty, getNftBonus, getEffectiveApy } from '../../services/stakingService'

export function StakingTab() {
  const { t } = useTranslation()
  const { address } = useGetAccountInfo()

  const {
    isLoading,
    error,
    positions,
    stats,
    tokenBalance,
    stake,
    unstake,
    claimRewards,
    emergencyUnstake,
    refreshData,
    clearError
  } = useStaking()

  const [stakeAmount, setStakeAmount] = useState('')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [showStakeModal, setShowStakeModal] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // NFT Bonus state
  const [nftBonus, setNftBonus] = useState<number>(0)
  const [effectiveApys, setEffectiveApys] = useState<Record<number, number>>({})

  // Real-time rewards, time remaining and penalty for each position
  const [positionRewards, setPositionRewards] = useState<Record<number, string>>({})
  const [positionTimeRemaining, setPositionTimeRemaining] = useState<Record<number, number>>({})
  const [positionPenalty, setPositionPenalty] = useState<Record<number, number>>({})

  // Current epoch state
  const [currentEpoch, setCurrentEpoch] = useState(4911)

  // Fetch NFT bonus for the user
  const fetchNftBonus = useCallback(async () => {
    if (!address) return

    try {
      const bonus = await getNftBonus(address)
      setNftBonus(bonus)

      // Fetch effective APY for each level
      const apyPromises = STAKING_LEVELS.map(level => getEffectiveApy(address, level.level))
      const apys = await Promise.all(apyPromises)
      const newApys: Record<number, number> = {}
      STAKING_LEVELS.forEach((level, i) => {
        newApys[level.level] = apys[i]
      })
      setEffectiveApys(newApys)
    } catch (err) {
      console.error('Error fetching NFT bonus:', err)
    }
  }, [address])

  // Fetch real-time data for all positions
  const fetchPositionDetails = useCallback(async () => {
    if (!address || positions.length === 0) return

    const rewardsPromises = positions.map(p => getPendingRewards(address, p.positionId))
    const timePromises = positions.map(p => getTimeUntilUnlock(address, p.positionId))
    const penaltyPromises = positions.map(p => getEmergencyPenalty(address, p.positionId))

    const [rewards, times, penalties] = await Promise.all([
      Promise.all(rewardsPromises),
      Promise.all(timePromises),
      Promise.all(penaltyPromises)
    ])

    const newRewards: Record<number, string> = {}
    const newTimes: Record<number, number> = {}
    const newPenalties: Record<number, number> = {}

    positions.forEach((p, i) => {
      newRewards[p.positionId] = rewards[i]
      newTimes[p.positionId] = times[i]
      newPenalties[p.positionId] = penalties[i]
    })

    setPositionRewards(newRewards)
    setPositionTimeRemaining(newTimes)
    setPositionPenalty(newPenalties)
  }, [address, positions])

  // Fetch current epoch from network
  useEffect(() => {
    const fetchEpoch = async () => {
      try {
        const response = await fetch('${multiversxApiUrl}/stats')
        const data = await response.json()
        if (data.epoch) {
          setCurrentEpoch(data.epoch)
        }
      } catch (err) {
        console.error('Error fetching epoch:', err)
      }
    }
    fetchEpoch()
  }, [])

  // Fetch position details when positions change
  useEffect(() => {
    fetchPositionDetails()
    fetchNftBonus()
  }, [fetchPositionDetails, fetchNftBonus])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPositionDetails()
      fetchNftBonus()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchPositionDetails, fetchNftBonus])

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(4)
  }

  // 1 epoch = 4 hours on devnet (2400 rounds × 6 sec)
  const formatTimeRemaining = (epochs: number): string => {
    if (epochs <= 0) return t('stakingTab.unlocked', 'Unlocked!')
    const totalHours = epochs * 4
    if (totalHours < 24) {
      return `${totalHours}h`
    } else {
      const days = Math.floor(totalHours / 24)
      const remainingHours = totalHours % 24
      if (remainingHours === 0) return `${days} ${t('stakingTab.day', 'day')}${days > 1 ? 's' : ''}`
      return `${days}${t('stakingTab.dayShort', 'd')} ${remainingHours}h`
    }
  }

  // Calculate expected rewards for a position based on APY and lock duration
  // Note: Contract calculates as if 1 epoch = 1 day, so rewards are 6x higher on devnet
  const calculateExpectedRewards = (amount: string, apyPercent: number, lockEpochs: number): string => {
    const amountNum = parseFloat(amount) || 0
    if (amountNum === 0 || lockEpochs === 0) return '0'
    // Contract formula: amount * (APY/100) * (epochs/365)
    const expectedRewards = amountNum * (apyPercent / 100) * (lockEpochs / 365)
    return expectedRewards.toFixed(2)
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return
    setActionLoading('stake')
    try {
      await stake(stakeAmount, selectedLevel)
      setStakeAmount('')
      setShowStakeModal(false)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnstake = async (positionId: number) => {
    setActionLoading(`unstake-${positionId}`)
    try {
      await unstake(positionId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleClaimRewards = async (positionId: number) => {
    setActionLoading(`claim-${positionId}`)
    try {
      await claimRewards(positionId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmergencyUnstake = async (positionId: number) => {
    if (!confirm('Emergency unstake will incur a penalty. Are you sure?')) return
    setActionLoading(`emergency-${positionId}`)
    try {
      await emergencyUnstake(positionId)
    } finally {
      setActionLoading(null)
    }
  }

  const getLevelInfo = (level: number) => {
    return STAKING_LEVELS.find(l => l.level === level) || STAKING_LEVELS[0]
  }

  // Calculate NFT bonus percentage (nftBonus is in basis points: 500 = 5%)
  const nftBonusPercent = (nftBonus / 100).toFixed(1)

  // Calculate effective APY with NFT bonus
  // The bonus is applied to rewards, so effective APY = base APY * (1 + bonus/10000)
  const calculateEffectiveApy = (baseApy: number): number => {
    if (nftBonus === 0) return baseApy
    return baseApy * (1 + nftBonus / 10000)
  }

  // Format APY with 2 decimal places
  const formatApy = (apy: number): string => {
    return apy % 1 === 0 ? apy.toString() : apy.toFixed(2)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">&#128176;</span>
              {t('stakingTab.title', 'Staking XCIRCLEX')}
            </h2>
            <p className="text-gray-300 mt-1">
              {t('stakingTab.subtitle', 'Stake your tokens and earn up to 42% APY + NFT bonus')}
            </p>
          </div>
          <button
            onClick={() => setShowStakeModal(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            {t('stakingTab.stake', 'Stake')}
          </button>
        </div>
      </div>

      {/* NFT Bonus Banner */}
      {NFT_CONTRACT_ADDRESS && (
        <div className={`rounded-xl p-4 border ${
          nftBonus > 0
            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30'
            : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">&#127752;</span>
              <div>
                <h3 className="text-white font-semibold">{t('stakingTab.nftBonusTitle', 'NFT Staking Bonus')}</h3>
                <p className="text-gray-400 text-sm">
                  {nftBonus > 0
                    ? t('stakingTab.nftBonusActive', 'Your NFT gives you a +{{percent}}% bonus on your rewards!', { percent: nftBonusPercent })
                    : t('stakingTab.nftBonusInactive', 'Get an NFT to boost your staking rewards')
                  }
                </p>
              </div>
            </div>
            <div className={`text-2xl font-bold ${nftBonus > 0 ? 'text-green-400' : 'text-gray-500'}`}>
              +{nftBonusPercent}%
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex justify-between items-center">
          <p className="text-red-300">{error}</p>
          <button onClick={clearError} className="text-red-300 hover:text-white">X</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">&#128176;</div>
          <div className="text-xl font-bold text-white">{formatAmount(tokenBalance)}</div>
          <div className="text-gray-400 text-sm">{t('stakingTab.yourBalance', 'Your Balance')}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">&#128200;</div>
          <div className="text-xl font-bold text-white">{formatAmount(stats?.totalStaked || '0')}</div>
          <div className="text-gray-400 text-sm">{t('stakingTab.totalStaked', 'Total Staked')}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">&#127873;</div>
          <div className="text-xl font-bold text-white">{formatAmount(stats?.rewardsPool || '0')}</div>
          <div className="text-gray-400 text-sm">{t('stakingTab.rewardsPool', 'Rewards Pool')}</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <div className="text-2xl mb-2">&#128293;</div>
          <div className="text-xl font-bold text-white">{positions.length}</div>
          <div className="text-gray-400 text-sm">{t('stakingTab.yourPositions', 'Your Positions')}</div>
        </div>
      </div>

      {/* Staking Levels */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{t('stakingTab.stakingLevels', 'Staking Levels')}</h3>
          {nftBonus > 0 && (
            <div className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full border border-purple-500/30">
              {t('stakingTab.nftBonusOnRewards', 'NFT Bonus: +{{percent}}% on rewards', { percent: nftBonusPercent })}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          {STAKING_LEVELS.slice(0, 7).map((level) => {
            const baseApy = level.apy
            const effectiveApy = calculateEffectiveApy(baseApy)
            const hasBonus = nftBonus > 0
            return (
              <div
                key={level.level}
                className={`bg-white/5 rounded-lg p-3 text-center border transition cursor-pointer hover:bg-white/10 ${
                  level.level === 12 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10'
                }`}
                onClick={() => {
                  setSelectedLevel(level.level)
                  setShowStakeModal(true)
                }}
              >
                <div className="text-lg mb-1">{level.level === 0 ? '...' : `${level.days}j`}</div>
                {hasBonus ? (
                  <>
                    <div className="text-xs text-gray-500 line-through">{baseApy}%</div>
                    <div className={`text-sm font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {formatApy(effectiveApy)}%
                    </div>
                  </>
                ) : (
                  <div className={`text-sm font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {baseApy}%
                  </div>
                )}
                <div className="text-gray-400 text-xs mt-1">{level.label}</div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-2">
          {STAKING_LEVELS.slice(7).map((level) => {
            const baseApy = level.apy
            const effectiveApy = calculateEffectiveApy(baseApy)
            const hasBonus = nftBonus > 0
            return (
              <div
                key={level.level}
                className={`bg-white/5 rounded-lg p-3 text-center border transition cursor-pointer hover:bg-white/10 ${
                  level.level === 12 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10'
                }`}
                onClick={() => {
                  setSelectedLevel(level.level)
                  setShowStakeModal(true)
                }}
              >
                <div className="text-lg mb-1">{level.days}j</div>
                {hasBonus ? (
                  <>
                    <div className="text-xs text-gray-500 line-through">{baseApy}%</div>
                    <div className={`text-sm font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {formatApy(effectiveApy)}%
                    </div>
                  </>
                ) : (
                  <div className={`text-sm font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {baseApy}%
                  </div>
                )}
                <div className="text-gray-400 text-xs mt-1">{level.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Your Positions */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{t('stakingTab.yourPositions', 'Your Positions')}</h3>
            <p className="text-gray-400 text-xs">{t('stakingTab.currentEpoch', 'Current epoch')}: {currentEpoch} (1 epoch = 4h)</p>
          </div>
          <button
            onClick={refreshData}
            disabled={isLoading}
            className="text-blue-400 hover:text-blue-300 text-sm transition disabled:opacity-50"
          >
            {isLoading ? t('common.loading', 'Loading...') : t('stakingTab.refresh', 'Refresh')}
          </button>
        </div>

        {isLoading && positions.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin text-3xl mb-4">&#8987;</div>
            <p className="text-gray-300">{t('stakingTab.loadingPositions', 'Loading positions...')}</p>
          </div>
        ) : positions.length > 0 ? (
          <div className="space-y-3">
            {positions.map((position) => {
              const levelInfo = getLevelInfo(position.lockLevel)
              const timeRemaining = positionTimeRemaining[position.positionId] || 0
              const isUnlocked = timeRemaining <= 0
              const penaltyBps = positionPenalty[position.positionId] || 0
              const penaltyPercent = (penaltyBps / 100).toFixed(1)

              return (
                <div
                  key={position.positionId}
                  className="bg-white/5 rounded-lg p-4 border border-white/5"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-white font-semibold">
                          Position #{position.positionId}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          position.lockLevel === 12
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}>
                          {levelInfo.label}
                        </span>
                        {nftBonus > 0 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            +{nftBonusPercent}% NFT
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">{t('stakingTab.amount', 'Amount')}</p>
                          <p className="text-white font-semibold">{formatAmount(position.amount)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">{t('stakingTab.effectiveApy', 'Effective APY')}</p>
                          {nftBonus > 0 ? (
                            <div>
                              <p className="text-green-400 font-semibold">
                                {formatApy(calculateEffectiveApy(levelInfo.apy))}%
                              </p>
                              <p className="text-purple-400 text-xs">
                                ({levelInfo.apy}% + {nftBonusPercent}% NFT)
                              </p>
                            </div>
                          ) : (
                            <p className="text-green-400 font-semibold">{levelInfo.apy}%</p>
                          )}
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">{t('stakingTab.timeRemaining', 'Time remaining')}</p>
                          <p className={`font-semibold ${isUnlocked ? 'text-green-400' : 'text-white'}`}>
                            {isUnlocked ? t('stakingTab.unlocked', 'Unlocked!') : formatTimeRemaining(timeRemaining)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">{t('stakingTab.rewards', 'Rewards')} {nftBonus > 0 ? '(+bonus)' : ''}</p>
                          <p className="text-yellow-400 font-semibold">
                            {formatAmount(positionRewards[position.positionId] || position.accumulatedRewards)}
                          </p>
                        </div>
                      </div>
                      {/* Epoch information */}
                      <div className="flex flex-wrap gap-4 mt-2 pt-2 border-t border-white/5 text-xs">
                        <div>
                          <span className="text-gray-500">{t('stakingTab.start', 'Start')}:</span>
                          <span className="text-white ml-1">Epoch {position.startEpoch}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('stakingTab.end', 'End')}:</span>
                          <span className="text-blue-400 ml-1">Epoch {position.endEpoch}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('stakingTab.duration', 'Duration')}:</span>
                          <span className="text-white ml-1">{formatTimeRemaining(position.endEpoch - position.startEpoch)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('stakingTab.expectedRewards', 'Expected rewards')}:</span>
                          <span className="text-green-400 ml-1">
                            ~{formatAmount(calculateExpectedRewards(
                              position.amount,
                              calculateEffectiveApy(levelInfo.apy),
                              position.endEpoch - position.startEpoch
                            ))} XCX
                          </span>
                        </div>
                      </div>
                      {/* Info about rewards after unlock */}
                      {isUnlocked && (
                        <div className="mt-2 text-xs text-green-400/70 italic">
                          {t('stakingTab.rewardsAccumulateAfterUnlock', 'Rewards continue to accumulate after unlock')}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 w-full lg:w-auto">
                      <button
                        onClick={() => handleClaimRewards(position.positionId)}
                        disabled={actionLoading === `claim-${position.positionId}`}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
                      >
                        {actionLoading === `claim-${position.positionId}` ? t('stakingTab.claiming', 'Claiming...') : t('stakingTab.claim', 'Claim')}
                      </button>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleUnstake(position.positionId)}
                          disabled={actionLoading === `unstake-${position.positionId}`}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
                        >
                          {actionLoading === `unstake-${position.positionId}` ? t('stakingTab.unstaking', 'Unstaking...') : t('stakingTab.unstake', 'Unstake')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEmergencyUnstake(position.positionId)}
                          disabled={actionLoading === `emergency-${position.positionId}`}
                          className="bg-red-600/50 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-xs"
                          title={t('stakingTab.emergencyPenaltyTitle', 'Early withdrawal with {{percent}}% penalty', { percent: penaltyPercent })}
                        >
                          {actionLoading === `emergency-${position.positionId}`
                            ? t('stakingTab.processing', 'Processing...')
                            : t('stakingTab.emergency', 'Emergency (-{{percent}}%)', { percent: penaltyPercent })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#128176;</div>
            <p className="text-gray-300 mb-4">{t('stakingTab.noPositions', 'No staking positions')}</p>
            <button
              onClick={() => setShowStakeModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              {t('stakingTab.startStaking', 'Start Staking')}
            </button>
          </div>
        )}
      </div>

      {/* Contract Info */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <p className="text-gray-400 text-xs">{t('stakingTab.stakingContract', 'Staking Contract')}</p>
            <p className="text-white font-mono text-xs break-all">{STAKING_CONTRACT_ADDRESS}</p>
          </div>
          <a
            href={`${explorerUrl}/accounts/${STAKING_CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
          >
            {t('stakingTab.explorer', 'Explorer')} &#8599;
          </a>
        </div>
      </div>

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">{t('stakingTab.stakeXcirclex', 'Stake XCIRCLEX')}</h3>
              <button
                onClick={() => setShowStakeModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                X
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">{t('stakingTab.amount', 'Amount')}</label>
              <div className="relative">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white text-lg focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => setStakeAmount(tokenBalance)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 text-sm"
                >
                  MAX
                </button>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                {t('stakingTab.available', 'Available')}: {formatAmount(tokenBalance)} XCIRCLEX
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">{t('stakingTab.lockPeriod', 'Lock Period')}</label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white focus:outline-none focus:border-blue-500"
              >
                {STAKING_LEVELS.map((level) => (
                  <option key={level.level} value={level.level} className="bg-gray-800">
                    {level.label} - {level.apy}% APY
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">{t('stakingTab.duration', 'Duration')}</span>
                <span className="text-white">{getLevelInfo(selectedLevel).days} {t('stakingTab.days', 'days')}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">{t('stakingTab.baseApy', 'Base APY')}</span>
                <span className="text-white">{getLevelInfo(selectedLevel).apy}%</span>
              </div>
              {nftBonus > 0 && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">{t('stakingTab.nftBonusOnRewardsLabel', 'NFT Bonus on rewards')}</span>
                    <span className="text-purple-400 font-semibold">+{nftBonusPercent}%</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 bg-green-500/10 -mx-4 px-4 py-2 border-y border-green-500/20">
                    <span className="text-green-300 font-semibold">{t('stakingTab.totalEffectiveApy', 'Total Effective APY')}</span>
                    <span className="text-green-400 font-bold">
                      {formatApy(calculateEffectiveApy(getLevelInfo(selectedLevel).apy))}%
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                <span className="text-gray-400">{t('stakingTab.estimatedDailyRewards', 'Estimated daily rewards')}</span>
                <span className="text-yellow-400 font-semibold">
                  {stakeAmount
                    ? (parseFloat(stakeAmount) * calculateEffectiveApy(getLevelInfo(selectedLevel).apy) / 100 / 365).toFixed(4)
                    : '0'} XCIRCLEX
                </span>
              </div>
              {nftBonus > 0 && stakeAmount && parseFloat(stakeAmount) > 0 && (
                <div className="text-xs text-purple-400 text-right mt-1">
                  {t('stakingTab.includingNftBonus', 'Including +{{amount}} thanks to NFT bonus', { amount: (parseFloat(stakeAmount) * getLevelInfo(selectedLevel).apy * nftBonus / 10000 / 100 / 365).toFixed(4) })}
                </div>
              )}
            </div>

            <button
              onClick={handleStake}
              disabled={actionLoading === 'stake' || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'stake' ? t('stakingTab.staking', 'Staking...') : t('stakingTab.stakeXcirclex', 'Stake XCIRCLEX')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default StakingTab
