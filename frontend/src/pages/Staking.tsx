import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useStaking } from '../hooks/useStaking'
import { STAKING_CONTRACT_ADDRESS, XCIRCLEX_TOKEN_ID, STAKING_LEVELS } from '../config/contracts'
import { getPendingRewards, getTimeUntilUnlock, getEmergencyPenalty } from '../services/stakingService'

function Staking() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address, account } = useGetAccountInfo()
  const navigate = useNavigate()

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

  // Real-time rewards, time remaining and penalty for each position
  const [positionRewards, setPositionRewards] = useState<Record<number, string>>({})
  const [positionTimeRemaining, setPositionTimeRemaining] = useState<Record<number, number>>({})
  const [positionPenalty, setPositionPenalty] = useState<Record<number, number>>({})

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

  // Fetch position details when positions change
  useEffect(() => {
    fetchPositionDetails()
  }, [fetchPositionDetails])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchPositionDetails()
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchPositionDetails])

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(4)
  }

  // Current epoch state for date calculation
  const [currentEpoch, setCurrentEpoch] = useState(4911)

  // Fetch current epoch from network
  useEffect(() => {
    const fetchEpoch = async () => {
      try {
        const response = await fetch('https://devnet-api.multiversx.com/stats')
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

  // Convert MultiversX epoch to date
  // DEVNET: 1 epoch = 4 hours (2400 rounds × 6 sec)
  // MAINNET: 1 epoch = 24 hours
  const EPOCH_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours per epoch on devnet

  // Store the epoch fetch time to calculate stable dates
  const [epochFetchTime, setEpochFetchTime] = useState<number>(Date.now())

  // Update epochFetchTime when currentEpoch changes
  useEffect(() => {
    setEpochFetchTime(Date.now())
  }, [currentEpoch])

  const epochToDate = (epoch: number): string => {
    if (!epoch || epoch <= 0) return 'N/A'

    // Calculate time difference from current epoch at the time we fetched it
    const epochDiff = epoch - currentEpoch

    // Use the fetch time as base, then add epoch difference
    const targetDate = new Date(epochFetchTime + epochDiff * EPOCH_DURATION_MS)

    return targetDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Format remaining epochs to human-readable time
  // On devnet: 1 epoch = 4 hours (2400 rounds × 6 sec)
  const formatTimeRemaining = (epochs: number): string => {
    if (epochs <= 0) return 'Debloque!'

    // Convert epochs to hours (1 epoch = 4 hours on devnet)
    const totalHours = epochs * 4

    if (totalHours < 24) {
      return `${totalHours}h`
    } else {
      // More than 24 hours - show in days and hours
      const days = Math.floor(totalHours / 24)
      const remainingHours = totalHours % 24
      if (remainingHours === 0) return `${days} jour${days > 1 ? 's' : ''}`
      return `${days}j ${remainingHours}h`
    }
  }

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`
  }

  // Calculate expected rewards for a position based on APY and lock duration
  // Note: Contract calculates as if 1 epoch = 1 day
  const calculateExpectedRewards = (amount: string, apyPercent: number, lockEpochs: number): string => {
    const amountNum = parseFloat(amount) || 0
    if (amountNum === 0 || lockEpochs === 0) return '0'
    // Contract formula: amount * (APY/100) * (epochs/365)
    const expectedRewards = amountNum * (apyPercent / 100) * (lockEpochs / 365)
    return expectedRewards.toFixed(2)
  }

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) {
      return
    }

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
    if (!confirm('Emergency unstake will incur a 10% penalty. Are you sure?')) {
      return
    }
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

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">&#128274;</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Connexion Requise
          </h2>
          <p className="text-gray-200 mb-6">
            Connectez votre wallet MultiversX pour acceder au staking XCIRCLEX
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Retour a l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              XCIRCLEX Staking
            </h1>
            <p className="text-lg text-gray-300">
              Stake XCIRCLEX tokens and earn up to 42% APY
            </p>
          </div>
          <button
            onClick={() => setShowStakeModal(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Stake Now
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex justify-between items-center">
            <p className="text-red-300">{error}</p>
            <button onClick={clearError} className="text-red-300 hover:text-white">
              X
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128176;</div>
            <div className="text-2xl font-bold text-white">{formatAmount(tokenBalance)}</div>
            <div className="text-gray-400 text-sm">Your XCIRCLEX Balance</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128200;</div>
            <div className="text-2xl font-bold text-white">{formatAmount(stats?.totalStaked || '0')}</div>
            <div className="text-gray-400 text-sm">Total Staked</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#127873;</div>
            <div className="text-2xl font-bold text-white">{formatAmount(stats?.rewardsPool || '0')}</div>
            <div className="text-gray-400 text-sm">Rewards Pool</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128293;</div>
            <div className="text-2xl font-bold text-white">{positions.length}</div>
            <div className="text-gray-400 text-sm">Your Positions</div>
          </div>
        </div>

        {/* Staking Levels */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Staking Levels</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {STAKING_LEVELS.slice(0, 7).map((level) => (
              <div
                key={level.level}
                className={`bg-white/5 rounded-lg p-4 text-center border transition cursor-pointer hover:bg-white/10 ${
                  level.level === 12 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10'
                }`}
                onClick={() => {
                  setSelectedLevel(level.level)
                  setShowStakeModal(true)
                }}
              >
                <div className="text-2xl mb-1">{level.level === 0 ? '∞' : `${level.days}d`}</div>
                <div className={`text-lg font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {level.apy}% APY
                </div>
                <div className="text-gray-400 text-xs mt-1">{level.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
            {STAKING_LEVELS.slice(7).map((level) => (
              <div
                key={level.level}
                className={`bg-white/5 rounded-lg p-4 text-center border transition cursor-pointer hover:bg-white/10 ${
                  level.level === 12 ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-white/10'
                }`}
                onClick={() => {
                  setSelectedLevel(level.level)
                  setShowStakeModal(true)
                }}
              >
                <div className="text-2xl mb-1">{level.days}d</div>
                <div className={`text-lg font-bold ${level.level === 12 ? 'text-yellow-400' : 'text-green-400'}`}>
                  {level.apy}% APY
                </div>
                <div className="text-gray-400 text-xs mt-1">{level.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Your Positions */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Your Positions</h2>
              <p className="text-gray-400 text-sm">Epoch actuel: {currentEpoch} (devnet: 4h/epoch)</p>
            </div>
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="text-blue-400 hover:text-blue-300 text-sm transition disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {isLoading && positions.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">&#8987;</div>
              <p className="text-gray-300">Loading positions...</p>
            </div>
          ) : positions.length > 0 ? (
            <div className="space-y-4">
              {positions.map((position) => {
                const levelInfo = getLevelInfo(position.lockLevel)
                return (
                  <div
                    key={position.positionId}
                    className="bg-white/5 rounded-lg p-4 border border-white/5"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-semibold text-white">
                            Position #{position.positionId}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            position.lockLevel === 12
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}>
                            {levelInfo.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Montant</p>
                            <p className="text-white font-semibold">{formatAmount(position.amount)} XCIRCLEX</p>
                          </div>
                          <div>
                            <p className="text-gray-500">APY</p>
                            <p className="text-green-400 font-semibold">{levelInfo.apy}%</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Epoch de stake</p>
                            <p className="text-blue-400 font-semibold">{position.startEpoch}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Epoch de fin</p>
                            <p className="text-orange-400 font-semibold">{position.endEpoch}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Epochs restants</p>
                            <p className={`font-semibold ${(positionTimeRemaining[position.positionId] || 0) <= 0 ? 'text-green-400' : 'text-white'}`}>
                              {(positionTimeRemaining[position.positionId] || 0) <= 0
                                ? 'Debloque!'
                                : `${positionTimeRemaining[position.positionId]} (~${formatTimeRemaining(positionTimeRemaining[position.positionId] || 0)})`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Recompenses</p>
                            <p className="text-yellow-400 font-semibold">
                              {formatAmount(positionRewards[position.positionId] || position.accumulatedRewards)} XCIRCLEX
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Prevues (total lock)</p>
                            <p className="text-green-400 font-semibold">
                              ~{formatAmount(calculateExpectedRewards(position.amount, levelInfo.apy, position.endEpoch - position.startEpoch))} XCIRCLEX
                            </p>
                          </div>
                        </div>
                        {/* Info about rewards after unlock */}
                        {(positionTimeRemaining[position.positionId] || 0) <= 0 && (
                          <p className="text-green-400/70 text-xs italic mt-2">
                            Les recompenses continuent a s'accumuler apres le deblocage
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 w-full md:w-auto">
                        {/* Bouton Claim Rewards - toujours disponible */}
                        <button
                          onClick={() => handleClaimRewards(position.positionId)}
                          disabled={actionLoading === `claim-${position.positionId}`}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === `claim-${position.positionId}` ? 'Reclamation...' : 'Reclamer Recompenses'}
                        </button>

                        {/* Bouton Unstake - seulement si debloque */}
                        {(positionTimeRemaining[position.positionId] || 0) <= 0 ? (
                          <button
                            onClick={() => handleUnstake(position.positionId)}
                            disabled={actionLoading === `unstake-${position.positionId}`}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                          >
                            {actionLoading === `unstake-${position.positionId}` ? 'Unstaking...' : 'Unstake (Debloque!)'}
                          </button>
                        ) : (
                          <>
                            {/* Bouton Emergency Unstake - si encore locke */}
                            {(() => {
                              const penaltyBps = positionPenalty[position.positionId] || 0
                              const penaltyPercent = (penaltyBps / 100).toFixed(1)
                              const amountNum = parseFloat(position.amount)
                              const returnAmount = amountNum * (1 - penaltyBps / 10000)
                              return (
                                <>
                                  <button
                                    onClick={() => handleEmergencyUnstake(position.positionId)}
                                    disabled={actionLoading === `emergency-${position.positionId}`}
                                    className="bg-red-600/50 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 text-sm"
                                    title={`Retrait anticipe avec ${penaltyPercent}% de penalite`}
                                  >
                                    {actionLoading === `emergency-${position.positionId}`
                                      ? 'Processing...'
                                      : `Unstake Urgence (-${penaltyPercent}%)`}
                                  </button>
                                  <p className="text-red-400 text-xs text-center">
                                    Penalite: {penaltyPercent}% → Vous recevrez ~{formatAmount(returnAmount.toString())} XCIRCLEX
                                  </p>
                                  <p className="text-gray-500 text-xs text-center">
                                    Unstake sans penalite dans {formatTimeRemaining(positionTimeRemaining[position.positionId] || 0)}
                                  </p>
                                </>
                              )
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">&#128176;</div>
              <p className="text-gray-300 mb-4">No staking positions yet</p>
              <button
                onClick={() => setShowStakeModal(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
              >
                Start Staking
              </button>
            </div>
          )}
        </div>

        {/* Smart Contract Info */}
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">Staking Contract</p>
              <p className="text-white font-mono text-xs md:text-sm break-all">{STAKING_CONTRACT_ADDRESS}</p>
            </div>
            <a
              href={`https://devnet-explorer.multiversx.com/accounts/${STAKING_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
            >
              View on Explorer &#8599;
            </a>
          </div>
        </div>
      </div>

      {/* Stake Modal */}
      {showStakeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-blue-900 to-purple-900 rounded-2xl p-6 max-w-md w-full border border-white/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">Stake XCIRCLEX</h3>
              <button
                onClick={() => setShowStakeModal(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                X
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">Amount</label>
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
                Available: {formatAmount(tokenBalance)} XCIRCLEX
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">Lock Period</label>
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

            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Lock Duration</span>
                <span className="text-white">{getLevelInfo(selectedLevel).days} days</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">APY</span>
                <span className="text-green-400 font-semibold">{getLevelInfo(selectedLevel).apy}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated Daily Rewards</span>
                <span className="text-yellow-400">
                  {stakeAmount ? (parseFloat(stakeAmount) * getLevelInfo(selectedLevel).apy / 100 / 365).toFixed(4) : '0'} XCIRCLEX
                </span>
              </div>
            </div>

            <button
              onClick={handleStake}
              disabled={actionLoading === 'stake' || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'stake' ? 'Staking...' : 'Stake XCIRCLEX'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Staking
