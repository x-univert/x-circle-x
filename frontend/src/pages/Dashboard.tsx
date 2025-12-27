import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CIRCLE_MANAGER_ADDRESS } from '../config/contracts'

interface CircleData {
  id: number
  name: string
  creator: string
  contributionAmount: string
  cycleDuration: number
  maxMembers: number
  memberCount: number
  currentCycle: number
  isActive: boolean
  startTime: number
  endTime: number
}

// Decode base64 to hex
const base64ToHex = (base64: string): string => {
  const binary = atob(base64)
  let hex = ''
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0')
  }
  return hex
}

// Parse circle data from smart contract response
const parseCircleData = (base64Data: string, circleId: number): CircleData | null => {
  try {
    const hex = base64ToHex(base64Data)
    console.log('Parsing circle data, hex length:', hex.length)

    let offset = 0

    // Circle ID (u64 = 8 bytes = 16 hex chars)
    const idHex = hex.slice(offset, offset + 16)
    offset += 16

    // Creator address (32 bytes = 64 hex chars)
    const creatorHex = hex.slice(offset, offset + 64)
    offset += 64

    // Name length (4 bytes = 8 hex chars)
    const nameLengthHex = hex.slice(offset, offset + 8)
    const nameLength = parseInt(nameLengthHex, 16)
    offset += 8

    // Name (variable length)
    const nameHex = hex.slice(offset, offset + nameLength * 2)
    const name = Buffer.from(nameHex, 'hex').toString('utf8')
    offset += nameLength * 2

    // Contribution amount (BigUint - 4 bytes length + value)
    const contribLengthHex = hex.slice(offset, offset + 8)
    const contribLength = parseInt(contribLengthHex, 16)
    offset += 8
    const contribHex = hex.slice(offset, offset + contribLength * 2)
    const contributionWei = BigInt('0x' + contribHex)
    const contributionEgld = Number(contributionWei) / 1e18
    offset += contribLength * 2

    // Cycle duration (u64 = 8 bytes)
    const cycleDurationHex = hex.slice(offset, offset + 16)
    const cycleDuration = parseInt(cycleDurationHex, 16)
    offset += 16

    // Max members (u32 = 4 bytes = 8 hex chars)
    const maxMembersHex = hex.slice(offset, offset + 8)
    const maxMembers = parseInt(maxMembersHex, 16)
    offset += 8

    // Current cycle (u32 = 4 bytes) - comes BEFORE member_count in contract struct
    const currentCycleHex = hex.slice(offset, offset + 8)
    const currentCycle = parseInt(currentCycleHex, 16)
    offset += 8

    // Member count (u32 = 4 bytes)
    const memberCountHex = hex.slice(offset, offset + 8)
    const memberCount = parseInt(memberCountHex, 16)
    offset += 8

    // Is active (bool = 1 byte = 2 hex chars)
    const isActiveHex = hex.slice(offset, offset + 2)
    const isActive = parseInt(isActiveHex, 16) === 1
    offset += 2

    // Start time (u64 = 8 bytes)
    const startTimeHex = hex.slice(offset, offset + 16)
    const startTime = parseInt(startTimeHex, 16)
    offset += 16

    // End time (u64 = 8 bytes)
    const endTimeHex = hex.slice(offset, offset + 16)
    const endTime = parseInt(endTimeHex, 16)

    return {
      id: circleId,
      name,
      creator: 'erd1' + creatorHex.slice(0, 58) + '...',
      contributionAmount: contributionEgld.toFixed(4),
      cycleDuration,
      maxMembers,
      memberCount,
      currentCycle,
      isActive,
      startTime,
      endTime
    }
  } catch (error) {
    console.error('Error parsing circle data:', error)
    return null
  }
}

function Dashboard() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address, account } = useGetAccountInfo()
  const navigate = useNavigate()

  const [circleCount, setCircleCount] = useState<number>(0)
  const [loadingCircles, setLoadingCircles] = useState(true)
  const [circles, setCircles] = useState<CircleData[]>([])

  // Charger le nombre de cercles et les details
  useEffect(() => {
    const fetchCircles = async () => {
      try {
        // 1. Get circle count
        const countResponse = await fetch(
          'https://devnet-api.multiversx.com/vm-values/query',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              scAddress: CIRCLE_MANAGER_ADDRESS,
              funcName: 'getCircleCount',
              args: []
            })
          }
        )
        const countData = await countResponse.json()
        let count = 0
        if (countData.data?.data?.returnData && countData.data.data.returnData.length > 0) {
          const hexValue = atob(countData.data.data.returnData[0])
          for (let i = 0; i < hexValue.length; i++) {
            count = count * 256 + hexValue.charCodeAt(i)
          }
          setCircleCount(count)
        }

        // 2. Fetch each circle's details
        const circlePromises = []
        for (let i = 1; i <= count; i++) {
          // Convert circle ID to hex (padded to at least 2 chars)
          const circleIdHex = i.toString(16).padStart(2, '0')

          circlePromises.push(
            fetch('https://devnet-api.multiversx.com/vm-values/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scAddress: CIRCLE_MANAGER_ADDRESS,
                funcName: 'getCircle',
                args: [circleIdHex]
              })
            }).then(res => res.json()).then(data => {
              if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
                return parseCircleData(data.data.data.returnData[0], i)
              }
              return null
            })
          )
        }

        const circleResults = await Promise.all(circlePromises)
        const validCircles = circleResults.filter((c): c is CircleData => c !== null)
        setCircles(validCircles)

      } catch (error) {
        console.error('Error fetching circles:', error)
      } finally {
        setLoadingCircles(false)
      }
    }

    if (isLoggedIn) {
      fetchCircles()
    }
  }, [isLoggedIn])

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`
  }

  const formatBalance = (balance: string) => {
    if (!balance) return '0'
    const egld = parseFloat(balance) / 10**18
    return egld.toFixed(4)
  }

  const formatDuration = (seconds: number) => {
    if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)} mois`
    if (seconds >= 604800) return `${Math.floor(seconds / 604800)} semaines`
    return `${Math.floor(seconds / 86400)} jours`
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-500/20 text-green-300 border-green-500/30'
      : 'bg-gray-500/20 text-gray-300 border-gray-500/30'
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
            Connectez votre wallet MultiversX pour acceder a votre dashboard
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
              Mon Dashboard
            </h1>
            <p className="text-lg text-gray-300">
              Bienvenue sur xCircle DAO
            </p>
          </div>
          <button
            onClick={() => navigate('/create-circle')}
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
          >
            <span className="text-xl">+</span>
            Creer un Cercle
          </button>
        </div>

        {/* Wallet Info Card */}
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Adresse Wallet</p>
              <p className="text-white font-mono text-lg">{formatAddress(address)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Solde Disponible</p>
              <p className="text-white font-bold text-2xl">{formatBalance(account.balance)} <span className="text-blue-400 text-lg">EGLD</span></p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Cercles Totaux (Devnet)</p>
              <p className="text-white font-bold text-2xl">
                {loadingCircles ? '...' : circleCount}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Reseau</p>
              <span className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-sm px-3 py-1 rounded-full border border-blue-500/30">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Devnet
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128257;</div>
            <div className="text-2xl font-bold text-white">{circles.length}</div>
            <div className="text-gray-400 text-sm">Cercles Disponibles</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128176;</div>
            <div className="text-2xl font-bold text-white">0 EGLD</div>
            <div className="text-gray-400 text-sm">Total Contribue</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#11088;</div>
            <div className="text-2xl font-bold text-white">{circles.filter(c => c.isActive).length}</div>
            <div className="text-gray-400 text-sm">Cercles Actifs</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <div className="text-3xl mb-2">&#128200;</div>
            <div className="text-2xl font-bold text-white">{circles.reduce((sum, c) => sum + c.memberCount, 0)}</div>
            <div className="text-gray-400 text-sm">Total Membres</div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Cercles sur la Blockchain */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Cercles sur la Blockchain</h2>
              <button
                onClick={() => navigate('/circles')}
                className="text-blue-400 hover:text-blue-300 text-sm transition"
              >
                Voir tout &#8594;
              </button>
            </div>

            {loadingCircles ? (
              <div className="text-center py-12">
                <div className="animate-spin text-4xl mb-4">&#8987;</div>
                <p className="text-gray-300">Chargement des cercles...</p>
              </div>
            ) : circles.length > 0 ? (
              <div className="space-y-4">
                {circles.map((circle) => (
                  <div
                    key={circle.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition cursor-pointer border border-white/5 hover:border-white/20"
                    onClick={() => navigate(`/circle/${circle.id}`)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{circle.name}</h3>
                        <span className="text-xs text-gray-400">ID: {circle.id}</span>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full border ${getStatusColor(circle.isActive)}`}>
                        {circle.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 text-xs">Contribution</p>
                        <p className="text-white font-semibold">{circle.contributionAmount} EGLD</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Membres</p>
                        <p className="text-white font-semibold">{circle.memberCount}/{circle.maxMembers}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Cycle</p>
                        <p className="text-white font-semibold">{formatDuration(circle.cycleDuration)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">Tour actuel</p>
                        <p className="text-white font-semibold">{circle.currentCycle}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">&#128269;</div>
                <p className="text-gray-300 mb-4">Aucun cercle sur la blockchain</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/create-circle')}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
                  >
                    Creer le premier cercle
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Activite Recente */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Activite Recente</h2>
            </div>

            <div className="text-center py-12">
              <div className="text-5xl mb-4">&#128232;</div>
              <p className="text-gray-300 mb-2">Aucune activite recente</p>
              <p className="text-gray-500 text-sm">
                Vos contributions, votes et distributions apparaitront ici
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate('/create-circle')}
            className="bg-gradient-to-r from-green-600/80 to-green-700/80 hover:from-green-600 hover:to-green-700 text-white font-semibold py-5 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 border border-green-500/30"
          >
            <span className="text-2xl">+</span>
            <span>Creer un Cercle</span>
          </button>

          <button
            onClick={() => navigate('/circles')}
            className="bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-5 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 border border-blue-500/30"
          >
            <span className="text-2xl">&#128269;</span>
            <span>Rejoindre un Cercle</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-600/80 to-purple-700/80 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-5 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 border border-purple-500/30"
          >
            <span className="text-2xl">&#127968;</span>
            <span>Accueil</span>
          </button>
        </div>

        {/* Smart Contract Info */}
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">Smart Contract CircleManager</p>
              <p className="text-white font-mono text-xs md:text-sm break-all">{CIRCLE_MANAGER_ADDRESS}</p>
            </div>
            <a
              href={`https://devnet-explorer.multiversx.com/accounts/${CIRCLE_MANAGER_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
            >
              Voir sur Explorer &#8599;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
