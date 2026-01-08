import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteNamesEnum } from 'routes/routes';

const Whitepaper = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    { id: 'summary', title: 'Resume executif', icon: '📋' },
    { id: 'vision', title: 'Vision et mission', icon: '🎯' },
    { id: 'problem', title: 'Probleme et opportunite', icon: '💡' },
    { id: 'solution', title: 'Solution X-CIRCLE-X', icon: '⚙️' },
    { id: 'circleOfLife', title: 'Le Cercle de Vie', icon: '🌀' },
    { id: 'architecture', title: 'Architecture technique', icon: '🏗️' },
    { id: 'tokenomics', title: 'Tokenomics $XCIRCLEX', icon: '🪙' },
    { id: 'staking', title: 'Staking Circulaire 360', icon: '📈' },
    { id: 'nft', title: 'NFT Evolutif', icon: '🎨' },
    { id: 'liquidity', title: 'Pool de Liquidite', icon: '💧' },
    { id: 'governance', title: 'Gouvernance DAO', icon: '🏛️' },
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
          Version 2.2 - Janvier 2026
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
