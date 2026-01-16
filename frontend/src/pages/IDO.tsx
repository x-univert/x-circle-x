import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { IDO_CONFIG, XCIRCLEX_TOKEN_ID, IDO_CONTRACT_ADDRESS } from '../config/contracts'
import * as idoService from '../services/idoService'
import { Contribution, IdoStatus, IdoInfo } from '../services/idoService'

function IDO() {
  const { t } = useTranslation()
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
  const [claimTimeRemaining, setClaimTimeRemaining] = useState<number>(-1) // -1 = not finalized

  // Fetch all data from contract
  const fetchData = useCallback(async () => {
    try {
      setIsLoadingData(true)
      setError(null)

      const [info, status, claimTime] = await Promise.all([
        idoService.getIdoInfo(),
        idoService.getIdoStatus(),
        idoService.getClaimTimeRemaining()
      ])

      setIdoInfo(info)
      setIdoStatus(status)
      setClaimTimeRemaining(claimTime)

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
      setError(t('ido.errors.loadingError'))
    } finally {
      setIsLoadingData(false)
    }
  }, [isLoggedIn, address])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [fetchData])

  // Countdown timer for IDO end
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

  // Countdown timer for claim availability
  useEffect(() => {
    if (claimTimeRemaining > 0) {
      const interval = setInterval(() => {
        setClaimTimeRemaining(prev => Math.max(0, prev - 1))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [claimTimeRemaining])

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return t('ido.timer.finished')
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = seconds % 60
    return `${days}d ${hours}h ${minutes}m ${secs}s`
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
      setError(t('ido.errors.minContribution', { amount: IDO_CONFIG.minContribution }))
      return
    }
    if (amount > IDO_CONFIG.maxContribution) {
      setError(t('ido.errors.maxContribution', { amount: IDO_CONFIG.maxContribution }))
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
      setError(t('ido.errors.contributionError'))
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
      setError(t('ido.errors.claimError'))
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
      setError(t('ido.errors.refundError'))
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
  const hardCapReached = progressPercent >= 100

  // Get status display
  const getStatusDisplay = (status: IdoStatus) => {
    switch (status) {
      case 'NotStarted': return { text: t('ido.status.notStarted'), color: 'text-yellow-400', bg: 'bg-yellow-400/20' }
      case 'Active': return { text: t('ido.status.active'), color: 'text-green-400', bg: 'bg-green-400/20' }
      case 'Ended': return { text: t('ido.status.ended'), color: 'text-blue-400', bg: 'bg-blue-400/20' }
      case 'Finalized': return { text: t('ido.status.finalized'), color: 'text-purple-400', bg: 'bg-purple-400/20' }
      case 'Cancelled': return { text: t('ido.status.cancelled'), color: 'text-red-400', bg: 'bg-red-400/20' }
      default: return { text: t('ido.status.unknown'), color: 'text-gray-400', bg: 'bg-gray-400/20' }
    }
  }

  const statusDisplay = getStatusDisplay(idoStatus)

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">&#128640;</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            {t('ido.connectPrompt')}
          </h2>
          <p className="text-gray-200 mb-6">
            {t('ido.connectDescription')}
          </p>
          <button
            onClick={() => navigate('/unlock')}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {t('ido.connectWallet')}
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
              {t('ido.pageTitle')}
            </h1>
            <span className={`${statusDisplay.bg} ${statusDisplay.color} px-4 py-1 rounded-full text-sm font-semibold`}>
              {statusDisplay.text}
            </span>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {t('ido.subtitle')}
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
            {/* Hard Cap Reached Celebration */}
            {hardCapReached && (
              <div className="mb-8 relative overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-500 via-green-500 to-yellow-500 rounded-2xl p-8 shadow-2xl border-4 border-yellow-400 animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                  <div className="relative z-10 text-center">
                    <div className="text-6xl mb-4 animate-bounce">
                      &#127881; &#127882; &#127880;
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                      {t('ido.celebration.hardCapReached', 'HARD CAP ATTEINT !')}
                    </h2>
                    <p className="text-xl text-white/90 font-semibold">
                      {t('ido.celebration.thankYou', 'Merci a tous les participants !')}
                    </p>
                    <div className="mt-4 text-4xl">
                      &#128640; &#127775; &#128640;
                    </div>
                  </div>
                </div>
                <style>{`
                  @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                  }
                  .animate-shimmer {
                    animation: shimmer 2s infinite;
                  }
                `}</style>
              </div>
            )}

            {/* Next Steps after Hard Cap */}
            {hardCapReached && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-green-500/50 mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-3xl">&#128203;</span>
                  {t('ido.nextSteps.title', 'Prochaines Etapes')}
                </h2>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-400">
                        {t('ido.nextSteps.step1Title', 'Finalisation de l\'IDO')}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {t('ido.nextSteps.step1Desc', 'L\'admin finalise l\'IDO dans les 24-48h. Le contrat passe en statut "Finalized".')}
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-blue-400">
                        {t('ido.nextSteps.step2Title', 'Creation de la Liquidite')}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {t('ido.nextSteps.step2Desc', '80% des EGLD collectes sont utilises pour creer la paire XCIRCLEX/WEGLD sur xExchange. Les LP tokens sont lockes pour 12 mois minimum.')}
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-purple-400">
                        {t('ido.nextSteps.step3Title', 'Reclamation des Tokens')}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {t('ido.nextSteps.step3Desc', 'Une fois finalise, vous pouvez reclamer vos XCIRCLEX! Le bouton "Claim" apparaitra automatiquement.')}
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-4 bg-white/5 rounded-lg p-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-400">
                        {t('ido.nextSteps.step4Title', 'Trading & Staking')}
                      </h3>
                      <p className="text-gray-300 text-sm">
                        {t('ido.nextSteps.step4Desc', 'Apres le claim, vous pouvez trader sur xExchange, staker pour du APY, ou participer au Circle of Life!')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Distribution Summary */}
                <div className="mt-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-500/30">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <span>&#128176;</span>
                    {t('ido.nextSteps.distributionTitle', 'Repartition des EGLD collectes')}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-green-400">80%</div>
                      <div className="text-xs text-gray-300">{t('ido.nextSteps.liquidity', 'Liquidite xExchange')}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-blue-400">10%</div>
                      <div className="text-xs text-gray-300">{t('ido.nextSteps.development', 'Developpement')}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-purple-400">5%</div>
                      <div className="text-xs text-gray-300">{t('ido.nextSteps.marketing', 'Marketing')}</div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold text-yellow-400">5%</div>
                      <div className="text-xs text-gray-300">{t('ido.nextSteps.reserve', 'Reserve')}</div>
                    </div>
                  </div>
                </div>

                {/* Claim Countdown Timer */}
                {claimTimeRemaining !== 0 && (
                  <div className="mt-4 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-lg p-4 border border-orange-500/30">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <span>&#9200;</span>
                      {t('ido.nextSteps.claimCountdown', 'Temps avant le Claim')}
                    </h3>
                    <div className="text-center">
                      {claimTimeRemaining === -1 ? (
                        <div className="text-yellow-400">
                          {t('ido.nextSteps.waitingFinalization', 'En attente de finalisation...')}
                        </div>
                      ) : claimTimeRemaining > 0 ? (
                        <div className="text-3xl font-bold text-orange-400 animate-pulse">
                          {formatTimeRemaining(claimTimeRemaining)}
                        </div>
                      ) : (
                        <div className="text-2xl font-bold text-green-400">
                          {t('ido.nextSteps.claimAvailable', 'Claim disponible !')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Your Allocation */}
                {userContribution && parseFloat(userContribution.amountEgld) > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 border border-purple-500/30">
                    <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                      <span>&#127873;</span>
                      {t('ido.nextSteps.yourAllocation', 'Votre Allocation')}
                    </h3>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div>
                        <span className="text-gray-400">{t('ido.nextSteps.contributed', 'Contribution')}:</span>
                        <span className="text-white font-bold ml-2">{parseFloat(userContribution.amountEgld).toFixed(4)} EGLD</span>
                      </div>
                      <div className="text-2xl">&#10132;</div>
                      <div>
                        <span className="text-gray-400">{t('ido.nextSteps.toReceive', 'A recevoir')}:</span>
                        <span className="text-green-400 font-bold ml-2">{formatNumber(parseFloat(userContribution.tokensToReceive || '0'))} XCIRCLEX</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Countdown Timer */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8 text-center">
              <h2 className="text-lg text-gray-300 mb-2">
                {hardCapReached
                  ? t('ido.timer.hardCapReached', 'Hard Cap Atteint !')
                  : idoStatus === 'Active'
                    ? t('ido.timer.timeRemaining')
                    : idoStatus === 'NotStarted'
                      ? t('ido.timer.startsIn')
                      : t('ido.timer.ended')}
              </h2>
              <div className={`text-4xl md:text-5xl font-bold ${hardCapReached ? 'text-green-400' : 'text-white'}`}>
                {hardCapReached
                  ? `${hardCap} / ${hardCap} EGLD (100%)`
                  : timeRemaining > 0
                    ? formatTimeRemaining(timeRemaining)
                    : t('ido.timer.finished')}
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* IDO Info Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">{t('ido.info.title')}</h2>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">{t('ido.info.progress')}</span>
                    <span className={hardCapReached ? 'text-green-400 font-bold' : 'text-white'}>
                      {totalRaised.toFixed(2)} / {hardCap} EGLD {hardCapReached && '(COMPLET !)'}
                    </span>
                  </div>
                  <div className={`w-full bg-white/10 rounded-full h-4 overflow-hidden ${hardCapReached ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-transparent' : ''}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${hardCapReached ? 'bg-gradient-to-r from-green-400 via-green-500 to-green-400 animate-pulse' : softCapReached ? 'bg-green-500' : 'bg-blue-500'}`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className={softCapReached ? 'text-green-400' : 'text-gray-500'}>
                      {t('ido.info.softCap')}: {softCap} EGLD {softCapReached && `(${t('ido.info.reached')})`}
                    </span>
                    <span className={hardCapReached ? 'text-green-400 font-bold' : 'text-gray-500'}>
                      {t('ido.info.hardCap')}: {hardCap} EGLD {hardCapReached && `(${t('ido.info.reached')})`}
                    </span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">{t('ido.info.rate')}</div>
                    <div className="text-white font-bold text-lg">1 EGLD = {formatNumber(IDO_CONFIG.rate)} XCX</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">{t('ido.info.participants')}</div>
                    <div className="text-white font-bold text-lg">{idoInfo?.totalParticipants || 0}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">{t('ido.info.allocation')}</div>
                    <div className="text-white font-bold text-lg">{formatNumber(IDO_CONFIG.allocation)} XCX</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-gray-400 text-sm">{t('ido.info.minMax')}</div>
                    <div className="text-white font-bold text-lg">{IDO_CONFIG.minContribution} - {IDO_CONFIG.maxContribution} EGLD</div>
                  </div>
                </div>
              </div>

              {/* Contribute Card */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
                <h2 className="text-2xl font-bold text-white mb-6">{t('ido.participate.title')}</h2>

                {/* User Stats */}
                <div className="bg-white/5 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">{t('ido.participate.yourBalance')}</span>
                    <span className="text-white font-semibold">{parseFloat(userEgldBalance).toFixed(4)} EGLD</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400">{t('ido.participate.yourContribution')}</span>
                    <span className="text-white font-semibold">{parseFloat(userContribution?.amountEgld || '0').toFixed(4)} EGLD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">{t('ido.participate.tokensToReceive')}</span>
                    <span className="text-green-400 font-semibold">{formatNumber(parseFloat(userContribution?.tokensToReceive || '0'))} XCIRCLEX</span>
                  </div>
                </div>

                {/* Action based on status */}
                {idoStatus === 'Active' || idoStatus === 'NotStarted' ? (
                  <>
                    {/* Contribution Input */}
                    <div className="mb-6">
                      <label className="block text-gray-300 text-sm mb-2">{t('ido.participate.amount')}</label>
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
                      {isLoading ? t('ido.participate.contributing') : idoStatus === 'NotStarted' ? t('ido.participate.idoNotStarted') : t('ido.participate.contribute')}
                    </button>
                  </>
                ) : idoStatus === 'Finalized' && userContribution && !userContribution.claimed && parseFloat(userContribution.amountEgld) > 0 ? (
                  <button
                    onClick={handleClaimTokens}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? t('ido.participate.claiming') : t('ido.participate.claimTokens')}
                  </button>
                ) : idoStatus === 'Cancelled' && userContribution && !userContribution.refunded && parseFloat(userContribution.amountEgld) > 0 ? (
                  <button
                    onClick={handleRefund}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                  >
                    {isLoading ? t('ido.participate.refunding') : t('ido.participate.requestRefund')}
                  </button>
                ) : userContribution?.claimed ? (
                  <div className="text-center py-4">
                    <p className="text-green-400 text-lg">{t('ido.participate.alreadyClaimed')}</p>
                  </div>
                ) : userContribution?.refunded ? (
                  <div className="text-center py-4">
                    <p className="text-yellow-400 text-lg">{t('ido.participate.alreadyRefunded')}</p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-400">
                      {idoStatus === 'Ended' ? t('ido.participate.waitingFinalization') : t('ido.participate.noContribution')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tokenomics Summary */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">{t('ido.tokenomics.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128142;</div>
                  <div className="text-2xl font-bold text-white">35%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.circleRewards')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128176;</div>
                  <div className="text-2xl font-bold text-white">15%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.liquidityPool')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128200;</div>
                  <div className="text-2xl font-bold text-white">15%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.stakingRewards')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128101;</div>
                  <div className="text-2xl font-bold text-white">10%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.team')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#127970;</div>
                  <div className="text-2xl font-bold text-white">10%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.daoTreasury')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border-2 border-green-500/50">
                  <div className="text-3xl mb-2">&#128640;</div>
                  <div className="text-2xl font-bold text-green-400">5%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.idoYou')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128226;</div>
                  <div className="text-2xl font-bold text-white">5%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.marketing')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#128188;</div>
                  <div className="text-2xl font-bold text-white">3%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.advisors')}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <div className="text-3xl mb-2">&#127873;</div>
                  <div className="text-2xl font-bold text-white">2%</div>
                  <div className="text-gray-400 text-sm">{t('ido.tokenomics.airdrop')}</div>
                </div>
              </div>
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 text-center">
                  {t('ido.tokenomics.summary')}
                </p>
              </div>
            </div>

            {/* Protection Features */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">{t('ido.protection.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">&#128274;</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t('ido.protection.lockedLiquidity')}</h3>
                    <p className="text-gray-400 text-sm">{t('ido.protection.lockedLiquidityDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">&#128051;</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t('ido.protection.antiWhale')}</h3>
                    <p className="text-gray-400 text-sm">{t('ido.protection.antiWhaleDesc')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-4xl">&#128337;</div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{t('ido.protection.teamVesting')}</h3>
                    <p className="text-gray-400 text-sm">{t('ido.protection.teamVestingDesc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract Info */}
            <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-400 text-sm">{t('ido.contract.idoContract')}</p>
                  <p className="text-white font-mono text-xs md:text-sm">{IDO_CONTRACT_ADDRESS}</p>
                </div>
                <div className="flex gap-4">
                  <a
                    href={`https://devnet-explorer.multiversx.com/accounts/${IDO_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
                  >
                    {t('ido.contract.contractExplorer')} &#8599;
                  </a>
                  <a
                    href={`https://devnet-explorer.multiversx.com/tokens/${XCIRCLEX_TOKEN_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 text-sm flex items-center gap-1 transition"
                  >
                    {t('ido.contract.tokenExplorer')} &#8599;
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
