import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { IDO_CONFIG, XCIRCLEX_TOKEN_ID, IDO_CONTRACT_ADDRESS } from '../config/contracts'
import * as idoService from '../services/idoService'
import { Contribution, IdoStatus, IdoInfo } from '../services/idoService'

function IDO() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const navigate = useNavigate()

  const [contributionAmount, setContributionAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Contract data
  const [idoInfo, setIdoInfo] = useState<IdoInfo | null>(null)
  const [idoStatus, setIdoStatus] = useState<IdoStatus>('NotStarted')
  const [userContribution, setUserContribution] = useState<Contribution | null>(null)
  const [userEgldBalance, setUserEgldBalance] = useState('0')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [canContribute, setCanContribute] = useState(false)
  const [maxContribution, setMaxContribution] = useState('0')

  // Fetch all data from contract
  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true)
      setError(null)

      const [info, status] = await Promise.all([
        idoService.getIdoInfo(),
        idoService.getIdoStatus()
      ])

      setIdoInfo(info)
      setIdoStatus(status)

      // Calculate time remaining
      const now = Math.floor(Date.now() / 1000)
      const remaining = Math.max(0, info.endTime - now)
      setTimeRemaining(remaining)

      if (isLoggedIn && address) {
        const [contribution, balance, eligibility] = await Promise.all([
          idoService.getContribution(address),
          idoService.getUserEgldBalance(address),
          idoService.canUserContribute(address)
        ])

        setUserContribution(contribution)
        setUserEgldBalance(balance)
        setCanContribute(eligibility.canContribute)
        setMaxContribution(eligibility.maxAmount)
      }
    } catch (err) {
      console.error('Error fetching IDO data:', err)
      setError('Erreur lors du chargement des donnees')
    } finally {
      setIsLoadingData(false)
    }
  }, [isLoggedIn, address])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  // Countdown timer
  useEffect(() => {
    if (idoInfo && idoInfo.endTime > 0) {
      const interval = setInterval(() => {
        const now = Math.floor(Date.now() / 1000)
        const remaining = Math.max(0, idoInfo.endTime - now)
        setTimeRemaining(remaining)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [idoInfo])

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return 'TERMINEE'
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = seconds % 60
    return `${days}j ${hours}h ${minutes}m ${secs}s`
  }

  // Calculate tokens for contribution
  const calculateTokens = (egldAmount: string) => {
    const amount = parseFloat(egldAmount) || 0
    return amount * IDO_CONFIG.rate
  }

  const handleContribute = async () => {
    if (!address) return

    const amount = parseFloat(contributionAmount)
    if (!amount || amount < IDO_CONFIG.minContribution) {
      setError(`Minimum contribution is ${IDO_CONFIG.minContribution} EGLD`)
      return
    }
    if (amount > IDO_CONFIG.maxContribution) {
      setError(`Maximum contribution is ${IDO_CONFIG.maxContribution} EGLD`)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await idoService.contribute(contributionAmount, address)
      setContributionAmount('')
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error contributing:', err)
      setError('Erreur lors de la contribution')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClaimTokens = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)
    try {
      await idoService.claimTokens(address)
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error claiming tokens:', err)
      setError('Erreur lors de la reclamation des tokens')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)
    try {
      await idoService.refund(address)
      await fetchData() // Refresh data
    } catch (err) {
      console.error('Error requesting refund:', err)
      setError('Erreur lors du remboursement')
    } finally {
      setIsLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toFixed(2)
  }

  // Calculate progress
  const totalRaised = parseFloat(idoInfo?.totalRaised || '0')
  const hardCap = parseFloat(idoInfo?.hardCap || String(IDO_CONFIG.hardCap))
  const softCap = parseFloat(idoInfo?.softCap || String(IDO_CONFIG.softCap))
  const progressPercent = hardCap > 0 ? (totalRaised / hardCap) * 100 : 0
  const softCapReached = totalRaised >= softCap

  // Get status display
  const getStatusDisplay = (status: IdoStatus) => {
    switch (status) {
      case 'NotStarted': return { text: 'Bientot', color: 'text-yellow-400', bg: 'bg-yellow-400/20' }
      case 'Active': return { text: 'En cours', color: 'text-green-400', bg: 'bg-green-400/20' }
      case 'Ended': return { text: 'Terminee', color: 'text-blue-400', bg: 'bg-blue-400/20' }
      case 'Finalized': return { text: 'Finalisee', color: 'text-purple-400', bg: 'bg-purple-400/20' }
      case 'Cancelled': return { text: 'Annulee', color: 'text-red-400', bg: 'bg-red-400/20' }
      default: return { text: 'Inconnu', color: 'text-gray-400', bg: 'bg-gray-400/20' }
    }
  }

  const statusDisplay = getStatusDisplay(idoStatus)

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
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold text-white">
              XCIRCLEX IDO
            </h1>
            <span className={`${statusDisplay.bg} ${statusDisplay.color} px-4 py-1 rounded-full text-sm font-semibold`}>
              {statusDisplay.text}
            </span>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Initial DEX Offering - Participez au lancement du token XCIRCLEX et rejoignez l'ecosysteme X-CIRCLE-X
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : (
          <>
            {/* Countdown Timer */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8 text-center">
              <h2 className="text-lg text-gray-300 mb-2">
                {idoStatus === 'Active' ? 'Temps restant' : idoStatus === 'NotStarted' ? 'Debut dans' : 'IDO Terminee'}
              </h2>
              <div className="text-4xl md:text-5xl font-bold text-white">
                {timeRemaining > 0 ? formatTimeRemaining(timeRemaining) : 'TERMINEE'}
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
                    <span className="text-white">{totalRaised.toFixed(2)} / {hardCap} EGLD</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${softCapReached ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={softCapReached ? 'text-green-400' : 'text-gray-500'}>
                      Soft Cap: {softCap} EGLD {softCapReached && '(Atteint!)'}
                    </span>
                    <span className="text-gray-500">Hard Cap: {hardCap} EGLD</span>
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
                    <div className="text-white font-bold text-lg">{idoInfo?.totalParticipants || 0}</div>
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
                    <span className="text-gray-400">Votre solde</span>
                    <span className="text-white font-semibold">{parseFloat(userEgldBalance).toFixed(4)} EGLD</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">Votre contribution</span>
                    <span className="text-white font-semibold">{parseFloat(userContribution?.amountEgld || '0').toFixed(4)} EGLD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tokens a recevoir</span>
                    <span className="text-green-400 font-semibold">{formatNumber(parseFloat(userContribution?.tokensToReceive || '0'))} XCIRCLEX</span>
                  </div>
                </div>

                {/* Action based on status */}
                {idoStatus === 'Active' || idoStatus === 'NotStarted' ? (
                  <>
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
                          max={Math.min(IDO_CONFIG.maxContribution, parseFloat(maxContribution))}
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
                      disabled={isLoading || !contributionAmount || !canContribute || idoStatus === 'NotStarted'}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {isLoading ? 'Transaction en cours...' : idoStatus === 'NotStarted' ? 'IDO pas encore commencee' : 'Contribuer'}
                    </button>
                  </>
                ) : idoStatus === 'Finalized' && userContribution && !userContribution.claimed && parseFloat(userContribution.amountEgld) > 0 ? (
                  <button
                    onClick={handleClaimTokens}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? 'Transaction en cours...' : 'Reclamer vos tokens'}
                  </button>
                ) : idoStatus === 'Cancelled' && userContribution && !userContribution.refunded && parseFloat(userContribution.amountEgld) > 0 ? (
                  <button
                    onClick={handleRefund}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? 'Transaction en cours...' : 'Demander remboursement'}
                  </button>
                ) : userContribution?.claimed ? (
                  <div className="text-center py-4">
                    <p className="text-green-400 text-lg">Tokens deja reclames!</p>
                  </div>
                ) : userContribution?.refunded ? (
                  <div className="text-center py-4">
                    <p className="text-yellow-400 text-lg">Deja rembourse!</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400">
                      {idoStatus === 'Ended' ? 'En attente de finalisation...' : 'Pas de contribution a traiter'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tokenomics Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Distribution des Tokens (Tokenomics)</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128142;</div>
                  <div className="text-2xl font-bold text-white">35%</div>
                  <div className="text-gray-400 text-sm">Recompenses Cercle de Vie</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128176;</div>
                  <div className="text-2xl font-bold text-white">15%</div>
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
                  <div className="text-gray-400 text-sm">Equipe (24 mois)</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#127970;</div>
                  <div className="text-2xl font-bold text-white">10%</div>
                  <div className="text-gray-400 text-sm">Tresorerie DAO</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border-2 border-green-500/50">
                  <div className="text-3xl mb-2">&#128640;</div>
                  <div className="text-2xl font-bold text-green-400">5%</div>
                  <div className="text-gray-400 text-sm">IDO (Vous!)</div>
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
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#127873;</div>
                  <div className="text-2xl font-bold text-white">2%</div>
                  <div className="text-gray-400 text-sm">Airdrop</div>
                </div>
              </div>
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 text-center">
                  <strong>IDO:</strong> 5% = ~15.7M XCIRCLEX | <strong>Objectif:</strong> 360 EGLD | <strong>Taux:</strong> 1 EGLD = 43,633 XCIRCLEX
                </p>
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
                  <p className="text-gray-400 text-sm">Contrat IDO</p>
                  <p className="text-white font-mono text-xs md:text-sm">{IDO_CONTRACT_ADDRESS}</p>
                </div>
                <div className="flex gap-4">
                  <a
                    href={`https://devnet-explorer.multiversx.com/accounts/${IDO_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
                  >
                    Contrat Explorer &#8599;
                  </a>
                  <a
                    href={`https://devnet-explorer.multiversx.com/tokens/${XCIRCLEX_TOKEN_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1 transition"
                  >
                    Token Explorer &#8599;
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default IDO
