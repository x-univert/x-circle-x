import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { TransactionModal, TransactionStep } from '../components/TransactionModal'
import { ReferralModal } from '../components/ReferralModal'
import { useCircleOfLife } from '../hooks/useCircleOfLife'
import { CIRCLE_OF_LIFE_ADDRESS } from '../config/contracts'
import { multiversxApiUrl, explorerUrl, chainId } from '../config'
import { CircleNavTabs, TabId } from '../components/CircleNavTabs'
import { CircleSkeleton } from '../components/CircleSkeleton'
import { AdminPanel } from '../components/AdminPanel'
import { RouteNamesEnum } from 'localConstants'

// Lazy load tabs for faster initial render
const MyPeripheralTab = lazy(() => import('../components/tabs/MyPeripheralTab').then(m => ({ default: m.MyPeripheralTab })))
const NftTab = lazy(() => import('../components/tabs/NftTab').then(m => ({ default: m.NftTab })))
const TokenTab = lazy(() => import('../components/tabs/TokenTab').then(m => ({ default: m.TokenTab })))
const DaoTab = lazy(() => import('../components/tabs/DaoTab').then(m => ({ default: m.DaoTab })))
const ScCentralTab = lazy(() => import('../components/tabs/ScCentralTab').then(m => ({ default: m.ScCentralTab })))
const StakingTab = lazy(() => import('../components/tabs/StakingTab').then(m => ({ default: m.StakingTab })))
const ChatTab = lazy(() => import('../components/tabs/ChatTab').then(m => ({ default: m.ChatTab })))

function CircleOfLife() {
  const { t } = useTranslation()
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const navigate = useNavigate()

  // Hook pour interagir avec le contrat
  const {
    isLoading,
    error,
    circleInfo,
    myContract,
    isMyTurn,
    isActive,
    isMember,
    activeContracts,
    inactiveContracts,
    contractBalance,
    isPaused,
    cycleHolder,
    hasPreSigned,
    hasSignedThisCycle,
    preSignedMembers,
    pendingAutoTransfers,
    cycleStats,
    sc0Owner,
    contractOwners,
    scStats,
    peripheralBalances,
    rewardsInfo,
    pendingRewards,
    canClaim,
    dayOfWeek,
    burnStats,
    autoSignStatus,
    starterBonusInfo,
    optionFInfo,
    pioneerInfo,
    depositBonusInfo,
    referralBonusInfo,
    distributionStats,
    createPeripheralContract,
    signAndForward,
    startDailyCycle,
    setActive,
    setInactive,
    preSign,
    processAllPendingTransfers,
    failCycle,
    claimRewards,
    enableAutoSign,
    disableAutoSign,
    deposit,
    refreshData,
    clearError
  } = useCircleOfLife()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('circle')

  // Zoom state for circle visualization
  const [zoomLevel, setZoomLevel] = useState(1)
  const minZoom = 0.5
  const maxZoom = 3

  // Window size for responsive SVG
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 500)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate responsive SVG size
  const svgSize = useMemo(() => {
    const baseSize = 500 * zoomLevel
    const maxSize = windowWidth < 640 ? windowWidth - 48 : windowWidth < 1024 ? windowWidth - 80 : 600
    return Math.min(baseSize, maxSize)
  }, [zoomLevel, windowWidth])

  // Rotation angle state for orbit animation
  const [rotationAngle, setRotationAngle] = useState(0)

  // Animation loop for rotation
  useEffect(() => {
    const startTime = Date.now()
    const duration = 120000 // 120 seconds for full rotation

    const animate = () => {
      const elapsed = Date.now() - startTime
      const angle = (elapsed / duration) * 360 % 360
      setRotationAngle(angle)
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [])

  // Fetch last transaction hashes for SC0 and peripherals
  useEffect(() => {
    const fetchLastTxHashes = async () => {
      try {
        // Fetch last transaction/transfer for SC0 (check both transactions and transfers)
        const [sc0TxRes, sc0TransferRes] = await Promise.all([
          fetch(`${multiversxApiUrl}/accounts/${CIRCLE_OF_LIFE_ADDRESS}/transactions?size=1&order=desc`),
          fetch(`${multiversxApiUrl}/accounts/${CIRCLE_OF_LIFE_ADDRESS}/transfers?size=1&order=desc`)
        ])

        let latestSc0Tx: string | null = null
        let latestSc0Time = 0

        if (sc0TxRes.ok) {
          const txs = await sc0TxRes.json()
          if (txs.length > 0) {
            latestSc0Tx = txs[0].txHash
            latestSc0Time = txs[0].timestamp || 0
          }
        }
        if (sc0TransferRes.ok) {
          const transfers = await sc0TransferRes.json()
          if (transfers.length > 0 && (transfers[0].timestamp || 0) > latestSc0Time) {
            latestSc0Tx = transfers[0].txHash
          }
        }
        if (latestSc0Tx) {
          setLastTxHashSc0(latestSc0Tx)
        }

        // Fetch last transactions/transfers for all peripheral contracts
        if (activeContracts.length > 0) {
          const newPeripheralHashes = new Map<string, string>()
          await Promise.all(activeContracts.map(async (contractAddr) => {
            try {
              const [txRes, transferRes] = await Promise.all([
                fetch(`${multiversxApiUrl}/accounts/${contractAddr}/transactions?size=1&order=desc`),
                fetch(`${multiversxApiUrl}/accounts/${contractAddr}/transfers?size=1&order=desc`)
              ])

              let latestHash: string | null = null
              let latestTime = 0

              if (txRes.ok) {
                const txs = await txRes.json()
                if (txs.length > 0) {
                  latestHash = txs[0].txHash
                  latestTime = txs[0].timestamp || 0
                }
              }
              if (transferRes.ok) {
                const transfers = await transferRes.json()
                if (transfers.length > 0 && (transfers[0].timestamp || 0) > latestTime) {
                  latestHash = transfers[0].txHash
                }
              }
              if (latestHash) {
                newPeripheralHashes.set(contractAddr, latestHash)
              }
            } catch (e) {
              console.error(`Error fetching tx for ${contractAddr}:`, e)
            }
          }))
          setLastTxHashPeripherals(newPeripheralHashes)
        }
      } catch (e) {
        console.error('Error fetching last tx hashes:', e)
      }
    }

    fetchLastTxHashes()
    // Refresh every 30 seconds
    const interval = setInterval(fetchLastTxHashes, 30000)
    return () => clearInterval(interval)
  }, [activeContracts])

  // Tooltip state for circle nodes
  const [tooltipInfo, setTooltipInfo] = useState<{
    visible: boolean
    x: number
    y: number
    type: 'sc0' | 'peripheral'
    scAddress: string
    ownerAddress: string | null
    scIndex: number
    isMyContract: boolean
  } | null>(null)

  // Hover state for peripheral SC zoom effect
  const [hoveredScIndex, setHoveredScIndex] = useState<number | null>(null)

  // Hover state for SC0 zoom effect
  const [hoveredSc0, setHoveredSc0] = useState(false)

  // Tooltip deposit state
  const [tooltipDepositAmount, setTooltipDepositAmount] = useState('0.01')
  const [isDepositing, setIsDepositing] = useState(false)

  // Rewards deposit bonus state
  const [rewardsDepositAmount, setRewardsDepositAmount] = useState('1')
  const [isRewardsDepositing, setIsRewardsDepositing] = useState(false)

  // Last transaction hashes state
  const [lastTxHashSc0, setLastTxHashSc0] = useState<string | null>(null)
  const [lastTxHashPeripherals, setLastTxHashPeripherals] = useState<Map<string, string>>(new Map())

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, maxZoom))
  }

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, minZoom))
  }

  const handleZoomReset = () => {
    setZoomLevel(1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) {
      setZoomLevel(prev => Math.min(prev + 0.1, maxZoom))
    } else {
      setZoomLevel(prev => Math.max(prev - 0.1, minZoom))
    }
  }

  // Tooltip handlers for circle nodes
  const handleNodeClick = (
    e: React.MouseEvent | React.TouchEvent,
    type: 'sc0' | 'peripheral',
    scAddress: string,
    ownerAddress: string | null,
    scIndex: number,
    isMyContractNode: boolean
  ) => {
    e.stopPropagation()

    // Set hover state for zoom effect on touch devices
    if (type === 'sc0') {
      setHoveredSc0(true)
      setHoveredScIndex(null)
    } else {
      setHoveredScIndex(scIndex - 1) // scIndex is 1-based, hoveredScIndex is 0-based
      setHoveredSc0(false)
    }

    const rect = (e.currentTarget as SVGElement).closest('svg')?.getBoundingClientRect()
    if (rect) {
      // Get coordinates from mouse or touch event
      const clientX = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY || 0 : e.clientY

      setTooltipInfo({
        visible: true,
        x: clientX - rect.left,
        y: clientY - rect.top,
        type,
        scAddress,
        ownerAddress,
        scIndex,
        isMyContract: isMyContractNode
      })
    }
  }

  const handleCloseTooltip = () => {
    setTooltipInfo(null)
    setTooltipDepositAmount('0.01')
    // Clear hover states when closing tooltip
    setHoveredScIndex(null)
    setHoveredSc0(false)
  }

  // Handle deposit from tooltip popup
  const handleTooltipDeposit = async () => {
    if (!tooltipInfo || isDepositing || !address) return

    const amount = parseFloat(tooltipDepositAmount)
    if (isNaN(amount) || amount <= 0) return

    setIsDepositing(true)
    try {
      if (tooltipInfo.type === 'sc0') {
        // Deposit to SC0 using the existing function
        const result = await deposit(tooltipDepositAmount)
        if (result) {
          handleCloseTooltip()
          await refreshData()
        }
      } else {
        // For peripheral contracts, we need to send EGLD directly
        // Import signAndSendTransactions dynamically
        const { signAndSendTransactionsWithHash } = await import('../helpers/signAndSendTransactions')
        const { Address, Transaction, TransactionPayload, TokenTransfer } = await import('lib')

        const amountInWei = BigInt(Math.floor(amount * 1e18))
        const recipientAddress = new Address(tooltipInfo.scAddress)
        const senderAddress = new Address(address)

        // Create a simple EGLD transfer with 'deposit' data
        const transaction = new Transaction({
          sender: senderAddress,
          receiver: recipientAddress,
          value: amountInWei,
          gasLimit: BigInt(30000000), // Augmente pour calculs de distribution EGLD
          data: new TransactionPayload('deposit'),
          chainID: chainId
        })

        const result = await signAndSendTransactionsWithHash({
          transactions: [transaction],
          transactionsDisplayInfo: {
            processingMessage: 'Depot en cours...',
            successMessage: 'Depot reussi!',
            errorMessage: 'Erreur lors du depot'
          },
          senderAddress: address
        })

        if (result) {
          handleCloseTooltip()
          await refreshData()
        }
      }
    } catch (err) {
      console.error('Error depositing:', err)
    } finally {
      setIsDepositing(false)
    }
  }

  // Handler for deposit bonus (rewards section)
  const handleRewardsDeposit = async () => {
    if (!address || isRewardsDepositing) return

    const amount = parseFloat(rewardsDepositAmount)
    if (isNaN(amount) || amount <= 0) {
      return
    }

    setIsRewardsDepositing(true)
    try {
      const result = await deposit(rewardsDepositAmount)
      if (result) {
        setRewardsDepositAmount('1')
        await refreshData()
      }
    } catch (err) {
      console.error('Error depositing for bonus:', err)
    } finally {
      setIsRewardsDepositing(false)
    }
  }

  // Calculate orbiting circles based on cycles completed
  const getOrbitingCirclesData = (cyclesCompleted: number) => {
    // Each 30 cycles = 1 orbiting circle, max 12 at 360
    const completed360Cycles = Math.floor(cyclesCompleted / 360)
    const remainingCycles = cyclesCompleted % 360
    const numOrbitingCircles = Math.min(Math.floor(remainingCycles / 30), 12)

    return {
      completed360Cycles,
      numOrbitingCircles,
      showBadge: completed360Cycles > 0 && numOrbitingCircles === 0
    }
  }

  // Modal states
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [referrerAddress, setReferrerAddress] = useState<string | null>(null)

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinModalStep, setJoinModalStep] = useState<TransactionStep>('confirm')
  const [joinTransactionHash, setJoinTransactionHash] = useState('')

  const [showSignModal, setShowSignModal] = useState(false)
  const [signModalStep, setSignModalStep] = useState<TransactionStep>('confirm')
  const [signTransactionHash, setSignTransactionHash] = useState('')

  const [showStartCycleModal, setShowStartCycleModal] = useState(false)
  const [startCycleModalStep, setStartCycleModalStep] = useState<TransactionStep>('confirm')
  const [startCycleTransactionHash, setStartCycleTransactionHash] = useState('')

  const [showPreSignModal, setShowPreSignModal] = useState(false)
  const [preSignModalStep, setPreSignModalStep] = useState<TransactionStep>('confirm')
  const [preSignTransactionHash, setPreSignTransactionHash] = useState('')

  const [showProcessModal, setShowProcessModal] = useState(false)
  const [processModalStep, setProcessModalStep] = useState<TransactionStep>('confirm')
  const [processTransactionHash, setProcessTransactionHash] = useState('')

  const [showFailCycleModal, setShowFailCycleModal] = useState(false)
  const [failCycleModalStep, setFailCycleModalStep] = useState<TransactionStep>('confirm')
  const [failCycleTransactionHash, setFailCycleTransactionHash] = useState('')

  const [showActivateModal, setShowActivateModal] = useState(false)
  const [activateModalStep, setActivateModalStep] = useState<TransactionStep>('confirm')
  const [activateTransactionHash, setActivateTransactionHash] = useState('')

  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivateModalStep, setDeactivateModalStep] = useState<TransactionStep>('confirm')
  const [deactivateTransactionHash, setDeactivateTransactionHash] = useState('')

  const [showClaimRewardsModal, setShowClaimRewardsModal] = useState(false)
  const [claimRewardsModalStep, setClaimRewardsModalStep] = useState<TransactionStep>('confirm')
  const [claimRewardsTransactionHash, setClaimRewardsTransactionHash] = useState('')

  // Auto-sign modal states
  const [showAutoSignModal, setShowAutoSignModal] = useState(false)
  const [autoSignModalStep, setAutoSignModalStep] = useState<TransactionStep>('confirm')
  const [autoSignTransactionHash, setAutoSignTransactionHash] = useState('')

  const [showDisableAutoSignModal, setShowDisableAutoSignModal] = useState(false)
  const [disableAutoSignModalStep, setDisableAutoSignModalStep] = useState<TransactionStep>('confirm')
  const [disableAutoSignTransactionHash, setDisableAutoSignTransactionHash] = useState('')

  // Clear error on mount
  useEffect(() => {
    clearError()
  }, [])

  // Handlers

  // Handler when user submits referral code (or skips)
  const handleReferralSubmit = (referrer: string | null) => {
    setReferrerAddress(referrer)
    setShowReferralModal(false)
    setShowJoinModal(true)
  }

  const handleJoinConfirm = async () => {
    setJoinModalStep('pending')
    try {
      const result = await createPeripheralContract(referrerAddress || undefined)
      if (result && result.transactionHash) {
        setJoinTransactionHash(result.transactionHash)
        setJoinModalStep('processing')
        // Reset referrer after successful join
        setReferrerAddress(null)
      } else {
        setJoinModalStep('error')
      }
    } catch (err) {
      console.error('Error joining Circle of Life:', err)
      setJoinModalStep('error')
    }
  }

  const handleSignConfirm = async () => {
    setSignModalStep('pending')
    try {
      const result = await signAndForward()
      if (result && result.transactionHash) {
        setSignTransactionHash(result.transactionHash)
        setSignModalStep('processing')
      } else {
        setSignModalStep('error')
      }
    } catch (err) {
      console.error('Error signing cycle:', err)
      setSignModalStep('error')
    }
  }

  const handleStartCycleConfirm = async () => {
    setStartCycleModalStep('pending')
    try {
      const result = await startDailyCycle()
      console.log('startDailyCycle result:', result)

      if (result) {
        // Le hash peut être dans transactionHash ou dans sessionId
        const txHash = result.transactionHash || result.sessionId
        if (txHash) {
          console.log('Using transaction hash:', txHash)
          setStartCycleTransactionHash(txHash)
          setStartCycleModalStep('processing')
        } else {
          console.error('No transaction hash found in result:', result)
          setStartCycleModalStep('error')
        }
      } else {
        console.error('No result returned from startDailyCycle')
        setStartCycleModalStep('error')
      }
    } catch (err) {
      console.error('Error starting cycle:', err)
      setStartCycleModalStep('error')
    }
  }

  const handlePreSignConfirm = async () => {
    setPreSignModalStep('pending')
    try {
      const result = await preSign()
      if (result && result.transactionHash) {
        setPreSignTransactionHash(result.transactionHash)
        setPreSignModalStep('processing')
      } else {
        setPreSignModalStep('error')
      }
    } catch (err) {
      console.error('Error pre-signing:', err)
      setPreSignModalStep('error')
    }
  }

  const handleProcessConfirm = async () => {
    console.log('handleProcessConfirm: starting...')
    setProcessModalStep('pending')
    try {
      const result = await processAllPendingTransfers()
      console.log('processAllPendingTransfers result:', result)

      if (result) {
        const txHash = result.transactionHash || result.sessionId
        if (txHash) {
          console.log('Using transaction hash for process:', txHash)
          setProcessTransactionHash(txHash)
          setProcessModalStep('processing')
        } else {
          console.error('No transaction hash found in result:', result)
          setProcessModalStep('error')
        }
      } else {
        console.error('No result returned from processAllPendingTransfers')
        setProcessModalStep('error')
      }
    } catch (err) {
      console.error('Error processing all transfers:', err)
      setProcessModalStep('error')
    }
  }

  const handleFailCycleConfirm = async () => {
    setFailCycleModalStep('pending')
    try {
      const result = await failCycle()
      if (result && result.transactionHash) {
        setFailCycleTransactionHash(result.transactionHash)
        setFailCycleModalStep('processing')
      } else {
        setFailCycleModalStep('error')
      }
    } catch (err) {
      console.error('Error failing cycle:', err)
      setFailCycleModalStep('error')
    }
  }

  const handleActivateConfirm = async () => {
    setActivateModalStep('pending')
    try {
      const result = await setActive()
      if (result && result.transactionHash) {
        setActivateTransactionHash(result.transactionHash)
        setActivateModalStep('processing')
      } else {
        setActivateModalStep('error')
      }
    } catch (err) {
      console.error('Error activating:', err)
      setActivateModalStep('error')
    }
  }

  const handleDeactivateConfirm = async () => {
    setDeactivateModalStep('pending')
    try {
      const result = await setInactive()
      if (result && result.transactionHash) {
        setDeactivateTransactionHash(result.transactionHash)
        setDeactivateModalStep('processing')
      } else {
        setDeactivateModalStep('error')
      }
    } catch (err) {
      console.error('Error deactivating:', err)
      setDeactivateModalStep('error')
    }
  }

  const handleClaimRewardsConfirm = async () => {
    setClaimRewardsModalStep('pending')
    try {
      const result = await claimRewards()
      if (result && result.transactionHash) {
        setClaimRewardsTransactionHash(result.transactionHash)
        setClaimRewardsModalStep('processing')
      } else {
        setClaimRewardsModalStep('error')
      }
    } catch (err) {
      console.error('Error claiming rewards:', err)
      setClaimRewardsModalStep('error')
    }
  }

  const handleAutoSignConfirm = async () => {
    setAutoSignModalStep('pending')
    try {
      console.log('Calling enableAutoSign (permanent)...')
      const result = await enableAutoSign()
      console.log('Auto-sign result:', result)
      if (result && result.transactionHash) {
        setAutoSignTransactionHash(result.transactionHash)
        setAutoSignModalStep('processing')
      } else if (result && result.sessionId) {
        // Transaction envoyée mais hash pas encore disponible
        setAutoSignModalStep('processing')
      } else {
        console.error('No result from auto-sign call')
        setAutoSignModalStep('error')
      }
    } catch (err) {
      console.error('Error enabling auto-sign:', err)
      setAutoSignModalStep('error')
    }
  }

  const handleDisableAutoSignConfirm = async () => {
    setDisableAutoSignModalStep('pending')
    try {
      const result = await disableAutoSign()
      if (result && result.transactionHash) {
        setDisableAutoSignTransactionHash(result.transactionHash)
        setDisableAutoSignModalStep('processing')
      } else {
        setDisableAutoSignModalStep('error')
      }
    } catch (err) {
      console.error('Error disabling auto-sign:', err)
      setDisableAutoSignModalStep('error')
    }
  }

  const getDayName = (day: number): string => {
    const days = [
      t('days.sunday', 'Sunday'),
      t('days.monday', 'Monday'),
      t('days.tuesday', 'Tuesday'),
      t('days.wednesday', 'Wednesday'),
      t('days.thursday', 'Thursday'),
      t('days.friday', 'Friday'),
      t('days.saturday', 'Saturday')
    ]
    return day >= 0 && day < 7 ? days[day] : t('days.unknown', 'Unknown')
  }

  const formatTimeRemaining = () => {
    const now = new Date()
    // Calculer minuit UTC (prochain jour UTC)
    const midnightUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ))
    const remaining = midnightUTC.getTime() - now.getTime()

    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    return `${hours}h ${minutes}min`
  }

  const getContractPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2
    const radius = 120
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    return { x, y }
  }

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 6)}`
  }

  const creationFee = circleInfo?.entryFee || '1'
  const circulationAmount = circleInfo?.circulationAmount || '0.001'
  const totalContracts = circleInfo?.totalMembers || 0
  const activeContractsCount = circleInfo?.activeMembers || 0
  const currentCycleIndex = circleInfo?.currentCycleIndex || 0
  const cycleDay = circleInfo?.cycleDay || 0

  // Current day on blockchain (UTC): day = timestamp / 86400
  const currentDay = Math.floor(Date.now() / 1000 / 86400)

  // Determine if cycle is complete (all members have signed TODAY, money back to center)
  // Only consider complete if cycleDay matches currentDay
  const isCycleComplete = cycleDay === currentDay && cycleDay > 0 && !cycleHolder && activeContractsCount > 0

  // Determine if cycle is in timeout (current day > cycle day AND there's still a cycleHolder)
  const isCycleInTimeout = cycleHolder && cycleDay > 0 && currentDay > cycleDay

  // Determine if a cycle is currently active (there's a holder OR cycle completed today)
  const isCycleActive = !!cycleHolder || isCycleComplete

  // Check if user's SC is banned
  const myScStats = myContract ? scStats.get(myContract) : null
  const isMyScBanned = myScStats?.isBanned || false
  const myBanUntil = myScStats?.banUntil || 0
  const banEndDate = myBanUntil > 0 ? new Date(myBanUntil * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : ''

  // Calculer la vraie position actuelle basée sur cycleHolder
  // cycleHolder = le SC qui détient actuellement les fonds et doit signer
  const actualCurrentPosition = cycleHolder && activeContracts.length > 0
    ? activeContracts.indexOf(cycleHolder)
    : -1

  // Calculate progress percentage
  const progressPercentage = isCycleComplete
    ? 100
    : actualCurrentPosition >= 0 && activeContractsCount > 0
      ? Math.round((actualCurrentPosition / activeContractsCount) * 100)
      : 0

  return (
    <div className="min-h-screen bg-transparent overflow-x-hidden">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-full overflow-hidden">

        {/* Header */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2">
            &#x1F300; {t('circleOfLife.title', 'Circle of Life')}
          </h1>
          <p className="text-sm sm:text-xl text-gray-300 mb-4 sm:mb-6">
            {t('circle.ecosystem', 'Circular Smart Contracts Ecosystem')}
          </p>
          {isPaused && (
            <div className="mb-4 inline-block bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg">
              {t('circle.contractPaused', 'The contract is currently paused')}
            </div>
          )}
        </div>

        {/* Navigation Tabs - Toujours visible */}
        <CircleNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Non connecte */}
        {!isLoggedIn && (
          <div className="flex items-center justify-center py-12">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md text-center">
              <div className="text-6xl mb-4">&#x1F300;</div>
              <h2 className="text-2xl font-semibold text-white mb-4">
                {t('circle.connectionRequired', 'Connection Required')}
              </h2>
              <p className="text-gray-200 mb-6">
                {t('circle.connectToJoin', 'Connect to join the Circle of Life and participate in circular transactions.')}
              </p>
              <button
                onClick={() => navigate(RouteNamesEnum.unlock)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                {t('common.connect', 'Connect')}
              </button>
            </div>
          </div>
        )}

        {/* Chargement avec Skeleton */}
        {isLoggedIn && isLoading && !circleInfo && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <div className="h-6 w-48 bg-white/10 rounded animate-pulse"></div>
                <div className="h-8 w-24 bg-white/10 rounded animate-pulse"></div>
              </div>
              <div className="relative overflow-hidden bg-gradient-to-br from-black/20 to-black/40 rounded-xl border border-white/10">
                <CircleSkeleton numPeripherals={6} />
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl h-48 animate-pulse"></div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl h-32 animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Contenu principal - seulement si connecte et charge */}
        {isLoggedIn && (circleInfo || !isLoading) && (
        <>
        {/* Error display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-300 hover:text-white">&times;</button>
          </div>
        )}

        {/* Tab Content - Lazy loaded with Suspense */}
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin text-4xl mb-2">&#x1F300;</div>
              <p className="text-gray-400">{t('common.loading')}</p>
            </div>
          </div>
        }>
          {activeTab === 'sc-central' && <ScCentralTab />}
          {activeTab === 'my-sc' && <MyPeripheralTab />}
          {activeTab === 'staking' && <StakingTab />}
          {activeTab === 'nft' && <NftTab />}
          {activeTab === 'token' && <TokenTab />}
          {activeTab === 'dao' && <DaoTab />}
          {activeTab === 'chat' && <ChatTab />}
        </Suspense>

        {/* Circle Tab - Main Grid */}
        {activeTab === 'circle' && (
        <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 w-full">

          {/* Circle Visualization */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl w-full overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-white">{t('circle.visualization', 'Circle Visualization')}</h2>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Zoom controls - compact on mobile */}
                <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 rounded-lg p-0.5 sm:p-1">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= minZoom}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Dezoomer"
                  >
                    <span className="text-base sm:text-lg font-bold">-</span>
                  </button>
                  <button
                    onClick={handleZoomReset}
                    className="px-1.5 sm:px-2 h-7 sm:h-8 flex items-center justify-center text-white hover:bg-white/20 rounded text-xs sm:text-sm font-mono transition min-w-[40px]"
                    title="Reinitialiser le zoom"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= maxZoom}
                    className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-white hover:bg-white/20 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Zoomer"
                  >
                    <span className="text-base sm:text-lg font-bold">+</span>
                  </button>
                </div>
                <button
                  onClick={refreshData}
                  disabled={isLoading}
                  className="text-xs sm:text-sm text-gray-300 hover:text-white transition px-2 sm:px-3 py-1 bg-white/10 rounded-lg whitespace-nowrap"
                >
                  {isLoading ? '...' : t('circle.refresh', 'Refresh')}
                </button>
              </div>
            </div>

            {/* SVG Circle - Responsive with zoom */}
            <div
              className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-black/20 to-black/40 rounded-lg sm:rounded-xl border border-white/10 w-full"
              style={{ minHeight: '280px', maxHeight: '60vh', height: 'auto', aspectRatio: '1/1' }}
              onWheel={handleWheel}
              onClick={handleCloseTooltip}
            >
              {/* Zoom hint - responsive */}
              <div className="absolute top-2 left-2 text-[10px] sm:text-xs text-gray-400 bg-black/30 px-1.5 sm:px-2 py-1 rounded z-10">
                <span className="hidden sm:inline">Molette pour zoomer | Glisser pour deplacer</span>
                <span className="sm:hidden">Pincer pour zoomer</span>
              </div>
              <svg
                viewBox="-180 -180 360 360"
                className="transition-all duration-200 ease-out flex-shrink-0"
                preserveAspectRatio="xMidYMid meet"
                style={{
                  width: '100%',
                  height: '100%',
                  maxWidth: `${svgSize}px`,
                  maxHeight: `${svgSize}px`
                }}
              >
                {/* Gradient and marker definitions - en dehors du groupe anime */}
                <defs>
                  {/* Spin animation for orbiting circles */}
                  <style>{`
                    @keyframes orbitSpin {
                      from { transform: rotate(0deg); }
                      to { transform: rotate(360deg); }
                    }
                    .orbit-circle {
                      animation: orbitSpin 8s linear infinite;
                      transform-origin: center;
                    }
                    .orbit-circle-fast {
                      animation: orbitSpin 4s linear infinite;
                      transform-origin: center;
                    }
                  `}</style>
                  <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(168, 85, 247, 0.8)" />
                  </marker>
                  <marker id="arrowheadGreen" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="rgba(34, 197, 94, 0.9)" />
                  </marker>
                  <radialGradient id="sc0Gradient">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </radialGradient>
                  <radialGradient id="sc0CompleteGradient">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#15803d" />
                  </radialGradient>
                  <radialGradient id="completedGradient">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </radialGradient>
                  <radialGradient id="activeGradient">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#16a34a" />
                  </radialGradient>
                  <radialGradient id="inactiveGradient">
                    <stop offset="0%" stopColor="#6b7280" />
                    <stop offset="100%" stopColor="#4b5563" />
                  </radialGradient>
                  <radialGradient id="currentGradient">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </radialGradient>
                  <radialGradient id="myContractGradient">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </radialGradient>
                </defs>

                {/* Groupe qui tourne autour du centre (0,0) - contient le cercle orbital et les SC peripheriques */}
                <g transform={`rotate(${rotationAngle})`}>

                  {/* Circle path - orbite des SC peripheriques */}
                  <circle
                    cx="0"
                    cy="0"
                    r="120"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />

                {/* Circular arrows between active contracts - RENDERED FIRST so peripherals appear on top when zoomed */}
                {activeContracts.length > 0 && (
                  <path
                    d={`M ${getContractPosition(0, activeContracts.length).x * 0.85} ${getContractPosition(0, activeContracts.length).y * 0.85}
                        A 102 102 0 1 1 ${getContractPosition(0, activeContracts.length).x * 0.85 - 1} ${getContractPosition(0, activeContracts.length).y * 0.85}`}
                    fill="none"
                    stroke={isCycleComplete ? "rgba(34, 197, 94, 0.7)" : "rgba(168, 85, 247, 0.5)"}
                    strokeWidth={isCycleComplete ? "3" : "2"}
                    markerEnd={isCycleComplete ? "url(#arrowheadGreen)" : "url(#arrowhead)"}
                  />
                )}

                {/* Peripheral contracts - render: others first, then user's SC (MOI), then current turn, then hovered on top */}
                {activeContracts
                  .map((contractAddr, index) => ({
                    contractAddr,
                    index,
                    isMyContract: myContract === contractAddr,
                    isCurrentTurn: actualCurrentPosition === index && !isCycleComplete && isCycleActive
                  }))
                  .sort((a, b) => {
                    // Render hovered element last (highest z-index)
                    if (a.index === hoveredScIndex) return 1
                    if (b.index === hoveredScIndex) return -1
                    // Render current turn SC second to last (above others and MOI but below hovered)
                    if (a.isCurrentTurn) return 1
                    if (b.isCurrentTurn) return -1
                    // Render user's SC third to last (above others but below current turn)
                    if (a.isMyContract) return 1
                    if (b.isMyContract) return -1
                    return 0
                  })
                  .map(({ contractAddr, index }) => {
                  const pos = getContractPosition(index, activeContracts.length || 1)
                  // Utiliser actualCurrentPosition (basé sur cycleHolder) au lieu de currentCycleIndex
                  const isCurrent = actualCurrentPosition === index && !isCycleComplete && isCycleActive
                  const isMyContractNode = myContract === contractAddr
                  // Only show as completed if cycle is active (has holder or completed today)
                  const hasCompleted = isCycleComplete || (isCycleActive && actualCurrentPosition >= 0 && index < actualCurrentPosition)

                  // Check if the owner of this contract has pre-signed
                  const ownerAddress = contractOwners.get(contractAddr)
                  const hasOwnerPreSigned = ownerAddress ? preSignedMembers.includes(ownerAddress) : false

                  // Determine gradient based on state
                  let gradientId = 'activeGradient'
                  if (isCycleComplete) {
                    gradientId = 'completedGradient'
                  } else if (isCurrent) {
                    gradientId = 'currentGradient'
                  } else if (isMyContractNode) {
                    gradientId = 'myContractGradient'
                  } else if (hasCompleted) {
                    gradientId = 'completedGradient'
                  }

                  // Determine line color: gold if current turn, green if completed, blue if pre-signed, purple otherwise
                  let lineColor = "rgba(168, 85, 247, 0.4)"
                  let lineWidth = "1"
                  if (isCurrent) {
                    lineColor = "rgba(251, 191, 36, 0.8)"
                    lineWidth = "3"
                  } else if (hasCompleted || isCycleComplete) {
                    lineColor = "rgba(34, 197, 94, 0.6)"
                    lineWidth = "2"
                  } else if (hasOwnerPreSigned) {
                    lineColor = "rgba(59, 130, 246, 0.6)"
                    lineWidth = "2"
                  }

                  // Check if this node is hovered or is current turn
                  const isHovered = hoveredScIndex === index
                  // Scale: hovered > current turn > normal
                  const scale = isHovered ? 1.4 : isCurrent ? 1.2 : 1

                  return (
                    <g key={contractAddr}>
                      {/* Line to center - green when completed, blue when pre-signed */}
                      <line
                        x1="0"
                        y1="0"
                        x2={pos.x * 0.7}
                        y2={pos.y * 0.7}
                        stroke={lineColor}
                        strokeWidth={lineWidth}
                      />
                      {/* Checkmark indicator for completed - avec contre-rotation */}
                      {(hasCompleted || isCycleComplete) && (
                        <g>
                          <circle
                            cx={pos.x * 0.5}
                            cy={pos.y * 0.5}
                            r="8"
                            fill="rgba(34, 197, 94, 0.9)"
                          />
                          <text
                            x={pos.x * 0.5}
                            y={pos.y * 0.5 + 3}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                            transform={`rotate(${-rotationAngle}, ${pos.x * 0.5}, ${pos.y * 0.5})`}
                          >
                            &#x2713;
                          </text>
                        </g>
                      )}
                      {/* Pre-signed indicator (blue checkmark) - only if not completed */}
                      {hasOwnerPreSigned && !hasCompleted && !isCycleComplete && (
                        <g>
                          <circle
                            cx={pos.x * 0.5}
                            cy={pos.y * 0.5}
                            r="8"
                            fill="rgba(59, 130, 246, 0.9)"
                          />
                          <text
                            x={pos.x * 0.5}
                            y={pos.y * 0.5 + 3}
                            textAnchor="middle"
                            fill="white"
                            fontSize="10"
                            transform={`rotate(${-rotationAngle}, ${pos.x * 0.5}, ${pos.y * 0.5})`}
                          >
                            &#x2713;
                          </text>
                        </g>
                      )}
                      {/* Contract node - clickable with hover zoom effect */}
                      <g
                        className="cursor-pointer"
                        style={{ transition: 'transform 0.2s ease-out' }}
                        transform={`translate(${pos.x}, ${pos.y}) scale(${scale}) translate(${-pos.x}, ${-pos.y})`}
                        onClick={(e) => handleNodeClick(e, 'peripheral', contractAddr, contractOwners.get(contractAddr) || null, index + 1, isMyContractNode)}
                        onMouseEnter={() => setHoveredScIndex(index)}
                        onMouseLeave={() => setHoveredScIndex(null)}
                      >
                        {/* Badge showing 360 cycle count - ALWAYS visible, positioned on outer side */}
                        {(() => {
                          const peripheralStats = scStats.get(contractAddr)
                          const peripheralCycles = peripheralStats?.cyclesCompleted || 0
                          const orbitData = getOrbitingCirclesData(peripheralCycles)

                          // Calculate outward direction from SC0 center (0,0) to this peripheral
                          const distFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y)
                          const dirX = pos.x / distFromCenter
                          const dirY = pos.y / distFromCenter
                          const badgeDistance = 38 // Distance from peripheral center to badge

                          // Badge position: peripheral position + outward direction * badgeDistance
                          const badgeX = pos.x + dirX * badgeDistance
                          const badgeY = pos.y + dirY * badgeDistance

                          return (
                            <g>
                              <circle
                                cx={badgeX}
                                cy={badgeY}
                                r="8"
                                fill={orbitData.completed360Cycles > 0 ? "rgba(255, 215, 0, 0.9)" : "rgba(128, 128, 128, 0.6)"}
                                stroke="rgba(255, 255, 255, 0.3)"
                                strokeWidth="1"
                              />
                              <text
                                x={badgeX}
                                y={badgeY + 3}
                                textAnchor="middle"
                                fill="white"
                                fontSize="7"
                                fontWeight="bold"
                                transform={`rotate(${-rotationAngle}, ${badgeX}, ${badgeY})`}
                              >
                                {orbitData.completed360Cycles}
                              </text>
                            </g>
                          )
                        })()}

                        {/* Orbiting circles - only visible on hover */}
                        {isHovered && (() => {
                          const peripheralStats = scStats.get(contractAddr)
                          const peripheralCycles = peripheralStats?.cyclesCompleted || 0
                          const orbitData = getOrbitingCirclesData(peripheralCycles)
                          const orbitRadius = 50 // Outside the badge
                          const orbitingCircleRadius = 5
                          const peripheralOrbitAngle = (rotationAngle * 5) % 360

                          if (orbitData.numOrbitingCircles > 0 || orbitData.completed360Cycles > 0) {
                            const numCircles = orbitData.numOrbitingCircles > 0 ? orbitData.numOrbitingCircles : 1
                            return (
                              <g transform={`rotate(${-rotationAngle}, ${pos.x}, ${pos.y})`}>
                                {/* Orbit path */}
                                <circle
                                  cx={pos.x}
                                  cy={pos.y}
                                  r={orbitRadius}
                                  fill="none"
                                  stroke={orbitData.completed360Cycles > 0 ? "rgba(255, 215, 0, 0.4)" : "rgba(168, 85, 247, 0.3)"}
                                  strokeWidth="1"
                                  strokeDasharray="2,2"
                                />
                                {/* Orbiting circles - rotating around the peripheral center */}
                                {Array.from({ length: numCircles }).map((_, i) => {
                                  const baseAngle = (i * 360) / numCircles
                                  const currentAngle = (baseAngle + peripheralOrbitAngle) % 360
                                  const ox = pos.x + orbitRadius * Math.cos((currentAngle * Math.PI) / 180)
                                  const oy = pos.y + orbitRadius * Math.sin((currentAngle * Math.PI) / 180)
                                  return (
                                    <g key={`peripheral-orbit-${i}`}>
                                      <circle
                                        cx={ox}
                                        cy={oy}
                                        r={orbitingCircleRadius}
                                        fill={orbitData.completed360Cycles > 0 ? "rgba(255, 215, 0, 0.9)" : "rgba(168, 85, 247, 0.8)"}
                                        stroke="rgba(255, 255, 255, 0.5)"
                                        strokeWidth="1"
                                      />
                                    </g>
                                  )
                                })}
                              </g>
                            )
                          }
                          return null
                        })()}

                        {/* Sun glow effect for user's SC (MOI) - pulsing rays */}
                        {isMyContractNode && (
                          <>
                            {/* Outer pulsing glow */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="42"
                              fill="none"
                              stroke="rgba(59, 130, 246, 0.3)"
                              strokeWidth="4"
                              className="animate-ping"
                              style={{ animationDuration: '2s' }}
                            />
                            {/* Middle glow ring */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="38"
                              fill="none"
                              stroke="rgba(59, 130, 246, 0.5)"
                              strokeWidth="3"
                              className="animate-pulse"
                            />
                            {/* Inner bright ring */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="34"
                              fill="none"
                              stroke="rgba(147, 197, 253, 0.6)"
                              strokeWidth="2"
                            />
                          </>
                        )}

                        {/* CURRENT TURN - Blinking glow effect (orange/gold) */}
                        {isCurrent && (
                          <>
                            {/* Outer pulsing ping effect */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="50"
                              fill="none"
                              stroke="rgba(251, 191, 36, 0.4)"
                              strokeWidth="4"
                              className="animate-ping"
                              style={{ animationDuration: '1.5s' }}
                            />
                            {/* Middle pulsing glow */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="42"
                              fill="none"
                              stroke="rgba(251, 191, 36, 0.6)"
                              strokeWidth="3"
                              className="animate-pulse"
                            />
                            {/* Inner bright ring */}
                            <circle
                              cx={pos.x}
                              cy={pos.y}
                              r="36"
                              fill="none"
                              stroke="rgba(253, 224, 71, 0.7)"
                              strokeWidth="2"
                            />
                          </>
                        )}

                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="30"
                          fill={`url(#${gradientId})`}
                          className={`filter ${isHovered ? 'drop-shadow-xl' : isCurrent ? 'drop-shadow-lg' : 'drop-shadow-md'}`}
                          stroke={isHovered ? 'rgba(255,255,255,0.5)' : isCurrent ? 'rgba(253, 224, 71, 0.9)' : isMyContractNode ? 'rgba(147, 197, 253, 0.8)' : 'none'}
                          strokeWidth={isHovered ? '2' : isCurrent ? '3' : isMyContractNode ? '2' : '0'}
                        />
                        {/* Textes des noeuds avec contre-rotation pour rester horizontaux */}
                        <g transform={`rotate(${-rotationAngle}, ${pos.x}, ${pos.y})`}>
                          <text x={pos.x} y={pos.y - 10} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">
                            SC{index + 1}
                          </text>
                          <text x={pos.x} y={pos.y + 2} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="6">
                            {peripheralBalances.get(contractAddr) || '0'} EGLD
                          </text>
                          <text x={pos.x} y={pos.y + 14} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="6">
                            {isCycleComplete ? 'FAIT' : isMyContractNode ? 'MOI' : hasCompleted ? 'FAIT' : isCurrent ? 'TOUR' : hasOwnerPreSigned ? 'PRE' : 'ACTIF'}
                          </text>
                        </g>
                      </g>
                    </g>
                  )
                })}
                </g>
                {/* Fin du groupe qui tourne */}

                {/* SC0 - Center (rendered last to be on top of lines and checkmarks) - FIXE, ne tourne pas */}
                {/* SC0 with hover zoom effect */}
                {(() => {
                  const sc0Scale = hoveredSc0 ? 1.3 : 1
                  return (
                    <g
                      className="cursor-pointer"
                      style={{ transition: 'transform 0.2s ease-out' }}
                      transform={`scale(${sc0Scale})`}
                      onClick={(e) => handleNodeClick(e, 'sc0', CIRCLE_OF_LIFE_ADDRESS, sc0Owner, 0, false)}
                      onMouseEnter={() => setHoveredSc0(true)}
                      onMouseLeave={() => setHoveredSc0(false)}
                    >
                      {/* Permanent sun glow effect around SC0 - always visible */}
                      <>
                        {/* Outermost pulsing glow ray */}
                        <circle
                          cx="0"
                          cy="0"
                          r="55"
                          fill="none"
                          stroke={isCycleComplete ? "rgba(34, 197, 94, 0.2)" : "rgba(168, 85, 247, 0.15)"}
                          strokeWidth="6"
                          className="animate-ping"
                          style={{ animationDuration: '3s' }}
                        />
                        {/* Outer glow ring */}
                        <circle
                          cx="0"
                          cy="0"
                          r="48"
                          fill="none"
                          stroke={isCycleComplete ? "rgba(34, 197, 94, 0.3)" : "rgba(168, 85, 247, 0.25)"}
                          strokeWidth="4"
                          className="animate-pulse"
                          style={{ animationDuration: '2s' }}
                        />
                        {/* Middle glow ring */}
                        <circle
                          cx="0"
                          cy="0"
                          r="43"
                          fill="none"
                          stroke={isCycleComplete ? "rgba(34, 197, 94, 0.5)" : "rgba(168, 85, 247, 0.4)"}
                          strokeWidth="3"
                        />
                        {/* Inner bright ring */}
                        <circle
                          cx="0"
                          cy="0"
                          r="39"
                          fill="none"
                          stroke={isCycleComplete ? "rgba(134, 239, 172, 0.6)" : "rgba(196, 181, 253, 0.5)"}
                          strokeWidth="2"
                        />
                      </>

                      {/* Additional glow effect when cycle is complete */}
                      {isCycleComplete && (
                        <circle
                          cx="0"
                          cy="0"
                          r="60"
                          fill="none"
                          stroke="rgba(34, 197, 94, 0.3)"
                          strokeWidth="8"
                          className="animate-ping"
                          style={{ animationDuration: '1.5s' }}
                        />
                      )}

                      {/* Main SC0 circle */}
                      <circle
                        cx="0"
                        cy="0"
                        r="35"
                        fill={isCycleComplete ? "url(#sc0CompleteGradient)" : "url(#sc0Gradient)"}
                        className={`filter ${hoveredSc0 ? 'drop-shadow-xl' : 'drop-shadow-lg'} ${isCycleComplete ? 'animate-pulse' : ''}`}
                        stroke={hoveredSc0 ? 'rgba(255,255,255,0.5)' : isCycleComplete ? 'rgba(134, 239, 172, 0.8)' : 'rgba(196, 181, 253, 0.6)'}
                        strokeWidth={hoveredSc0 ? '3' : '2'}
                      />
                      <text x="0" y="-5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">SC0</text>
                      <text x="0" y="10" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="8">
                        {isCycleComplete ? 'COMPLET!' : 'CENTRE'}
                      </text>
                      <text x="0" y="22" textAnchor="middle" fill={isCycleComplete ? "rgba(34, 197, 94, 0.9)" : "rgba(255,255,255,0.5)"} fontSize="6">
                        {contractBalance} EGLD
                      </text>

                      {/* Orbiting circles based on cycles completed (30 cycles = 1 circle, max 12) - RENDERED LAST (on top of glow) */}
                      {(() => {
                        const orbitData = getOrbitingCirclesData(cycleStats.cyclesCompleted)
                        const orbitRadius = 50 // Distance from center
                        const orbitingCircleRadius = 8
                        // Use rotationAngle * 3 for faster orbit speed (3x faster than main rotation)
                        const orbitAngle = (rotationAngle * 3) % 360

                        // If we have completed 360 cycles but no remaining cycles, show badge with count
                        if (orbitData.completed360Cycles > 0 && orbitData.numOrbitingCircles === 0) {
                          // Single orbiting circle position
                          const x = orbitRadius * Math.cos((orbitAngle * Math.PI) / 180)
                          const y = orbitRadius * Math.sin((orbitAngle * Math.PI) / 180)
                          return (
                            <g>
                              {/* Orbit path */}
                              <circle
                                cx="0"
                                cy="0"
                                r={orbitRadius}
                                fill="none"
                                stroke="rgba(255, 215, 0, 0.3)"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                              />
                              {/* Single orbiting circle with 360 completion count */}
                              <circle
                                cx={x}
                                cy={y}
                                r={orbitingCircleRadius + 2}
                                fill="url(#sc0Gradient)"
                                stroke="rgba(255, 215, 0, 0.8)"
                                strokeWidth="2"
                              />
                              <text
                                x={x}
                                y={y + 3}
                                textAnchor="middle"
                                fill="white"
                                fontSize="8"
                                fontWeight="bold"
                              >
                                {orbitData.completed360Cycles}
                              </text>
                            </g>
                          )
                        }

                        // Show orbiting circles based on progress toward next 360
                        if (orbitData.numOrbitingCircles > 0) {
                          return (
                            <g>
                              {/* Orbit path */}
                              <circle
                                cx="0"
                                cy="0"
                                r={orbitRadius}
                                fill="none"
                                stroke="rgba(168, 85, 247, 0.3)"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                              />
                              {/* Orbiting circles - positioned based on orbitAngle */}
                              {Array.from({ length: orbitData.numOrbitingCircles }).map((_, i) => {
                                const baseAngle = (i * 360) / orbitData.numOrbitingCircles
                                const currentAngle = (baseAngle + orbitAngle) % 360
                                const x = orbitRadius * Math.cos((currentAngle * Math.PI) / 180)
                                const y = orbitRadius * Math.sin((currentAngle * Math.PI) / 180)
                                return (
                                  <g key={`sc0-orbit-${i}`}>
                                    <circle
                                      cx={x}
                                      cy={y}
                                      r={orbitingCircleRadius}
                                      fill={i === 0 && orbitData.completed360Cycles > 0 ? "url(#sc0Gradient)" : "rgba(168, 85, 247, 0.8)"}
                                      stroke="rgba(255, 255, 255, 0.5)"
                                      strokeWidth="1"
                                    />
                                    {/* Show 360 completion count on first circle if > 0 */}
                                    {i === 0 && orbitData.completed360Cycles > 0 && (
                                      <text
                                        x={x}
                                        y={y + 3}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="7"
                                        fontWeight="bold"
                                      >
                                        {orbitData.completed360Cycles}
                                      </text>
                                    )}
                                  </g>
                                )
                              })}
                            </g>
                          )
                        }

                        return null
                      })()}
                    </g>
                  )
                })()}
              </svg>

            </div>

            {/* Legend - responsive grid on mobile */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-4 mt-3 sm:mt-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 ${isCycleComplete ? 'bg-gradient-to-r from-green-500 to-green-700' : 'bg-gradient-to-r from-purple-500 to-indigo-500'}`}></div>
                <span className="text-gray-300 text-xs sm:text-sm">SC0</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-gradient-to-r from-green-500 to-green-600"></div>
                <span className="text-gray-300 text-xs sm:text-sm">{t('circle.legend.active', 'Active')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                <span className="text-gray-300 text-xs sm:text-sm">{t('circle.legend.turn', 'Turn')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                <span className="text-gray-300 text-xs sm:text-sm">{t('circle.legend.me', 'Me')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-gradient-to-r from-blue-400 to-blue-500"></div>
                <span className="text-gray-300 text-xs sm:text-sm">{t('circle.legend.preSigned', 'Pre-signed')}</span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0 bg-gradient-to-r from-green-300 to-green-500"></div>
                <span className="text-gray-300 text-xs sm:text-sm">{t('circle.legend.signed', 'Signed')}</span>
              </div>
            </div>

            {/* Cycle Complete Banner */}
            {isCycleComplete && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-500/20 border border-green-500/50 rounded-lg sm:rounded-xl text-center">
                <p className="text-green-300 font-bold text-base sm:text-lg">{t('circle.cycleCompleted', 'Cycle')} #{cycleDay} {t('circle.completed', 'Completed')}!</p>
                <p className="text-green-200/80 text-xs sm:text-sm mt-1">
                  {t('circle.fundsReturned', 'Funds')} ({circulationAmount} EGLD) {t('circle.returnedToSC0', 'returned to SC0')}.
                </p>
              </div>
            )}

            {/* Actions - Moved under visualization */}
            <div className="mt-4 sm:mt-6 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Actions</h3>

              <div className="space-y-3">
                {!myContract ? (
                  <button
                    onClick={() => setShowReferralModal(true)}
                    disabled={isPaused || isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition"
                  >
                    {t('circle.joinCircle', 'Join the Circle')} ({creationFee} EGLD)
                  </button>
                ) : (
                  <>
                    {/* Bouton pour traiter TOUS les transferts en attente en une seule transaction */}
                    {/* Ne pas afficher si le cycle est en timeout (echec) - il faut d'abord declarer l'echec */}
                    {pendingAutoTransfers > 0 && !isCycleInTimeout && (
                      <button
                        onClick={() => setShowProcessModal(true)}
                        disabled={isPaused || isLoading}
                        className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition animate-pulse shadow-lg shadow-cyan-500/50"
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span className="text-lg">⚡</span>
                          {t('circle.executeTransfers', 'Execute {{count}} transfer(s) in 1 click', { count: pendingAutoTransfers })}
                          <span className="text-lg">⚡</span>
                        </span>
                      </button>
                    )}

                    {/* Boutons de signature - seulement si le cycle est demarre (cycleHolder existe) et PAS en timeout */}
                    {cycleHolder && !isCycleInTimeout && (
                      <>
                        {/* Bouton Signer - seulement si c'est son tour et pas banni */}
                        {isMyTurn && !isMyScBanned && (
                          <button
                            onClick={() => setShowSignModal(true)}
                            disabled={isPaused || isLoading}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition animate-pulse"
                          >
                            {t('circle.signTransfer', 'Sign Transfer')} ({t('circle.itsYourTurn', "It's your turn")}!)
                          </button>
                        )}

                        {/* Bouton Pre-signer - si pas encore pre-signe, pas son tour, pas deja signe, et pas banni */}
                        {!hasPreSigned && !isMyTurn && !hasSignedThisCycle && !isMyScBanned && (
                          <button
                            onClick={() => setShowPreSignModal(true)}
                            disabled={isPaused || isLoading}
                            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
                          >
                            {t('circle.preSignInAdvance', 'Pre-sign in advance')}
                          </button>
                        )}

                        {/* Indicateur pre-signature */}
                        {hasPreSigned && !isMyTurn && !hasSignedThisCycle && (
                          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                            <p className="text-blue-300 text-sm text-center">
                              {t('circle.alreadyPreSigned', 'You have already pre-signed')}
                            </p>
                            <p className="text-blue-400/70 text-xs text-center mt-1">
                              {t('circle.transferAutoExecute', 'The transfer will execute automatically when it is your turn')}
                            </p>
                          </div>
                        )}

                        {/* Indicateur tour termine */}
                        {hasSignedThisCycle && !isMyTurn && (
                          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                            <p className="text-green-300 text-sm text-center">
                              &#x2713; {t('circle.turnCompleted', 'Your turn is completed for this cycle')}
                            </p>
                            <p className="text-green-400/70 text-xs text-center mt-1">
                              {t('circle.alreadySignedTransferred', 'You have already signed and transferred')}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Section Auto-Sign */}
                    {!isMyScBanned && (
                      <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-purple-300 font-semibold text-sm">{t('circle.autoSign', 'Auto-Signature')}</h4>
                          {autoSignStatus.isPermanent && (
                            <span className="px-2 py-1 bg-purple-500/30 text-purple-300 text-xs rounded-full">
                              {t('circle.permanent', 'Permanent')}
                            </span>
                          )}
                        </div>

                        {/* Status actuel */}
                        {autoSignStatus.isPermanent ? (
                          <div className="p-2 bg-purple-500/20 rounded-lg">
                            <p className="text-purple-300 text-xs text-center">
                              {t('circle.permanentAutoSignActive', 'Permanent auto-sign enabled')}
                            </p>
                            <p className="text-purple-400/70 text-xs text-center mt-1">
                              {t('circle.cyclesSignedIndefinitely', 'Your cycles will be signed automatically indefinitely')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-purple-400/70 text-xs text-center">
                            {t('circle.enableAutoSignDesc', 'Enable auto-sign so you do not have to sign manually every day')}
                          </p>
                        )}

                        {/* Boutons */}
                        <div className="flex gap-2">
                          {!autoSignStatus.isPermanent && (
                            <button
                              onClick={() => setShowAutoSignModal(true)}
                              disabled={isPaused || isLoading}
                              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg transition text-sm animate-pulse shadow-lg shadow-purple-500/50"
                            >
                              <span className="flex items-center justify-center gap-2">
                                <span className="text-lg">✨</span>
                                {t('circle.enableAutoSign', 'Enable Auto-Sign')}
                                <span className="text-lg">✨</span>
                              </span>
                            </button>
                          )}

                          {autoSignStatus.isPermanent && (
                            <button
                              onClick={() => setShowDisableAutoSignModal(true)}
                              disabled={isPaused || isLoading}
                              className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white font-semibold py-2 px-3 rounded-lg transition text-sm"
                            >
                              {t('circle.disable', 'Desactiver')}
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Message quand le cycle n'est pas demarre */}
                    {!cycleHolder && !isCycleComplete && (
                      <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                        <p className="text-orange-300 text-sm text-center">
                          {t('circle.cycleNotStarted', 'The daily cycle has not started yet')}
                        </p>
                        <p className="text-orange-400/70 text-xs text-center mt-1">
                          {t('circle.waitForStart', 'Wait for a member to start the cycle to pre-sign or sign')}
                        </p>
                      </div>
                    )}

                    {/* Member status card */}
                    <div className={`p-3 ${isMyScBanned ? 'bg-red-500/20 border-red-500/30' : isActive ? 'bg-green-500/20 border-green-500/30' : 'bg-gray-500/20 border-gray-500/30'} border rounded-lg`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`${isMyScBanned ? 'text-red-300' : isActive ? 'text-green-300' : 'text-gray-300'} text-sm`}>
                            {t('circle.youAreMember', 'You are a member of the circle')}
                          </p>
                          <p className={`${isMyScBanned ? 'text-red-400/70' : isActive ? 'text-green-400/70' : 'text-gray-400/70'} text-xs mt-1 font-mono`}>
                            {formatAddress(myContract)}
                          </p>
                          {isMyScBanned && banEndDate && (
                            <p className="text-red-400 text-xs mt-1">
                              {t('circle.banEnd', 'Ban ends')}: {banEndDate}
                            </p>
                          )}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-semibold ${isMyScBanned ? 'bg-red-500/30 text-red-300' : isActive ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'}`}>
                          {isMyScBanned ? t('circle.banned', 'Banned') : isActive ? t('circle.active', 'Active') : t('circle.inactive', 'Inactive')}
                        </div>
                      </div>
                    </div>

                    {/* Toggle Active/Inactive button */}
                    {isActive ? (
                      <button
                        onClick={() => setShowDeactivateModal(true)}
                        disabled={isPaused || isLoading}
                        className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                      >
                        {t('circle.deactivatePoint', 'Deactivate my node')}
                      </button>
                    ) : isMyScBanned ? (
                      <div className="space-y-2">
                        <button
                          disabled={true}
                          className="w-full bg-gradient-to-r from-red-800 to-red-900 opacity-50 cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                        >
                          {t('circle.reactivatePointBanned', 'Reactivate my node (Banned)')}
                        </button>
                        <p className="text-center text-xs text-red-400">
                          {t('circle.cannotReactivateBan', 'You cannot reactivate your node during the ban period')}
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowActivateModal(true)}
                        disabled={isPaused || isLoading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition text-sm"
                      >
                        {t('circle.reactivatePoint', 'Reactivate my node')}
                      </button>
                    )}
                  </>
                )}

                {/* Start cycle button - seulement si membre et le cycle n'est pas en cours */}
                {isMember && activeContractsCount > 0 && !cycleHolder && !isCycleComplete && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setShowStartCycleModal(true)}
                      disabled={isPaused || isLoading}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition animate-pulse shadow-lg shadow-orange-500/50"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-lg">🚀</span>
                        {t('circle.startDailyCycle', 'Start Daily Cycle')}
                        {starterBonusInfo.percentage > 0 && (
                          <span className="text-cyan-200 text-sm">⭐ +{(starterBonusInfo.percentage / 100).toFixed(0)}%</span>
                        )}
                        <span className="text-lg">🚀</span>
                      </span>
                    </button>
                    {starterBonusInfo.percentage > 0 && (
                      <p className="text-cyan-400 text-xs text-center">
                        {t('circle.bonusForStart', 'Bonus')}: +{starterBonusInfo.potentialBonus} XCX {t('circle.toStart', 'to start')}!
                      </p>
                    )}
                    <p className="text-center text-xs text-gray-400">
                      {t('circle.launchCycleTransfers', 'Launch the cycle to start the transfers')}
                    </p>
                  </div>
                )}

                {/* Indicateur cycle en cours */}
                {cycleHolder && !isCycleInTimeout && (
                  <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-300 text-sm text-center font-semibold">
                      {t('circle.cycleInProgress', 'Cycle in progress')}
                    </p>
                    <p className="text-green-400/70 text-xs text-center mt-1">
                      {t('circle.cycleActiveMembers', 'The daily cycle is active - members can sign')}
                    </p>
                  </div>
                )}

                {/* Indicateur cycle en timeout + bouton pour declarer echec */}
                {isCycleInTimeout && (
                  <div className="space-y-3">
                    <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-300 text-sm text-center font-semibold">
                        {t('circle.cycleTimeout', 'Cycle in Timeout')}!
                      </p>
                      <p className="text-red-400/70 text-xs text-center mt-1">
                        {t('circle.cycleNotCompleted', 'Cycle')} #{cycleDay} {t('circle.notCompletedOnTime', 'was not completed on time')}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowFailCycleModal(true)}
                      disabled={isPaused || isLoading}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-lg transition"
                    >
                      {t('circle.declareCycleFailed', 'Declare Cycle Failed (Ban the responsible SC)')}
                    </button>
                    <p className="text-center text-xs text-red-400/70">
                      {t('circle.scBanned7Days', 'The blocking SC will be banned for 7 days')}
                    </p>
                  </div>
                )}

                {/* Indicateur cycle termine */}
                {isCycleComplete && (
                  <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                    <p className="text-purple-300 text-sm text-center font-semibold">
                      {t('circle.cycle', 'Cycle')} #{cycleDay} {t('circle.completed', 'completed')}!
                    </p>
                    <p className="text-purple-400/70 text-xs text-center mt-1">
                      {t('circle.allMembersSigned', 'All members have signed. Next cycle tomorrow.')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Comment ca marche - Liste verticale */}
            <div className="mt-4 sm:mt-6 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
              <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">{t('circle.howItWorks', 'How does it work?')}</h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/30 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                  <span className="text-gray-300 text-sm">{t('circle.step1', 'Pay {{fee}} EGLD to create your smart contract', { fee: creationFee })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/30 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                  <span className="text-gray-300 text-sm">{t('circle.step2', 'SC0 becomes co-owner with you')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/30 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <span className="text-gray-300 text-sm">{t('circle.step3', 'Every day, {{amount}} EGLD transits between SCs', { amount: circulationAmount })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/30 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <span className="text-gray-300 text-sm">{t('circle.step4', 'Sign before midnight (UTC) to validate the transfer')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-purple-500/30 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">5</span>
                  <span className="text-gray-300 text-sm">{t('circle.step5', 'If you do not sign, funds go to SC0')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Stats & Actions */}
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">

            {/* Cycle Status */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">{t('circle.circleStatus', 'Circle Status')}</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.totalContracts', 'Total contracts')}</span>
                  <span className="text-white font-semibold">{totalContracts}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.activeContracts', 'Active contracts')}</span>
                  <span className="text-white font-semibold">{activeContractsCount}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.currentPosition', 'Current position')}</span>
                  <span className="text-white font-semibold">
                    {isCycleComplete
                      ? t('circle.cycleFinished', 'Cycle finished')
                      : actualCurrentPosition >= 0
                        ? `SC${actualCurrentPosition + 1} / ${activeContractsCount}`
                        : 'N/A'}
                  </span>
                </div>

                {/* Cycle Holder - Debug info */}
                {cycleHolder && (
                  <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-300 text-sm">{t('circle.cycleHolder', 'Cycle holder')}</span>
                      <span className="text-amber-100 font-mono text-xs">
                        {formatAddress(cycleHolder)}
                      </span>
                    </div>
                    <p className="text-amber-200/70 text-xs mt-1">
                      {cycleHolder === myContract ? t('circle.itsYourTurnToSign', "It's YOUR turn to sign!") :
                       activeContracts.indexOf(cycleHolder) >= 0
                         ? `SC${activeContracts.indexOf(cycleHolder) + 1} ${t('circle.mustSign', 'must sign')}`
                         : t('circle.cycleFinished', 'Cycle finished')}
                    </p>
                  </div>
                )}

                {!cycleHolder && cycleDay > 0 && (
                  <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-300 text-sm text-center">
                      {t('circle.todayCycleFinished', "Today's cycle")} #{cycleDay} {t('circle.finished', 'finished')}!
                    </p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.circulatingAmount', 'Circulating amount')}</span>
                  <span className="text-white font-semibold">{circulationAmount} EGLD</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.nextCycleUTC', 'Next cycle (UTC)')}</span>
                  <span className="text-orange-400 font-semibold">{formatTimeRemaining()}</span>
                </div>

                {/* Progress bar */}
                {activeContractsCount > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{t('circle.progress', 'Progress')}</span>
                      <span className={isCycleComplete ? 'text-green-400 font-bold' : ''}>
                        {progressPercentage}%{isCycleComplete && ` - ${t('circle.finished', 'Finished')}!`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isCycleComplete
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    {isCycleComplete && (
                      <p className="text-green-400 text-xs mt-2 text-center animate-pulse">
                        {t('circle.cycleCompleteMessage', 'The cycle is complete! Funds have returned to the center (SC0)')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cycle Statistics */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4">{t('circle.cycleStatistics', 'Cycle Statistics')}</h3>

              <div className="space-y-4">
                {/* Total cycles */}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{t('circle.totalCycles', 'Total cycles')}</span>
                  <span className="text-white font-semibold">{cycleStats.totalCycles}</span>
                </div>

                {/* Success/Fail ratio */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Completed */}
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{cycleStats.cyclesCompleted}</div>
                    <div className="text-xs text-green-300">{t('circle.successful', 'Successful')}</div>
                  </div>

                  {/* Failed */}
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{cycleStats.cyclesFailed}</div>
                    <div className="text-xs text-red-300">{t('circle.failed', 'Failed')}</div>
                  </div>
                </div>

                {/* Success rate progress bar */}
                {cycleStats.totalCycles > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{t('circle.successRate', 'Success rate')}</span>
                      <span className={cycleStats.cyclesCompleted / cycleStats.totalCycles >= 0.8 ? 'text-green-400' : cycleStats.cyclesCompleted / cycleStats.totalCycles >= 0.5 ? 'text-yellow-400' : 'text-red-400'}>
                        {Math.round((cycleStats.cyclesCompleted / cycleStats.totalCycles) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div className="flex h-full">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-400 h-full transition-all duration-500"
                          style={{ width: `${(cycleStats.cyclesCompleted / cycleStats.totalCycles) * 100}%` }}
                        />
                        <div
                          className="bg-gradient-to-r from-red-500 to-red-400 h-full transition-all duration-500"
                          style={{ width: `${(cycleStats.cyclesFailed / cycleStats.totalCycles) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-green-400">{cycleStats.cyclesCompleted} {t('circle.successful', 'successful')}</span>
                      <span className="text-red-400">{cycleStats.cyclesFailed} {t('circle.failed', 'failed')}</span>
                    </div>
                  </div>
                )}

                {cycleStats.totalCycles === 0 && (
                  <p className="text-gray-400 text-sm text-center py-2">
                    {t('circle.noCyclesYet', 'No cycles completed yet')}
                  </p>
                )}
              </div>
            </div>

            {/* Rewards Section */}
            {myContract && (
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-xl overflow-hidden">
                <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <span>&#x1F3C6;</span> <span className="truncate">{t('circle.xcirclexRewards', 'XCIRCLEX Rewards')}</span>
                </h3>

                <div className="space-y-3 sm:space-y-4">
                  {/* Current day */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400 text-sm sm:text-base">{t('circle.dayUTC', 'Day (UTC)')}</span>
                    <span className={`font-semibold text-sm sm:text-base ${canClaim.isSunday ? 'text-green-400' : 'text-white'}`}>
                      {getDayName(dayOfWeek)}
                      {canClaim.isSunday && ' ✓'}
                    </span>
                  </div>

                  {/* Pending rewards */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400 text-sm sm:text-base truncate">{t('circle.myRewards', 'My rewards')}</span>
                    <span className={`font-bold text-sm sm:text-lg flex-shrink-0 ${parseFloat(pendingRewards) > 0 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {pendingRewards} XCX
                    </span>
                  </div>

                  {/* Reward per cycle */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400 text-sm sm:text-base truncate">{t('circle.rewardPerCycle', 'Reward/cycle')}</span>
                    <span className="text-white text-sm sm:text-base flex-shrink-0">{rewardsInfo.rewardPerCycle} XCX</span>
                  </div>

                  {/* Potential reward with bonuses */}
                  {myContract && (
                    <div className="mt-2 p-2 sm:p-3 bg-gradient-to-r from-yellow-500/10 to-green-500/10 border border-yellow-500/30 rounded-lg overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-2">
                        <span className="text-yellow-300 font-semibold text-sm sm:text-base truncate">{t('circle.potentialReward', 'Potential reward')}</span>
                        <span className="text-green-400 font-bold text-base sm:text-lg">
                          {(() => {
                            const scCount = activeContracts.length || 1;
                            const totalReward = parseFloat(rewardsInfo.rewardPerCycle) || 0;
                            const basePerSc = totalReward / scCount;
                            const pioneerBonus = pioneerInfo.isPioneer ? basePerSc * (pioneerInfo.bonusPercentage / 10000) : 0;
                            const depositBonus = basePerSc * (depositBonusInfo.bonusBps / 10000);
                            // Starter bonus: 10% of base/SC, only if user started the cycle
                            // cycleStarter contains the WALLET address, not the SC address
                            const isStarterActive = starterBonusInfo.percentage > 0 && starterBonusInfo.cycleStarter === address;
                            const starterBonus = isStarterActive ? parseFloat(starterBonusInfo.potentialBonus) || 0 : 0;
                            const total = basePerSc + pioneerBonus + depositBonus + starterBonus;
                            return total.toFixed(2);
                          })()} XCX
                        </span>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-gray-400 gap-2">
                          <span className="truncate">Base (/{activeContracts.length || 1} SC)</span>
                          <span className="flex-shrink-0">{((parseFloat(rewardsInfo.rewardPerCycle) || 0) / (activeContracts.length || 1)).toFixed(2)}</span>
                        </div>
                        {/* Starter bonus - active only if user started the cycle */}
                        {starterBonusInfo.percentage > 0 && (
                          <div className={`flex justify-between items-center gap-2 ${starterBonusInfo.cycleStarter === address ? 'text-cyan-400' : 'text-gray-500'}`}>
                            <span className="truncate">
                              + Starter (+{(starterBonusInfo.percentage / 100).toFixed(1)}%)
                              {starterBonusInfo.cycleStarter !== address && <span className="ml-1 text-gray-600">({t('circle.inactive', 'inactive')})</span>}
                            </span>
                            <span className="flex-shrink-0">
                              {starterBonusInfo.cycleStarter === address
                                ? `+${starterBonusInfo.potentialBonus}`
                                : '-'}
                            </span>
                          </div>
                        )}
                        {pioneerInfo.isPioneer && (
                          <div className="flex justify-between items-center text-emerald-400 gap-2">
                            <span className="truncate">+ Pioneer (+{(pioneerInfo.bonusPercentage / 100).toFixed(2)}%)</span>
                            <span className="flex-shrink-0">+{(((parseFloat(rewardsInfo.rewardPerCycle) || 0) / (activeContracts.length || 1)) * pioneerInfo.bonusPercentage / 10000).toFixed(2)}</span>
                          </div>
                        )}
                        {depositBonusInfo.bonusPercent > 0 && (
                          <div className="flex justify-between items-center text-amber-400 gap-2">
                            <span className="truncate">+ {t('circle.deposit', 'Deposit')} (+{depositBonusInfo.bonusPercent}%)</span>
                            <span className="flex-shrink-0">+{(((parseFloat(rewardsInfo.rewardPerCycle) || 0) / (activeContracts.length || 1)) * depositBonusInfo.bonusBps / 10000).toFixed(2)}</span>
                          </div>
                        )}
                        {referralBonusInfo.bonusPercent > 0 && (
                          <div className="flex justify-between items-center text-pink-400 gap-2">
                            <span className="truncate">+ {t('circle.referral', 'Referral')} (+{referralBonusInfo.bonusPercent}%)</span>
                            <span className="flex-shrink-0">+{(((parseFloat(rewardsInfo.rewardPerCycle) || 0) / (activeContracts.length || 1)) * referralBonusInfo.bonusBps / 10000).toFixed(2)}</span>
                          </div>
                        )}
                        {!pioneerInfo.isPioneer && depositBonusInfo.bonusPercent === 0 && referralBonusInfo.bonusPercent === 0 && starterBonusInfo.percentage === 0 && (
                          <div className="text-gray-500 text-center text-xs">
                            {t('circle.depositOrPioneer', 'Deposit EGLD or become a pioneer!')}
                          </div>
                        )}
                        <div className="flex justify-between items-center text-green-300 font-semibold pt-1 border-t border-green-500/20">
                          <span>Total bonus</span>
                          <span>+{(() => {
                            // Only count starter if active for this user (compare with wallet address, not SC)
                            const isStarterActive = starterBonusInfo.percentage > 0 && starterBonusInfo.cycleStarter === address;
                            const starterPct = isStarterActive ? starterBonusInfo.percentage / 100 : 0;
                            const pioneerPct = pioneerInfo.isPioneer ? pioneerInfo.bonusPercentage / 100 : 0;
                            const depositPct = depositBonusInfo.bonusPercent;
                            const referralPct = referralBonusInfo.bonusPercent;
                            return (starterPct + pioneerPct + depositPct + referralPct).toFixed(2);
                          })()}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rewards pool */}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-400 text-sm sm:text-base truncate">Pool</span>
                    <span className="text-white text-sm sm:text-base flex-shrink-0">{rewardsInfo.rewardsPool} XCX</span>
                  </div>

                  {/* Total distributed */}
                  <div className="flex justify-between items-center gap-2 text-xs sm:text-sm">
                    <span className="text-gray-500 truncate">{t('circle.totalDistributed', 'Total distributed')}</span>
                    <span className="text-gray-400 flex-shrink-0">{rewardsInfo.totalRewardsDistributed} XCX</span>
                  </div>

                  {/* Burn Stats Section */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-red-500/20">
                    <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <span>&#x1F525;</span> {t('circle.burn', 'Burn')}
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.burnPerScCycle', 'Burn/SC/cycle')}</span>
                        <span className="text-red-300 flex-shrink-0">{burnStats.burnPerSc} XCX</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.nextBurn', 'Next burn')}</span>
                        <span className="text-red-400 flex-shrink-0">{burnStats.estimatedNextBurn} XCX</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-500 truncate">{t('circle.totalBurned', 'Total burned')}</span>
                        <span className="text-red-500 font-bold flex-shrink-0">{burnStats.totalBurned} XCX</span>
                      </div>
                    </div>
                  </div>

                  {/* Starter Bonus Section */}
                  {starterBonusInfo.percentage > 0 && (
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-cyan-500/20">
                      <h4 className="text-cyan-400 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                        <span>&#x2B50;</span> {t('circle.starter', 'Starter')}
                      </h4>
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-400 truncate">{t('circle.bonus', 'Bonus')}</span>
                          <span className="text-cyan-300 font-bold flex-shrink-0">+{(starterBonusInfo.percentage / 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-400 truncate">{t('circle.potential', 'Potential')}</span>
                          <span className="text-cyan-400 flex-shrink-0">
                            {starterBonusInfo.potentialBonus} XCX
                          </span>
                        </div>
                        {starterBonusInfo.cycleStarter && (
                          <div className="flex justify-between items-center gap-2">
                            <span className="text-gray-400 truncate">{t('circle.startedBy', 'Started by')}</span>
                            <span className={`font-mono text-xs flex-shrink-0 ${starterBonusInfo.cycleStarter === address ? 'text-green-400 font-bold' : 'text-cyan-300'}`}>
                              {starterBonusInfo.cycleStarter === address ? t('circle.you', 'YOU') + '!' : formatAddress(starterBonusInfo.cycleStarter)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-500 truncate">{t('circle.totalDistributed', 'Total distributed')}</span>
                          <span className="text-cyan-500 flex-shrink-0">{starterBonusInfo.totalDistributed} XCX</span>
                        </div>
                      </div>
                      {!cycleHolder && !starterBonusInfo.cycleStarter && (
                        <p className="text-cyan-400/70 text-xs mt-2 text-center">
                          {t('circle.startCycleForBonus', 'Start the cycle for the bonus!')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* π × 360 Halving System */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-purple-500/20">
                    <h4 className="text-purple-400 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <span>&#x03C0;</span> <span className="truncate">{t('circle.piSystem', 'System πx360')}</span>
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.reward', 'Reward')}</span>
                        <span className="text-purple-300 font-bold flex-shrink-0">{optionFInfo.currentReward || rewardsInfo.rewardPerCycle} XCX</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.era', 'Era')}</span>
                        <span className="text-purple-300 flex-shrink-0">{t('circle.era', 'Era')} {optionFInfo.currentEra}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.halving', 'Halving')}</span>
                        <span className="text-purple-400 flex-shrink-0">{t('circle.in', 'In')} {optionFInfo.cyclesUntilHalving} {t('circle.cycles', 'cycles')}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.fullCircle', 'Full circle')}</span>
                        <span className="text-purple-300 flex-shrink-0">#{optionFInfo.nextCircleComplete}</span>
                      </div>
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.piBonus', 'Bonus π%')}</span>
                        <span className="text-pink-400 font-bold flex-shrink-0">+{optionFInfo.piBonusAmount || ((parseFloat(rewardsInfo.rewardPerCycle) * 0.0314).toFixed(2))} XCX</span>
                      </div>
                    </div>
                    <p className="text-purple-400/60 text-xs mt-2 text-center">
                      {t('circle.halvingInfo', 'Halving /360 cycles - Bonus +3.14% at #360, #720...')}
                    </p>
                  </div>

                  {/* Pioneer Bonus Section */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-emerald-500/20">
                    <h4 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <span>&#x1F31F;</span> <span className="truncate">{t('circle.pioneerPi', 'Pioneer π%')}</span>
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      {/* User Pioneer Status */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.status', 'Status')}</span>
                        {pioneerInfo.isPioneer ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 flex-shrink-0">
                            <span className="animate-pulse">&#x2B50;</span> #{pioneerInfo.index}
                          </span>
                        ) : (
                          <span className="text-gray-500 flex-shrink-0">{t('circle.notPioneer', 'Not a pioneer')}</span>
                        )}
                      </div>

                      {/* Pioneer Bonus */}
                      {pioneerInfo.isPioneer && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-400 truncate">{t('circle.bonus', 'Bonus')}</span>
                          <span className="text-emerald-300 font-bold flex-shrink-0">+{(pioneerInfo.bonusPercentage / 100).toFixed(2)}%</span>
                        </div>
                      )}

                      {/* Pioneer Slots */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.slots', 'Slots')}</span>
                        <span className={`font-semibold flex-shrink-0 ${pioneerInfo.remainingSlots > 0 ? 'text-emerald-300' : 'text-gray-500'}`}>
                          {pioneerInfo.totalPioneers}/360
                        </span>
                      </div>

                      {/* Remaining slots */}
                      {pioneerInfo.remainingSlots > 0 && (
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-gray-400 truncate">{t('circle.remaining', 'Remaining')}</span>
                          <span className="text-emerald-400 font-bold flex-shrink-0">{pioneerInfo.remainingSlots}</span>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                            style={{ width: `${(pioneerInfo.totalPioneers / 360) * 100}%` }}
                          />
                        </div>
                        <p className="text-emerald-400/60 text-xs mt-1 text-center">
                          {((pioneerInfo.totalPioneers / 360) * 100).toFixed(1)}% {t('circle.allocated', 'allocated')}
                        </p>
                      </div>
                    </div>
                    <p className="text-emerald-400/60 text-xs mt-2 text-center">
                      {t('circle.first360SC', 'First 360 SC = +3.14% permanent')}
                    </p>
                  </div>

                  {/* Deposit Bonus Section */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-amber-500/20">
                    <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2 text-sm sm:text-base">
                      <span>&#x1F4B0;</span> <span className="truncate">{t('circle.depositEGLD', 'EGLD Deposit')}</span>
                    </h4>
                    <div className="space-y-2 text-xs sm:text-sm">
                      {/* Deposit bonus info */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.deposits', 'Deposits')}</span>
                        <span className={`font-semibold flex-shrink-0 ${parseFloat(depositBonusInfo.totalDeposits) > 0 ? 'text-amber-300' : 'text-gray-500'}`}>
                          {parseFloat(depositBonusInfo.totalDeposits).toFixed(2)} EGLD
                        </span>
                      </div>

                      {/* Current bonus */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.bonus', 'Bonus')}</span>
                        <span className={`font-bold flex-shrink-0 ${depositBonusInfo.bonusPercent > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                          +{depositBonusInfo.bonusPercent}%
                        </span>
                      </div>

                      {/* Max bonus */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.max', 'Max')}</span>
                        <span className="text-amber-300/70 flex-shrink-0">+{depositBonusInfo.maxBonusPercent}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                            style={{ width: `${(depositBonusInfo.bonusPercent / depositBonusInfo.maxBonusPercent) * 100}%` }}
                          />
                        </div>
                        <p className="text-amber-400/60 text-xs mt-1 text-center">
                          {depositBonusInfo.bonusPercent}/{depositBonusInfo.maxBonusPercent}%
                        </p>
                      </div>

                      {/* Deposit input */}
                      {isMember && (
                        <div className="mt-3 pt-3 border-t border-amber-500/20">
                          <div className="flex gap-2">
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={rewardsDepositAmount}
                              onChange={(e) => setRewardsDepositAmount(e.target.value)}
                              className="flex-1 bg-gray-800 border border-amber-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                              placeholder="1"
                            />
                            <button
                              onClick={handleRewardsDeposit}
                              disabled={isRewardsDepositing || parseFloat(rewardsDepositAmount) <= 0}
                              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg transition text-sm"
                            >
                              {isRewardsDepositing ? '...' : t('circle.deposit', 'Deposit')}
                            </button>
                          </div>
                          <p className="text-amber-400/50 text-xs mt-1 text-center">
                            {t('circle.depositNote', 'Deposit EGLD to increase your bonus')}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-amber-400/60 text-xs mt-2 text-center">
                      1 EGLD = +1% (max 360 EGLD = 360%)
                    </p>
                  </div>

                  {/* Referral Bonus Section */}
                  <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-4 border border-pink-500/30">
                    <h4 className="text-pink-300 font-semibold mb-3 flex items-center gap-2">
                      <span>&#x1F381;</span> {t('circle.referralBonus', 'Referral Bonus')}
                    </h4>
                    <div className="space-y-2">
                      {/* Referrals count */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.referralsCount', 'Referrals')}</span>
                        <span className={`font-semibold flex-shrink-0 ${referralBonusInfo.count > 0 ? 'text-pink-300' : 'text-gray-500'}`}>
                          {referralBonusInfo.count}/360
                        </span>
                      </div>

                      {/* Current bonus */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.currentBonus', 'Current bonus')}</span>
                        <span className={`font-bold flex-shrink-0 ${referralBonusInfo.bonusPercent > 0 ? 'text-pink-400' : 'text-gray-500'}`}>
                          +{referralBonusInfo.bonusPercent}%
                        </span>
                      </div>

                      {/* Remaining slots */}
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-gray-400 truncate">{t('circle.remainingSlots', 'Remaining slots')}</span>
                        <span className="text-pink-300/70 flex-shrink-0">{referralBonusInfo.remainingSlots}</span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                            style={{ width: `${(referralBonusInfo.count / 360) * 100}%` }}
                          />
                        </div>
                        <p className="text-pink-400/60 text-xs mt-1 text-center">
                          {referralBonusInfo.bonusPercent}/360%
                        </p>
                      </div>

                      {/* Referral code (user's address) */}
                      {isMember && address && (
                        <div className="mt-3 pt-3 border-t border-pink-500/20">
                          <p className="text-gray-400 text-xs mb-2">{t('circle.yourReferralCode', 'Your referral code')}</p>
                          <div className="flex gap-2">
                            <div className="flex-1 bg-gray-800 border border-pink-500/30 rounded-lg px-3 py-2 text-pink-300 text-xs truncate">
                              {address}
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(address);
                                // Optional: show toast notification
                              }}
                              className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold px-3 py-2 rounded-lg transition text-sm"
                              title={t('circle.copyReferralCode', 'Copy referral code')}
                            >
                              &#x1F4CB;
                            </button>
                          </div>
                          <p className="text-pink-400/50 text-xs mt-2 text-center">
                            {t('circle.shareReferralNote', 'Share this code to earn +1% per referral!')}
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="text-pink-400/60 text-xs mt-2 text-center">
                      1 {t('circle.referral', 'referral')} = +1% (max 360 = 360%)
                    </p>
                  </div>

                  {/* Claim info */}
                  {!canClaim.isSunday && parseFloat(pendingRewards) > 0 && (
                    <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-lg">
                      <p className="text-orange-300 text-sm text-center">
                        &#x23F0; {t('circle.claimOnlySunday', 'Rewards can only be claimed on Sunday (UTC)')}
                      </p>
                      <p className="text-orange-200 text-xs text-center mt-1">
                        {t('circle.sundayUTCNote', 'Sunday UTC = Sunday 01:00 French time')}
                      </p>
                    </div>
                  )}

                  {canClaim.isSunday && parseFloat(pendingRewards) > 0 && (
                    <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                      <p className="text-green-300 text-sm text-center">
                        &#x2705; {t('circle.itsSundayClaim', "It's Sunday (UTC)! You can claim your rewards")}
                      </p>
                    </div>
                  )}

                  {/* Claim button */}
                  <button
                    onClick={() => setShowClaimRewardsModal(true)}
                    disabled={isPaused || isLoading || !canClaim.isSunday || parseFloat(pendingRewards) <= 0}
                    className={`w-full font-semibold py-3 px-4 rounded-lg transition ${
                      canClaim.isSunday && parseFloat(pendingRewards) > 0
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canClaim.isSunday
                      ? parseFloat(pendingRewards) > 0
                        ? `${t('circle.claim', 'Claim')} ${pendingRewards} XCIRCLEX`
                        : t('circle.noRewardsToClaim', 'No rewards to claim')
                      : `${t('circle.availableSunday', 'Available Sunday')} (${pendingRewards} XCIRCLEX)`}
                  </button>
                </div>
              </div>
            )}

            {/* Pre-signatures Status */}
            {preSignedMembers.length > 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-blue-300 mb-3">
                  {t('circle.preSignatures', 'Pre-signatures')} ({preSignedMembers.length})
                </h3>
                <p className="text-blue-200/70 text-sm mb-3">
                  {t('circle.preSignaturesDesc', 'These members have pre-signed. Their transfer will execute automatically.')}
                </p>
                <div className="space-y-2">
                  {preSignedMembers.slice(0, 5).map((member, index) => (
                    <div key={member} className="flex items-center gap-2 text-sm">
                      <span className="text-blue-400">&#x2713;</span>
                      <span className="text-blue-200 font-mono">{formatAddress(member)}</span>
                      {member === address && <span className="text-blue-400 text-xs">({t('circle.you', 'you')})</span>}
                    </div>
                  ))}
                  {preSignedMembers.length > 5 && (
                    <p className="text-blue-300/50 text-xs">
                      +{preSignedMembers.length - 5} {t('circle.others', 'others')}...
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Contracts List */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4">
            {t('circle.activeSmartContracts', 'Active Smart Contracts')} ({activeContracts.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="pb-3 pr-4">{t('circle.position', 'Position')}</th>
                  <th className="pb-3 pr-4">{t('circle.contractAddress', 'Contract Address')}</th>
                  <th className="pb-3 pr-4">{t('circle.owner', 'Owner')}</th>
                  <th className="pb-3 pr-4">{t('circle.successfulCycles', 'Successful Cycles')}</th>
                  <th className="pb-3 pr-4">{t('circle.failedCycles', 'Failed Cycles')}</th>
                  <th className="pb-3 pr-4">{t('circle.status', 'Status')}</th>
                  <th className="pb-3">{t('circle.turn', 'Turn')}</th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.map((contractAddr, index) => {
                  // Utiliser actualCurrentPosition (basé sur cycleHolder) au lieu de currentCycleIndex
                  const isCurrent = actualCurrentPosition === index && !isCycleComplete && isCycleActive
                  const isMyContractNode = myContract === contractAddr
                  // Only show as signed if cycle is active
                  const hasSigned = isCycleComplete || (isCycleActive && actualCurrentPosition >= 0 && index < actualCurrentPosition)
                  const stats = scStats.get(contractAddr)
                  const ownerAddress = contractOwners.get(contractAddr)
                  const isMyAccount = ownerAddress === address

                  return (
                    <tr key={contractAddr} className={`border-b border-white/5 hover:bg-white/5 ${isMyContractNode ? 'bg-blue-500/10' : ''} ${isCycleComplete ? 'bg-green-500/5' : ''}`}>
                      <td className="py-3 pr-4">
                        <span className={`px-2 py-1 rounded font-mono text-sm ${isCycleComplete ? 'bg-green-500/20 text-green-300' : 'bg-purple-500/20 text-purple-300'}`}>
                          SC{index + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={`${explorerUrl}/accounts/${contractAddr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-300 font-mono text-sm hover:text-blue-400 transition"
                        >
                          {formatAddress(contractAddr)}
                        </a>
                        {isMyContractNode && (
                          <span className="ml-2 text-xs text-blue-400">({t('circle.yourSC', 'your SC')})</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {ownerAddress ? (
                          <a
                            href={`${explorerUrl}/accounts/${ownerAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`font-mono text-sm hover:text-blue-400 transition ${isMyAccount ? 'text-blue-400' : 'text-gray-400'}`}
                          >
                            {formatAddress(ownerAddress)}
                            {isMyAccount && <span className="ml-1 text-xs">({t('circle.you', 'you')})</span>}
                          </a>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-green-400 font-semibold">{stats?.cyclesCompleted || 0}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`font-semibold ${(stats?.cyclesFailed || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                          {stats?.cyclesFailed || 0}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                          {t('circle.active', 'Active')}
                        </span>
                      </td>
                      <td className="py-3">
                        {isCycleComplete ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                            {t('circle.signed', 'Signed')} &#x2713;
                          </span>
                        ) : isCurrent ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-300 animate-pulse">
                            {t('circle.currentTurn', 'Current turn')}
                          </span>
                        ) : hasSigned ? (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                            {t('circle.signed', 'Signed')} &#x2713;
                          </span>
                        ) : (
                          <span className="text-gray-500 text-sm">{t('circle.waiting', 'Waiting')}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {activeContracts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">{t('circle.noActiveContracts', 'No active smart contracts yet')}</p>
              <p className="text-gray-500 text-sm mt-2">{t('circle.beFirstToJoin', 'Be the first to join the Circle of Life!')}</p>
            </div>
          )}
        </div>

        {/* Inactive Contracts List */}
        {inactiveContracts.length > 0 && (
          <div className="mt-6 bg-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-gray-500/20">
            <h2 className="text-xl font-bold text-gray-400 mb-4">
              {t('circle.inactiveSmartContracts', 'Inactive Smart Contracts')} ({inactiveContracts.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/10">
                    <th className="pb-3 pr-4">{t('circle.contract', 'Contract')}</th>
                    <th className="pb-3 pr-4">{t('circle.contractAddress', 'Contract Address')}</th>
                    <th className="pb-3 pr-4">{t('circle.owner', 'Owner')}</th>
                    <th className="pb-3 pr-4">{t('circle.successfulCycles', 'Successful Cycles')}</th>
                    <th className="pb-3 pr-4">{t('circle.failedCycles', 'Failed Cycles')}</th>
                    <th className="pb-3">{t('circle.status', 'Status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {inactiveContracts.map((contractAddr, index) => {
                    const isMyContractNode = myContract === contractAddr
                    const ownerAddress = contractOwners.get(contractAddr)
                    const isMyAccount = ownerAddress === address
                    const stats = scStats.get(contractAddr)
                    const isBannedSc = stats?.isBanned || false
                    const banUntilDate = stats?.banUntil ? new Date(stats.banUntil * 1000).toLocaleDateString() : null

                    return (
                      <tr key={contractAddr} className={`border-b border-white/5 hover:bg-white/5 ${isMyContractNode ? 'bg-blue-500/10' : ''} ${isBannedSc ? 'bg-red-500/10' : ''}`}>
                        <td className="py-3 pr-4">
                          <span className="px-2 py-1 rounded font-mono text-sm bg-gray-500/20 text-gray-400">
                            SC
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          <a
                            href={`${explorerUrl}/accounts/${contractAddr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 font-mono text-sm hover:text-blue-400 transition"
                          >
                            {formatAddress(contractAddr)}
                          </a>
                          {isMyContractNode && (
                            <span className="ml-2 text-xs text-blue-400">({t('circle.yourSC', 'your SC')})</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          {ownerAddress ? (
                            <a
                              href={`${explorerUrl}/accounts/${ownerAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-mono text-sm hover:text-blue-400 transition ${isMyAccount ? 'text-blue-400' : 'text-gray-500'}`}
                            >
                              {formatAddress(ownerAddress)}
                              {isMyAccount && <span className="ml-1 text-xs">({t('circle.you', 'you')})</span>}
                            </a>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span className="text-green-400 font-semibold">{stats?.cyclesCompleted || 0}</span>
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`font-semibold ${(stats?.cyclesFailed || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>
                            {stats?.cyclesFailed || 0}
                          </span>
                        </td>
                        <td className="py-3">
                          {isBannedSc ? (
                            <div>
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-red-500/20 text-red-400">
                                {t('circle.banned', 'Banned')}
                              </span>
                              <p className="text-red-400/70 text-xs mt-1">
                                {t('circle.until', 'until')} {banUntilDate}
                              </p>
                            </div>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-500/20 text-gray-400">
                              {t('circle.inactive', 'Inactive')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-gray-500 text-sm mt-4 text-center">
              {t('circle.inactiveContractsNote', 'Inactive contracts do not participate in daily cycles.')}
              {inactiveContracts.some(c => scStats.get(c)?.isBanned) && (
                <span className="text-red-400 block mt-1">
                  {t('circle.bannedContractsNote', 'Banned contracts cannot be reactivated until the ban ends (7 days).')}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Smart Contract Info */}
        <div className="mt-8 bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-gray-400 text-sm">{t('circle.sc0Info', 'Smart Contract Circle of Life Center (SC0)')}</p>
              <p className="text-white font-mono text-xs md:text-sm break-all">{CIRCLE_OF_LIFE_ADDRESS}</p>
            </div>
            <a
              href={`${explorerUrl}/accounts/${CIRCLE_OF_LIFE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 transition"
            >
              {t('circle.viewOnExplorer', 'View on Explorer')} &#8599;
            </a>
          </div>
        </div>
        </>
        )}
        </>
        )}
      </div>

      {/* Referral Modal - Shown first when joining */}
      <ReferralModal
        isOpen={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        onSubmit={handleReferralSubmit}
      />

      {/* Join Modal */}
      <TransactionModal
        isOpen={showJoinModal}
        step={joinModalStep}
        title={t('circle.modal.join.title', 'Join the Circle of Life')}
        confirmTitle={t('circle.modal.join.confirmTitle', 'Create your Smart Contract')}
        confirmDescription={t('circle.modal.join.confirmDesc', 'You will create a peripheral smart contract and join the Circle of Life.')}
        confirmDetails={
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.join.creationFee', 'Creation fee')}</span>
              <span className="text-white font-bold">{creationFee} EGLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.join.estimatedGas', 'Estimated gas')}</span>
              <span className="text-white">~0.03 EGLD</span>
            </div>
            {referrerAddress && (
              <div className="flex justify-between">
                <span className="text-gray-400">{t('circle.modal.join.referrer', 'Referrer')}</span>
                <span className="text-green-400 text-xs truncate max-w-[150px]" title={referrerAddress}>
                  {referrerAddress.substring(0, 10)}...{referrerAddress.substring(referrerAddress.length - 6)}
                </span>
              </div>
            )}
            <div className="border-t border-purple-500/30 pt-3">
              <p className="text-gray-300 text-sm">
                {t('circle.modal.join.details', 'SC0 will become co-owner of your smart contract. You will need to sign daily circular transactions.')}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.join.successTitle', 'Welcome to the Circle!')}
        successMessage={t('circle.modal.join.successMsg', 'Your smart contract has been created. You are now part of the Circle of Life.')}
        errorMessage={t('circle.modal.join.errorMsg', 'Error creating the smart contract.')}
        transactionHash={joinTransactionHash}
        onConfirm={handleJoinConfirm}
        onClose={() => {
          setShowJoinModal(false)
          setTimeout(() => {
            setJoinModalStep('confirm')
            setJoinTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Sign Modal */}
      <TransactionModal
        isOpen={showSignModal}
        step={signModalStep}
        title={t('circle.modal.sign.title', 'Sign Transfer')}
        confirmTitle={t('circle.modal.sign.confirmTitle', 'Validate Cycle')}
        confirmDescription={t('circle.modal.sign.confirmDesc', 'You will sign the transfer of funds to the next smart contract.')}
        confirmDetails={
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.amount', 'Amount')}</span>
              <span className="text-white font-bold">{circulationAmount} EGLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.from', 'From')}</span>
              <span className="text-white">{t('circle.modal.sign.yourSC', 'Your SC')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.to', 'To')}</span>
              <span className="text-white">{t('circle.modal.sign.nextSC', 'Next SC')}</span>
            </div>
            <div className="border-t border-green-500/30 pt-3">
              <p className="text-orange-300 text-sm">
                {t('circle.modal.sign.warning', 'Warning: If you do not sign before midnight, funds will go directly to SC0.')}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.sign.successTitle', 'Signature validated!')}
        successMessage={t('circle.modal.sign.successMsg', 'The transfer has been made to the next smart contract.')}
        errorMessage={t('circle.modal.sign.errorMsg', 'Error during signature.')}
        transactionHash={signTransactionHash}
        onConfirm={handleSignConfirm}
        onClose={() => {
          setShowSignModal(false)
          setTimeout(() => {
            setSignModalStep('confirm')
            setSignTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Start Cycle Modal */}
      <TransactionModal
        isOpen={showStartCycleModal}
        step={startCycleModalStep}
        title={t('circle.modal.startCycle.title', 'Start Cycle')}
        confirmTitle={t('circle.modal.startCycle.confirmTitle', 'Launch Daily Cycle')}
        confirmDescription={t('circle.modal.startCycle.confirmDesc', 'You will start the daily cycle. SC0 will send the circulation amount to the first active SC.')}
        confirmDetails={
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.startCycle.amountToSend', 'Amount to send')}</span>
              <span className="text-white font-bold">{circulationAmount} EGLD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.from', 'From')}</span>
              <span className="text-white">SC0 ({t('circle.modal.startCycle.center', 'Center')})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.to', 'To')}</span>
              <span className="text-white">SC1 ({t('circle.modal.startCycle.firstActive', 'First active')})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.startCycle.participants', 'Participants')}</span>
              <span className="text-white">{activeContractsCount} {t('circle.modal.startCycle.activeSCs', 'active SCs')}</span>
            </div>
            {starterBonusInfo.percentage > 0 && (
              <div className="flex justify-between items-center bg-cyan-500/20 rounded-lg p-2 -mx-1">
                <span className="text-cyan-300 font-semibold flex items-center gap-1">
                  <span>&#x2B50;</span> {t('circle.modal.startCycle.starterBonus', 'Starter Bonus')}
                </span>
                <span className="text-cyan-400 font-bold">+{starterBonusInfo.potentialBonus} XCX</span>
              </div>
            )}
            <div className="border-t border-orange-500/30 pt-3">
              <p className="text-gray-300 text-sm">
                {t('circle.modal.startCycle.details', 'Once the cycle starts, each member must sign in order to circulate the funds.')}
                {starterBonusInfo.percentage > 0 && (
                  <span className="text-cyan-300"> {t('circle.modal.startCycle.bonusInfo', 'You will receive a {{percent}}% bonus if the cycle completes successfully!', { percent: (starterBonusInfo.percentage / 100).toFixed(1) })}</span>
                )}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.startCycle.successTitle', 'Cycle started!')}
        successMessage={t('circle.modal.startCycle.successMsg', 'The daily cycle has been launched. The circulation amount has been sent to the first SC.')}
        errorMessage={t('circle.modal.startCycle.errorMsg', 'Error starting the cycle. Check that SC0 has enough funds.')}
        transactionHash={startCycleTransactionHash}
        onConfirm={handleStartCycleConfirm}
        onClose={() => {
          setShowStartCycleModal(false)
          setTimeout(() => {
            setStartCycleModalStep('confirm')
            setStartCycleTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Pre-Sign Modal */}
      <TransactionModal
        isOpen={showPreSignModal}
        step={preSignModalStep}
        title={t('circle.modal.preSign.title', 'Pre-sign in Advance')}
        confirmTitle={t('circle.modal.preSign.confirmTitle', 'Confirm Pre-signature')}
        confirmDescription={t('circle.modal.preSign.confirmDesc', 'You will pre-sign your participation in the cycle. The transfer will execute automatically when it is your turn.')}
        confirmDetails={
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.action', 'Action')}</span>
              <span className="text-white font-bold">{t('circle.modal.preSign.preSignature', 'Pre-signature')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.preSign.amountToTransfer', 'Amount to transfer')}</span>
              <span className="text-white">{circulationAmount} EGLD</span>
            </div>
            <div className="border-t border-blue-500/30 pt-3">
              <p className="text-blue-300 text-sm">
                {t('circle.modal.preSign.advantages', 'Advantages of pre-signing:')}
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li>&#x2713; {t('circle.modal.preSign.adv1', 'No need to be present when it is your turn')}</li>
                <li>&#x2713; {t('circle.modal.preSign.adv2', 'Transfer executes automatically')}</li>
                <li>&#x2713; {t('circle.modal.preSign.adv3', 'Avoid missing your turn')}</li>
              </ul>
            </div>
          </div>
        }
        successTitle={t('circle.modal.preSign.successTitle', 'Pre-signature registered!')}
        successMessage={t('circle.modal.preSign.successMsg', 'Your pre-signature has been registered. The transfer will execute automatically when it is your turn.')}
        errorMessage={t('circle.modal.preSign.errorMsg', 'Error during pre-signature.')}
        transactionHash={preSignTransactionHash}
        onConfirm={handlePreSignConfirm}
        onClose={() => {
          setShowPreSignModal(false)
          setTimeout(() => {
            setPreSignModalStep('confirm')
            setPreSignTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Process ALL Transfers Modal - Batch processing in 1 transaction */}
      <TransactionModal
        isOpen={showProcessModal}
        step={processModalStep}
        title={t('circle.modal.process.title', 'Execute ALL Transfers')}
        confirmTitle={t('circle.modal.process.confirmTitle', 'Process ALL Transfers in 1 Transaction')}
        confirmDescription={t('circle.modal.process.confirmDesc', 'You will execute ALL pending transfers in a single transaction. No need to click multiple times!')}
        confirmDetails={
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.process.transfersToExecute', 'Transfers to execute')}</span>
              <span className="text-white font-bold text-lg">{pendingAutoTransfers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.process.amountPerTransfer', 'Amount per transfer')}</span>
              <span className="text-white">{circulationAmount} EGLD</span>
            </div>
            <div className="bg-green-500/20 border border-green-500/30 rounded p-2 mt-2">
              <p className="text-green-400 text-sm font-semibold text-center">
                {t('circle.modal.process.oneSignature', '1 signature = {{count}} transfers executed!', { count: pendingAutoTransfers })}
              </p>
            </div>
            <div className="border-t border-cyan-500/30 pt-3">
              <p className="text-gray-300 text-sm">
                {t('circle.modal.process.permissionless', 'This action is permissionless - anyone can trigger transfers for members who have enabled auto-sign.')}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.process.successTitle', 'All transfers executed!')}
        successMessage={t('circle.modal.process.successMsg', 'The {{count}} pending transfers have been processed in a single transaction!', { count: pendingAutoTransfers })}
        errorMessage={t('circle.modal.process.errorMsg', 'Error processing transfers.')}
        transactionHash={processTransactionHash}
        onConfirm={handleProcessConfirm}
        onClose={() => {
          setShowProcessModal(false)
          setTimeout(() => {
            setProcessModalStep('confirm')
            setProcessTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Activate Modal */}
      <TransactionModal
        isOpen={showActivateModal}
        step={activateModalStep}
        title={t('circle.modal.activate.title', 'Reactivate my Point')}
        confirmTitle={t('circle.modal.activate.confirmTitle', 'Confirm Reactivation')}
        confirmDescription={t('circle.modal.activate.confirmDesc', 'You will reactivate your point in the circle. You will participate again in daily cycles.')}
        confirmDetails={
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.common.action', 'Action')}</span>
              <span className="text-white font-bold">{t('circle.modal.activate.action', 'Reactivation')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.common.yourContract', 'Your contract')}</span>
              <span className="text-white font-mono text-xs">{myContract ? formatAddress(myContract) : '-'}</span>
            </div>
            <div className="border-t border-green-500/30 pt-3">
              <p className="text-green-300 text-sm">
                {t('circle.modal.activate.benefits', 'Benefits of activation:')}
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li>&#x2713; {t('circle.modal.activate.benefit1', 'Participates in daily cycles')}</li>
                <li>&#x2713; {t('circle.modal.activate.benefit2', 'Receives circular transfers')}</li>
                <li>&#x2713; {t('circle.modal.activate.benefit3', 'Is part of the active circle')}</li>
              </ul>
            </div>
          </div>
        }
        successTitle={t('circle.modal.activate.successTitle', 'Point reactivated!')}
        successMessage={t('circle.modal.activate.successMsg', 'Your point is now active. You participate again in cycles.')}
        errorMessage={t('circle.modal.activate.errorMsg', 'Error during reactivation.')}
        transactionHash={activateTransactionHash}
        onConfirm={handleActivateConfirm}
        onClose={() => {
          setShowActivateModal(false)
          setTimeout(() => {
            setActivateModalStep('confirm')
            setActivateTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Deactivate Modal */}
      <TransactionModal
        isOpen={showDeactivateModal}
        step={deactivateModalStep}
        title={t('circle.modal.deactivate.title', 'Deactivate my Point')}
        confirmTitle={t('circle.modal.deactivate.confirmTitle', 'Confirm Deactivation')}
        confirmDescription={t('circle.modal.deactivate.confirmDesc', 'You will deactivate your point in the circle. You will no longer participate in daily cycles.')}
        confirmDetails={
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.common.action', 'Action')}</span>
              <span className="text-white font-bold">{t('circle.modal.deactivate.action', 'Deactivation')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.common.yourContract', 'Your contract')}</span>
              <span className="text-white font-mono text-xs">{myContract ? formatAddress(myContract) : '-'}</span>
            </div>
            <div className="border-t border-orange-500/30 pt-3">
              <p className="text-orange-300 text-sm">
                {t('circle.modal.deactivate.consequences', 'Consequences of deactivation:')}
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li>&#x26A0; {t('circle.modal.deactivate.consequence1', 'No longer participates in cycles')}</li>
                <li>&#x26A0; {t('circle.modal.deactivate.consequence2', 'No longer receives transfers')}</li>
                <li>&#x2713; {t('circle.modal.deactivate.consequence3', 'Can be reactivated at any time')}</li>
                <li>&#x2713; {t('circle.modal.deactivate.consequence4', 'You remain a member of the circle')}</li>
              </ul>
            </div>
          </div>
        }
        successTitle={t('circle.modal.deactivate.successTitle', 'Point deactivated!')}
        successMessage={t('circle.modal.deactivate.successMsg', 'Your point is now inactive. You can reactivate it at any time.')}
        errorMessage={t('circle.modal.deactivate.errorMsg', 'Error during deactivation.')}
        transactionHash={deactivateTransactionHash}
        onConfirm={handleDeactivateConfirm}
        onClose={() => {
          setShowDeactivateModal(false)
          setTimeout(() => {
            setDeactivateModalStep('confirm')
            setDeactivateTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Fail Cycle Modal */}
      <TransactionModal
        isOpen={showFailCycleModal}
        step={failCycleModalStep}
        title={t('circle.modal.failCycle.title', 'Declare Cycle Failed')}
        confirmTitle={t('circle.modal.failCycle.confirmTitle', 'Confirm Cycle Failure')}
        confirmDescription={t('circle.modal.failCycle.confirmDesc', 'You will declare this cycle as failed. The blocking SC will be automatically banned for 7 days.')}
        confirmDetails={
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.common.action', 'Action')}</span>
              <span className="text-white font-bold">{t('circle.modal.failCycle.action', 'Declare Failure')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.failCycle.cycle', 'Cycle')}</span>
              <span className="text-white">#{cycleDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.failCycle.responsibleSc', 'Responsible SC')}</span>
              <span className="text-white font-mono text-xs">{cycleHolder ? formatAddress(cycleHolder) : '-'}</span>
            </div>
            <div className="border-t border-red-500/30 pt-3">
              <p className="text-red-300 text-sm font-semibold">
                {t('circle.modal.failCycle.consequences', 'Consequences:')}
              </p>
              <ul className="text-gray-300 text-sm mt-2 space-y-1">
                <li className="text-red-400">&#x26A0; {t('circle.modal.failCycle.consequence1', 'The responsible SC will be banned for 7 days')}</li>
                <li className="text-red-400">&#x26A0; {t('circle.modal.failCycle.consequence2', 'Its failure counter will be incremented')}</li>
                <li>&#x2713; {t('circle.modal.failCycle.consequence3', 'Funds will be recovered to SC0')}</li>
                <li>&#x2713; {t('circle.modal.failCycle.consequence4', 'A new cycle can start')}</li>
              </ul>
            </div>
          </div>
        }
        successTitle={t('circle.modal.failCycle.successTitle', 'Cycle declared failed!')}
        successMessage={t('circle.modal.failCycle.successMsg', 'The responsible SC has been banned for 7 days. Funds have been recovered to SC0.')}
        errorMessage={t('circle.modal.failCycle.errorMsg', 'Error declaring failure. The cycle may not be in timeout yet.')}
        transactionHash={failCycleTransactionHash}
        onConfirm={handleFailCycleConfirm}
        onClose={() => {
          setShowFailCycleModal(false)
          setTimeout(() => {
            setFailCycleModalStep('confirm')
            setFailCycleTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Claim Rewards Modal */}
      <TransactionModal
        isOpen={showClaimRewardsModal}
        step={claimRewardsModalStep}
        title={t('circle.modal.claimRewards.title', 'Claim Rewards')}
        confirmTitle={t('circle.modal.claimRewards.confirmTitle', 'Confirm Claim')}
        confirmDescription={t('circle.modal.claimRewards.confirmDesc', 'You will claim your XCIRCLEX rewards accumulated through your participation in cycles.')}
        confirmDetails={
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.claimRewards.amountToClaim', 'Amount to claim')}</span>
              <span className="text-yellow-400 font-bold">{pendingRewards} XCIRCLEX</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.claimRewards.token', 'Token')}</span>
              <span className="text-white">{rewardsInfo.rewardTokenId || 'XCIRCLEX'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.claimRewards.day', 'Day')}</span>
              <span className="text-green-400">{getDayName(dayOfWeek)} ({t('circle.modal.claimRewards.claimDay', 'claim day')})</span>
            </div>
            <div className="border-t border-yellow-500/30 pt-3">
              <p className="text-gray-300 text-sm">
                {t('circle.modal.claimRewards.tokensInfo', 'Tokens will be sent directly to your wallet.')}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.claimRewards.successTitle', 'Rewards claimed!')}
        successMessage={t('circle.modal.claimRewards.successMsg', `You received ${pendingRewards} XCIRCLEX in your wallet.`)}
        errorMessage={t('circle.modal.claimRewards.errorMsg', 'Error during claim. Check that it is Sunday and that you have rewards to claim.')}
        transactionHash={claimRewardsTransactionHash}
        onConfirm={handleClaimRewardsConfirm}
        onClose={() => {
          setShowClaimRewardsModal(false)
          setTimeout(() => {
            setClaimRewardsModalStep('confirm')
            setClaimRewardsTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Auto-Sign Modal */}
      <TransactionModal
        isOpen={showAutoSignModal}
        step={autoSignModalStep}
        title={t('circle.modal.autoSign.title', 'Enable Auto-Sign')}
        confirmTitle={t('circle.modal.autoSign.confirmTitle', 'Enable Permanent Auto-Sign')}
        confirmDescription={t('circle.modal.autoSign.confirmDesc', 'Enable auto-sign so you no longer have to sign manually every day.')}
        confirmDetails={
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center">
                <span className="text-xl">✨</span>
              </div>
              <div>
                <p className="text-white font-semibold">{t('circle.modal.autoSign.permanentLabel', 'Permanent Auto-Sign')}</p>
                <p className="text-purple-300 text-sm">{t('circle.modal.autoSign.autoSignInfo', 'Your cycles will be signed automatically')}</p>
              </div>
            </div>
            <div className="border-t border-purple-500/30 pt-3">
              <p className="text-purple-300 text-sm">
                {t('circle.modal.autoSign.permanentInfo', 'Permanent auto-sign will automatically sign all your future cycles indefinitely. You can disable it at any time.')}
              </p>
            </div>
          </div>
        }
        successTitle={t('circle.modal.autoSign.successTitle', 'Auto-Sign enabled!')}
        successMessage={t('circle.modal.autoSign.successMsg', 'Permanent auto-sign is now active. Your cycles will be signed automatically.')}
        errorMessage={t('circle.modal.autoSign.errorMsg', 'Error enabling auto-sign. Check that you are an active member of the circle.')}
        transactionHash={autoSignTransactionHash}
        onConfirm={handleAutoSignConfirm}
        onClose={() => {
          setShowAutoSignModal(false)
          setTimeout(() => {
            setAutoSignModalStep('confirm')
            setAutoSignTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Disable Auto-Sign Modal */}
      <TransactionModal
        isOpen={showDisableAutoSignModal}
        step={disableAutoSignModalStep}
        title={t('circle.modal.disableAutoSign.title', 'Disable Auto-Sign')}
        confirmTitle={t('circle.modal.disableAutoSign.confirmTitle', 'Confirm Deactivation')}
        confirmDescription={t('circle.modal.disableAutoSign.confirmDesc', 'You will disable auto-sign. You will need to sign manually or pre-sign each cycle.')}
        confirmDetails={
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('circle.modal.disableAutoSign.currentStatus', 'Current status')}</span>
              <span className="text-purple-400 font-bold">
                {autoSignStatus.isPermanent ? t('circle.modal.disableAutoSign.permanent', 'Permanent') : `${autoSignStatus.remainingCycles} ${t('circle.modal.disableAutoSign.cyclesRemaining', 'cycles remaining')}`}
              </span>
            </div>
            <div className="border-t border-gray-500/30 pt-3">
              <p className="text-gray-300 text-sm">
                {t('circle.modal.disableAutoSign.afterDeactivation', 'After deactivation, you will need to:')}
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1 list-disc list-inside">
                <li>{t('circle.modal.disableAutoSign.option1', 'Pre-sign manually each cycle')}</li>
                <li>{t('circle.modal.disableAutoSign.option2', 'Or sign when it is your turn')}</li>
                <li>{t('circle.modal.disableAutoSign.option3', 'Or reactivate auto-sign')}</li>
              </ul>
            </div>
          </div>
        }
        successTitle={t('circle.modal.disableAutoSign.successTitle', 'Auto-Sign disabled')}
        successMessage={t('circle.modal.disableAutoSign.successMsg', 'Auto-sign has been disabled. You will now need to sign your cycles manually.')}
        errorMessage={t('circle.modal.disableAutoSign.errorMsg', 'Error disabling auto-sign.')}
        transactionHash={disableAutoSignTransactionHash}
        onConfirm={handleDisableAutoSignConfirm}
        onClose={() => {
          setShowDisableAutoSignModal(false)
          setTimeout(() => {
            setDisableAutoSignModalStep('confirm')
            setDisableAutoSignTransactionHash('')
          }, 300)
        }}
        onSuccess={() => {
          refreshData()
        }}
      />

      {/* Admin Panel - Visible uniquement pour l'admin */}
      <AdminPanel onRefresh={refreshData} />

      {/* SC Info Modal - Fixed position for proper mobile display */}
      {tooltipInfo && tooltipInfo.visible && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[100]"
            onClick={handleCloseTooltip}
          />
          {/* Modal */}
          <div
            className={`
              fixed z-[101] bg-gray-900 border border-purple-500/50 shadow-2xl overflow-y-auto
              ${windowWidth < 640
                ? 'bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl max-h-[80vh] w-[380px]'
              }
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Swipe handle for mobile */}
            {windowWidth < 640 && (
              <div className="sticky top-0 bg-gray-900 pt-3 pb-2 flex justify-center">
                <div className="w-12 h-1.5 bg-gray-600 rounded-full" />
              </div>
            )}

            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-white font-bold text-lg">
                  {tooltipInfo.type === 'sc0' ? 'SC0 - Centre' : `SC${tooltipInfo.scIndex}`}
                  {tooltipInfo.isMyContract && <span className="ml-2 text-blue-400 text-sm">(vous)</span>}
                </h4>
                <button
                  onClick={handleCloseTooltip}
                  className="text-gray-400 hover:text-white text-2xl leading-none p-2 -mr-2 -mt-2"
                >
                  &times;
                </button>
              </div>

              {/* SC Address */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Adresse du Smart Contract</p>
                <div className="flex items-center gap-2">
                  <p className="text-white font-mono text-xs break-all">{tooltipInfo.scAddress}</p>
                  <a
                    href={`${explorerUrl}/accounts/${tooltipInfo.scAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex-shrink-0"
                  >
                    &#8599;
                  </a>
                </div>
              </div>

              {/* Owner Address */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">
                  {tooltipInfo.type === 'sc0' ? 'Proprietaire (Deployer)' : 'Compte Associe (Owner)'}
                </p>
                {tooltipInfo.ownerAddress ? (
                  <div className="flex items-center gap-2">
                    <p className="text-white font-mono text-xs break-all">{tooltipInfo.ownerAddress}</p>
                    <a
                      href={`${explorerUrl}/accounts/${tooltipInfo.ownerAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm flex-shrink-0"
                    >
                      &#8599;
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs italic">Chargement...</p>
                )}
              </div>

              {/* Cycle Stats */}
              <div className="mb-4 p-3 bg-white/5 rounded-lg">
                <p className="text-gray-400 text-xs mb-2">Statistiques des Cycles</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-green-400 font-bold text-xl">
                      {tooltipInfo.type === 'sc0'
                        ? cycleStats.cyclesCompleted
                        : scStats.get(tooltipInfo.scAddress)?.cyclesCompleted || 0}
                    </p>
                    <p className="text-gray-400 text-xs">Reussis</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-400 font-bold text-xl">
                      {tooltipInfo.type === 'sc0'
                        ? cycleStats.cyclesFailed
                        : scStats.get(tooltipInfo.scAddress)?.cyclesFailed || 0}
                    </p>
                    <p className="text-gray-400 text-xs">Echoues</p>
                  </div>
                </div>
                {/* 360 Cycle badge */}
                {(() => {
                  const cycles = tooltipInfo.type === 'sc0'
                    ? cycleStats.cyclesCompleted
                    : scStats.get(tooltipInfo.scAddress)?.cyclesCompleted || 0
                  const orbitData = getOrbitingCirclesData(cycles)
                  if (orbitData.completed360Cycles > 0) {
                    return (
                      <div className="mt-3 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 rounded-full">
                          <span className="text-amber-400">&#x1F3C6;</span>
                          <span className="text-amber-300 text-sm font-bold">{orbitData.completed360Cycles}x 360 cycles</span>
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>

              {/* Last Transaction Hash */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Derniere Transaction</p>
                {(() => {
                  const txHash = tooltipInfo.type === 'sc0'
                    ? lastTxHashSc0
                    : lastTxHashPeripherals.get(tooltipInfo.scAddress)
                  if (txHash) {
                    return (
                      <div className="flex items-center gap-2">
                        <p className="text-white font-mono text-xs">
                          {txHash.slice(0, 12)}...{txHash.slice(-8)}
                        </p>
                        <a
                          href={`${explorerUrl}/transactions/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm flex-shrink-0"
                        >
                          &#8599;
                        </a>
                      </div>
                    )
                  }
                  return <p className="text-gray-500 text-xs italic">Aucune transaction</p>
                })()}
              </div>

              {/* Balance */}
              <div className="mb-4">
                <p className="text-gray-400 text-xs mb-1">Balance</p>
                <p className="text-white font-bold text-lg">
                  {tooltipInfo.type === 'sc0'
                    ? contractBalance
                    : peripheralBalances.get(tooltipInfo.scAddress) || '0'} EGLD
                </p>
              </div>

              {/* Distribution Stats - Only for SC0 */}
              {tooltipInfo.type === 'sc0' && (
                <div className="mb-4 p-3 bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white text-sm font-semibold">{t('scCentral.distributionStats')}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      distributionStats.distributionEnabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {distributionStats.distributionEnabled ? t('scCentral.distributionActive') : t('scCentral.distributionInactive')}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mb-3">{t('scCentral.distributionDescription')}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">{t('scCentral.treasurySc0')}</span>
                      <span className="text-teal-400 font-mono text-sm">{distributionStats.totalDistributedTreasury} EGLD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">{t('scCentral.daoV2')}</span>
                      <span className="text-blue-400 font-mono text-sm">{distributionStats.totalDistributedDao} EGLD</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-xs">{t('scCentral.liquidityPending')}</span>
                      <span className="text-purple-400 font-mono text-sm">{distributionStats.pendingLiquidityEgld} EGLD</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deposit Panel */}
              <div className="mb-4 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg">
                <p className="text-white text-sm font-semibold mb-2">
                  Deposer des EGLD
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={tooltipDepositAmount}
                    onChange={(e) => setTooltipDepositAmount(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-2 text-white focus:border-purple-500 focus:outline-none"
                    placeholder="0.01"
                  />
                  <button
                    onClick={handleTooltipDeposit}
                    disabled={isDepositing || parseFloat(tooltipDepositAmount) <= 0}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded transition"
                  >
                    {isDepositing ? '...' : 'Deposer'}
                  </button>
                </div>
              </div>

              {/* Type indicator */}
              <div className="pt-3 border-t border-gray-700">
                <span className={`inline-block px-3 py-1.5 rounded text-sm font-semibold ${
                  tooltipInfo.type === 'sc0'
                    ? 'bg-purple-500/20 text-purple-300'
                    : tooltipInfo.isMyContract
                      ? 'bg-blue-500/20 text-blue-300'
                      : 'bg-green-500/20 text-green-300'
                }`}>
                  {tooltipInfo.type === 'sc0' ? 'Contrat Central' : tooltipInfo.isMyContract ? 'Mon Contrat' : 'Contrat Peripherique'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CircleOfLife
