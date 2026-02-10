import { useTranslation } from 'react-i18next'

function IDO() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-12 shadow-2xl border border-white/10">
            <div className="text-8xl mb-6">&#128640;</div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              IDO XCIRCLEX
            </h1>
            <div className="inline-block bg-yellow-400/20 text-yellow-400 px-6 py-2 rounded-full text-lg font-semibold mb-6">
              Coming Soon
            </div>
            <p className="text-xl text-gray-300 mb-8">
              {t('ido.comingSoon', "L'IDO XCIRCLEX sera bientot disponible. Restez connectes pour ne pas manquer le lancement !")}
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">&#128176;</div>
                <div className="text-white font-semibold">Token</div>
                <div className="text-gray-400 text-sm">XCX</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">&#9939;&#65039;</div>
                <div className="text-white font-semibold">Network</div>
                <div className="text-gray-400 text-sm">MultiversX</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-3xl mb-2">&#128274;</div>
                <div className="text-white font-semibold">Fair Launch</div>
                <div className="text-gray-400 text-sm">100%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IDO
