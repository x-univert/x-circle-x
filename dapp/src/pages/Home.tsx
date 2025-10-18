import { useGetIsLoggedIn } from '@multiversx/sdk-dapp/hooks'
import { logout } from '@multiversx/sdk-dapp/utils'
import { ExtensionLoginButton, WebWalletLoginButton, WalletConnectLoginButton } from '@multiversx/sdk-dapp/UI'

function Home() {
  const isLoggedIn = useGetIsLoggedIn()

  const handleLogout = () => {
    logout(`${window.location.origin}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-4">
            xCircle DAO
          </h1>
          <p className="text-2xl text-gray-200">
            Tontines Décentralisées sur MultiversX
          </p>
          <p className="text-lg text-gray-300 mt-4 max-w-2xl mx-auto">
            La confiance décentralisée, la solidarité amplifiée
          </p>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!isLoggedIn ? (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
              <h2 className="text-3xl font-semibold text-white mb-6 text-center">
                Connectez votre Wallet
              </h2>
              <p className="text-gray-200 mb-8 text-center">
                Pour accéder à xCircle DAO, connectez-vous avec votre wallet MultiversX
              </p>

              <div className="space-y-4">
                <ExtensionLoginButton
                  callbackRoute="/"
                  loginButtonText="MultiversX DeFi Wallet"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200"
                />

                <WebWalletLoginButton
                  callbackRoute="/"
                  loginButtonText="MultiversX Web Wallet"
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200"
                />

                <WalletConnectLoginButton
                  callbackRoute="/"
                  loginButtonText="xPortal App"
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl">
              <h2 className="text-3xl font-semibold text-white mb-6 text-center">
                Bienvenue sur xCircle DAO ! 🎉
              </h2>
              <p className="text-gray-200 mb-8 text-center">
                Vous êtes connecté. Les fonctionnalités arrivent bientôt !
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-white mb-2">Cercles</h3>
                  <p className="text-gray-300">Créez ou rejoignez des cercles d'épargne</p>
                </div>

                <div className="bg-white/5 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-white mb-2">Réputation</h3>
                  <p className="text-gray-300">Gagnez des NFT de réputation</p>
                </div>

                <div className="bg-white/5 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-white mb-2">Gouvernance</h3>
                  <p className="text-gray-300">Votez sur les décisions du protocole</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition duration-200"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-white mb-2">Sécurisé</h3>
            <p className="text-gray-300">Smart contracts audités et transparents</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-white mb-2">Communautaire</h3>
            <p className="text-gray-300">Gouvernance décentralisée par la DAO</p>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-white mb-2">Rapide</h3>
            <p className="text-gray-300">Transactions instantanées sur MultiversX</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-400">
          <p>xCircle DAO © 2025 - Open Source & Décentralisé</p>
          <div className="mt-4 space-x-4">
            <a href="#" className="hover:text-white transition">GitHub</a>
            <a href="#" className="hover:text-white transition">Discord</a>
            <a href="#" className="hover:text-white transition">Twitter</a>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Home
