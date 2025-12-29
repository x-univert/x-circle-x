import { useState, useEffect } from 'react'
import { useGetAccountInfo, useGetIsLoggedIn } from 'lib'
import { XCircleLogo } from '../Logo/Logo'
import {
  XCIRCLEX_TOKEN_ID,
  XCIRCLEX_DECIMALS,
  CIRCLE_OF_LIFE_ADDRESS,
  STAKING_CONTRACT_ADDRESS,
  VESTING_CONTRACT_ADDRESS,
  DAO_CONTRACT_ADDRESS,
  LIQUIDITY_POOL_ADDRESS,
  NETWORK_CONFIG
} from '../../config/contracts'

interface TokenInfo {
  identifier: string
  name: string
  ticker: string
  owner: string
  supply: string
  circulatingSupply: string
  initialMinted: string
  decimals: number
  price?: number
  marketCap?: number
  burnt?: string
}

interface AllocationInfo {
  name: string
  address: string
  balance: string
  percentage: number
  color: string
  icon: string
}

export function TokenTab() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [userBalance, setUserBalance] = useState<string>('0')
  const [allocations, setAllocations] = useState<AllocationInfo[]>([])
  const [holdersCount, setHoldersCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Total initial supply (PI)
  const TOTAL_SUPPLY = 314159265.358979323846264338

  const formatNumber = (value: string | number, decimals = 18): string => {
    const num = typeof value === 'string' ? parseFloat(value) / Math.pow(10, decimals) : value
    return num.toLocaleString('fr-FR', { maximumFractionDigits: 0 })
  }

  const formatAddress = (addr: string): string => {
    if (!addr) return ''
    return `${addr.substring(0, 12)}...${addr.substring(addr.length - 6)}`
  }

  // Fetch token info and balances
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch token info
        const tokenResponse = await fetch(
          `${NETWORK_CONFIG.apiAddress}/tokens/${XCIRCLEX_TOKEN_ID}`
        )
        if (!tokenResponse.ok) throw new Error('Failed to fetch token info')
        const token = await tokenResponse.json()

        setTokenInfo({
          identifier: token.identifier,
          name: token.name,
          ticker: token.ticker,
          owner: token.owner,
          supply: token.supply,
          circulatingSupply: token.circulatingSupply || token.supply,
          initialMinted: token.initialMinted || '314159265358979323846264338',
          decimals: token.decimals || XCIRCLEX_DECIMALS,
          price: token.price,
          marketCap: token.marketCap,
          burnt: token.burnt
        })

        // Fetch user balance if logged in
        if (isLoggedIn && address) {
          try {
            const balanceResponse = await fetch(
              `${NETWORK_CONFIG.apiAddress}/accounts/${address}/tokens/${XCIRCLEX_TOKEN_ID}`
            )
            if (balanceResponse.ok) {
              const balanceData = await balanceResponse.json()
              setUserBalance(balanceData.balance || '0')
            }
          } catch {
            setUserBalance('0')
          }
        }

        // Fetch holders count
        try {
          const holdersResponse = await fetch(
            `${NETWORK_CONFIG.apiAddress}/tokens/${XCIRCLEX_TOKEN_ID}/accounts/count`
          )
          if (holdersResponse.ok) {
            const count = await holdersResponse.json()
            setHoldersCount(count)
          }
        } catch {
          console.error('Failed to fetch holders count')
        }

        // Fetch allocation balances
        const allocationAddresses = [
          {
            name: 'Circle de Vie (SC0)',
            address: CIRCLE_OF_LIFE_ADDRESS,
            color: 'from-purple-500 to-pink-500',
            icon: '🌀'
          },
          {
            name: 'Staking Pool',
            address: STAKING_CONTRACT_ADDRESS,
            color: 'from-blue-500 to-cyan-500',
            icon: '📈'
          },
          {
            name: 'Vesting (Team/Marketing)',
            address: VESTING_CONTRACT_ADDRESS,
            color: 'from-green-500 to-emerald-500',
            icon: '🔒'
          },
          {
            name: 'DAO Treasury',
            address: DAO_CONTRACT_ADDRESS,
            color: 'from-amber-500 to-orange-500',
            icon: '🏛️'
          },
          // Liquidity Pool (si configure)
          ...(LIQUIDITY_POOL_ADDRESS ? [{
            name: 'Liquidity Pool (DEX)',
            address: LIQUIDITY_POOL_ADDRESS,
            color: 'from-pink-500 to-rose-500',
            icon: '💧'
          }] : [])
        ]

        const allocationPromises = allocationAddresses.map(async (alloc) => {
          try {
            const response = await fetch(
              `${NETWORK_CONFIG.apiAddress}/accounts/${alloc.address}/tokens/${XCIRCLEX_TOKEN_ID}`
            )
            if (response.ok) {
              const data = await response.json()
              const balance = parseFloat(data.balance || '0') / Math.pow(10, XCIRCLEX_DECIMALS)
              return {
                ...alloc,
                balance: data.balance || '0',
                percentage: (balance / TOTAL_SUPPLY) * 100
              }
            }
            return {
              ...alloc,
              balance: '0',
              percentage: 0
            }
          } catch {
            return {
              ...alloc,
              balance: '0',
              percentage: 0
            }
          }
        })

        const allocationResults = await Promise.all(allocationPromises)
        setAllocations(allocationResults)

      } catch (err: any) {
        console.error('Error fetching token data:', err)
        setError(err.message || 'Erreur lors du chargement des donnees')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoggedIn, address])

  // Calculate total allocated percentage
  const totalAllocatedPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0)

  if (loading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="animate-spin text-6xl mb-4">🪙</div>
        <p className="text-gray-300">Chargement des donnees du token...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-red-400 mb-4">Erreur</h2>
        <p className="text-gray-300">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Token Header Card */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-purple-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center shadow-lg">
              <XCircleLogo size={64} animate={true} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{tokenInfo?.name || 'XCIRCLEX'}</h1>
              <p className="text-gray-400 font-mono">{tokenInfo?.identifier || XCIRCLEX_TOKEN_ID}</p>
            </div>
          </div>
          <a
            href={`${NETWORK_CONFIG.explorerAddress}/tokens/${XCIRCLEX_TOKEN_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            Voir sur Explorer &#8599;
          </a>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* User Balance */}
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Votre Balance</p>
          <p className="text-2xl font-bold text-green-400">
            {isLoggedIn ? formatNumber(userBalance) : '-'}
          </p>
          <p className="text-gray-500 text-xs">XCIRCLEX</p>
          {isLoggedIn && tokenInfo?.price && parseFloat(userBalance) > 0 && (
            <p className="text-green-300 text-sm mt-1 font-semibold">
              ≈ ${((parseFloat(userBalance) / Math.pow(10, XCIRCLEX_DECIMALS)) * tokenInfo.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </p>
          )}
        </div>

        {/* Price */}
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Prix</p>
          <p className="text-2xl font-bold text-blue-400">
            {tokenInfo?.price ? `$${tokenInfo.price.toFixed(6)}` : 'N/A'}
          </p>
          <p className="text-gray-500 text-xs mt-1">USD</p>
        </div>

        {/* Market Cap */}
        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Market Cap</p>
          <p className="text-2xl font-bold text-yellow-400">
            {tokenInfo?.marketCap
              ? tokenInfo.marketCap >= 1000000
                ? `$${(tokenInfo.marketCap / 1000000).toFixed(2)}M`
                : tokenInfo.marketCap >= 1000
                  ? `$${(tokenInfo.marketCap / 1000).toFixed(2)}K`
                  : `$${tokenInfo.marketCap.toFixed(2)}`
              : tokenInfo?.price
                ? `$${((tokenInfo.price * TOTAL_SUPPLY) / 1000000).toFixed(2)}M`
                : 'N/A'}
          </p>
          <p className="text-gray-500 text-xs mt-1">USD</p>
        </div>

        {/* Holders */}
        <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Holders</p>
          <p className="text-2xl font-bold text-pink-400">
            {holdersCount > 0 ? holdersCount.toLocaleString('fr-FR') : '-'}
          </p>
          <p className="text-gray-500 text-xs mt-1">Detenteurs</p>
        </div>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Supply */}
        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Supply Totale</p>
          <p className="text-2xl font-bold text-purple-400">
            {tokenInfo?.initialMinted ? formatNumber(tokenInfo.initialMinted) : '-'}
          </p>
          <p className="text-gray-500 text-xs mt-1">= PI (314,159,265)</p>
        </div>

        {/* Circulating Supply */}
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Supply Circulante</p>
          <p className="text-2xl font-bold text-amber-400">
            {tokenInfo?.circulatingSupply ? formatNumber(tokenInfo.circulatingSupply) : '-'}
          </p>
          <p className="text-gray-500 text-xs mt-1">XCIRCLEX</p>
        </div>

        {/* Tokens Burnt */}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Tokens Brules</p>
          <p className="text-2xl font-bold text-red-400">
            {tokenInfo?.burnt && parseFloat(tokenInfo.burnt) > 0
              ? formatNumber(tokenInfo.burnt)
              : '0'}
          </p>
          <p className="text-gray-500 text-xs mt-1">XCIRCLEX</p>
        </div>

        {/* Fully Diluted Valuation */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">FDV</p>
          <p className="text-2xl font-bold text-indigo-400">
            {tokenInfo?.price
              ? `$${((tokenInfo.price * TOTAL_SUPPLY) / 1000000).toFixed(2)}M`
              : 'N/A'}
          </p>
          <p className="text-gray-500 text-xs mt-1">Fully Diluted</p>
        </div>
      </div>

      {/* Token Distribution */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>📊</span> Distribution du Token
        </h2>

        {/* Total Supply Display */}
        <div className="mb-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl">
                🥧
              </div>
              <div>
                <p className="text-gray-400 text-sm">Supply Totale (PI)</p>
                <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {tokenInfo?.initialMinted
                    ? formatNumber(tokenInfo.initialMinted)
                    : TOTAL_SUPPLY.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XCIRCLEX
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Valeur exacte</p>
              <p className="text-white font-mono text-sm">314,159,265.358979...</p>
              <p className="text-purple-400 text-xs">= nombre PI</p>
            </div>
          </div>
        </div>

        {/* Visual Distribution Bar */}
        <div className="mb-6">
          <div className="h-6 rounded-full bg-white/10 overflow-hidden flex">
            {allocations.map((alloc, index) => (
              <div
                key={alloc.address}
                className={`h-full bg-gradient-to-r ${alloc.color}`}
                style={{ width: `${Math.max(alloc.percentage, 0.5)}%` }}
                title={`${alloc.name}: ${alloc.percentage.toFixed(2)}%`}
              />
            ))}
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
              style={{ width: `${Math.max(100 - totalAllocatedPercentage, 0)}%` }}
              title={`Autres Detenteurs: ${(100 - totalAllocatedPercentage).toFixed(2)}%`}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Allocation Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allocations.map((alloc) => (
            <div
              key={alloc.address}
              className={`bg-gradient-to-br ${alloc.color.replace('from-', 'from-').replace('to-', 'to-')}/10 border border-white/10 rounded-xl p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-gradient-to-br ${alloc.color} rounded-lg flex items-center justify-center text-xl`}>
                    {alloc.icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{alloc.name}</p>
                    <p className="text-gray-400 text-xs font-mono">{formatAddress(alloc.address)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{alloc.percentage.toFixed(2)}%</p>
                  <p className="text-gray-400 text-xs">{formatNumber(alloc.balance)} XCIRCLEX</p>
                </div>
              </div>
              <a
                href={`${NETWORK_CONFIG.explorerAddress}/accounts/${alloc.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs mt-3 inline-flex items-center gap-1"
              >
                Voir le contrat &#8599;
              </a>
            </div>
          ))}

          {/* Other Holders - Highlighted */}
          <div className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center text-xl">
                  👥
                </div>
                <div>
                  <p className="text-white font-semibold">Autres Detenteurs</p>
                  <p className="text-gray-400 text-xs">Wallets individuels</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-cyan-400">{(100 - totalAllocatedPercentage).toFixed(2)}%</p>
                <p className="text-gray-400 text-xs">
                  ~{formatNumber(((TOTAL_SUPPLY * (100 - totalAllocatedPercentage) / 100) * Math.pow(10, XCIRCLEX_DECIMALS)).toFixed(0), XCIRCLEX_DECIMALS)} XCIRCLEX
                </p>
              </div>
            </div>
            {/* Total amount in tokens */}
            <div className="mt-3 pt-3 border-t border-cyan-500/20">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Tokens en circulation libre</span>
                <span className="text-cyan-300 font-mono text-sm">
                  {((TOTAL_SUPPLY * (100 - totalAllocatedPercentage) / 100)).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} XCIRCLEX
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-gray-400 text-xs mb-1">Contracts (SC)</p>
              <p className="text-purple-400 font-bold text-lg">{totalAllocatedPercentage.toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Wallets Individuels</p>
              <p className="text-cyan-400 font-bold text-lg">{(100 - totalAllocatedPercentage).toFixed(2)}%</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Supply Totale</p>
              <p className="text-white font-bold text-lg">314.16M</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Holders</p>
              <p className="text-pink-400 font-bold text-lg">{holdersCount > 0 ? holdersCount : '-'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs mb-1">Decimales</p>
              <p className="text-white font-bold text-lg">{XCIRCLEX_DECIMALS}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Token Info */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>ℹ️</span> Informations du Token
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Proprietaire (Issuer)</p>
            <p className="text-white font-mono text-xs break-all">{tokenInfo?.owner}</p>
            {tokenInfo?.owner && (
              <a
                href={`${NETWORK_CONFIG.explorerAddress}/accounts/${tokenInfo.owner}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs mt-2 inline-flex items-center gap-1"
              >
                Voir sur Explorer &#8599;
              </a>
            )}
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Decimales</p>
            <p className="text-2xl font-bold text-white">{tokenInfo?.decimals || XCIRCLEX_DECIMALS}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Ticker</p>
            <p className="text-2xl font-bold text-white">{tokenInfo?.ticker || 'XCIRCLEX'}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">Reseau</p>
            <p className="text-2xl font-bold text-white">MultiversX Devnet</p>
          </div>
        </div>
      </div>

      {/* Token Utility */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>⚡</span> Utilite du Token
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
            <div className="text-3xl mb-2">🌀</div>
            <h3 className="text-white font-semibold mb-2">Recompenses de Cycle</h3>
            <p className="text-gray-400 text-sm">
              Gagnez des XCIRCLEX en participant aux cycles quotidiens du Cercle de Vie.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="text-3xl mb-2">📈</div>
            <h3 className="text-white font-semibold mb-2">Staking</h3>
            <p className="text-gray-400 text-sm">
              Stakez vos tokens pour gagner jusqu'a 42% APY avec 12 niveaux de verrouillage.
            </p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="text-3xl mb-2">🏛️</div>
            <h3 className="text-white font-semibold mb-2">Gouvernance DAO</h3>
            <p className="text-gray-400 text-sm">
              Votez sur les propositions et participez a la gouvernance du protocole.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TokenTab
