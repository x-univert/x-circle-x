import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useCircleOfLife } from '../../hooks/useCircleOfLife'
import { multiversxApiUrl, explorerUrl } from '../../config'

interface CycleHistoryEntry {
  txHash: string
  timestamp: number
  type: 'received' | 'forwarded' | 'reward'
  value: string
  from?: string
  to?: string
  status: string
}

interface MyPeripheralTabProps {
  // Props si necessaire
}

export function MyPeripheralTab({}: MyPeripheralTabProps) {
  const { t } = useTranslation()
  const {
    myContract,
    isActive,
    hasPreSigned,
    hasSignedThisCycle,
    cycleStats,
    autoSignStatus,
    pendingRewards,
    canClaim,
    peripheralBalances,
    scStats,
    address: userAddress
  } = useCircleOfLife()

  // Get address from the hook
  const address = (() => {
    try {
      const accountInfo = JSON.parse(sessionStorage.getItem('accountInfo') || '{}')
      return accountInfo.address || ''
    } catch {
      return ''
    }
  })()

  // Cycle history state
  const [cycleHistory, setCycleHistory] = useState<CycleHistoryEntry[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'received' | 'forwarded' | 'reward'>('all')

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

  // Fetch cycle history for this SC
  useEffect(() => {
    if (!myContract) return

    const fetchCycleHistory = async () => {
      setLoadingHistory(true)
      try {
        console.log('Fetching cycle history for SC:', myContract)

        // Fetch transfers for the peripheral SC (cycle transfers)
        const scTransfersResponse = await fetch(
          `${multiversxApiUrl}/accounts/${myContract}/transfers?size=100`
        )
        const scTransfers: any[] = await scTransfersResponse.json()

        // Also fetch user's wallet transfers to get XCIRCLEX rewards
        let userRewardTransfers: any[] = []
        if (userAddress) {
          const userTransfersResponse = await fetch(
            `${multiversxApiUrl}/accounts/${userAddress}/transfers?size=50&token=XCIRCLEX`
          )
          const userTransfersData = await userTransfersResponse.json()
          if (Array.isArray(userTransfersData)) {
            userRewardTransfers = userTransfersData
          }
        }

        // Combine transfers
        const transfers = [...(Array.isArray(scTransfers) ? scTransfers : []), ...userRewardTransfers]

        console.log('myContract address:', myContract)
        console.log('userAddress:', userAddress)
        console.log('SC Transfers:', scTransfers?.length || 0)
        console.log('User Reward Transfers:', userRewardTransfers?.length || 0)
        console.log('Total Transfers:', transfers?.length || 0)

        // Debug: show first user reward transfer structure
        if (userRewardTransfers?.length > 0) {
          console.log('First user reward transfer:', JSON.stringify(userRewardTransfers[0], null, 2))
        }

        const history: CycleHistoryEntry[] = []

        // Process transfers - this API contains all EGLD and ESDT movements
        if (Array.isArray(transfers)) {
          for (const transfer of transfers) {
            const txHash = transfer.originalTxHash || transfer.txHash
            const hasEgldValue = transfer.value && parseFloat(transfer.value) > 0

            // Check for ESDT token in action.arguments.transfers (new API format)
            const esdtTransfers = transfer.action?.arguments?.transfers || []
            const xcirclexTransfer = esdtTransfers.find((t: any) =>
              t.token?.includes('XCIRCLEX') || t.ticker?.includes('XCIRCLEX') || t.name === 'XCIRCLEX'
            )
            const hasEsdtValue = !!xcirclexTransfer

            // Also check old format
            const tokenId = transfer.token || transfer.identifier || transfer.tokenIdentifier || ''
            const isXcirclexTokenOldFormat = tokenId.includes('XCIRCLEX')

            // Check if this is an ESDTTransfer function (typical for rewards)
            const isEsdtTransferFunction = transfer.function === 'ESDTTransfer'

            // ESDT Token received (XCIRCLEX rewards) - can be to myContract or userAddress
            const isReceivedByUser = transfer.receiver === myContract || transfer.receiver === userAddress
            const isXcirclexTransfer = hasEsdtValue || isXcirclexTokenOldFormat || isEsdtTransferFunction
            if (isXcirclexTransfer && isReceivedByUser) {
              // Get value from the appropriate place (action.arguments.transfers[0].value for ESDTTransfer)
              const tokenValue = xcirclexTransfer?.value || transfer.tokenValue || transfer.tokenAmount || '0'
              console.log('Found XCIRCLEX reward:', {
                txHash,
                receiver: transfer.receiver,
                hasEsdtValue,
                isXcirclexTokenOldFormat,
                isEsdtTransferFunction,
                tokenValue
              })
              history.push({
                txHash,
                timestamp: transfer.timestamp,
                type: 'reward',
                value: tokenValue,
                from: transfer.sender,
                status: transfer.status || 'success'
              })
              continue
            }

            // EGLD transfers (cycle transfers, not rewards - rewards are XCIRCLEX tokens)
            if (hasEgldValue) {
              // Received EGLD (myContract is the receiver)
              if (transfer.receiver === myContract) {
                history.push({
                  txHash,
                  timestamp: transfer.timestamp,
                  type: 'received',
                  value: transfer.value,
                  from: transfer.sender,
                  status: transfer.status || 'success'
                })
              }

              // Sent/Forwarded EGLD (myContract is the sender)
              if (transfer.sender === myContract && transfer.receiver !== myContract) {
                history.push({
                  txHash,
                  timestamp: transfer.timestamp,
                  type: 'forwarded',
                  value: transfer.value,
                  to: transfer.receiver,
                  status: transfer.status || 'success'
                })
              }
            }
          }
        }

        console.log('Parsed history entries:', history.length, history)

        // Sort by timestamp descending
        history.sort((a, b) => b.timestamp - a.timestamp)

        // Remove duplicates based on txHash + type + value
        const seen = new Set<string>()
        const uniqueHistory = history.filter(entry => {
          const key = `${entry.txHash}-${entry.type}-${entry.value}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        console.log('Unique history entries:', uniqueHistory.length)
        setCycleHistory(uniqueHistory.slice(0, 50))
      } catch (error) {
        console.error('Error fetching cycle history:', error)
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchCycleHistory()
  }, [myContract, userAddress])

  // Get my SC balance
  const myBalance = myContract && peripheralBalances ? peripheralBalances[myContract] : null

  // Get my SC stats from contract (more reliable than counting from history)
  const myScStats = myContract && scStats ? scStats.get(myContract) : null

  // Filter history
  const filteredHistory = historyFilter === 'all'
    ? cycleHistory
    : cycleHistory.filter(entry => entry.type === historyFilter)

  // Use contract stats if available, otherwise fallback to counting from history
  const successfulCycles = myScStats?.cyclesCompleted ?? cycleHistory.filter(e => e.type === 'forwarded' && e.status === 'success').length
  const receivedCycles = myScStats?.cyclesCompleted ?? cycleHistory.filter(e => e.type === 'received' && e.status === 'success').length

  if (!myContract) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          {t('myPeripheral.noContract', 'You don\'t have a Smart Contract yet')}
        </h2>
        <p className="text-gray-300 mb-6">
          {t('myPeripheral.noContractDesc', 'Join the Circle of Life to create your peripheral smart contract and participate in daily cycles.')}
        </p>
        <p className="text-gray-400 text-sm">
          {t('myPeripheral.goToCircle', 'Go to the "Circle of Life" tab to join the circle.')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SC Info Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📄</span> {t('myPeripheral.title', 'My Peripheral Smart Contract')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">{t('myPeripheral.contractAddress', 'Contract Address')}</p>
            <p className="text-white font-mono text-sm break-all">{myContract}</p>
            <a
              href={`${explorerUrl}/accounts/${myContract}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1"
            >
              {t('common.viewOnExplorer', 'View on Explorer')} &#8599;
            </a>
          </div>

          {/* Balance */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">{t('myPeripheral.scBalance', 'SC Balance')}</p>
            <p className="text-2xl font-bold text-white">
              {myBalance ? parseFloat(myBalance).toFixed(4) : '0'} <span className="text-gray-400 text-lg">EGLD</span>
            </p>
            {pendingRewards && parseFloat(pendingRewards) > 0 && (
              <p className="text-purple-400 text-sm mt-2">
                + {(parseFloat(pendingRewards) / 1e18).toFixed(0)} {t('myPeripheral.xcirclexPending', 'XCIRCLEX pending')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">{t('myPeripheral.currentStatus', 'Current Status')}</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Active status */}
          <div className={`rounded-xl p-4 text-center ${isActive ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <div className={`text-2xl font-bold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
              {isActive ? t('myPeripheral.active', 'Active') : t('myPeripheral.inactive', 'Inactive')}
            </div>
            <div className="text-xs text-gray-400 mt-1">{t('myPeripheral.status', 'Status')}</div>
          </div>

          {/* Pre-signed */}
          <div className={`rounded-xl p-4 text-center ${hasPreSigned ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gray-500/20 border border-gray-500/30'}`}>
            <div className={`text-2xl font-bold ${hasPreSigned ? 'text-blue-400' : 'text-gray-400'}`}>
              {hasPreSigned ? t('myPeripheral.yes', 'Yes') : t('myPeripheral.no', 'No')}
            </div>
            <div className="text-xs text-gray-400 mt-1">{t('myPeripheral.preSigned', 'Pre-signed')}</div>
          </div>

          {/* Auto-sign status */}
          {(() => {
            const isAutoSignEnabled = autoSignStatus?.isPermanent || (autoSignStatus?.remainingCycles && autoSignStatus.remainingCycles > 0);
            return (
              <div className={`rounded-xl p-4 text-center ${isAutoSignEnabled ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-gray-500/20 border border-gray-500/30'}`}>
                <div className={`text-2xl font-bold ${isAutoSignEnabled ? 'text-purple-400' : 'text-gray-400'}`}>
                  {autoSignStatus?.isPermanent ? '∞' : isAutoSignEnabled ? `${autoSignStatus?.remainingCycles}` : 'Off'}
                </div>
                <div className="text-xs text-gray-400 mt-1">{t('myPeripheral.autoSign', 'Auto-Sign')}</div>
              </div>
            );
          })()}

          {/* Cycles forwarded */}
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{successfulCycles}</div>
            <div className="text-xs text-gray-400 mt-1">{t('myPeripheral.forwarded', 'Forwarded')}</div>
          </div>

          {/* Cycles received */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{receivedCycles}</div>
            <div className="text-xs text-gray-400 mt-1">{t('myPeripheral.received', 'Received')}</div>
          </div>
        </div>
      </div>

      {/* Cycle History */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <h3 className="text-lg font-bold text-white">{t('myPeripheral.cycleHistory', 'Cycle History')}</h3>

          {/* Filter buttons */}
          <div className="flex gap-2">
            {(['all', 'received', 'forwarded', 'reward'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  historyFilter === filter
                    ? 'bg-purple-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {filter === 'all' ? t('myPeripheral.filterAll', 'All') : filter === 'received' ? t('myPeripheral.filterReceived', 'Received') : filter === 'forwarded' ? t('myPeripheral.filterForwarded', 'Forwarded') : t('myPeripheral.filterRewards', 'Rewards')}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            {t('myPeripheral.loadingHistory', 'Loading history...')}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-400">{t('myPeripheral.noTransactions', 'No transactions found')}</p>
            <p className="text-gray-500 text-sm mt-2">{t('myPeripheral.participateToSee', 'Participate in cycles to see history here.')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredHistory.map((entry, index) => (
              <div
                key={`${entry.txHash}-${index}`}
                className={`bg-white/5 rounded-lg p-4 border ${
                  entry.type === 'received'
                    ? 'border-green-500/20'
                    : entry.type === 'forwarded'
                      ? 'border-blue-500/20'
                      : 'border-purple-500/20'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      entry.type === 'received'
                        ? 'bg-green-500/20'
                        : entry.type === 'forwarded'
                          ? 'bg-blue-500/20'
                          : 'bg-purple-500/20'
                    }`}>
                      <span className="text-xl">
                        {entry.type === 'received' ? '↓' : entry.type === 'forwarded' ? '↑' : '🎁'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {entry.type === 'received' ? t('myPeripheral.receivedLabel', 'Received') : entry.type === 'forwarded' ? t('myPeripheral.forwardedLabel', 'Forwarded') : t('myPeripheral.rewardLabel', 'Reward')}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {entry.type === 'received' && entry.from && (
                          <>{t('myPeripheral.from', 'From')}: {formatAddress(entry.from)}</>
                        )}
                        {entry.type === 'forwarded' && entry.to && (
                          <>{t('myPeripheral.to', 'To')}: {formatAddress(entry.to)}</>
                        )}
                        {entry.type === 'reward' && t('myPeripheral.cycleReward', 'Cycle reward')}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">{formatDate(entry.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${
                      entry.type === 'received'
                        ? 'text-green-400'
                        : entry.type === 'forwarded'
                          ? 'text-blue-400'
                          : 'text-purple-400'
                    }`}>
                      {entry.type === 'forwarded' ? '-' : '+'}{formatEgld(entry.value)} {entry.type === 'reward' ? 'XCIRCLEX' : 'EGLD'}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      entry.status === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.status === 'success' ? t('myPeripheral.success', 'Success') : t('myPeripheral.failed', 'Failed')}
                    </span>
                  </div>
                </div>
                <a
                  href={`${explorerUrl}/transactions/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs mt-3 inline-flex items-center gap-1"
                >
                  {t('myPeripheral.viewTransaction', 'View transaction')} &#8599;
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MyPeripheralTab
