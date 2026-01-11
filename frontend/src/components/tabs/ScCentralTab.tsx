import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCircleOfLife } from '../../hooks/useCircleOfLife'
import { CIRCLE_OF_LIFE_ADDRESS, XCIRCLEX_TOKEN_ID } from '../../config/contracts'
import { TransactionModal, TransactionStep } from '../TransactionModal'

interface Transaction {
  txHash: string
  timestamp: number
  sender: string
  receiver: string
  value: string
  status: string
  function?: string
}

export function ScCentralTab() {
  const { t } = useTranslation()
  const {
    circleInfo,
    contractBalance,
    cycleStats,
    sc0Owner,
    activeContracts,
    rewardsInfo,
    burnStats,
    distributionStats,
    deposit,
    refreshData,
    isLoading
  } = useCircleOfLife()

  // State for deposit modal
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [depositModalStep, setDepositModalStep] = useState<TransactionStep>('confirm')
  const [depositTransactionHash, setDepositTransactionHash] = useState('')
  const [depositAmount, setDepositAmount] = useState('0.1')

  // State for transactions history
  const [incomingTxs, setIncomingTxs] = useState<Transaction[]>([])
  const [outgoingTxs, setOutgoingTxs] = useState<Transaction[]>([])
  const [loadingTxs, setLoadingTxs] = useState(false)

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatEgld = (value: string) => {
    const egld = parseFloat(value) / 1e18
    return egld.toFixed(4)
  }

  // Fetch transaction history using transfers API
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoadingTxs(true)
      try {
        // Utiliser l'API des transferts pour voir tous les mouvements EGLD
        const [transfersRes, txsRes] = await Promise.all([
          fetch(`https://devnet-api.multiversx.com/accounts/${CIRCLE_OF_LIFE_ADDRESS}/transfers?size=100`),
          fetch(`https://devnet-api.multiversx.com/accounts/${CIRCLE_OF_LIFE_ADDRESS}/transactions?size=50`)
        ])

        const transfers: any[] = transfersRes.ok ? await transfersRes.json() : []
        const txs: any[] = txsRes.ok ? await txsRes.json() : []

        console.log('SC0 Transfers:', transfers)
        console.log('SC0 Transactions:', txs)

        const incoming: Transaction[] = []
        const outgoing: Transaction[] = []
        const seenHashes = new Set<string>()

        // Parcourir les transferts
        for (const transfer of transfers) {
          // Ignorer les transferts de valeur 0
          if (!transfer.value || transfer.value === '0') continue

          const txData: Transaction = {
            txHash: transfer.txHash,
            timestamp: transfer.timestamp,
            sender: transfer.sender,
            receiver: transfer.receiver,
            value: transfer.value,
            status: transfer.status || 'success',
            function: transfer.function
          }

          // Entrant: receiver = SC0
          if (transfer.receiver === CIRCLE_OF_LIFE_ADDRESS && transfer.sender !== CIRCLE_OF_LIFE_ADDRESS) {
            const key = `in-${transfer.txHash}-${transfer.sender}`
            if (!seenHashes.has(key)) {
              seenHashes.add(key)
              incoming.push(txData)
            }
          }

          // Sortant: sender = SC0
          if (transfer.sender === CIRCLE_OF_LIFE_ADDRESS && transfer.receiver !== CIRCLE_OF_LIFE_ADDRESS) {
            const key = `out-${transfer.txHash}-${transfer.receiver}`
            if (!seenHashes.has(key)) {
              seenHashes.add(key)
              outgoing.push(txData)
            }
          }
        }

        // Aussi vérifier les transactions pour les appels SC
        for (const tx of txs) {
          // Transactions avec valeur > 0
          if (tx.value && parseFloat(tx.value) > 0) {
            const txData: Transaction = {
              txHash: tx.txHash,
              timestamp: tx.timestamp,
              sender: tx.sender,
              receiver: tx.receiver,
              value: tx.value,
              status: tx.status,
              function: tx.function
            }

            if (tx.receiver === CIRCLE_OF_LIFE_ADDRESS && tx.sender !== CIRCLE_OF_LIFE_ADDRESS) {
              const key = `in-tx-${tx.txHash}`
              if (!seenHashes.has(key)) {
                seenHashes.add(key)
                incoming.push(txData)
              }
            }

            if (tx.sender === CIRCLE_OF_LIFE_ADDRESS && tx.receiver !== CIRCLE_OF_LIFE_ADDRESS) {
              const key = `out-tx-${tx.txHash}`
              if (!seenHashes.has(key)) {
                seenHashes.add(key)
                outgoing.push(txData)
              }
            }
          }
        }

        // Trier par timestamp decroissant
        incoming.sort((a, b) => b.timestamp - a.timestamp)
        outgoing.sort((a, b) => b.timestamp - a.timestamp)

        console.log('Incoming transactions:', incoming)
        console.log('Outgoing transactions:', outgoing)

        setIncomingTxs(incoming.slice(0, 15))
        setOutgoingTxs(outgoing.slice(0, 15))
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoadingTxs(false)
      }
    }

    fetchTransactions()
  }, [])

  // Handle deposit
  const handleDepositConfirm = async () => {
    setDepositModalStep('pending')
    try {
      const result = await deposit(depositAmount)
      if (result && (result.transactionHash || result.sessionId)) {
        setDepositTransactionHash(result.transactionHash || result.sessionId)
        setDepositModalStep('processing')
      } else {
        setDepositModalStep('error')
      }
    } catch (err) {
      console.error('Error depositing:', err)
      setDepositModalStep('error')
    }
  }

  return (
    <div className="space-y-6">
      {/* SC0 Info Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>🏠</span> {t('scCentral.title', 'Central Smart Contract (SC0)')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">{t('scCentral.contractAddress', 'SC0 Contract Address')}</p>
            <p className="text-white font-mono text-xs break-all">{CIRCLE_OF_LIFE_ADDRESS}</p>
            <a
              href={`https://devnet-explorer.multiversx.com/accounts/${CIRCLE_OF_LIFE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1"
            >
              {t('common.viewOnExplorer', 'View on Explorer')} &#8599;
            </a>
          </div>

          {/* Owner */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">{t('scCentral.owner', 'Owner')}</p>
            <p className="text-white font-mono text-xs break-all">{sc0Owner || t('common.loading', 'Loading...')}</p>
            {sc0Owner && (
              <a
                href={`https://devnet-explorer.multiversx.com/accounts/${sc0Owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1"
              >
                {t('common.viewOnExplorer', 'View on Explorer')} &#8599;
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">{contractBalance || '0'}</div>
          <div className="text-sm text-gray-400 mt-1">{t('scCentral.balanceEgld', 'EGLD Balance')}</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">{circleInfo?.totalMembers || 0}</div>
          <div className="text-sm text-gray-400 mt-1">{t('scCentral.totalMembers', 'Total Members')}</div>
        </div>

        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">{circleInfo?.activeMembers || 0}</div>
          <div className="text-sm text-gray-400 mt-1">{t('scCentral.activeMembers', 'Active Members')}</div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-white">{cycleStats?.cyclesCompleted || 0}</div>
          <div className="text-sm text-gray-400 mt-1">{t('scCentral.successfulCycles', 'Successful Cycles')}</div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{t('scCentral.circleConfiguration', 'Circle Configuration')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm">{t('scCentral.entryFee', 'Entry Fee')}</p>
            <p className="text-2xl font-bold text-white">{circleInfo?.entryFee || '1'} EGLD</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm">{t('scCentral.circulatingAmount', 'Circulating Amount')}</p>
            <p className="text-2xl font-bold text-white">{circleInfo?.circulationAmount || '0.001'} EGLD</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm">{t('scCentral.currentCycle', 'Current Cycle')}</p>
            <p className="text-2xl font-bold text-white">#{(cycleStats?.cyclesCompleted || 0) + 1}</p>
          </div>
        </div>
      </div>

      {/* Rewards Pool Info */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{t('scCentral.rewardsPool', 'XCIRCLEX Rewards Pool')}</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
            <p className="text-gray-400 text-sm">{t('scCentral.availablePool', 'Available Pool')}</p>
            <p className="text-2xl font-bold text-purple-300">
              {rewardsInfo?.rewardsPool ? parseFloat(rewardsInfo.rewardsPool).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '0'} XCIRCLEX
            </p>
          </div>

          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
            <p className="text-gray-400 text-sm">{t('scCentral.rewardPerCycle', 'Reward per Cycle')}</p>
            <p className="text-2xl font-bold text-green-300">
              {rewardsInfo?.rewardPerCycle ? parseFloat(rewardsInfo.rewardPerCycle).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '0'} XCIRCLEX
            </p>
          </div>

          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
            <p className="text-gray-400 text-sm">{t('scCentral.burnPerSc', 'Burn per SC')}</p>
            <p className="text-2xl font-bold text-red-300">
              {burnStats?.burnPerSc ? parseFloat(burnStats.burnPerSc).toLocaleString('fr-FR', { maximumFractionDigits: 0 }) : '0'} XCIRCLEX
            </p>
          </div>
        </div>
      </div>

      {/* EGLD Distribution Stats */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>&#x1F4CA;</span> {t('scCentral.distributionStats', 'EGLD Distribution Stats')}
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {t('scCentral.distributionDescription', 'When EGLD is deposited, it is automatically distributed: 3.14% to Treasury, 30% to DAO, 70% to Liquidity.')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Treasury (3.14%) */}
          <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{t('scCentral.treasurySc0', 'Treasury SC0')}</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">3.14%</span>
            </div>
            <p className="text-2xl font-bold text-amber-300">
              {parseFloat(distributionStats?.totalDistributedTreasury || '0').toFixed(4)} EGLD
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('scCentral.remainsInSc0', 'Remains in SC0')}</p>
          </div>

          {/* DAO (30% of remaining) */}
          <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{t('scCentral.daoV2', 'DAO v2')}</span>
              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">30%</span>
            </div>
            <p className="text-2xl font-bold text-purple-300">
              {parseFloat(distributionStats?.totalDistributedDao || '0').toFixed(4)} EGLD
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('scCentral.sentToDao', 'Sent to DAO Treasury')}</p>
          </div>

          {/* Liquidity (70% of remaining) */}
          <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">{t('scCentral.liquidityPending', 'Liquidity (Pending)')}</span>
              <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded">70%</span>
            </div>
            <p className="text-2xl font-bold text-cyan-300">
              {parseFloat(distributionStats?.pendingLiquidityEgld || '0').toFixed(4)} EGLD
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('scCentral.pendingForLp', 'Pending for LP creation')}</p>
          </div>
        </div>

        {/* Distribution Status */}
        <div className="mt-4 flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${distributionStats?.distributionEnabled ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span className="text-sm text-gray-400">
            {distributionStats?.distributionEnabled
              ? t('scCentral.distributionActive', 'Distribution Active')
              : t('scCentral.distributionInactive', 'Distribution Inactive')}
          </span>
        </div>
      </div>

      {/* Deposit Section */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{t('scCentral.depositEgld', 'Deposit EGLD to SC0')}</h3>
        <p className="text-gray-400 text-sm mb-4">
          {t('scCentral.depositDescription', 'Deposit EGLD to fund the circulating amount of the circle.')}
        </p>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-gray-400 text-sm mb-2">{t('scCentral.amount', 'Amount (EGLD)')}</label>
            <input
              type="number"
              step="0.01"
              min="0.001"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
              placeholder="0.1"
            />
          </div>
          <button
            onClick={() => setShowDepositModal(true)}
            disabled={isLoading || parseFloat(depositAmount) <= 0}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {t('scCentral.deposit', 'Deposit')}
          </button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outgoing Transactions (Start of cycle) */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-red-400">↗</span> {t('scCentral.outgoingTransactions', 'Outgoing Transactions (SC0 → SC1)')}
          </h3>
          <p className="text-gray-400 text-xs mb-4">{t('scCentral.dailyCycleStart', 'Daily cycle start')}</p>

          {loadingTxs ? (
            <div className="text-center py-8 text-gray-400">{t('common.loading', 'Loading...')}</div>
          ) : outgoingTxs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">{t('scCentral.noOutgoingTransactions', 'No outgoing transactions')}</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {outgoingTxs.map((tx) => (
                <div key={tx.txHash} className="bg-white/5 rounded-lg p-3 border border-red-500/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-sm font-mono">
                        → {formatAddress(tx.receiver)}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(tx.timestamp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-red-400 font-bold">{formatEgld(tx.value)} EGLD</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://devnet-explorer.multiversx.com/transactions/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
                  >
                    {t('scCentral.viewTx', 'View TX')} &#8599;
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Transactions (End of cycle) */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-green-400">↙</span> {t('scCentral.incomingTransactions', 'Incoming Transactions (SCn → SC0)')}
          </h3>
          <p className="text-gray-400 text-xs mb-4">{t('scCentral.dailyCycleEnd', 'Daily cycle end')}</p>

          {loadingTxs ? (
            <div className="text-center py-8 text-gray-400">{t('common.loading', 'Loading...')}</div>
          ) : incomingTxs.length === 0 ? (
            <div className="text-center py-8 text-gray-400">{t('scCentral.noIncomingTransactions', 'No incoming transactions')}</div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {incomingTxs.map((tx) => (
                <div key={tx.txHash} className="bg-white/5 rounded-lg p-3 border border-green-500/20">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white text-sm font-mono">
                        ← {formatAddress(tx.sender)}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">{formatDate(tx.timestamp)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{formatEgld(tx.value)} EGLD</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${tx.status === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`https://devnet-explorer.multiversx.com/transactions/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-block"
                  >
                    {t('scCentral.viewTx', 'View TX')} &#8599;
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <TransactionModal
        isOpen={showDepositModal}
        step={depositModalStep}
        title={t('scCentral.depositEgldTitle', 'Deposit EGLD')}
        confirmTitle={t('scCentral.confirmDeposit', 'Confirm Deposit')}
        confirmDescription={t('scCentral.confirmDepositDesc', 'You are about to deposit {{amount}} EGLD to SC0 contract.', { amount: depositAmount })}
        confirmDetails={
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('scCentral.amountLabel', 'Amount')}</span>
              <span className="text-white font-bold">{depositAmount} EGLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('scCentral.destination', 'Destination')}</span>
              <span className="text-white font-mono text-xs">{formatAddress(CIRCLE_OF_LIFE_ADDRESS)}</span>
            </div>
          </div>
        }
        successTitle={t('scCentral.depositSuccess', 'Deposit Successful!')}
        successMessage={t('scCentral.depositSuccessMessage', 'You have deposited {{amount}} EGLD to SC0.', { amount: depositAmount })}
        errorMessage={t('scCentral.depositError', 'Error during deposit.')}
        transactionHash={depositTransactionHash}
        onConfirm={handleDepositConfirm}
        onClose={() => {
          setShowDepositModal(false)
          setTimeout(() => {
            setDepositModalStep('confirm')
            setDepositTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />
    </div>
  )
}

export default ScCentralTab
