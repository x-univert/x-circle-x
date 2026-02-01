import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteNamesEnum } from 'localConstants';

const Whitepaper = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: 'summary', title: 'Resume executif', icon: '📋' },
    { id: 'vision', title: 'Vision et mission', icon: '🎯' },
    { id: 'problem', title: 'Probleme et opportunite', icon: '💡' },
    { id: 'solution', title: 'Solution X-CIRCLE-X', icon: '⚙️' },
    { id: 'circleOfLife', title: 'Le Cercle de Vie', icon: '🌀' },
    { id: 'rewards', title: 'Systeme de Recompenses', icon: '🎁' },
    { id: 'bonuses', title: 'Systeme de Bonus', icon: '🚀' },
    { id: 'tokenomics', title: 'Tokenomics $XCIRCLEX', icon: '🪙' },
    { id: 'staking', title: 'Staking Circulaire 360', icon: '📈' },
    { id: 'nft', title: 'NFT Evolutif', icon: '🎨' },
    { id: 'liquidity', title: 'Pool de Liquidite', icon: '💧' },
    { id: 'governance', title: 'Gouvernance DAO', icon: '🏛️' },
    { id: 'useCases', title: 'Cas d\'Usage', icon: '👥' },
    { id: 'roadmap', title: 'Roadmap', icon: '🗺️' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary mb-4 animate-pageFadeIn">
          Whitepaper X-CIRCLE-X
        </h1>
        <p className="text-xl text-secondary max-w-3xl mx-auto mb-4">
          Version 2.3 - Janvier 2026
        </p>
        <p className="text-lg text-tertiary max-w-2xl mx-auto">
          La premiere plateforme de tontine decentralisee sur MultiversX avec le Cercle de Vie
        </p>
      </div>

      {/* Quick Navigation */}
      <div className="mb-12">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-6">
          <h2 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <span>📑</span> Table des matieres
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 p-3 bg-primary rounded-lg hover:bg-tertiary transition-all text-sm"
              >
                <span>{section.icon}</span>
                <span className="text-secondary">{section.title}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Resume Executif */}
      <section id="summary" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>📋</span> Resume executif
          </h2>
          <p className="text-lg text-secondary leading-relaxed mb-6">
            <strong>X-CIRCLE-X DAO</strong> est une plateforme decentralisee de solidarite financiere qui reinvente les <strong>tontines traditionnelles</strong> (ROSCA - Rotating Savings and Credit Association) en les rendant transparentes, securisees et programmables grace a la blockchain MultiversX.
          </p>
          <p className="text-lg text-secondary leading-relaxed mb-6">
            Au coeur de l'ecosysteme se trouve le <strong>Cercle de Vie</strong> : un systeme innovant de smart contracts interconnectes formant un cercle autour d'un contrat central (SC0), ou les tokens circulent quotidiennement entre tous les participants actifs.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🌍</div>
              <p className="text-primary font-bold">1+ Milliard</p>
              <p className="text-sm text-tertiary">Utilisateurs de tontines</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-primary font-bold">500+ Milliards USD</p>
              <p className="text-sm text-tertiary">Epargne rotative mondiale</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">🪙</div>
              <p className="text-primary font-bold">314,159,265</p>
              <p className="text-sm text-tertiary">Supply = PI x 10^8</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision et Mission */}
      <section id="vision" className="mb-16 scroll-mt-20">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🎯</span> Vision et Mission
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-primary rounded-lg p-6">
              <h3 className="text-xl font-bold text-accent mb-3">Vision</h3>
              <p className="text-secondary">
                Devenir la plateforme de reference mondiale pour l'epargne collaborative decentralisee, en offrant a des millions de personnes un acces transparent, securise et programmable aux systemes de solidarite financiere.
              </p>
            </div>
            <div className="bg-primary rounded-lg p-6">
              <h3 className="text-xl font-bold text-accent mb-3">Mission</h3>
              <p className="text-secondary">
                Democratiser l'acces aux services financiers collaboratifs en combinant la sagesse des systemes traditionnels d'epargne rotative, la transparence de la blockchain et la puissance des smart contracts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Probleme et Opportunite */}
      <section id="problem" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>💡</span> Probleme et Opportunite
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Problemes */}
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-4">Problemes des Tontines Traditionnelles</h3>
              <p className="text-secondary mb-4">
                Les <strong>tontines</strong> (aussi appelees "tandas" au Mexique, "chit funds" en Inde, "susus" en Afrique de l'Ouest) sont utilisees par plus d'<strong>1 milliard de personnes</strong> mais souffrent de:
              </p>
              <ul className="space-y-3">
                {[
                  { icon: '❌', title: 'Manque de confiance', desc: 'Pas de tracabilite, risques de fraude' },
                  { icon: '❌', title: 'Pas de garantie', desc: 'Si un membre part, le cercle s\'effondre' },
                  { icon: '❌', title: 'Opacite', desc: 'Decisions arbitraires du gestionnaire' },
                  { icon: '❌', title: 'Limite geographiquement', desc: 'Necessite une proximite physique' },
                  { icon: '❌', title: 'Pas d\'historique', desc: 'Aucune preuve de bonne conduite' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-red-500/10 rounded-lg p-3">
                    <span>{item.icon}</span>
                    <div>
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solutions */}
            <div>
              <h3 className="text-xl font-bold text-green-400 mb-4">L'Opportunite Blockchain</h3>
              <p className="text-secondary mb-4">
                La blockchain <strong>MultiversX</strong> permet de resoudre ces problemes grace a:
              </p>
              <ul className="space-y-3">
                {[
                  { icon: '✅', title: 'Transparence totale', desc: 'Toutes les transactions sont publiques et verifiables' },
                  { icon: '✅', title: 'Securite cryptographique', desc: 'Smart contracts immuables' },
                  { icon: '✅', title: 'Automatisation', desc: 'Execution garantie sans intermediaire' },
                  { icon: '✅', title: 'Reputation on-chain', desc: 'Historique permanent via NFTs' },
                  { icon: '✅', title: 'Global', desc: 'Accessible depuis n\'importe ou dans le monde' },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 bg-green-500/10 rounded-lg p-3">
                    <span>{item.icon}</span>
                    <div>
                      <p className="font-bold text-white">{item.title}</p>
                      <p className="text-sm text-gray-400">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Comparaison */}
          <h3 className="text-xl font-bold text-primary mb-4">Avantages Competitifs Uniques</h3>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { title: 'Cercle de Vie', desc: 'Circulation quotidienne obligatoire unique', icon: '🔄' },
              { title: 'MultiversX', desc: 'Frais ~$0.001-0.01 vs $5-50 sur Ethereum', icon: '⚡' },
              { title: 'NFT Evolutif', desc: 'Reputation on-chain visible et transferable', icon: '🎨' },
              { title: 'Symbolique PI', desc: 'Branding mathematique unique et memorable', icon: 'π' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{item.icon}</div>
                <p className="font-bold text-primary">{item.title}</p>
                <p className="text-xs text-tertiary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution X-CIRCLE-X */}
      <section id="solution" className="mb-16 scroll-mt-20">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>⚙️</span> Solution X-CIRCLE-X
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            X-CIRCLE-X DAO transforme la tontine traditionnelle en <strong>systeme decentralise</strong> enrichi par le <strong>Cercle de Vie</strong>.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { title: 'Circle Manager', icon: '🔷', desc: 'Cree et configure les cercles, orchestre les cycles, distribue les fonds' },
              { title: 'Token $XCIRCLEX', icon: '🪙', desc: 'Gouvernance DAO, staking, acces premium, mechanism deflationniste' },
              { title: 'NFT Reputation', icon: '🎨', desc: 'Cycles reussis, score de ponctualite, avantages debloques' },
              { title: 'Treasury DAO', icon: '🏦', desc: 'Frais de service, reserve d\'urgence, financement dev' },
            ].map((item, i) => (
              <div key={i} className="bg-white/10 rounded-lg p-4">
                <div className="text-2xl mb-2">{item.icon}</div>
                <h4 className="font-bold text-primary mb-2">{item.title}</h4>
                <p className="text-xs text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-black/20 rounded-lg p-6">
            <h3 className="text-lg font-bold text-primary mb-4">Flux d'Utilisation</h3>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              {[
                { step: '1', text: 'Connexion xPortal' },
                { step: '2', text: 'Exploration cercles' },
                { step: '3', text: 'Demande adhesion' },
                { step: '4', text: 'Contribution auto' },
                { step: '5', text: 'Reception a son tour' },
                { step: '6', text: 'MAJ NFT reputation' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-xs font-bold">{item.step}</span>
                  <span className="text-secondary">{item.text}</span>
                  {i < 5 && <span className="text-gray-600">→</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Le Cercle de Vie */}
      <section id="circleOfLife" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-2 border-blue-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🌀</span> Le Cercle de Vie
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            Le <strong>Cercle de Vie</strong> est le coeur battant de X-CIRCLE-X. C'est un ecosysteme de smart contracts interconnectes formant un cercle autour d'un smart contract central (SC0). Les tokens transitent quotidiennement de maniere circulaire entre tous les smart contracts actifs.
          </p>

          {/* Visual Diagram */}
          <div className="bg-white/5 rounded-xl p-6 mb-6">
            <pre className="text-center text-sm md:text-base text-secondary font-mono overflow-x-auto">
{`                    ┌─────────┐
                    │   SC3   │
                   /│ Owner:  │\\
                  / │ SC0+U3  │ \\
                 /  └────┬────┘  \\
                ↓        │        ↑
         ┌─────────┐     │     ┌─────────┐
         │   SC2   │     │     │   SC4   │
         │ Owner:  │     │     │ Owner:  │
         │ SC0+U2  │     │     │ SC0+U4  │
         └────┬────┘     │     └────┬────┘
              ↓          │          ↑
               \\    ┌────┴────┐    /
                \\   │   SC0   │   /
                 \\  │ CENTRAL │  /
                  \\ │ Master  │ /
                   \\└────┬────┘/
                    ↓    │    ↑
              ┌─────────┐│┌─────────┐
              │   SC1   │││   SC5   │
              │ Owner:  │││ Owner:  │
              │ SC0+U1  │││ SC0+U5  │
              └─────────┘│└─────────┘

            FLUX CIRCULAIRE QUOTIDIEN:
         SC0 → SC1 → SC2 → SC3 → SC4 → SC5 → SC0`}
            </pre>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-2">SC0 - Contrat Central</h4>
              <ul className="text-sm text-secondary space-y-1">
                <li>• Cree tous les SC peripheriques</li>
                <li>• Co-proprietaire de tous les SC</li>
                <li>• Orchestre les transactions</li>
                <li>• Distribue les recompenses</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-2">SC Peripheriques</h4>
              <ul className="text-sm text-secondary space-y-1">
                <li>• 2 proprietaires: SC0 + utilisateur</li>
                <li>• Recoit et transmet les fonds</li>
                <li>• Recoit les recompenses XCIRCLEX</li>
                <li>• Peut etre banni si inactif</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Systeme de Recompenses */}
      <section id="rewards" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🎁</span> Systeme de Recompenses PI x 360
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            Le systeme de recompenses du Cercle de Vie est base sur une formule unique qui combine la symbolique du cercle (360 degres) et du nombre PI, avec un mecanisme de <strong>halving</strong> inspire de Bitcoin.
          </p>

          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-primary mb-4">Formule de Recompense</h3>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-center mb-4">
              <p className="text-green-400 text-lg">recompense = 36,000 / 2^era</p>
              <p className="text-gray-400 text-sm mt-2">ou era = floor(cycles_completes / 360)</p>
            </div>
            <p className="text-secondary text-sm">
              <strong>BASE_REWARD</strong> = 36,000 XCX par cycle (360 x 100) | <strong>HALVING</strong> : Tous les 360 cycles (1 cercle complet)
            </p>
          </div>

          <h3 className="text-xl font-bold text-primary mb-4">Table des Recompenses par Ere</h3>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 text-primary">Ere</th>
                  <th className="text-left py-3 text-primary">Cycles</th>
                  <th className="text-left py-3 text-primary">Recompense/Cycle</th>
                  <th className="text-left py-3 text-primary">Total sur l'Ere</th>
                  <th className="text-left py-3 text-primary">Duree</th>
                </tr>
              </thead>
              <tbody className="text-secondary">
                {[
                  { era: 0, cycles: '1-360', reward: '36,000 XCX', total: '12,960,000 XCX', time: '~1 an' },
                  { era: 1, cycles: '361-720', reward: '18,000 XCX', total: '6,480,000 XCX', time: '~1 an' },
                  { era: 2, cycles: '721-1080', reward: '9,000 XCX', total: '3,240,000 XCX', time: '~1 an' },
                  { era: 3, cycles: '1081-1440', reward: '4,500 XCX', total: '1,620,000 XCX', time: '~1 an' },
                  { era: 4, cycles: '1441-1800', reward: '2,250 XCX', total: '810,000 XCX', time: '~1 an' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-3 font-bold text-yellow-400">{row.era}</td>
                    <td className="py-3">{row.cycles}</td>
                    <td className="py-3 text-green-400 font-bold">{row.reward}</td>
                    <td className="py-3">{row.total}</td>
                    <td className="py-3">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-2">Cycle Reussi</h4>
              <ul className="text-sm text-secondary space-y-1">
                <li>• Recompense calculee selon la formule PI x 360</li>
                <li>• Chaque SC actif recoit sa part equitablement</li>
                <li>• Les tokens sont <strong className="text-red-400">BRULES</strong> (deflation)</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-bold text-primary mb-2">Cycle Echoue</h4>
              <ul className="text-sm text-secondary space-y-1">
                <li>• SC defaillant ne recoit <strong>PAS</strong> de recompenses</li>
                <li>• Ses tokens sont redistribues aux signataires</li>
                <li>• Pas de burn en cas d'echec</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Systeme de Bonus */}
      <section id="bonuses" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-2 border-emerald-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🚀</span> Systeme de Bonus
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            Le Cercle de Vie recompense differents types de comportements positifs via un systeme de <strong>bonus cumulables</strong>. Chaque bonus encourage une action specifique qui beneficie a l'ensemble de l'ecosysteme.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Bonus Starter */}
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🚀</span>
                <h3 className="text-lg font-bold text-blue-400">Bonus Starter</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">10%</p>
              <p className="text-sm text-secondary mb-3">
                Recompense celui qui initie le cycle quotidien en appelant <code className="bg-black/30 px-1 rounded">startDailyCycle()</code>.
              </p>
              <div className="bg-black/20 rounded p-2 text-xs text-gray-400">
                <strong>Exemple:</strong> Base 1,714 XCX = +171 XCX
              </div>
            </div>

            {/* Bonus Pioneer */}
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🏆</span>
                <h3 className="text-lg font-bold text-purple-400">Bonus Pioneer</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">3.14% <span className="text-sm text-purple-400">(PI%)</span></p>
              <p className="text-sm text-secondary mb-3">
                Recompense les premiers membres (early adopters) qui ont cree leur SC peripherique.
              </p>
              <div className="bg-black/20 rounded p-2 text-xs text-gray-400">
                <strong>Exemple:</strong> Base 1,714 XCX = +53.8 XCX
              </div>
            </div>

            {/* Bonus Depot */}
            <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">💎</span>
                <h3 className="text-lg font-bold text-amber-400">Bonus Depot</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">1%<span className="text-sm text-amber-400">/EGLD supp.</span></p>
              <p className="text-sm text-secondary mb-3">
                Recompense les membres qui deposent plus que le minimum requis (1 EGLD).
              </p>
              <div className="bg-black/20 rounded p-2 text-xs text-gray-400">
                <strong>5 EGLD:</strong> +4% | <strong>10 EGLD:</strong> +9%
              </div>
            </div>

            {/* Bonus Cercle Complet */}
            <div className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 border border-pink-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🔄</span>
                <h3 className="text-lg font-bold text-pink-400">Cercle Complet</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">3.14% <span className="text-sm text-pink-400">(PI%)</span></p>
              <p className="text-sm text-secondary mb-3">
                Attribue au membre qui complete un cycle multiple de 360 (#360, #720, #1080...).
              </p>
              <div className="bg-black/20 rounded p-2 text-xs text-gray-400">
                <strong>Cycle #360:</strong> +1,130 XCX bonus
              </div>
            </div>

            {/* Bonus Parrainage */}
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-xl p-5 md:col-span-2 lg:col-span-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">👥</span>
                <h3 className="text-lg font-bold text-green-400">Bonus Parrainage</h3>
              </div>
              <p className="text-3xl font-bold text-white mb-2">1% <span className="text-sm text-green-400">par filleul actif</span></p>
              <p className="text-sm text-secondary mb-3">
                Chaque filleul actif donne +1% de bonus sur vos recompenses. Maximum 360 filleuls = <strong className="text-green-400">+360% bonus</strong>.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">
                {[
                  { refs: '1', bonus: '+1%' },
                  { refs: '10', bonus: '+10%' },
                  { refs: '50', bonus: '+50%' },
                  { refs: '100', bonus: '+100%' },
                  { refs: '360', bonus: '+360% MAX' },
                ].map((item, i) => (
                  <div key={i} className="bg-black/20 rounded p-2 text-center">
                    <p className="text-xs text-gray-400">{item.refs} filleuls</p>
                    <p className="text-sm font-bold text-green-400">{item.bonus}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tableau recapitulatif */}
          <h3 className="text-xl font-bold text-primary mb-4">Tableau Recapitulatif</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 text-primary">Bonus</th>
                  <th className="text-left py-3 text-primary">Pourcentage</th>
                  <th className="text-left py-3 text-primary">Condition</th>
                  <th className="text-left py-3 text-primary">Frequence</th>
                </tr>
              </thead>
              <tbody className="text-secondary">
                {[
                  { name: 'Starter', pct: '10%', cond: 'Demarrer le cycle', freq: 'Par cycle' },
                  { name: 'Pioneer', pct: '3.14% (PI)', cond: 'Etre early adopter', freq: 'Par cycle' },
                  { name: 'Depot', pct: '1% par EGLD', cond: 'Depot > 1 EGLD', freq: 'Par cycle' },
                  { name: 'Cercle Complet', pct: '3.14% (PI)', cond: 'Cycle #360, #720...', freq: 'Tous les 360 cycles' },
                  { name: 'Parrainage', pct: '1% par filleul (max 360%)', cond: 'Filleuls actifs', freq: 'Par cycle' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-3 font-bold">{row.name}</td>
                    <td className="py-3 text-green-400">{row.pct}</td>
                    <td className="py-3">{row.cond}</td>
                    <td className="py-3">{row.freq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tokenomics */}
      <section id="tokenomics" className="mb-16 scroll-mt-20">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🪙</span> Tokenomics $XCIRCLEX
          </h2>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-6 mb-6 text-center">
            <p className="text-lg text-tertiary mb-2">Supply Total = PI x 10^8</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              314,159,265.358979...
            </p>
            <p className="text-sm text-tertiary mt-2">Le cercle parfait : PI est l'ame mathematique</p>
          </div>

          <h3 className="text-xl font-bold text-primary mb-4">Distribution Initiale</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { name: 'Recompenses Cercle', pct: '35%', tokens: '~110M', color: 'from-purple-500 to-pink-500' },
              { name: 'Pool Liquidite', pct: '15%', tokens: '~47M', color: 'from-blue-500 to-cyan-500' },
              { name: 'Staking Rewards', pct: '15%', tokens: '~47M', color: 'from-green-500 to-emerald-500' },
              { name: 'Equipe', pct: '10%', tokens: '~31M', color: 'from-amber-500 to-orange-500' },
              { name: 'Tresorerie DAO', pct: '10%', tokens: '~31M', color: 'from-red-500 to-rose-500' },
              { name: 'IDO', pct: '5%', tokens: '~16M', color: 'from-emerald-500 to-green-500', highlight: true },
              { name: 'Marketing', pct: '5%', tokens: '~16M', color: 'from-indigo-500 to-violet-500' },
              { name: 'Conseillers', pct: '3%', tokens: '~9M', color: 'from-teal-500 to-cyan-500' },
              { name: 'Airdrop', pct: '2%', tokens: '~6M', color: 'from-pink-500 to-rose-500' },
            ].map((item, i) => (
              <div key={i} className={`bg-gradient-to-br ${item.color}/20 border ${item.highlight ? 'border-green-500/50 border-2' : 'border-white/10'} rounded-lg p-4`}>
                <p className="text-primary font-bold">{item.name}</p>
                <p className={`text-2xl font-bold ${item.highlight ? 'text-green-400' : 'text-white'}`}>{item.pct}</p>
                <p className="text-xs text-tertiary">{item.tokens}</p>
              </div>
            ))}
          </div>

          <h3 className="text-xl font-bold text-primary mb-4">Systeme de Recompenses PI x 360</h3>
          <div className="bg-primary rounded-lg p-4">
            <p className="text-secondary mb-4">
              <strong>Formule:</strong> recompense = 36,000 / 2^era (ou era = cycles / 360)
            </p>
            <p className="text-secondary mb-4">
              <strong>Halving:</strong> Tous les 360 cycles (1 cercle complet)
            </p>
            <p className="text-secondary">
              <strong>Bonus PI%:</strong> +3.14% pour celui qui complete les cycles #360, #720, #1080...
            </p>
          </div>
        </div>
      </section>

      {/* Staking */}
      <section id="staking" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>📈</span> Staking Circulaire 360
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            Le staking X-CIRCLE-X est base sur la symbolique du cercle parfait : <strong>360 degres = 12 niveaux de lock x 30 jours</strong>.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left py-3 text-primary">Niveau</th>
                  <th className="text-left py-3 text-primary">Duree</th>
                  <th className="text-left py-3 text-primary">Degres</th>
                  <th className="text-left py-3 text-primary">APY</th>
                  <th className="text-left py-3 text-primary">Badge NFT</th>
                </tr>
              </thead>
              <tbody className="text-secondary">
                {[
                  { lvl: 1, days: 30, deg: '30', apy: '5%', badge: '-' },
                  { lvl: 3, days: 90, deg: '90', apy: '12%', badge: 'Bronze' },
                  { lvl: 6, days: 180, deg: '180', apy: '22%', badge: 'Argent+' },
                  { lvl: 9, days: 270, deg: '270', apy: '32%', badge: 'Platine' },
                  { lvl: 12, days: 360, deg: '360', apy: '42%', badge: 'Cercle Parfait' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10">
                    <td className="py-3">{row.lvl}</td>
                    <td className="py-3">{row.days} jours</td>
                    <td className="py-3">{row.deg}</td>
                    <td className="py-3 text-green-400 font-bold">{row.apy}</td>
                    <td className="py-3">{row.badge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* NFT Evolutif */}
      <section id="nft" className="mb-16 scroll-mt-20">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🎨</span> NFT Evolutif - Cercle de Reputation
          </h2>

          <p className="text-lg text-secondary leading-relaxed mb-6">
            Chaque membre du Cercle de Vie possede un <strong>NFT dynamique</strong> qui evolue visuellement en fonction de ses cycles reussis. Le NFT represente un cercle central avec des points peripheriques qui apparaissent progressivement.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { cycles: '0-29', points: 0, rarity: 'Commun', bonus: '+0%' },
              { cycles: '90+', points: 3, rarity: 'Rare', bonus: '+10%' },
              { cycles: '180+', points: 6, rarity: 'Epique', bonus: '+15%' },
              { cycles: '270+', points: 9, rarity: 'Mythique', bonus: '+35%' },
              { cycles: '360+', points: 12, rarity: 'CERCLE PARFAIT', bonus: '+50%' },
            ].map((nft, i) => (
              <div key={i} className="bg-primary rounded-lg p-4 text-center">
                <p className="text-tertiary text-sm">{nft.cycles} cycles</p>
                <p className="text-2xl font-bold text-primary">{nft.points} points</p>
                <p className="text-accent font-semibold">{nft.rarity}</p>
                <p className="text-green-400 text-sm">Bonus Staking: {nft.bonus}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Governance */}
      <section id="governance" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-2 border-amber-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🏛️</span> Gouvernance DAO
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Niveaux de Gouvernance</h3>
              <ul className="space-y-3">
                {[
                  { level: 'Core Team', desc: 'Decisions critiques (6 mois initiaux)' },
                  { level: 'Contributors DAO', desc: 'Developpeurs actifs, propositions techniques' },
                  { level: 'Token Holders', desc: 'Vote sur propositions, allocation budget' },
                  { level: 'Circle Leaders', desc: 'Createurs de cercles actifs (vote 2x)' },
                ].map((item, i) => (
                  <li key={i} className="bg-white/10 rounded-lg p-3">
                    <p className="font-bold text-accent">{item.level}</p>
                    <p className="text-sm text-secondary">{item.desc}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Processus de Proposition</h3>
              <ol className="space-y-3">
                {[
                  'Soumission: Holder avec 10,000+ XCIRCLEX',
                  'Discussion: 7 jours sur forum',
                  'Vote: 5 jours, quorum 10%',
                  'Timelock: 48h avant execution',
                  'Execution: Automatique par SC',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-accent rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </span>
                    <span className="text-secondary">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Cas d'Usage */}
      <section id="useCases" className="mb-16 scroll-mt-20">
        <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border-2 border-indigo-500/30 rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>👥</span> Cas d'Usage Concrets
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Cas 1: Marie */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🌍</span>
                <div>
                  <h3 className="text-lg font-bold text-primary">Marie, commercante au Senegal</h3>
                  <p className="text-sm text-tertiary">Acces au financement sans banque</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-secondary">
                <p><strong className="text-white">Situation:</strong> Marie veut acheter un refrigerateur (500E) mais n'a pas acces au credit bancaire.</p>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-green-400 font-semibold mb-2">Solution X-CIRCLE-X:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Cree un SC peripherique (1 EGLD ~ 40E)</li>
                    <li>Participe aux cycles quotidiens</li>
                    <li>Gagne ~1,700 XCX/cycle</li>
                    <li>Apres 30 cycles, NFT niveau 1</li>
                    <li>Revend ses XCX ou stake pour 5-42% APY</li>
                  </ol>
                </div>
                <p className="text-green-400 text-xs"><strong>Avantages:</strong> Transparent, automatique, reputation portable</p>
              </div>
            </div>

            {/* Cas 2: Ahmed */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💻</span>
                <div>
                  <h3 className="text-lg font-bold text-primary">Ahmed, developpeur freelance</h3>
                  <p className="text-sm text-tertiary">Epargne productive en crypto</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-secondary">
                <p><strong className="text-white">Situation:</strong> Ahmed gagne en crypto et veut epargner de maniere productive.</p>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-green-400 font-semibold mb-2">Utilisation X-CIRCLE-X:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Stake 100,000 XCX niveau 6 (180 jours)</li>
                    <li>Gagne 22% APY = 22,000 XCX/an</li>
                    <li>Participe au Cercle de Vie pour bonus</li>
                    <li>Vote dans la DAO (pouvoir 1.5x)</li>
                    <li>NFT niveau 6 = +15% bonus staking</li>
                  </ol>
                </div>
                <p className="text-green-400 text-xs"><strong>Resultat:</strong> Epargne productive + gouvernance + reputation</p>
              </div>
            </div>

            {/* Cas 3: Association */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🤝</span>
                <div>
                  <h3 className="text-lg font-bold text-primary">Association "Les Amis de Lyon"</h3>
                  <p className="text-sm text-tertiary">Epargne collective transparente</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-secondary">
                <p><strong className="text-white">Situation:</strong> 15 amis veulent epargner ensemble pour un voyage annuel.</p>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-green-400 font-semibold mb-2">Solution X-CIRCLE-X:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Chacun cree un SC peripherique (1 EGLD)</li>
                    <li>L'association recoit des XCX a chaque cycle</li>
                    <li>Apres 6 mois, XCX finances le voyage</li>
                    <li>Membres gardent leur NFT de reputation</li>
                    <li>Annee suivante: acces cercles VIP</li>
                  </ol>
                </div>
                <p className="text-green-400 text-xs"><strong>Avantage:</strong> Plus de tresorier humain, tout est on-chain</p>
              </div>
            </div>

            {/* Cas 4: Pierre */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📈</span>
                <div>
                  <h3 className="text-lg font-bold text-primary">Pierre, investisseur DeFi</h3>
                  <p className="text-sm text-tertiary">Maximisation des rendements</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-secondary">
                <p><strong className="text-white">Situation:</strong> Pierre cherche du yield dans un projet innovant.</p>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-green-400 font-semibold mb-2">Strategie X-CIRCLE-X:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Achete 500,000 XCX sur xExchange</li>
                    <li>Stake niveau 12 (360j) = 42% APY</li>
                    <li>Fournit liquidite EGLD/XCX = +fees LP</li>
                    <li>Participe au Cercle = bonus quotidiens</li>
                    <li>NFT Cercle Parfait = +50% bonus + 3x vote</li>
                  </ol>
                </div>
                <p className="text-green-400 text-xs"><strong>Yield total estime:</strong> 50-80% APY combine</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section id="roadmap" className="mb-16 scroll-mt-20">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <h2 className="text-3xl font-bold text-primary mb-6 flex items-center gap-3">
            <span>🗺️</span> Roadmap
          </h2>

          <div className="space-y-6">
            {[
              { phase: 'Phase 0', status: 'COMPLETE', title: 'MVP Actuel', date: 'Dec 2025', items: ['Smart contracts deployes sur Devnet', 'Interface dApp fonctionnelle', '21+ SC actifs'] },
              { phase: 'Phase 1', status: 'EN COURS', title: 'Stabilisation', date: 'Q1 2026', items: ['Tests automatises (coverage > 80%)', 'Documentation complete', 'Audit securite interne'] },
              { phase: 'Phase 2', status: 'PLANIFIE', title: 'Beta', date: 'Q2 2026', items: ['NFT de reputation', 'Gouvernance V1', 'Deploiement Testnet'] },
              { phase: 'Phase 3', status: 'PLANIFIE', title: 'Mainnet', date: 'Q3 2026', items: ['Audit externe (CertiK/Hacken)', 'IDO du token', 'Listing xExchange'] },
              { phase: 'Phase 4', status: 'FUTUR', title: 'Expansion', date: '2027+', items: ['Mobile app native', 'Bridge multi-chaines', 'Prets P2P'] },
            ].map((phase, i) => (
              <div key={i} className={`border-l-4 ${phase.status === 'COMPLETE' ? 'border-green-500' : phase.status === 'EN COURS' ? 'border-amber-500' : 'border-gray-500'} pl-6`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${phase.status === 'COMPLETE' ? 'bg-green-500/20 text-green-400' : phase.status === 'EN COURS' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {phase.status}
                  </span>
                  <span className="font-bold text-primary">{phase.phase}: {phase.title}</span>
                  <span className="text-tertiary text-sm">{phase.date}</span>
                </div>
                <ul className="text-secondary text-sm space-y-1">
                  {phase.items.map((item, j) => (
                    <li key={j}>• {item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conclusion */}
      <section className="mb-16">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/30 rounded-xl p-8 text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">Conclusion</h2>
          <p className="text-lg text-secondary leading-relaxed mb-6 max-w-3xl mx-auto">
            X-CIRCLE-X DAO represente une opportunite unique de combiner un besoin reel (1+ milliard d'utilisateurs de tontines), une innovation technologique (blockchain MultiversX + Cercle de Vie), et un impact social positif (inclusion financiere).
          </p>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
            "Le cercle est la forme parfaite, PI en est l'ame mathematique."
          </p>
          <p className="text-tertiary">
            PI x 10^8 = 314,159,265.358979323846264338 $XCIRCLEX
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center">
        <div className="bg-accent bg-opacity-10 border-2 border-accent rounded-xl p-10">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Rejoignez le Cercle de Vie
          </h2>
          <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
            L'avenir de l'epargne collaborative est on-chain. L'avenir, c'est X-CIRCLE-X DAO.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate(RouteNamesEnum.circleOfLife)}
              className="bg-btn-primary text-btn-primary px-8 py-4 rounded-lg hover:bg-btn-hover transition-all font-semibold text-lg hover:scale-105"
            >
              Decouvrir le Cercle de Vie
            </button>
            <button
              onClick={() => navigate(RouteNamesEnum.about)}
              className="bg-secondary text-primary border-2 border-secondary px-8 py-4 rounded-lg hover:bg-tertiary transition-all font-semibold text-lg"
            >
              En savoir plus
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Whitepaper;
