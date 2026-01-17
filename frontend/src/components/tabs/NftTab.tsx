import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { NftVisual } from '../NftVisual'
import { NftGifVisual } from '../NftGifVisual'
import { useCircleOfLife } from '../../hooks/useCircleOfLife'
import { NFT_CONTRACT_ADDRESS, NFT_TOKEN_ID } from '../../config/contracts'
import { claimNft, checkUserHasNft, getCollectionStats, burnAndReclaim } from '../../services/nftService'

// Tous les niveaux pour la galerie complete
const ALL_LEVELS = [
  { level: 0, cycles: 0, name: 'Commun' },
  { level: 1, cycles: 30, name: 'Peu Commun' },
  { level: 2, cycles: 60, name: 'Peu Commun' },
  { level: 3, cycles: 90, name: 'Rare' },
  { level: 4, cycles: 120, name: 'Rare' },
  { level: 5, cycles: 150, name: 'Epique' },
  { level: 6, cycles: 180, name: 'Epique' },
  { level: 7, cycles: 210, name: 'Legendaire' },
  { level: 8, cycles: 240, name: 'Legendaire' },
  { level: 9, cycles: 270, name: 'Mythique' },
  { level: 10, cycles: 300, name: 'Mythique' },
  { level: 11, cycles: 330, name: 'Transcendant' },
  { level: 12, cycles: 360, name: 'Cercle Parfait' },
]

// Donnees de demonstration pour le preview (niveaux representatifs)
const DEMO_LEVELS = [
  { level: 0, cycles: 0, name: 'Commun' },
  { level: 1, cycles: 30, name: 'Peu Commun' },
  { level: 3, cycles: 90, name: 'Rare' },
  { level: 5, cycles: 150, name: 'Epique' },
  { level: 7, cycles: 210, name: 'Legendaire' },
  { level: 9, cycles: 270, name: 'Mythique' },
  { level: 11, cycles: 330, name: 'Transcendant' },
  { level: 12, cycles: 360, name: 'Cercle Parfait' },
]

const LEVEL_REQUIREMENTS = [
  { level: 0, cycles: 0, rarity: 'Commun', bonus: '0%' },
  { level: 1, cycles: 30, rarity: 'Peu Commun', bonus: '+5%' },
  { level: 2, cycles: 60, rarity: 'Peu Commun', bonus: '+5%' },
  { level: 3, cycles: 90, rarity: 'Rare', bonus: '+10%' },
  { level: 4, cycles: 120, rarity: 'Rare', bonus: '+10%' },
  { level: 5, cycles: 150, rarity: 'Epique', bonus: '+15%' },
  { level: 6, cycles: 180, rarity: 'Epique', bonus: '+15%' },
  { level: 7, cycles: 210, rarity: 'Legendaire', bonus: '+25%' },
  { level: 8, cycles: 240, rarity: 'Legendaire', bonus: '+25%' },
  { level: 9, cycles: 270, rarity: 'Mythique', bonus: '+35%' },
  { level: 10, cycles: 300, rarity: 'Mythique', bonus: '+35%' },
  { level: 11, cycles: 330, rarity: 'Transcendant', bonus: '+40%' },
  { level: 12, cycles: 360, rarity: 'CERCLE PARFAIT', bonus: '+50%' },
]

export function NftTab() {
  const { t } = useTranslation()
  const [previewLevel, setPreviewLevel] = useState(0)
  const [showAllLevels, setShowAllLevels] = useState(false)
  const [showGallery, setShowGallery] = useState(false)
  const [enablePreviewMode, setEnablePreviewMode] = useState(false) // Mode demo desactive par defaut
  const [useGifPreview, setUseGifPreview] = useState(true) // Utiliser les GIFs IPFS par defaut
  const [hasNft, setHasNft] = useState(false)
  const [nftNonce, setNftNonce] = useState(0)
  const [isClaimingNft, setIsClaimingNft] = useState(false)
  const [isUpdatingNft, setIsUpdatingNft] = useState(false)
  const [collectionStats, setCollectionStats] = useState({ totalMinted: 0, holders: 0 })
  const [nftRefreshKey, setNftRefreshKey] = useState(0) // Cle pour forcer le rechargement des GIFs

  // Recuperer les vraies donnees depuis le hook useCircleOfLife
  const { myContract, scStats, isMember, isLoading, address } = useCircleOfLife()

  // Obtenir les cycles completes de l'utilisateur depuis les stats du SC
  const userScStats = myContract ? scStats.get(myContract) : null
  const userCycles = userScStats?.cyclesCompleted || 0
  const userLevel = Math.min(Math.floor(userCycles / 30), 12)

  // Verifier si le contrat NFT est deploye (adresse configuree)
  const nftContractDeployed = NFT_CONTRACT_ADDRESS !== '' || enablePreviewMode

  // Verifier si l'utilisateur possede deja un NFT
  const checkNftOwnership = useCallback(async () => {
    if (!address || !NFT_CONTRACT_ADDRESS) return

    try {
      const result = await checkUserHasNft(address)
      setHasNft(result.hasNft)
      setNftNonce(result.nonce)
    } catch (error) {
      console.error('Error checking NFT ownership:', error)
    }
  }, [address])

  // Charger les stats de la collection
  const loadCollectionStats = useCallback(async () => {
    try {
      const stats = await getCollectionStats()
      setCollectionStats(stats)
    } catch (error) {
      console.error('Error loading collection stats:', error)
    }
  }, [])

  useEffect(() => {
    checkNftOwnership()
    loadCollectionStats()
  }, [checkNftOwnership, loadCollectionStats])

  // Handlers pour les actions NFT
  const handleClaimNft = async () => {
    if (!NFT_CONTRACT_ADDRESS) {
      if (enablePreviewMode) {
        alert('Mode Preview: Simulation du mint NFT.\n\nEndpoint: claimNft()\nCout: Gratuit (gas seulement)')
        setHasNft(true)
      } else {
        alert('Le contrat NFT n\'est pas encore deploye.')
      }
      return
    }

    if (!address) {
      alert('Veuillez connecter votre wallet.')
      return
    }

    setIsClaimingNft(true)
    try {
      await claimNft(address)
      // Attendre un peu pour que la blockchain traite la transaction
      setTimeout(() => {
        checkNftOwnership()
        loadCollectionStats()
      }, 5000)
    } catch (error: any) {
      console.error('Error claiming NFT:', error)
      alert(`Erreur lors du mint: ${error.message || 'Erreur inconnue'}`)
    } finally {
      setIsClaimingNft(false)
    }
  }

  const handleUpdateNft = async () => {
    if (!NFT_CONTRACT_ADDRESS) {
      if (enablePreviewMode) {
        alert(`Mode Preview: Simulation de l'evolution.\n\nEndpoint: burnAndReclaim()\nVotre niveau actuel: ${userLevel}\nCycles completes: ${userCycles}`)
      } else {
        alert('Le contrat NFT n\'est pas encore deploye.')
      }
      return
    }

    if (!address) {
      alert('Veuillez connecter votre wallet.')
      return
    }

    if (!hasNft || nftNonce === 0) {
      alert('Vous devez d\'abord reclamer votre NFT avant de pouvoir le mettre a jour.')
      return
    }

    // Rafraichir le nonce avant de proceder
    const currentNftInfo = await checkUserHasNft(address)
    if (!currentNftInfo.hasNft || currentNftInfo.nonce === 0) {
      alert('Impossible de trouver votre NFT. Veuillez rafraichir la page.')
      return
    }

    const currentNonce = currentNftInfo.nonce
    console.log(`[NftTab] Updating NFT with nonce: ${currentNonce}`)

    setIsUpdatingNft(true)
    try {
      // Burn l'ancien NFT et mint un nouveau au bon niveau avec la bonne URI
      await burnAndReclaim(address, currentNonce)
      // Rafraichir apres la transaction
      setTimeout(() => {
        checkNftOwnership()
        loadCollectionStats()
        // Forcer le rechargement des GIFs
        setNftRefreshKey(prev => prev + 1)
      }, 5000)
    } catch (error: any) {
      console.error('Error updating NFT:', error)
      // Extraire le message d'erreur de maniere plus robuste
      let errorMessage = 'Erreur inconnue'
      if (error) {
        if (typeof error === 'string') {
          errorMessage = error
        } else if (error.message) {
          errorMessage = error.message
        } else if (error.reason) {
          errorMessage = error.reason
        } else if (error.toString && error.toString() !== '[object Object]') {
          errorMessage = error.toString()
        }
        // Verifier si c'est une annulation de l'utilisateur
        if (errorMessage.toLowerCase().includes('cancel') ||
            errorMessage.toLowerCase().includes('rejected') ||
            errorMessage.toLowerCase().includes('user denied')) {
          errorMessage = 'Transaction annulee par l\'utilisateur'
        }
      }
      alert(`Erreur lors de la mise a jour: ${errorMessage}`)
    } finally {
      setIsUpdatingNft(false)
    }
  }


  const currentDemo = DEMO_LEVELS.find(d => d.level === previewLevel) || DEMO_LEVELS[0]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">&#x1F3A8;</span>
            {t('nftTab.title', 'Evolving NFT - Reputation Circle')}
          </h2>
          <div className="flex items-center gap-2">
            {!NFT_CONTRACT_ADDRESS && enablePreviewMode && (
              <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 px-3 py-1 rounded-lg text-sm">
                {t('nftTab.previewMode', 'Preview Mode')}
              </span>
            )}
            {!NFT_CONTRACT_ADDRESS && !enablePreviewMode && (
              <span className="bg-orange-500/20 border border-orange-500/30 text-orange-300 px-3 py-1 rounded-lg text-sm">
                {t('nftTab.comingSoon', 'Coming Soon')}
              </span>
            )}
            <button
              onClick={() => setEnablePreviewMode(!enablePreviewMode)}
              className={`text-xs px-2 py-1 rounded transition ${
                enablePreviewMode
                  ? 'bg-blue-500/30 text-blue-300 hover:bg-blue-500/40'
                  : 'bg-gray-500/30 text-gray-400 hover:bg-gray-500/40'
              }`}
              title={t('nftTab.togglePreview', 'Toggle preview mode')}
            >
              {enablePreviewMode ? t('nftTab.previewOn', 'Preview ON') : t('nftTab.previewOff', 'Preview OFF')}
            </button>
          </div>
        </div>
        <p className="text-gray-300 mb-4">
          {t('nftTab.description', 'Your NFT evolves with your participation in the Circle of Life. The more cycles you complete, the higher your NFT level and rarity!')}
        </p>

        {/* Collection Info */}
        {NFT_CONTRACT_ADDRESS && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="bg-black/20 rounded-lg px-4 py-2">
              <span className="text-gray-400">{t('nftTab.collection', 'Collection')}:</span>
              <span className="ml-2 text-white font-mono">{NFT_TOKEN_ID || 'N/A'}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-4 py-2">
              <span className="text-gray-400">{t('nftTab.totalMinted', 'Total minted')}:</span>
              <span className="ml-2 text-white font-bold">{collectionStats.totalMinted}</span>
            </div>
            <div className="bg-black/20 rounded-lg px-4 py-2">
              <span className="text-gray-400">{t('nftTab.holders', 'Holders')}:</span>
              <span className="ml-2 text-white font-bold">{collectionStats.holders}</span>
            </div>
            {hasNft && nftNonce > 0 && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-2">
                <span className="text-green-300">{t('nftTab.yourNft', 'Your NFT')} #</span>
                <span className="ml-1 text-white font-bold">{nftNonce}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preview Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">{t('nftTab.nftPreview', 'NFT Preview')}</h3>
            {/* Toggle GIF/SVG */}
            <button
              onClick={() => setUseGifPreview(!useGifPreview)}
              className={`text-xs px-3 py-1 rounded-lg transition ${
                useGifPreview
                  ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40'
                  : 'bg-gray-500/30 text-gray-400 hover:bg-gray-500/40'
              }`}
              title="Toggle entre GIF IPFS et SVG local"
            >
              {useGifPreview ? '🎬 GIF IPFS' : '🎨 SVG Local'}
            </button>
          </div>

          {/* NFT Visual */}
          <div className="flex justify-center mb-6">
            {useGifPreview ? (
              <NftGifVisual
                level={currentDemo.level}
                size={280}
                refreshKey={nftRefreshKey}
              />
            ) : (
              <NftVisual
                level={currentDemo.level}
                cycles={currentDemo.cycles}
                size={280}
                animated={true}
              />
            )}
          </div>

          {/* Level selector */}
          <div className="mb-4">
            <label className="text-gray-400 text-sm mb-2 block">{t('nftTab.previewLevel', 'Preview a level')}:</label>
            <div className="flex flex-wrap gap-2">
              {DEMO_LEVELS.map((demo) => (
                <button
                  key={demo.level}
                  onClick={() => setPreviewLevel(demo.level)}
                  className={`px-3 py-1 rounded-lg text-sm transition ${
                    previewLevel === demo.level
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {t('nftTab.lvl', 'Lvl')}.{demo.level}
                </button>
              ))}
            </div>
          </div>

          {/* Current preview info */}
          <div className="bg-black/20 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('nftTab.level', 'Level')}</span>
              <span className="text-white font-bold">{currentDemo.level}/12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('nftTab.rarity', 'Rarity')}</span>
              <span className="text-purple-400 font-semibold">{currentDemo.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('nftTab.cyclesRequired', 'Cycles required')}</span>
              <span className="text-white">{currentDemo.cycles}+</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('nftTab.stakingBonus', 'Staking Bonus')}</span>
              <span className="text-green-400 font-bold">
                {LEVEL_REQUIREMENTS.find(l => l.level === currentDemo.level)?.bonus}
              </span>
            </div>
          </div>
        </div>

        {/* User NFT Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-4">{t('nftTab.myNft', 'My NFT')}</h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4 animate-spin">&#x23F3;</div>
              <p className="text-gray-400">{t('nftTab.loadingData', 'Loading your data...')}</p>
            </div>
          ) : !isMember ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 opacity-50">&#x1F510;</div>
              <h4 className="text-xl text-white mb-2">{t('nftTab.joinCircle', 'Join the Circle')}</h4>
              <p className="text-gray-400 mb-4">
                {t('nftTab.joinCircleDesc', 'You must be a member of the Circle of Life to accumulate cycles and get an evolving NFT.')}
              </p>
              <p className="text-purple-400 text-sm">
                {t('nftTab.goToCircleTab', 'Go to the "Circle of Life" tab to join!')}
              </p>
            </div>
          ) : !nftContractDeployed ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 opacity-50">&#x1F3AD;</div>
              <h4 className="text-xl text-white mb-2">{t('nftTab.nftComingSoon', 'NFT Coming Soon')}</h4>
              <p className="text-gray-400 mb-4">
                {t('nftTab.nftComingSoonDesc', 'The NFT contract will be deployed soon. Keep participating in cycles to accumulate points!')}
              </p>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <div className="text-blue-300 font-semibold mb-1">{t('nftTab.yourCyclesCompleted', 'Your cycles completed')}</div>
                <div className="text-3xl text-white font-bold">{userCycles}</div>
                <div className="text-blue-300 text-sm mt-1">
                  {t('nftTab.expectedLevel', 'Expected level')}: {userLevel} ({LEVEL_REQUIREMENTS[userLevel]?.rarity})
                </div>
              </div>
              {/* Preview du NFT de l'utilisateur */}
              <div className="mt-6">
                <p className="text-gray-400 text-sm mb-3">{t('nftTab.previewFutureNft', 'Preview of your future NFT')}:</p>
                <div className="flex justify-center">
                  {useGifPreview ? (
                    <NftGifVisual level={userLevel} size={200} refreshKey={nftRefreshKey} />
                  ) : (
                    <NftVisual level={userLevel} cycles={userCycles} size={200} animated={true} />
                  )}
                </div>
              </div>
            </div>
          ) : hasNft ? (
            <div className="text-center">
              {/* User's actual NFT */}
              <div className="flex justify-center mb-4">
                {useGifPreview ? (
                  <NftGifVisual level={userLevel} size={250} refreshKey={nftRefreshKey} />
                ) : (
                  <NftVisual level={userLevel} cycles={userCycles} size={250} animated={true} />
                )}
              </div>
              <div className="bg-black/20 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">{t('nftTab.level', 'Level')}</span>
                    <p className="text-white font-bold text-xl">{userLevel}/12</p>
                  </div>
                  <div>
                    <span className="text-gray-400">{t('nftTab.cycles', 'Cycles')}</span>
                    <p className="text-white font-bold text-xl">{userCycles}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleUpdateNft}
                  disabled={isUpdatingNft}
                  className={`w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg transition font-semibold ${
                    isUpdatingNft ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isUpdatingNft ? t('nftTab.updating', 'Updating...') : t('nftTab.updateNft', 'Update NFT')}
                </button>
                <p className="text-gray-500 text-xs">
                  {t('nftTab.updateNftDesc', 'Update your NFT to sync your cycles and evolve level')}
                </p>
              </div>

            </div>
          ) : (
            <div className="text-center py-4">
              {/* Preview du futur NFT */}
              <div className="flex justify-center mb-4">
                {useGifPreview ? (
                  <NftGifVisual level={userLevel} size={220} refreshKey={nftRefreshKey} />
                ) : (
                  <NftVisual level={userLevel} cycles={userCycles} size={220} animated={true} />
                )}
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <div className="text-blue-300 font-semibold mb-1">{t('nftTab.yourFutureNft', 'Your future NFT')}</div>
                <div className="text-white">
                  {t('nftTab.level', 'Level')} <span className="font-bold text-xl">{userLevel}</span> • {userCycles} {t('nftTab.cycles', 'cycles')}
                </div>
                <div className="text-blue-300 text-sm mt-1">
                  {t('nftTab.rarity', 'Rarity')}: {LEVEL_REQUIREMENTS[userLevel]?.rarity}
                </div>
              </div>
              <button
                onClick={handleClaimNft}
                disabled={isClaimingNft}
                className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition ${
                  isClaimingNft ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isClaimingNft ? t('nftTab.minting', 'Minting...') : t('nftTab.claimNft', 'Claim my NFT')}
              </button>
              <p className="text-gray-500 text-xs mt-2">
                {t('nftTab.freeGasOnly', 'Free - only gas fees (~0.005 EGLD)')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Level Requirements Table */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">{t('nftTab.levelTable', 'Level Table')}</h3>
          <button
            onClick={() => setShowAllLevels(!showAllLevels)}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            {showAllLevels ? t('nftTab.collapse', 'Collapse') : t('nftTab.seeAll', 'See all')}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-white/10">
                <th className="text-left py-2 px-2">{t('nftTab.level', 'Level')}</th>
                <th className="text-left py-2 px-2">{t('nftTab.cycles', 'Cycles')}</th>
                <th className="text-left py-2 px-2">{t('nftTab.rarity', 'Rarity')}</th>
                <th className="text-right py-2 px-2">{t('nftTab.stakingBonus', 'Staking Bonus')}</th>
              </tr>
            </thead>
            <tbody>
              {(showAllLevels ? LEVEL_REQUIREMENTS : LEVEL_REQUIREMENTS.slice(0, 5)).map((req) => (
                <tr
                  key={req.level}
                  className={`border-b border-white/5 ${
                    req.level === userLevel ? 'bg-purple-500/20' : ''
                  }`}
                >
                  <td className="py-3 px-2">
                    <span className="font-bold text-white">{req.level}</span>
                    {req.level === userLevel && (
                      <span className="ml-2 text-xs bg-purple-500 text-white px-2 py-0.5 rounded">VOUS</span>
                    )}
                  </td>
                  <td className="py-3 px-2 text-gray-300">{req.cycles}+</td>
                  <td className="py-3 px-2">
                    <span className={`font-semibold ${
                      req.level >= 12 ? 'text-yellow-400' :
                      req.level >= 11 ? 'text-cyan-400' :
                      req.level >= 9 ? 'text-pink-400' :
                      req.level >= 7 ? 'text-orange-400' :
                      req.level >= 5 ? 'text-purple-400' :
                      req.level >= 3 ? 'text-blue-400' :
                      req.level >= 1 ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {req.rarity}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-green-400 font-bold">{req.bonus}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Progress to next level */}
        <div className="mt-6 p-4 bg-black/20 rounded-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Progression vers le niveau {Math.min(userLevel + 1, 12)}</span>
            <span className="text-white">
              {userCycles} / {LEVEL_REQUIREMENTS[Math.min(userLevel + 1, 12)]?.cycles || 360} cycles
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(
                  ((userCycles - (LEVEL_REQUIREMENTS[userLevel]?.cycles || 0)) /
                    ((LEVEL_REQUIREMENTS[Math.min(userLevel + 1, 12)]?.cycles || 360) -
                      (LEVEL_REQUIREMENTS[userLevel]?.cycles || 0))) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>
          <p className="text-gray-400 text-xs mt-2 text-center">
            {userLevel < 12
              ? `Encore ${(LEVEL_REQUIREMENTS[userLevel + 1]?.cycles || 360) - userCycles} cycles pour atteindre le niveau ${userLevel + 1}`
              : 'Niveau maximum atteint! Vous avez le Cercle Parfait!'}
          </p>
        </div>
      </div>

      {/* Bonus Explanation */}
      <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>&#x1F4B0;</span> Bonus de Staking NFT
        </h3>
        <p className="text-gray-300 mb-4">
          Votre NFT vous donne un bonus sur vos recompenses de staking. Plus votre niveau est eleve, plus votre bonus est important!
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Niv. 1-2</div>
            <div className="text-green-400 font-bold text-lg">+5%</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Niv. 5-6</div>
            <div className="text-green-400 font-bold text-lg">+15%</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-gray-400 text-xs">Niv. 9-10</div>
            <div className="text-green-400 font-bold text-lg">+35%</div>
          </div>
          <div className="bg-black/20 rounded-lg p-3 text-center">
            <div className="text-yellow-400 text-xs">Niv. 12</div>
            <div className="text-yellow-400 font-bold text-lg">+50%</div>
          </div>
        </div>
      </div>

      {/* NFT Gallery - All 13 Levels */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>&#x1F5BC;</span> Galerie des NFT - Tous les Niveaux
          </h3>
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="bg-purple-500/20 border border-purple-500/30 text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-500/30 transition"
          >
            {showGallery ? 'Masquer la galerie' : 'Afficher tous les niveaux'}
          </button>
        </div>

        {showGallery && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-4">
            {ALL_LEVELS.map((levelData) => (
              <div
                key={levelData.level}
                className={`bg-black/30 rounded-xl p-3 border transition-all hover:scale-105 cursor-pointer ${
                  levelData.level === userLevel
                    ? 'border-purple-500 ring-2 ring-purple-500/50'
                    : 'border-white/10 hover:border-white/30'
                }`}
                onClick={() => setPreviewLevel(levelData.level)}
              >
                <div className="flex justify-center mb-2">
                  {useGifPreview ? (
                    <NftGifVisual
                      level={levelData.level}
                      size={140}
                      refreshKey={nftRefreshKey}
                    />
                  ) : (
                    <NftVisual
                      level={levelData.level}
                      cycles={levelData.cycles}
                      size={140}
                      animated={false}
                      seed={levelData.level * 12345}
                    />
                  )}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">Niveau {levelData.level}</p>
                  <p className={`text-xs font-semibold ${
                    levelData.level >= 12 ? 'text-yellow-400' :
                    levelData.level >= 11 ? 'text-cyan-400' :
                    levelData.level >= 9 ? 'text-pink-400' :
                    levelData.level >= 7 ? 'text-orange-400' :
                    levelData.level >= 5 ? 'text-purple-400' :
                    levelData.level >= 3 ? 'text-blue-400' :
                    levelData.level >= 1 ? 'text-green-400' :
                    'text-gray-400'
                  }`}>
                    {levelData.name}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{levelData.cycles}+ cycles</p>
                  {levelData.level === userLevel && (
                    <span className="inline-block mt-1 text-xs bg-purple-500 text-white px-2 py-0.5 rounded">
                      VOTRE NIVEAU
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!showGallery && (
          <p className="text-gray-400 text-center py-4">
            Cliquez sur "Afficher tous les niveaux" pour voir la galerie complete des 13 niveaux de NFT avec leurs designs uniques.
          </p>
        )}
      </div>

      {/* Mint & Upgrade Instructions */}
      <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/30 rounded-2xl p-6 shadow-xl">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span>&#x2699;</span> Comment Mint et Upgrade votre NFT
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mint Section */}
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-green-400">&#x2728;</span> Mint (Creer votre NFT)
            </h4>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Rejoignez le Cercle de Vie (1 EGLD)</li>
              <li>Participez a au moins 1 cycle complet</li>
              <li>Cliquez sur "Reclamer mon NFT"</li>
              <li>Confirmez la transaction (frais de gas seulement)</li>
            </ol>
            <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-xs">
                <strong>Cout:</strong> Gratuit (seulement les frais de gas ~0.005 EGLD)
              </p>
            </div>
          </div>

          {/* Upgrade Section */}
          <div className="bg-black/20 rounded-xl p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-purple-400">&#x2B06;</span> Upgrade (Evoluer votre NFT)
            </h4>
            <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
              <li>Completez des cycles quotidiens</li>
              <li>Atteignez le seuil du niveau suivant (30 cycles/niveau)</li>
              <li>Cliquez sur "Mettre a jour le NFT"</li>
              <li>Les attributs du NFT evoluent automatiquement!</li>
            </ol>
            <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <p className="text-purple-300 text-xs">
                <strong>Note:</strong> L'upgrade est permissionless - n'importe qui peut declencher la mise a jour de votre NFT!
              </p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-4 p-4 bg-black/30 rounded-xl">
          <h4 className="text-white font-semibold mb-2 text-sm">Details Techniques</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-gray-400">Type de Token</p>
              <p className="text-white font-mono">SFT (Semi-Fungible)</p>
            </div>
            <div>
              <p className="text-gray-400">Endpoint Mint</p>
              <p className="text-white font-mono">claimNft()</p>
            </div>
            <div>
              <p className="text-gray-400">Endpoint Upgrade</p>
              <p className="text-white font-mono">burnAndReclaim()</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NftTab
