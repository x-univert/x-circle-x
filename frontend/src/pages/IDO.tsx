import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { IDO_CONFIG, XCIRCLEX_TOKEN_ID, VESTING_CONTRACT_ADDRESS } from '../config/contracts'

interface IDOStats {
  totalRaised: number
  participants: number
  yourContribution: number
  tokensToReceive: number
  timeRemaining: number
}

function IDO() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address, account } = useGetAccountInfo()
  const navigate = useNavigate()

  const [contributionAmount, setContributionAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState<IDOStats>({
    totalRaised: 12.5, // Mock data - a remplacer par API
    participants: 45,
    yourContribution: 0,
    tokensToReceive: 0,
    timeRemaining: IDO_CONFIG.duration
  })

  // Calculate progress
  const progressPercent = (stats.totalRaised / IDO_CONFIG.hardCap) * 100
  const softCapReached = stats.totalRaised >= IDO_CONFIG.softCap

  // Format time remaining
  const formatTimeRemaining = (ms: number) => {
    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    return `${days}j ${hours}h ${minutes}m`
  }

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const endTime = IDO_CONFIG.startTime + IDO_CONFIG.duration
      const remaining = Math.max(0, endTime - Date.now())
      setStats(prev => ({ ...prev, timeRemaining: remaining }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // Calculate tokens for contribution
  const calculateTokens = (egldAmount: string) => {
    const amount = parseFloat(egldAmount) || 0
    return amount * IDO_CONFIG.rate
  }

  const handleContribute = async () => {
    if (!contributionAmount || parseFloat(contributionAmount) < IDO_CONFIG.minContribution) {
      alert(`Minimum contribution is ${IDO_CONFIG.minContribution} EGLD`)
      return
    }
    if (parseFloat(contributionAmount) > IDO_CONFIG.maxContribution) {
      alert(`Maximum contribution is ${IDO_CONFIG.maxContribution} EGLD`)
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement actual contribution transaction
      console.log('Contributing:', contributionAmount, 'EGLD')
      // For now, just show success
      alert('Contribution enregistree! Les tokens seront distribues a la fin de l\'IDO.')
      setContributionAmount('')
    } catch (error) {
      console.error('Error contributing:', error)
      alert('Erreur lors de la contribution')
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">&#128640;</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            Participez a l'IDO XCIRCLEX
          </h2>
          <p className="text-gray-200 mb-6">
            Connectez votre wallet MultiversX pour participer a la vente initiale de tokens
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            XCIRCLEX IDO
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Initial DEX Offering - Participez au lancement du token XCIRCLEX et rejoignez l'ecosysteme X-CIRCLE-X
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8 text-center">
          <h2 className="text-lg text-gray-300 mb-2">
            {stats.timeRemaining > 0 ? 'Temps restant' : 'IDO Terminee'}
          </h2>
          <div className="text-4xl md:text-5xl font-bold text-white">
            {stats.timeRemaining > 0 ? formatTimeRemaining(stats.timeRemaining) : 'TERMINEE'}
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* IDO Info Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Informations IDO</h2>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progression</span>
                <span className="text-white">{stats.totalRaised.toFixed(2)} / {IDO_CONFIG.hardCap} EGLD</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${softCapReached ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className={softCapReached ? 'text-green-400' : 'text-gray-500'}>
                  Soft Cap: {IDO_CONFIG.softCap} EGLD {softCapReached && '(Atteint!)'}
                </span>
                <span className="text-gray-500">Hard Cap: {IDO_CONFIG.hardCap} EGLD</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Taux</div>
                <div className="text-white font-bold text-lg">1 EGLD = {formatNumber(IDO_CONFIG.rate)} XCX</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Participants</div>
                <div className="text-white font-bold text-lg">{stats.participants}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Allocation IDO</div>
                <div className="text-white font-bold text-lg">{formatNumber(IDO_CONFIG.allocation)} XCX</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-gray-400 text-sm">Min/Max</div>
                <div className="text-white font-bold text-lg">{IDO_CONFIG.minContribution} - {IDO_CONFIG.maxContribution} EGLD</div>
              </div>
            </div>
          </div>

          {/* Contribute Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">Participer</h2>

            {/* User Stats */}
            <div className="bg-white/5 rounded-lg p-4 mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Votre contribution</span>
                <span className="text-white font-semibold">{stats.yourContribution} EGLD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tokens a recevoir</span>
                <span className="text-green-400 font-semibold">{formatNumber(stats.tokensToReceive)} XCIRCLEX</span>
              </div>
            </div>

            {/* Contribution Input */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm mb-2">Montant (EGLD)</label>
              <div className="relative">
                <input
                  type="number"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                  placeholder="0.0"
                  min={IDO_CONFIG.minContribution}
                  max={IDO_CONFIG.maxContribution}
                  step="0.1"
                  className="w-full bg-white/10 border border-white/20 rounded-lg py-3 px-4 text-white text-lg focus:outline-none focus:border-blue-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                  EGLD
                </div>
              </div>
              {contributionAmount && (
                <p className="text-green-400 text-sm mt-2">
                  = {formatNumber(calculateTokens(contributionAmount))} XCIRCLEX
                </p>
              )}
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mb-6">
              {[0.5, 1, 2, 5, 10].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setContributionAmount(amount.toString())}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2 rounded-lg transition text-sm"
                >
                  {amount} EGLD
                </button>
              ))}
            </div>

            {/* Contribute Button */}
            <button
              onClick={handleContribute}
              disabled={isLoading || !contributionAmount || stats.timeRemaining <= 0}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isLoading ? 'Transaction en cours...' : 'Contribuer'}
            </button>

            {stats.timeRemaining <= 0 && (
              <p className="text-yellow-400 text-center mt-4">
                L'IDO est terminee. Les tokens seront distribues prochainement.
              </p>
            )}
          </div>
        </div>

        {/* Tokenomics Summary */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Distribution des Tokens (Tokenomics)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128142;</div>
              <div className="text-2xl font-bold text-white">35%</div>
              <div className="text-gray-400 text-sm">Recompenses Cercle de Vie</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128176;</div>
              <div className="text-2xl font-bold text-white">20%</div>
              <div className="text-gray-400 text-sm">Pool de Liquidite</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128200;</div>
              <div className="text-2xl font-bold text-white">15%</div>
              <div className="text-gray-400 text-sm">Staking Rewards</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128101;</div>
              <div className="text-2xl font-bold text-white">10%</div>
              <div className="text-gray-400 text-sm">Equipe (24 mois vesting)</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#127970;</div>
              <div className="text-2xl font-bold text-white">10%</div>
              <div className="text-gray-400 text-sm">Tresorerie DAO</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128226;</div>
              <div className="text-2xl font-bold text-white">5%</div>
              <div className="text-gray-400 text-sm">Marketing (12 mois)</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">&#128188;</div>
              <div className="text-2xl font-bold text-white">3%</div>
              <div className="text-gray-400 text-sm">Conseillers</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center border-2 border-green-500/50">
              <div className="text-3xl mb-2">&#128640;</div>
              <div className="text-2xl font-bold text-green-400">2%</div>
              <div className="text-gray-400 text-sm">IDO (Vous!)</div>
            </div>
          </div>
        </div>

        {/* Protection Features */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">Protections pour les Investisseurs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">&#128274;</div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Liquidite Lockee</h3>
                <p className="text-gray-400 text-sm">La liquidite initiale est verrouillee 12 mois minimum via notre LP Locker. Pas de rug pull possible.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-4xl">&#128051;</div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Anti-Whale</h3>
                <p className="text-gray-400 text-sm">Maximum 2% du supply par wallet pour eviter la concentration excessive.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="text-4xl">&#128337;</div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Vesting Equipe</h3>
                <p className="text-gray-400 text-sm">Tokens equipe bloques 24 mois avec cliff de 6 mois. Alignement long-terme.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contract Info */}
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">Token XCIRCLEX</p>
              <p className="text-white font-mono text-xs md:text-sm">{XCIRCLEX_TOKEN_ID}</p>
            </div>
            <div className="flex gap-4">
              <a
                href={`https://devnet-explorer.multiversx.com/tokens/${XCIRCLEX_TOKEN_ID}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
              >
                Token Explorer &#8599;
              </a>
              <a
                href="https://devnet.xexchange.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1 transition"
              >
                xExchange &#8599;
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IDO
