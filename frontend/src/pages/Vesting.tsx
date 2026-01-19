import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { VESTING_CONTRACT_ADDRESS, XCIRCLEX_TOKEN_ID } from '../config/contracts'
import { explorerUrl } from '../config'
import { useVesting } from '../hooks/useVesting'

function Vesting() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const navigate = useNavigate()

  const {
    isLoading,
    error,
    schedules,
    stats,
    currentEpoch,
    totalReleasable,
    release,
    releaseAll,
    refreshData,
    clearError
  } = useVesting()

  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const handleRelease = async (scheduleId: number) => {
    setActionLoading(scheduleId)
    try {
      await release(scheduleId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReleaseAll = async () => {
    setActionLoading(-1)
    try {
      await releaseAll()
    } finally {
      setActionLoading(null)
    }
  }

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    if (isNaN(num)) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Team': return 'from-purple-500 to-purple-700'
      case 'Marketing': return 'from-green-500 to-green-700'
      case 'Advisors': return 'from-blue-500 to-blue-700'
      default: return 'from-gray-500 to-gray-700'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Team': return '\u{1F465}'      // 👥
      case 'Marketing': return '\u{1F4E2}' // 📢
      case 'Advisors': return '\u{1F4BC}'  // 💼
      default: return '\u{1F4B0}'          // 💰
    }
  }

  // Epochs to human-readable (devnet: 1 epoch = 4 hours = 2400 rounds × 6 sec)
  const epochsToTime = (epochs: number) => {
    if (epochs <= 0) return 'Maintenant!'
    const hours = epochs * 4 // 1 epoch = 4 hours on devnet
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) return `${days} jour${days > 1 ? 's' : ''}`
    return `${days}j ${remainingHours}h`
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">{'\u{1F512}'}</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Vesting XCIRCLEX
          </h2>
          <p className="text-gray-200 mb-6">
            Connectez votre wallet pour voir vos schedules de vesting
          </p>
          <button
            onClick={() => navigate('/unlock')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Connecter Wallet
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
              Vesting Dashboard
            </h1>
            <p className="text-lg text-gray-300">
              Suivez et reclamez vos tokens XCIRCLEX en vesting
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
            >
              {isLoading ? 'Chargement...' : 'Rafraichir'}
            </button>
            {parseFloat(totalReleasable) > 0 && (
              <button
                onClick={handleReleaseAll}
                disabled={actionLoading !== null}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:opacity-50"
              >
                {actionLoading === -1 ? 'En cours...' : `Reclamer Tout (${formatAmount(totalReleasable)} XCX)`}
              </button>
            )}
          </div>
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
            <div className="text-3xl mb-2">{'\u{1F4B0}'}</div>
            <div className="text-2xl font-bold text-white">{formatAmount(stats?.contractBalance || '0')}</div>
            <div className="text-gray-400 text-sm">Dans le contrat</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">{'\u{1F4CA}'}</div>
            <div className="text-2xl font-bold text-white">{schedules.length}</div>
            <div className="text-gray-400 text-sm">Vos schedules</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">{'\u{23F1}'}</div>
            <div className="text-2xl font-bold text-white">{currentEpoch}</div>
            <div className="text-gray-400 text-sm">Epoch actuel</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">{'\u{1F381}'}</div>
            <div className="text-2xl font-bold text-green-400">
              {formatAmount(totalReleasable)}
            </div>
            <div className="text-gray-400 text-sm">A reclamer</div>
          </div>
        </div>

        {/* Vesting Schedules */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">Vos Schedules de Vesting</h2>

          {isLoading && schedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin text-4xl mb-4">{'\u{231B}'}</div>
              <p className="text-gray-300">Chargement des schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">{'\u{1F512}'}</div>
              <p className="text-gray-300 mb-2">Aucun schedule de vesting trouve pour votre adresse</p>
              <p className="text-gray-500 text-sm">Adresse: {address?.slice(0, 20)}...{address?.slice(-10)}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {schedules.map((schedule) => (
                <div
                  key={schedule.scheduleId}
                  className="bg-white/5 rounded-xl p-6 border border-white/10"
                >
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`text-3xl p-3 rounded-lg bg-gradient-to-r ${getCategoryColor(schedule.category)}`}
                      >
                        {getCategoryIcon(schedule.category)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{schedule.category}</h3>
                        <p className="text-gray-400 text-sm">Schedule #{schedule.scheduleId}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {schedule.isRevoked ? (
                        <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm">
                          Revoque
                        </span>
                      ) : parseFloat(schedule.releasableAmount) > 0 ? (
                        <button
                          onClick={() => handleRelease(schedule.scheduleId)}
                          disabled={actionLoading !== null}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                          {actionLoading === schedule.scheduleId ? 'En cours...' : `Reclamer ${formatAmount(schedule.releasableAmount)} XCX`}
                        </button>
                      ) : schedule.timeUntilCliffEnd > 0 ? (
                        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                          En cliff ({epochsToTime(schedule.timeUntilCliffEnd)} restant)
                        </span>
                      ) : (
                        <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
                          En cours de vesting
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-400">Progression</span>
                      <span className="text-white">{schedule.progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${getCategoryColor(schedule.category)}`}
                        style={{ width: `${Math.min(schedule.progressPercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Alloue</p>
                      <p className="text-white font-semibold">{formatAmount(schedule.totalAmount)} XCX</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deja Veste</p>
                      <p className="text-blue-400 font-semibold">{formatAmount(schedule.vestedAmount)} XCX</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Deja Reclame</p>
                      <p className="text-purple-400 font-semibold">{formatAmount(schedule.releasedAmount)} XCX</p>
                    </div>
                    <div>
                      <p className="text-gray-500">A Reclamer</p>
                      <p className="text-green-400 font-semibold">{formatAmount(schedule.releasableAmount)} XCX</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div>
                        <span className="text-gray-500">Debut:</span>
                        <span className="text-white ml-1">Epoch {schedule.startEpoch}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fin du cliff:</span>
                        <span className="text-yellow-400 ml-1">Epoch {schedule.cliffEndEpoch}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fin du vesting:</span>
                        <span className="text-green-400 ml-1">Epoch {schedule.vestingEndEpoch}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duree cliff:</span>
                        <span className="text-white ml-1">{epochsToTime(schedule.cliffEpochs)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duree vesting:</span>
                        <span className="text-white ml-1">{epochsToTime(schedule.vestingDurationEpochs)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contract Info */}
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">Vesting Contract</p>
              <p className="text-white font-mono text-xs md:text-sm break-all">{VESTING_CONTRACT_ADDRESS}</p>
            </div>
            <a
              href={`${explorerUrl}/accounts/${VESTING_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
            >
              Voir sur Explorer {'\u{2197}'}
            </a>
          </div>
        </div>

        {/* Vesting Explanation */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
          <h2 className="text-xl font-bold text-white mb-4">Comment fonctionne le Vesting?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="text-3xl">{'\u{2460}'}</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Periode de Cliff</h3>
                <p className="text-gray-400 text-sm">Aucun token n'est deblocable pendant cette periode. C'est une periode d'attente obligatoire.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{'\u{2461}'}</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Vesting Lineaire</h3>
                <p className="text-gray-400 text-sm">Apres le cliff, les tokens sont debloques progressivement chaque epoch (10 min sur devnet).</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="text-3xl">{'\u{2462}'}</div>
              <div>
                <h3 className="text-white font-semibold mb-1">Reclamation</h3>
                <p className="text-gray-400 text-sm">Cliquez sur "Reclamer" pour recevoir vos tokens deverrouilles dans votre wallet.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Vesting
