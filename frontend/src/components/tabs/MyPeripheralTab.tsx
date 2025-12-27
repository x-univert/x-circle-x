import { useState, useEffect } from 'react'
import { useCircleOfLife } from '../../hooks/useCircleOfLife'

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
  const {
    myContract,
    isActive,
    hasPreSigned,
    hasSignedThisCycle,
    cycleStats,
    autoSignStatus,
    pendingRewards,
    canClaim,
    peripheralBalances
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
        // Fetch transactions for this peripheral SC
        const response = await fetch(
          `https://devnet-api.multiversx.com/accounts/${myContract}/transactions?size=100&withScResults=true`
        )
        const txs: any[] = await response.json()

        const history: CycleHistoryEntry[] = []

        for (const tx of txs) {
          // Received EGLD (from previous SC in the cycle)
          if (tx.receiver === myContract && tx.value && parseFloat(tx.value) > 0) {
            // Check if it's from another SC (cycle transfer) or a reward
            const isReward = tx.function === 'claimRewards' || tx.data?.includes('reward')

            history.push({
              txHash: tx.txHash,
              timestamp: tx.timestamp,
              type: isReward ? 'reward' : 'received',
              value: tx.value,
              from: tx.sender,
              status: tx.status
            })
          }

          // Forwarded EGLD (to next SC in the cycle)
          if (tx.sender === myContract && tx.value && parseFloat(tx.value) > 0 && tx.receiver !== myContract) {
            history.push({
              txHash: tx.txHash,
              timestamp: tx.timestamp,
              type: 'forwarded',
              value: tx.value,
              to: tx.receiver,
              status: tx.status
            })
          }

          // Also check SC results for internal transfers
          if (tx.results) {
            for (const result of tx.results) {
              if (result.receiver === myContract && result.value && parseFloat(result.value) > 0) {
                history.push({
                  txHash: tx.txHash,
                  timestamp: tx.timestamp,
                  type: 'received',
                  value: result.value,
                  from: result.sender,
                  status: 'success'
                })
              }
            }
          }
        }

        // Sort by timestamp descending
        history.sort((a, b) => b.timestamp - a.timestamp)

        // Remove duplicates based on txHash + type
        const seen = new Set<string>()
        const uniqueHistory = history.filter(entry => {
          const key = `${entry.txHash}-${entry.type}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })

        setCycleHistory(uniqueHistory.slice(0, 50))
      } catch (error) {
        console.error('Error fetching cycle history:', error)
      } finally {
        setLoadingHistory(false)
      }
    }

    fetchCycleHistory()
  }, [myContract])

  // Get my SC balance
  const myBalance = myContract && peripheralBalances ? peripheralBalances[myContract] : null

  // Filter history
  const filteredHistory = historyFilter === 'all'
    ? cycleHistory
    : cycleHistory.filter(entry => entry.type === historyFilter)

  // Count stats from history
  const successfulCycles = cycleHistory.filter(e => e.type === 'forwarded' && e.status === 'success').length
  const receivedCycles = cycleHistory.filter(e => e.type === 'received' && e.status === 'success').length

  if (!myContract) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">📄</div>
        <h2 className="text-2xl font-bold text-white mb-4">
          Vous n'avez pas encore de Smart Contract
        </h2>
        <p className="text-gray-300 mb-6">
          Rejoignez le Cercle de Vie pour creer votre smart contract peripherique et participer aux cycles quotidiens.
        </p>
        <p className="text-gray-400 text-sm">
          Allez dans l'onglet "Cercle de Vie" pour rejoindre le cercle.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* SC Info Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📄</span> Mon Smart Contract Peripherique
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Address */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Adresse du Contrat</p>
            <p className="text-white font-mono text-sm break-all">{myContract}</p>
            <a
              href={`https://devnet-explorer.multiversx.com/accounts/${myContract}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1"
            >
              Voir sur Explorer &#8599;
            </a>
          </div>

          {/* Balance */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-2">Balance du SC</p>
            <p className="text-2xl font-bold text-white">
              {myBalance ? parseFloat(myBalance).toFixed(4) : '0'} <span className="text-gray-400 text-lg">EGLD</span>
            </p>
            {pendingRewards && parseFloat(pendingRewards) > 0 && (
              <p className="text-purple-400 text-sm mt-2">
                + {(parseFloat(pendingRewards) / 1e18).toFixed(0)} XCIRCLEX en attente
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4">Statut Actuel</h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Active status */}
          <div className={`rounded-xl p-4 text-center ${isActive ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'}`}>
            <div className={`text-2xl font-bold ${isActive ? 'text-green-400' : 'text-red-400'}`}>
              {isActive ? 'Actif' : 'Inactif'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Statut</div>
          </div>

          {/* Pre-signed */}
          <div className={`rounded-xl p-4 text-center ${hasPreSigned ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-gray-500/20 border border-gray-500/30'}`}>
            <div className={`text-2xl font-bold ${hasPreSigned ? 'text-blue-400' : 'text-gray-400'}`}>
              {hasPreSigned ? 'Oui' : 'Non'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Pre-signe</div>
          </div>

          {/* Auto-sign status */}
          <div className={`rounded-xl p-4 text-center ${autoSignStatus?.enabled ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-gray-500/20 border border-gray-500/30'}`}>
            <div className={`text-2xl font-bold ${autoSignStatus?.enabled ? 'text-purple-400' : 'text-gray-400'}`}>
              {autoSignStatus?.enabled ? `${autoSignStatus.remainingCycles}` : 'Off'}
            </div>
            <div className="text-xs text-gray-400 mt-1">Auto-Sign</div>
          </div>

          {/* Cycles forwarded */}
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{successfulCycles}</div>
            <div className="text-xs text-gray-400 mt-1">Transferes</div>
          </div>

          {/* Cycles received */}
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{receivedCycles}</div>
            <div className="text-xs text-gray-400 mt-1">Recus</div>
          </div>
        </div>
      </div>

      {/* Cycle History */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
          <h3 className="text-lg font-bold text-white">Historique des Cycles</h3>

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
                {filter === 'all' ? 'Tout' : filter === 'received' ? 'Recus' : filter === 'forwarded' ? 'Transferes' : 'Rewards'}
              </button>
            ))}
          </div>
        </div>

        {loadingHistory ? (
          <div className="text-center py-8 text-gray-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            Chargement de l'historique...
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-gray-400">Aucune transaction trouvee</p>
            <p className="text-gray-500 text-sm mt-2">Participez aux cycles pour voir l'historique ici.</p>
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
                        {entry.type === 'received' ? 'Recu' : entry.type === 'forwarded' ? 'Transfere' : 'Recompense'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {entry.type === 'received' && entry.from && (
                          <>De: {formatAddress(entry.from)}</>
                        )}
                        {entry.type === 'forwarded' && entry.to && (
                          <>Vers: {formatAddress(entry.to)}</>
                        )}
                        {entry.type === 'reward' && 'Recompense de cycle'}
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
                      {entry.type === 'forwarded' ? '-' : '+'}{formatEgld(entry.value)} EGLD
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      entry.status === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {entry.status === 'success' ? 'Succes' : 'Echec'}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://devnet-explorer.multiversx.com/transactions/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-xs mt-3 inline-flex items-center gap-1"
                >
                  Voir la transaction &#8599;
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
