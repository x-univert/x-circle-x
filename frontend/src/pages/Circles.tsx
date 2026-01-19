import { useGetIsLoggedIn } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { CIRCLE_MANAGER_ADDRESS } from '../config/contracts'
import { multiversxApiUrl, explorerUrl } from '../config'
import * as circleService from '../services/circleService'

interface CircleData {
  id: number
  name: string
  creator: string
  contributionAmount: string
  cycleDuration: number
  maxMembers: number
  memberCount: number
  realMemberCount: number // Actual member count from getCircleMembers
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

    let offset = 0

    // Circle ID (u64 = 8 bytes = 16 hex chars)
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
    let name = ''
    for (let i = 0; i < nameHex.length; i += 2) {
      name += String.fromCharCode(parseInt(nameHex.substr(i, 2), 16))
    }
    offset += nameLength * 2

    // Contribution amount (BigUint - 4 bytes length + value)
    const contribLengthHex = hex.slice(offset, offset + 8)
    const contribLength = parseInt(contribLengthHex, 16)
    offset += 8
    const contribHex = hex.slice(offset, offset + contribLength * 2)
    const contributionWei = BigInt('0x' + (contribHex || '0'))
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

    // Current cycle (u32 = 4 bytes) - comes before member_count in contract struct
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
      creator: creatorHex,
      contributionAmount: contributionEgld.toFixed(4),
      cycleDuration,
      maxMembers,
      memberCount,
      realMemberCount: 0, // Will be fetched separately
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

function Circles() {
  const isLoggedIn = useGetIsLoggedIn()
  const navigate = useNavigate()

  const [circles, setCircles] = useState<CircleData[]>([])
  const [loading, setLoading] = useState(true)
  const [circleCount, setCircleCount] = useState(0)

  // Charger les cercles depuis la blockchain
  useEffect(() => {
    const fetchCircles = async () => {
      try {
        // 1. Get circle count
        const countResponse = await fetch(
          `${multiversxApiUrl}/vm-values/query`,
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
          const circleIdHex = i.toString(16).padStart(2, '0')

          circlePromises.push(
            fetch(`${multiversxApiUrl}/vm-values/query`, {
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

        // Fetch real member count for each circle
        const circlesWithMembers = await Promise.all(
          validCircles.map(async (circle) => {
            try {
              const members = await circleService.getCircleMembers(circle.id)
              return { ...circle, realMemberCount: members.length }
            } catch {
              return { ...circle, realMemberCount: circle.memberCount }
            }
          })
        )

        setCircles(circlesWithMembers)

      } catch (error) {
        console.error('Error fetching circles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCircles()
  }, [])

  const formatDuration = (seconds: number) => {
    if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)} mois`
    if (seconds >= 604800) return `${Math.floor(seconds / 604800)} semaines`
    return `${Math.floor(seconds / 86400)} jours`
  }

  const getStatusColor = (isActive: boolean, realMemberCount: number, maxMembers: number) => {
    if (!isActive) return 'bg-gray-500/20 text-gray-300'
    if (realMemberCount < maxMembers) return 'bg-green-500/20 text-green-300'
    return 'bg-blue-500/20 text-blue-300'
  }

  const getStatus = (isActive: boolean, realMemberCount: number, maxMembers: number) => {
    if (!isActive) return 'Termine'
    if (realMemberCount < maxMembers) return 'Recrutement'
    return 'En cours'
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md">
          <h2 className="text-2xl font-semibold text-white mb-4 text-center">
            Connexion Requise
          </h2>
          <p className="text-gray-200 mb-6 text-center">
            Vous devez vous connecter pour voir les cercles disponibles
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Retour a l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
          <div>
            <h1 className="text-5xl font-bold text-white mb-2">
              Cercles Disponibles
            </h1>
            <p className="text-xl text-gray-200">
              {circleCount} cercle{circleCount > 1 ? 's' : ''} sur la blockchain
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              Mon Dashboard
            </button>
            <button
              onClick={() => navigate('/create-circle')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
            >
              <span>+</span>
              Creer un Cercle
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-2">&#128257;</div>
            <div className="text-3xl font-bold text-white">{circles.length}</div>
            <div className="text-gray-300">Cercles sur Blockchain</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-2">&#128101;</div>
            <div className="text-3xl font-bold text-white">
              {circles.reduce((sum, c) => sum + c.realMemberCount, 0)}
            </div>
            <div className="text-gray-300">Membres Total</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-2">&#11088;</div>
            <div className="text-3xl font-bold text-white">
              {circles.filter(c => c.isActive).length}
            </div>
            <div className="text-gray-300">Cercles Actifs</div>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-6xl mb-4">&#8987;</div>
            <p className="text-gray-300 text-xl">Chargement des cercles depuis la blockchain...</p>
          </div>
        ) : circles.length > 0 ? (
          /* Circles Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {circles.map((circle) => (
              <div
                key={circle.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl hover:bg-white/15 transition cursor-pointer border border-white/10 hover:border-white/20"
                onClick={() => navigate(`/circle/${circle.id}`)}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white">{circle.name}</h3>
                    <p className="text-xs text-gray-400">ID: {circle.id}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${getStatusColor(circle.isActive, circle.realMemberCount, circle.maxMembers)}`}>
                    {getStatus(circle.isActive, circle.realMemberCount, circle.maxMembers)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Contribution</span>
                    <span className="text-white font-semibold">{circle.contributionAmount} EGLD</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Frequence</span>
                    <span className="text-white font-semibold">{formatDuration(circle.cycleDuration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Membres</span>
                    <span className="text-white font-semibold">
                      {circle.realMemberCount}/{circle.maxMembers}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cycle actuel</span>
                    <span className="text-white font-semibold">{circle.currentCycle}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(circle.realMemberCount / circle.maxMembers) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((circle.realMemberCount / circle.maxMembers) * 100)}% des places occupees
                  </p>
                </div>

                {/* Action Button */}
                <button
                  className={`w-full py-3 px-4 rounded-lg font-semibold transition duration-200 ${
                    circle.isActive && circle.realMemberCount < circle.maxMembers
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : circle.isActive
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-600 cursor-not-allowed text-gray-300'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/circle/${circle.id}`)
                  }}
                >
                  {circle.isActive && circle.realMemberCount < circle.maxMembers
                    ? 'Rejoindre'
                    : circle.isActive
                    ? 'Voir Details'
                    : 'Termine'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="text-6xl mb-4">&#128269;</div>
            <h3 className="text-2xl font-semibold text-white mb-2">Aucun cercle disponible</h3>
            <p className="text-gray-300 mb-6">Soyez le premier a creer un cercle sur la blockchain !</p>
            <button
              onClick={() => navigate('/create-circle')}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition duration-200"
            >
              Creer un Cercle
            </button>
          </div>
        )}

        {/* Back Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-300 hover:text-white transition"
          >
            &#8592; Retour a l'accueil
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
              href={`${explorerUrl}/accounts/${CIRCLE_MANAGER_ADDRESS}`}
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

export default Circles
