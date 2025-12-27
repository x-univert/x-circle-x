import { useGetIsLoggedIn, useGetAccountInfo } from 'lib'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { TransactionModal, TransactionStep } from '../components/TransactionModal'
import * as circleService from '../services/circleService'

function CreateCircle() {
  const isLoggedIn = useGetIsLoggedIn()
  const { address } = useGetAccountInfo()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    contributionAmount: '',
    frequency: 'monthly',
    maxMembers: '10',
    votingThreshold: 51 // Minimum 51%
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createModalStep, setCreateModalStep] = useState<TransactionStep>('confirm')
  const [transactionHash, setTransactionHash] = useState<string>('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
    if (error) {
      setError(null)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(51, parseInt(e.target.value)) // Minimum 51%
    setFormData(prev => ({ ...prev, votingThreshold: value }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Le nom du cercle est requis'
    } else if (formData.name.length < 3) {
      newErrors.name = 'Le nom doit contenir au moins 3 caracteres'
    }

    if (!formData.contributionAmount) {
      newErrors.contributionAmount = 'Le montant de contribution est requis'
    } else if (parseFloat(formData.contributionAmount) <= 0) {
      newErrors.contributionAmount = 'Le montant doit etre superieur a 0'
    }

    const maxMembers = parseInt(formData.maxMembers)
    if (!formData.maxMembers) {
      newErrors.maxMembers = 'Le nombre de membres est requis'
    } else if (maxMembers < 5) {
      newErrors.maxMembers = 'Un cercle doit avoir au moins 5 membres'
    } else if (maxMembers > 20) {
      newErrors.maxMembers = 'Maximum 20 membres par cercle'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Open confirmation modal
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    if (!address) {
      setError('Wallet non connecte')
      return
    }

    // Open confirmation modal
    setCreateModalStep('confirm')
    setTransactionHash('')
    setShowCreateModal(true)
  }

  // Handle actual creation after confirmation
  const handleCreateConfirm = async () => {
    if (!address) return

    setCreateModalStep('pending')
    setIsLoading(true)

    // Convertir la frequence en secondes
    const frequencyInSeconds: Record<string, number> = {
      'weekly': 604800,
      'monthly': 2592000,
      'quarterly': 7776000
    }
    const cycleDuration = frequencyInSeconds[formData.frequency] || 2592000

    try {
      console.log('Creating circle with params:', {
        name: formData.name,
        contributionAmount: formData.contributionAmount,
        cycleDuration,
        maxMembers: parseInt(formData.maxMembers),
        address
      })

      const result = await circleService.createCircle(
        formData.name,
        formData.contributionAmount,
        cycleDuration,
        parseInt(formData.maxMembers),
        address
      )

      console.log('Transaction result:', result)

      if (result.transactionHash) {
        setTransactionHash(result.transactionHash)
        setCreateModalStep('processing')
      } else {
        setCreateModalStep('processing')
      }
    } catch (err: any) {
      console.error('Failed to create circle:', err)
      setError(err?.message || 'Erreur lors de la creation du cercle')
      setCreateModalStep('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateModalClose = () => {
    setShowCreateModal(false)
    setTimeout(() => {
      setCreateModalStep('confirm')
      setTransactionHash('')
    }, 300)
  }

  const handleCreateSuccess = () => {
    // Navigate to dashboard after success
    setTimeout(() => {
      navigate('/dashboard')
    }, 2000)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl max-w-md">
          <h2 className="text-2xl font-semibold text-white mb-4 text-center">
            Connexion Requise
          </h2>
          <p className="text-gray-200 mb-6 text-center">
            Vous devez vous connecter pour creer un cercle
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
        <div className="max-w-3xl mx-auto mb-12">
          <h1 className="text-5xl font-bold text-white mb-2">
            Creer un Nouveau Cercle
          </h1>
          <p className="text-xl text-gray-200">
            Configurez votre cercle d'epargne rotative sur MultiversX
          </p>
        </div>

        {/* Form */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">

            {/* Nom du cercle */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Nom du Cercle *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Epargne Etudiants 2025"
                className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${
                  errors.name ? 'border-red-500' : 'border-white/20'
                } text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-white font-semibold mb-2">
                Description (optionnel)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Decrivez l'objectif de votre cercle..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Grid pour les champs numeriques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

              {/* Montant de contribution */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Contribution par cycle (EGLD) *
                </label>
                <input
                  type="number"
                  name="contributionAmount"
                  value={formData.contributionAmount}
                  onChange={handleChange}
                  placeholder="0.1"
                  step="0.001"
                  min="0.001"
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${
                    errors.contributionAmount ? 'border-red-500' : 'border-white/20'
                  } text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                />
                {errors.contributionAmount && <p className="text-red-400 text-sm mt-1">{errors.contributionAmount}</p>}
              </div>

              {/* Frequence */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Frequence des cycles *
                </label>
                <select
                  name="frequency"
                  value={formData.frequency}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="weekly" className="bg-gray-800">Hebdomadaire (7 jours)</option>
                  <option value="monthly" className="bg-gray-800">Mensuel (30 jours)</option>
                  <option value="quarterly" className="bg-gray-800">Trimestriel (90 jours)</option>
                </select>
              </div>

              {/* Nombre maximum de membres */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Nombre de Membres (5-20) *
                </label>
                <input
                  type="number"
                  name="maxMembers"
                  value={formData.maxMembers}
                  onChange={handleChange}
                  placeholder="10"
                  min="5"
                  max="20"
                  className={`w-full px-4 py-3 rounded-lg bg-white/10 border ${
                    errors.maxMembers ? 'border-red-500' : 'border-white/20'
                  } text-white placeholder-gray-400 focus:outline-none focus:border-blue-500`}
                />
                {errors.maxMembers && <p className="text-red-400 text-sm mt-1">{errors.maxMembers}</p>}
                <p className="text-gray-400 text-xs mt-1">Entre 5 et 20 membres selon le whitepaper</p>
              </div>

              {/* Seuil de vote avec slider */}
              <div>
                <label className="block text-white font-semibold mb-2">
                  Seuil de Vote pour Admission
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="51"
                    max="100"
                    step="1"
                    value={formData.votingThreshold}
                    onChange={handleSliderChange}
                    className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((formData.votingThreshold - 51) / 49) * 100}%, rgba(255,255,255,0.2) ${((formData.votingThreshold - 51) / 49) * 100}%, rgba(255,255,255,0.2) 100%)`
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">51%</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="51"
                        max="100"
                        value={formData.votingThreshold}
                        onChange={(e) => {
                          const val = Math.min(100, Math.max(51, parseInt(e.target.value) || 51))
                          setFormData(prev => ({ ...prev, votingThreshold: val }))
                        }}
                        className="w-16 text-center text-white font-bold text-lg px-2 py-1 bg-blue-500/30 rounded-lg border border-blue-500/50 focus:outline-none focus:border-blue-400"
                      />
                      <span className="text-white font-bold">%</span>
                    </div>
                    <span className="text-gray-400 text-sm">100%</span>
                  </div>
                  <p className="text-gray-400 text-xs">
                    Pourcentage de votes positifs requis pour accepter un nouveau membre (minimum 51%)
                  </p>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-2">Resume du cercle</h4>
              <ul className="text-gray-200 text-sm space-y-1">
                <li>Nom : {formData.name || '___'}</li>
                <li>Contribution par cycle : {formData.contributionAmount || '___'} EGLD</li>
                <li>Cagnotte par distribution : {formData.contributionAmount && formData.maxMembers ?
                  (parseFloat(formData.contributionAmount) * parseInt(formData.maxMembers) * 0.97).toFixed(4) : '___'} EGLD (apres 3% de frais)</li>
                <li>Nombre de tours : {formData.maxMembers || '___'}</li>
                <li>Frequence : {formData.frequency === 'weekly' ? 'Hebdomadaire' : formData.frequency === 'monthly' ? 'Mensuel' : 'Trimestriel'}</li>
                <li>Seuil de vote : {formData.votingThreshold}% des membres</li>
              </ul>
            </div>

            {/* Smart Contract Info */}
            <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-2">Information Smart Contract</h4>
              <p className="text-gray-200 text-sm">
                Ce cercle sera cree sur le smart contract CircleManager deploye sur MultiversX Devnet.
                Vous serez automatiquement ajoute comme premier membre et createur du cercle.
              </p>
              <p className="text-yellow-300 text-xs mt-2">
                Note: Le seuil de vote minimum est de 51% (majorite absolue).
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                disabled={isLoading}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">&#8987;</span>
                    Creation en cours...
                  </>
                ) : (
                  'Creer le Cercle'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Back Button */}
        <div className="max-w-3xl mx-auto mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-300 hover:text-white transition"
          >
            &#8592; Retour au dashboard
          </button>
        </div>
      </div>

      {/* CSS pour le slider */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Create Circle Modal */}
      <TransactionModal
        isOpen={showCreateModal}
        step={createModalStep}
        title="Creation du Cercle"
        confirmTitle="Confirmer la Creation"
        confirmDescription={`Vous allez creer le cercle "${formData.name}".`}
        confirmDetails={
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Nom du cercle</span>
              <span className="text-white font-bold">{formData.name}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Contribution</span>
              <span className="text-white">{formData.contributionAmount} EGLD</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Frequence</span>
              <span className="text-white">
                {formData.frequency === 'weekly' ? 'Hebdomadaire' : formData.frequency === 'monthly' ? 'Mensuel' : 'Trimestriel'}
              </span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Membres max</span>
              <span className="text-white">{formData.maxMembers}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-400">Seuil de vote</span>
              <span className="text-white">{formData.votingThreshold}%</span>
            </div>
            <div className="flex justify-between pt-3 border-t border-purple-500/30">
              <span className="text-gray-400">Cagnotte par tour</span>
              <span className="text-green-400 font-bold">
                {formData.contributionAmount && formData.maxMembers
                  ? (parseFloat(formData.contributionAmount) * parseInt(formData.maxMembers) * 0.97).toFixed(4)
                  : '0'} EGLD
              </span>
            </div>
          </div>
        }
        successTitle="Cercle Cree avec Succes !"
        successMessage={`Le cercle "${formData.name}" a ete cree. Vous etes maintenant le createur et premier membre.`}
        errorMessage={error || "Erreur lors de la creation du cercle. Verifiez votre solde et reessayez."}
        transactionHash={transactionHash}
        onConfirm={handleCreateConfirm}
        onClose={handleCreateModalClose}
        onSuccess={handleCreateSuccess}
      />
    </div>
  )
}

export default CreateCircle
