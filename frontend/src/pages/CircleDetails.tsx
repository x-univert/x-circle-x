import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Address } from '@multiversx/sdk-core'
import { CIRCLE_MANAGER_ADDRESS } from '../config/contracts'
import * as circleService from '../services/circleService'
import { TransactionModal, TransactionStep } from '../components/TransactionModal'

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

// Convert hex to bech32 address
const hexToBech32 = (hex: string): string => {
  try {
    // SDK v15: use Address.newFromHex()
    const addr = Address.newFromHex(hex)
    return addr.toBech32()
  } catch (e) {
    console.error('Error converting hex to bech32:', e)
    // Fallback: return truncated hex
    return `erd1${hex.slice(0, 8)}...${hex.slice(-8)}`
  }
}

function CircleDetails() {
  const { id } = useParams<{ id: string }>()
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const navigate = useNavigate()

  const [circleData, setCircleData] = useState<CircleData | null>(null)
  const [members, setMembers] = useState<string[]>([])
  const [pendingRequests, setPendingRequests] = useState<string[]>([])
  const [pendingRequestsNotVoted, setPendingRequestsNotVoted] = useState<string[]>([])
  const [contributors, setContributors] = useState<string[]>([])
  const [hasUserContributed, setHasUserContributed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showContributeModal, setShowContributeModal] = useState(false)
  const [contributeModalStep, setContributeModalStep] = useState<TransactionStep>('confirm')
  const [contributeTransactionHash, setContributeTransactionHash] = useState<string>('')
  const [showDistributeModal, setShowDistributeModal] = useState(false)
  const [distributeModalStep, setDistributeModalStep] = useState<TransactionStep>('confirm')
  const [distributeTransactionHash, setDistributeTransactionHash] = useState<string>('')
  const [showForceDistributeModal, setShowForceDistributeModal] = useState(false)
  const [forceDistributeModalStep, setForceDistributeModalStep] = useState<TransactionStep>('confirm')
  const [forceDistributeTransactionHash, setForceDistributeTransactionHash] = useState<string>('')
  const [isCreator, setIsCreator] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fonction pour recharger les donnees du cercle
  const fetchCircleData = async (showLoading = true) => {
    if (!id) return

    if (showLoading) setLoading(true)

    try {
      const circleIdHex = parseInt(id).toString(16).padStart(2, '0')

      // Fetch circle data
      const response = await fetch('https://devnet-api.multiversx.com/vm-values/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCircle',
          args: [circleIdHex]
        })
      })

      const data = await response.json()

      if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
        const parsed = parseCircleData(data.data.data.returnData[0], parseInt(id))
        if (parsed) {
          setCircleData(parsed)
          // Vérifier si l'utilisateur est le créateur
          if (address) {
            const creatorBech32 = hexToBech32(parsed.creator)
            setIsCreator(creatorBech32 === address)
          }
        } else {
          setError('Impossible de parser les donnees du cercle')
        }
      } else {
        setError('Cercle non trouve')
      }

      // Fetch members
      const membersData = await circleService.getCircleMembers(parseInt(id))
      setMembers(membersData)

      // Check if current user is a member
      if (address) {
        const memberStatus = await circleService.isMember(parseInt(id), address)
        setIsMember(memberStatus)

        // Check if user has contributed for current cycle
        try {
          const contributed = await circleService.hasContributed(parseInt(id), address)
          setHasUserContributed(contributed)
        } catch (e) {
          console.log('hasContributed not available yet')
        }
      }

      // Fetch contributors for current cycle
      try {
        const cycleContributors = await circleService.getCycleContributors(parseInt(id))
        setContributors(cycleContributors)
      } catch (e) {
        console.log('getCycleContributors not available yet')
      }

      // Fetch pending requests and filter out those already voted on
      try {
        const pendingData = await circleService.getPendingRequests(parseInt(id))
        setPendingRequests(pendingData)

        // Filter pending requests to only show those the user hasn't voted on yet
        if (address && pendingData.length > 0) {
          const notVotedRequests: string[] = []
          for (const candidate of pendingData) {
            const voted = await circleService.hasVoted(parseInt(id), candidate, address)
            if (!voted) {
              notVotedRequests.push(candidate)
            }
          }
          setPendingRequestsNotVoted(notVotedRequests)
        } else {
          setPendingRequestsNotVoted(pendingData)
        }
      } catch (e) {
        console.log('getPendingRequests not available')
      }

    } catch (err) {
      console.error('Error fetching circle:', err)
      setError('Erreur lors du chargement du cercle')
    } finally {
      setLoading(false)
    }
  }

  // Charger les donnees du cercle au demarrage
  useEffect(() => {
    fetchCircleData()
  }, [id, address, refreshKey])

  const formatDuration = (seconds: number) => {
    if (seconds >= 2592000) return `${Math.floor(seconds / 2592000)} mois`
    if (seconds >= 604800) return `${Math.floor(seconds / 604800)} semaines`
    return `${Math.floor(seconds / 86400)} jours`
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    if (addr.length > 20) {
      return `${addr.slice(0, 10)}...${addr.slice(-6)}`
    }
    return addr
  }

  const handleJoinRequest = async () => {
    if (!circleData || !address) return

    setIsSubmitting(true)
    try {
      await circleService.requestMembership(circleData.id, address)
      setShowJoinModal(false)
      // Rafraichir apres quelques secondes
      setTimeout(() => {
        fetchCircleData(false)
      }, 5000)
    } catch (err) {
      console.error('Error requesting membership:', err)
      alert('Erreur lors de la demande d\'adhesion')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleContributeConfirm = async () => {
    if (!circleData || !address) return

    setContributeModalStep('pending')
    try {
      const result = await circleService.contribute(circleData.id, circleData.contributionAmount, address)

      if (result.transactionHash) {
        setContributeTransactionHash(result.transactionHash)
        setContributeModalStep('processing')
      } else {
        // Transaction envoyee mais pas de hash recupere
        setContributeModalStep('processing')
      }
    } catch (err) {
      console.error('Error contributing:', err)
      setContributeModalStep('error')
    }
  }

  const handleContributeClose = () => {
    setShowContributeModal(false)
    // Reset modal state
    setTimeout(() => {
      setContributeModalStep('confirm')
      setContributeTransactionHash('')
    }, 300)
  }

  const handleContributeSuccess = () => {
    // Rafraichir les donnees apres succes
    fetchCircleData(false)
  }

  const openContributeModal = () => {
    setContributeModalStep('confirm')
    setContributeTransactionHash('')
    setShowContributeModal(true)
  }

  // ===== Distribute Handlers =====
  const handleDistributeConfirm = async () => {
    if (!circleData || !address) return

    setDistributeModalStep('pending')
    try {
      const result = await circleService.distributeFunds(circleData.id, address)

      if (result.transactionHash) {
        setDistributeTransactionHash(result.transactionHash)
        setDistributeModalStep('processing')
      } else {
        setDistributeModalStep('processing')
      }
    } catch (err) {
      console.error('Error distributing:', err)
      setDistributeModalStep('error')
    }
  }

  const handleDistributeClose = () => {
    setShowDistributeModal(false)
    setTimeout(() => {
      setDistributeModalStep('confirm')
      setDistributeTransactionHash('')
    }, 300)
  }

  const handleDistributeSuccess = () => {
    fetchCircleData(false)
  }

  const openDistributeModal = () => {
    setDistributeModalStep('confirm')
    setDistributeTransactionHash('')
    setShowDistributeModal(true)
  }

  // ===== Force Distribute Handlers =====
  const handleForceDistributeConfirm = async () => {
    if (!circleData || !address) return

    setForceDistributeModalStep('pending')
    try {
      const result = await circleService.forceDistribute(circleData.id, address)

      if (result.transactionHash) {
        setForceDistributeTransactionHash(result.transactionHash)
        setForceDistributeModalStep('processing')
      } else {
        setForceDistributeModalStep('processing')
      }
    } catch (err) {
      console.error('Error force distributing:', err)
      setForceDistributeModalStep('error')
    }
  }

  const handleForceDistributeClose = () => {
    setShowForceDistributeModal(false)
    setTimeout(() => {
      setForceDistributeModalStep('confirm')
      setForceDistributeTransactionHash('')
    }, 300)
  }

  const handleForceDistributeSuccess = () => {
    fetchCircleData(false)
  }

  const openForceDistributeModal = () => {
    setForceDistributeModalStep('confirm')
    setForceDistributeTransactionHash('')
    setShowForceDistributeModal(true)
  }

  // Vérifie si le cercle est terminé (tous les cycles complétés)
  const isCircleFinished = () => {
    if (!circleData) return false
    return circleData.currentCycle >= circleData.maxMembers
  }

  // Vérifie si le cercle est en phase active (recrutement terminé)
  const isCircleActive = () => {
    if (!circleData) return false
    return members.length >= circleData.maxMembers
  }

  // Vérifie si la distribution peut avoir lieu normalement
  const canDistributeNormally = () => {
    if (!circleData) return false
    const now = Math.floor(Date.now() / 1000)
    return now >= circleData.endTime
  }

  // Formate le temps restant avant distribution
  const getTimeUntilDistribution = () => {
    if (!circleData) return ''
    const now = Math.floor(Date.now() / 1000)
    const remaining = circleData.endTime - now

    if (remaining <= 0) return 'Disponible maintenant'

    const days = Math.floor(remaining / 86400)
    const hours = Math.floor((remaining % 86400) / 3600)
    const minutes = Math.floor((remaining % 3600) / 60)

    if (days > 0) return `${days}j ${hours}h ${minutes}min`
    if (hours > 0) return `${hours}h ${minutes}min`
    return `${minutes}min`
  }

  const handleVote = async (candidateAddress: string, approve: boolean) => {
    if (!circleData || !address) return

    setIsSubmitting(true)
    try {
      await circleService.voteForMember(circleData.id, candidateAddress, approve, address)
      // Attendre quelques secondes pour que la blockchain traite la transaction
      // puis rafraichir les donnees
      setTimeout(() => {
        fetchCircleData(false)
      }, 5000)
    } catch (err) {
      console.error('Error voting:', err)
      alert('Erreur lors du vote')
    } finally {
      setIsSubmitting(false)
    }
  }

  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md">
          <h2 className="text-2xl font-semibold text-white mb-4 text-center">
            Connexion Requise
          </h2>
          <p className="text-gray-200 mb-6 text-center">
            Vous devez vous connecter pour voir les details du cercle
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">&#8987;</div>
          <p className="text-gray-300 text-xl">Chargement du cercle...</p>
        </div>
      </div>
    )
  }

  if (error || !circleData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
          <div className="text-6xl mb-4">&#10060;</div>
          <h2 className="text-2xl font-semibold text-white mb-4">
            {error || 'Cercle non trouve'}
          </h2>
          <button
            onClick={() => navigate('/circles')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            Retour aux cercles
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-8">

        {/* Back Button */}
        <button
          onClick={() => navigate('/circles')}
          className="text-gray-300 hover:text-white transition mb-6 flex items-center gap-2"
        >
          &#8592; Retour aux cercles
        </button>

        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start mb-4 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {circleData.name}
              </h1>
              <p className="text-gray-300 text-sm">
                ID: {circleData.id} | Cree par {hexToBech32(circleData.creator)}
              </p>
            </div>
            <div className="flex gap-3">
              <span className={`text-sm px-4 py-2 rounded-full ${
                isCircleFinished()
                  ? 'bg-purple-500/20 text-purple-300'
                  : circleData.isActive
                    ? members.length < circleData.maxMembers
                      ? 'bg-green-500/20 text-green-300'
                      : 'bg-blue-500/20 text-blue-300'
                    : 'bg-gray-500/20 text-gray-300'
              }`}>
                {isCircleFinished()
                  ? `Termine (${circleData.maxMembers}/${circleData.maxMembers} cycles)`
                  : circleData.isActive
                    ? members.length < circleData.maxMembers
                      ? 'Recrutement'
                      : 'En cours'
                    : 'Inactif'}
              </span>
              {isMember && (
                <span className="text-sm px-4 py-2 rounded-full bg-purple-500/20 text-purple-300">
                  Vous etes membre
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Contribution</p>
              <p className="text-white font-bold text-xl">{circleData.contributionAmount} EGLD</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Frequence</p>
              <p className="text-white font-bold text-xl">{formatDuration(circleData.cycleDuration)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Membres</p>
              <p className="text-white font-bold text-xl">{members.length}/{circleData.maxMembers}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Cycle Actuel</p>
              <p className="text-white font-bold text-xl">{circleData.currentCycle}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column - Members & Pending */}
          <div className="lg:col-span-2 space-y-6">

            {/* Circle Visualization */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Visualisation du Cercle</h2>
                <button
                  onClick={refreshData}
                  className="text-sm text-gray-300 hover:text-white transition px-3 py-1 bg-white/10 rounded-lg"
                >
                  Actualiser
                </button>
              </div>

              {/* SVG Circle Visualization */}
              <div
                className="relative flex items-center justify-center bg-gradient-to-br from-black/20 to-black/40 rounded-xl border border-white/10"
                style={{ minHeight: '400px' }}
              >
                <svg
                  viewBox="-160 -160 320 320"
                  className="transition-all duration-200"
                  style={{ width: '400px', height: '400px', maxWidth: '100%' }}
                >
                  {/* Circle path */}
                  <circle
                    cx="0"
                    cy="0"
                    r="110"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />

                  {/* Gradient definitions */}
                  <defs>
                    <radialGradient id="scCenterGradient">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </radialGradient>
                    <radialGradient id="memberGradient">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </radialGradient>
                    <radialGradient id="contributedGradient">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </radialGradient>
                    <radialGradient id="pendingGradient">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#d97706" />
                    </radialGradient>
                    <radialGradient id="currentUserGradient">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#be185d" />
                    </radialGradient>
                    <radialGradient id="creatorGradient">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </radialGradient>
                  </defs>

                  {/* Member nodes around the circle */}
                  {members.map((member, index) => {
                    const totalMembers = members.length || 1
                    const angle = (2 * Math.PI * index) / totalMembers - Math.PI / 2
                    const radius = 110
                    const x = Math.cos(angle) * radius
                    const y = Math.sin(angle) * radius

                    const hasContributed = contributors.includes(member)
                    const isCurrentUser = member === address
                    const isCreatorMember = index === 0

                    // Determine gradient based on state
                    let gradientId = 'memberGradient'
                    if (hasContributed) {
                      gradientId = 'contributedGradient'
                    } else if (isCurrentUser) {
                      gradientId = 'currentUserGradient'
                    } else if (isCreatorMember) {
                      gradientId = 'creatorGradient'
                    }

                    // Line color: green if contributed, orange otherwise
                    const lineColor = hasContributed ? 'rgba(34, 197, 94, 0.6)' : 'rgba(168, 85, 247, 0.3)'
                    const lineWidth = hasContributed ? '2' : '1'

                    return (
                      <g key={member}>
                        {/* Line to center */}
                        <line
                          x1="0"
                          y1="0"
                          x2={x * 0.7}
                          y2={y * 0.7}
                          stroke={lineColor}
                          strokeWidth={lineWidth}
                        />
                        {/* Checkmark if contributed */}
                        {hasContributed && (
                          <>
                            <circle
                              cx={x * 0.5}
                              cy={y * 0.5}
                              r="8"
                              fill="rgba(34, 197, 94, 0.9)"
                            />
                            <text x={x * 0.5} y={y * 0.5 + 3} textAnchor="middle" fill="white" fontSize="10">
                              &#x2713;
                            </text>
                          </>
                        )}
                        {/* Member node */}
                        <g className="cursor-pointer hover:opacity-80 transition-opacity">
                          <circle
                            cx={x}
                            cy={y}
                            r="22"
                            fill={`url(#${gradientId})`}
                            className="filter drop-shadow-md"
                          />
                          {/* Member number */}
                          <text x={x} y={y - 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                            M{index + 1}
                          </text>
                          {/* Status indicator */}
                          <text x={x} y={y + 8} textAnchor="middle" fill="white" fontSize="7" opacity="0.8">
                            {hasContributed ? 'OK' : isCurrentUser ? 'Vous' : '...'}
                          </text>
                        </g>
                      </g>
                    )
                  })}

                  {/* Placeholder positions if members not full */}
                  {Array.from({ length: Math.max(0, circleData.maxMembers - members.length) }).map((_, index) => {
                    const totalSlots = circleData.maxMembers
                    const actualIndex = members.length + index
                    const angle = (2 * Math.PI * actualIndex) / totalSlots - Math.PI / 2
                    const radius = 110
                    const x = Math.cos(angle) * radius
                    const y = Math.sin(angle) * radius

                    return (
                      <g key={`empty-${index}`}>
                        {/* Dashed line to center */}
                        <line
                          x1="0"
                          y1="0"
                          x2={x * 0.7}
                          y2={y * 0.7}
                          stroke="rgba(107, 114, 128, 0.2)"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />
                        {/* Empty slot */}
                        <circle
                          cx={x}
                          cy={y}
                          r="22"
                          fill="rgba(107, 114, 128, 0.2)"
                          stroke="rgba(107, 114, 128, 0.4)"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                        <text x={x} y={y + 4} textAnchor="middle" fill="rgba(156, 163, 175, 0.6)" fontSize="9">
                          Libre
                        </text>
                      </g>
                    )
                  })}

                  {/* Center - SC Contract */}
                  <g>
                    <circle
                      cx="0"
                      cy="0"
                      r="35"
                      fill="url(#scCenterGradient)"
                      className="filter drop-shadow-lg"
                    />
                    <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">
                      SC
                    </text>
                    <text x="0" y="8" textAnchor="middle" fill="white" fontSize="9" opacity="0.9">
                      Cercle
                    </text>
                    <text x="0" y="18" textAnchor="middle" fill="white" fontSize="8" opacity="0.7">
                      #{circleData.id}
                    </text>
                  </g>

                  {/* Cycle indicator on top */}
                  {isCircleActive() && !isCircleFinished() && (
                    <g>
                      <rect x="-35" y="-145" width="70" height="20" rx="10" fill="rgba(34, 197, 94, 0.2)" stroke="rgba(34, 197, 94, 0.5)" strokeWidth="1" />
                      <text x="0" y="-131" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold">
                        Cycle {circleData.currentCycle + 1}/{circleData.maxMembers}
                      </text>
                    </g>
                  )}

                  {isCircleFinished() && (
                    <g>
                      <rect x="-35" y="-145" width="70" height="20" rx="10" fill="rgba(168, 85, 247, 0.2)" stroke="rgba(168, 85, 247, 0.5)" strokeWidth="1" />
                      <text x="0" y="-131" textAnchor="middle" fill="#c4b5fd" fontSize="9" fontWeight="bold">
                        Termine
                      </text>
                    </g>
                  )}
                </svg>

                {/* Legend */}
                <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-3 justify-center text-xs">
                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600"></div>
                    <span className="text-gray-300">A contribue</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
                    <span className="text-gray-300">En attente</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-500 to-pink-600"></div>
                    <span className="text-gray-300">Vous</span>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded">
                    <div className="w-3 h-3 rounded-full border-2 border-dashed border-gray-500"></div>
                    <span className="text-gray-300">Place libre</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Members List */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  Membres ({members.length}) - Contributions: {contributors.length}/{members.length}
                </h2>
                <button
                  onClick={refreshData}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Actualiser
                </button>
              </div>

              {/* Progress bar for contributions */}
              {members.length > 0 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${(contributors.length / members.length) * 100}%` }}
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {contributors.length === members.length
                      ? '✅ Tous les membres ont contribue !'
                      : `${members.length - contributors.length} contribution(s) manquante(s)`}
                  </p>
                </div>
              )}

              {members.length > 0 ? (
                <div className="space-y-3">
                  {members.map((member, index) => {
                    const hasContributed = contributors.includes(member)
                    return (
                      <div
                        key={index}
                        className={`rounded-lg p-4 flex items-center justify-between ${
                          hasContributed ? 'bg-green-500/10 border border-green-500/30' : 'bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                            hasContributed
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                              : 'bg-gradient-to-r from-blue-500 to-purple-500'
                          }`}>
                            {hasContributed ? '✓' : index + 1}
                          </div>
                          <div>
                            <p className="text-white font-mono text-sm">
                              {formatAddress(member)}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {member === address && (
                                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">Vous</span>
                              )}
                              {index === 0 && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded">Createur</span>
                              )}
                              {hasContributed && (
                                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded">A contribue</span>
                              )}
                              {!hasContributed && (
                                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded">En attente</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Chargement des membres...</p>
                </div>
              )}
            </div>

            {/* Pending Requests - Only show for members, filtered by not voted */}
            {isMember && pendingRequestsNotVoted.length > 0 && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
                <h2 className="text-xl font-bold text-white mb-4">
                  Demandes en attente ({pendingRequestsNotVoted.length})
                </h2>

                <div className="space-y-4">
                  {pendingRequestsNotVoted.map((candidate, index) => (
                    <div
                      key={index}
                      className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-white font-mono">{formatAddress(candidate)}</p>
                          <p className="text-gray-400 text-xs">En attente de vote</p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleVote(candidate, true)}
                          disabled={isSubmitting}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                          Approuver
                        </button>
                        <button
                          onClick={() => handleVote(candidate, false)}
                          disabled={isSubmitting}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50"
                        >
                          Rejeter
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Circle Details */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-white mb-4">
                Details du Cercle
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Date de debut</p>
                    <p className="text-white font-semibold">{formatDate(circleData.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Date de fin prevue</p>
                    <p className="text-white font-semibold">{formatDate(circleData.endTime)}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-400 text-sm">Fonds par tour</p>
                    <p className="text-white font-semibold">
                      {(parseFloat(circleData.contributionAmount) * circleData.maxMembers).toFixed(4)} EGLD
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Places disponibles</p>
                    <p className="text-white font-semibold">
                      {circleData.maxMembers - members.length} place{circleData.maxMembers - members.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Remplissage du cercle</p>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                    style={{ width: `${(members.length / circleData.maxMembers) * 100}%` }}
                  />
                </div>
                <p className="text-gray-400 text-xs mt-1">
                  {Math.round((members.length / circleData.maxMembers) * 100)}% - {members.length} membres sur {circleData.maxMembers}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Actions */}
          <div className="space-y-6">

            {/* Quick Actions */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-white mb-4">Actions</h3>

              <div className="space-y-3">
                {!isMember && circleData.isActive && members.length < circleData.maxMembers && !isCircleFinished() && (
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Demander a Rejoindre
                  </button>
                )}

                {/* Message cercle terminé */}
                {isCircleFinished() && (
                  <div className="w-full bg-purple-600/20 border border-purple-500/30 text-purple-300 font-semibold py-3 px-4 rounded-lg text-center">
                    🎉 Ce cercle est termine ! Tous les cycles ont ete completes.
                  </div>
                )}

                {/* Bouton contribuer - visible seulement si cercle actif (recrutement terminé) et pas terminé */}
                {isMember && !hasUserContributed && isCircleActive() && !isCircleFinished() && (
                  <button
                    onClick={openContributeModal}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Contribuer ({circleData.contributionAmount} EGLD)
                  </button>
                )}

                {/* Message en attente de membres */}
                {isMember && !isCircleActive() && !isCircleFinished() && (
                  <div className="w-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 font-semibold py-3 px-4 rounded-lg text-center">
                    ⏳ En attente de {circleData.maxMembers - members.length} membre{circleData.maxMembers - members.length > 1 ? 's' : ''} pour demarrer les contributions
                  </div>
                )}

                {isMember && hasUserContributed && isCircleActive() && !isCircleFinished() && (
                  <div className="w-full bg-green-600/20 border border-green-500/30 text-green-300 font-semibold py-3 px-4 rounded-lg text-center">
                    ✅ Vous avez deja contribue pour ce cycle
                  </div>
                )}

                {/* Bouton Distribuer - visible quand tous ont contribue ET temps atteint ET cercle pas terminé */}
                {isMember && contributors.length === members.length && members.length > 0 && canDistributeNormally() && !isCircleFinished() && (
                  <button
                    onClick={openDistributeModal}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Distribuer les Fonds
                  </button>
                )}

                {/* Bouton Force Distribute - visible pour le créateur quand tous ont contribué mais temps pas atteint ET cercle pas terminé */}
                {isCreator && contributors.length === members.length && members.length > 0 && !canDistributeNormally() && !isCircleFinished() && (
                  <button
                    onClick={openForceDistributeModal}
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    Forcer la Distribution (Admin)
                  </button>
                )}

                {/* Message d'attente si tous ont contribué mais temps pas atteint et pas créateur ET cercle pas terminé */}
                {isMember && !isCreator && contributors.length === members.length && members.length > 0 && !canDistributeNormally() && !isCircleFinished() && (
                  <div className="w-full bg-orange-500/20 border border-orange-500/30 text-orange-300 font-semibold py-3 px-4 rounded-lg text-center text-sm">
                    Distribution dans: {getTimeUntilDistribution()}
                  </div>
                )}

                <button
                  onClick={() => navigate('/dashboard')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                >
                  Mon Dashboard
                </button>
              </div>
            </div>

            {/* Distribution Info */}
            <div className={`border rounded-2xl p-6 ${
              isCircleFinished()
                ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30'
                : 'bg-gradient-to-r from-green-500/20 to-blue-500/20 border-green-500/30'
            }`}>
              <h3 className="text-xl font-bold text-white mb-3">
                {isCircleFinished() ? 'Cercle Termine' : 'Distribution'}
              </h3>
              <p className="text-3xl font-bold text-white mb-2">
                {(parseFloat(circleData.contributionAmount) * circleData.maxMembers).toFixed(4)} EGLD
              </p>
              <p className="text-gray-300 text-sm mb-3">
                {isCircleFinished()
                  ? 'Montant total distribue par cycle'
                  : 'Montant distribue a chaque tour'}
              </p>
              <div className="bg-white/10 rounded-lg p-3 mb-3">
                <p className="text-gray-300 text-xs mb-1">
                  {isCircleFinished() ? 'Cycles completes' : 'Cycle actuel'}
                </p>
                <p className="text-white font-bold">{circleData.currentCycle} / {circleData.maxMembers}</p>
              </div>

              {/* Date de distribution ou message de fin */}
              {isCircleFinished() ? (
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <p className="text-purple-300 font-bold">Termine avec succes !</p>
                  </div>
                  <p className="text-gray-300 text-sm">
                    Tous les {circleData.maxMembers} cycles ont ete completes.
                    Chaque membre a recu sa distribution.
                  </p>
                </div>
              ) : (
                <div className={`rounded-lg p-3 ${canDistributeNormally() ? 'bg-green-500/20 border border-green-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                  <p className="text-gray-300 text-xs mb-1">Prochaine distribution</p>
                  <p className="text-white font-bold">{formatDate(circleData.endTime)}</p>
                  <p className={`text-sm mt-1 ${canDistributeNormally() ? 'text-green-400' : 'text-orange-400'}`}>
                    {getTimeUntilDistribution()}
                  </p>
                </div>
              )}
            </div>

            {/* Smart Contract Info */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-3">Smart Contract</h3>
              <p className="text-white font-mono text-xs break-all mb-3">{CIRCLE_MANAGER_ADDRESS}</p>
              <a
                href={`https://devnet-explorer.multiversx.com/accounts/${CIRCLE_MANAGER_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm transition"
              >
                Voir sur Explorer &#8599;
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4">Rejoindre le Cercle</h3>
            <p className="text-gray-300 mb-6">
              Vous allez demander a rejoindre "{circleData.name}". Les membres existants devront voter pour approuver votre adhesion.
            </p>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <p className="text-white text-sm">
                <strong>Contribution requise :</strong> {circleData.contributionAmount} EGLD par {formatDuration(circleData.cycleDuration)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                onClick={handleJoinRequest}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Modal avec TransactionModal */}
      <TransactionModal
        isOpen={showContributeModal}
        step={contributeModalStep}
        title="Contribution"
        confirmTitle="Contribuer au Cercle"
        confirmDescription={`Vous allez contribuer ${circleData.contributionAmount} EGLD pour le cycle ${circleData.currentCycle}.`}
        confirmDetails={
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Montant</span>
              <span className="text-white font-bold">{circleData.contributionAmount} EGLD</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Cercle</span>
              <span className="text-white">{circleData.name}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Cycle actuel</span>
              <span className="text-white">{circleData.currentCycle} / {circleData.maxMembers}</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-purple-500/30">
              <span className="text-gray-400">Frais reseau estimes</span>
              <span className="text-white">~0.001 EGLD</span>
            </div>
          </div>
        }
        successTitle="Contribution Reussie !"
        successMessage={`Votre contribution de ${circleData.contributionAmount} EGLD a ete enregistree avec succes.`}
        errorMessage="Erreur lors de la contribution. Verifiez votre solde et reessayez."
        transactionHash={contributeTransactionHash}
        onConfirm={handleContributeConfirm}
        onClose={handleContributeClose}
        onSuccess={handleContributeSuccess}
      />

      {/* Distribute Modal avec TransactionModal */}
      <TransactionModal
        isOpen={showDistributeModal}
        step={distributeModalStep}
        title="Distribution"
        confirmTitle="Distribuer les Fonds"
        confirmDescription={`Tous les membres ont contribue ! Distribuez les fonds au beneficiaire du cycle ${circleData.currentCycle}.`}
        confirmDetails={
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Montant total</span>
              <span className="text-white font-bold">
                {(parseFloat(circleData.contributionAmount) * members.length).toFixed(4)} EGLD
              </span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Frais (3%)</span>
              <span className="text-red-400">
                -{(parseFloat(circleData.contributionAmount) * members.length * 0.03).toFixed(4)} EGLD
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-green-500/30">
              <span className="text-gray-400">Montant distribue</span>
              <span className="text-green-400 font-bold">
                {(parseFloat(circleData.contributionAmount) * members.length * 0.97).toFixed(4)} EGLD
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-green-500/30">
              <span className="text-gray-400 text-sm">Beneficiaire (membre #{circleData.currentCycle + 1}):</span>
              <p className="text-white font-mono text-sm mt-1">
                {members[circleData.currentCycle % members.length]
                  ? formatAddress(members[circleData.currentCycle % members.length])
                  : 'Chargement...'}
              </p>
            </div>
          </div>
        }
        successTitle="Distribution Reussie !"
        successMessage={`Les fonds ont ete distribues au beneficiaire du cycle ${circleData.currentCycle}.`}
        errorMessage="Erreur lors de la distribution. Le temps de distribution n'est peut-etre pas encore atteint."
        transactionHash={distributeTransactionHash}
        onConfirm={handleDistributeConfirm}
        onClose={handleDistributeClose}
        onSuccess={handleDistributeSuccess}
      />

      {/* Force Distribute Modal avec TransactionModal */}
      <TransactionModal
        isOpen={showForceDistributeModal}
        step={forceDistributeModalStep}
        title="Distribution Forcee"
        confirmTitle="&#9888;&#65039; Distribution Forcee (Admin)"
        confirmDescription={`En tant que createur, vous pouvez forcer la distribution avant la date prevue.`}
        confirmDetails={
          <div className="space-y-4">
            <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-3">
              <p className="text-orange-300 text-sm">
                <strong>Attention :</strong> Cette action ignore la verification du temps de distribution.
              </p>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex justify-between mb-3">
                <span className="text-gray-400">Montant total</span>
                <span className="text-white font-bold">
                  {(parseFloat(circleData.contributionAmount) * members.length).toFixed(4)} EGLD
                </span>
              </div>
              <div className="flex justify-between mb-3">
                <span className="text-gray-400">Frais (3%)</span>
                <span className="text-red-400">
                  -{(parseFloat(circleData.contributionAmount) * members.length * 0.03).toFixed(4)} EGLD
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-green-500/30">
                <span className="text-gray-400">Montant distribue</span>
                <span className="text-green-400 font-bold">
                  {(parseFloat(circleData.contributionAmount) * members.length * 0.97).toFixed(4)} EGLD
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-green-500/30">
                <span className="text-gray-400 text-sm">Beneficiaire (membre #{circleData.currentCycle + 1}):</span>
                <p className="text-white font-mono text-sm mt-1">
                  {members[circleData.currentCycle % members.length]
                    ? formatAddress(members[circleData.currentCycle % members.length])
                    : 'Chargement...'}
                </p>
              </div>
            </div>
          </div>
        }
        successTitle="Distribution Forcee Reussie !"
        successMessage={`Les fonds ont ete distribues au beneficiaire du cycle ${circleData.currentCycle}.`}
        errorMessage="Erreur lors de la distribution forcee. Seul le createur du cercle peut effectuer cette action."
        transactionHash={forceDistributeTransactionHash}
        onConfirm={handleForceDistributeConfirm}
        onClose={handleForceDistributeClose}
        onSuccess={handleForceDistributeSuccess}
      />
    </div>
  )
}

export default CircleDetails
