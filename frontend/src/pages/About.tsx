import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteNamesEnum } from 'routes/routes';

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary mb-4 animate-pageFadeIn">
          A propos de X-CIRCLE-X
        </h1>
        <p className="text-xl text-secondary max-w-3xl mx-auto">
          La premiere plateforme de tontine decentralisee sur MultiversX
        </p>
      </div>

      {/* What is X-CIRCLE-X */}
      <section className="mb-16">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">⭕</span>
            <h2 className="text-3xl font-bold text-primary">Qu'est-ce que X-CIRCLE-X ?</h2>
          </div>
          <p className="text-lg text-secondary leading-relaxed mb-4">
            X-CIRCLE-X est une plateforme revolutionnaire qui reinvente le concept traditionnel de la tontine (ROSCA - Rotating Savings and Credit Association) en utilisant la technologie blockchain de MultiversX.
          </p>
          <p className="text-lg text-secondary leading-relaxed">
            Notre mission est de democratiser l'acces a l'epargne collective et au microcredit en eliminant les intermediaires et en garantissant la transparence totale grace aux smart contracts.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">
          Comment ca fonctionne ?
        </h2>
        <div className="space-y-6">
          {[
            {
              title: "Creez ou rejoignez un cercle",
              description: "Creez votre propre cercle de tontine ou demandez a rejoindre un cercle existant. Chaque cercle a un nombre limite de membres (5-20) qui s'engagent a contribuer regulierement."
            },
            {
              title: "Les membres votent",
              description: "Lorsqu'un nouveau membre souhaite rejoindre, les membres existants votent pour approuver ou rejeter sa candidature. Cela garantit la confiance au sein du groupe."
            },
            {
              title: "Contribuez chaque cycle",
              description: "A chaque cycle (hebdomadaire, mensuel...), tous les membres contribuent un montant fixe en EGLD. Les contributions sont securisees dans le smart contract."
            },
            {
              title: "Distribution des fonds",
              description: "A la fin de chaque cycle, l'ensemble des contributions est distribue a un membre du cercle, selon un ordre predetermine. Chaque membre recoit la cagnotte une fois."
            },
            {
              title: "Repetez jusqu'a la fin",
              description: "Le processus continue jusqu'a ce que chaque membre ait recu sa part. Le cercle peut ensuite etre renouvele ou clou ture."
            }
          ].map((step, index) => (
            <div
              key={index}
              className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-6 hover:shadow-lg transition-all hover-lift"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-accent bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-accent">{index + 1}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-secondary">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">
          Fonctionnalites cles
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "🔗",
              title: "100% Blockchain",
              description: "Toutes les transactions et donnees sont stockees de maniere immuable sur la blockchain MultiversX."
            },
            {
              icon: "🔒",
              title: "Smart Contracts",
              description: "Les regles sont encodees dans des smart contracts audites et transparents. Aucune manipulation possible."
            },
            {
              icon: "👥",
              title: "Gouvernance DAO",
              description: "Les membres votent pour les nouvelles adhesions. La communaute controle le cercle."
            },
            {
              icon: "💰",
              title: "Frais reduits",
              description: "Seulement 3% de frais sur les distributions, bien moins que les tontines traditionnelles."
            },
            {
              icon: "⚡",
              title: "Rapide & Efficace",
              description: "Transactions instantanees grace a MultiversX. Plus besoin d'attendre des jours."
            },
            {
              icon: "🌍",
              title: "Accessible partout",
              description: "Participez de n'importe ou dans le monde. Seule une connexion internet est necessaire."
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-6 text-center hover:shadow-lg transition-all hover-lift"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-primary mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-secondary">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">
          Questions frequentes
        </h2>
        <div className="space-y-4">
          {[
            {
              question: "Qu'est-ce qu'une tontine (ROSCA) ?",
              answer: "Une tontine, ou ROSCA (Rotating Savings and Credit Association), est un systeme d'epargne collectif ou un groupe de personnes contribue regulierement a un fonds commun. A chaque cycle, un membre recoit l'integralite du pot. C'est une methode traditionnelle d'entraide financiere utilisee dans de nombreuses cultures."
            },
            {
              question: "Comment rejoindre un cercle existant ?",
              answer: "Pour rejoindre un cercle, naviguez vers la page Circles, selectionnez un cercle ouvert au recrutement, et cliquez sur 'Demander a rejoindre'. Les membres existants voteront pour approuver votre candidature."
            },
            {
              question: "Combien coute la creation d'un cercle ?",
              answer: "La creation d'un cercle est gratuite. Seuls les frais de transaction blockchain (gas) sont a votre charge, generalement quelques centimes en EGLD."
            },
            {
              question: "Que se passe-t-il si un membre ne contribue pas ?",
              answer: "Le smart contract garantit que la distribution ne peut avoir lieu que si tous les membres ont contribue. Les membres defaillants peuvent etre signales par la communaute."
            },
            {
              question: "Comment sont distribues les fonds ?",
              answer: "Les fonds sont distribues selon l'ordre d'inscription des membres dans le cercle. Chaque membre recoit la cagnotte complete une fois au cours de la vie du cercle."
            },
            {
              question: "Quels sont les frais ?",
              answer: "X-CIRCLE-X preleve 3% de frais sur chaque distribution. Ces frais servent a maintenir la plateforme et a financer son developpement."
            },
            {
              question: "Mes fonds sont-ils securises ?",
              answer: "Oui, vos fonds sont securises par le smart contract sur la blockchain MultiversX. Personne, meme l'equipe X-CIRCLE-X, ne peut acceder a vos fonds sans votre autorisation."
            },
            {
              question: "Puis-je quitter un cercle en cours ?",
              answer: "Une fois que vous avez rejoint un cercle et qu'il a demarre, vous ne pouvez pas le quitter avant la fin. Cela garantit l'integrite du systeme pour tous les membres."
            },
            {
              question: "Comment fonctionne le vote ?",
              answer: "Lorsqu'un nouveau membre demande a rejoindre, tous les membres actuels peuvent voter. Une majorite de votes positifs est necessaire pour accepter le nouveau membre."
            },
            {
              question: "X-CIRCLE-X est-il disponible sur mainnet ?",
              answer: "Actuellement, X-CIRCLE-X fonctionne sur le devnet de MultiversX. Le lancement sur mainnet est prevu pour bientot."
            }
          ].map((faq, index) => (
            <FAQItem
              key={index}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>
      </section>

      {/* Technology Stack */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">
          Stack Technologique
        </h2>
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <span>⚡</span> Frontend
              </h3>
              <ul className="space-y-2 text-secondary">
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> React 18 + TypeScript
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> Vite + Tailwind CSS
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> MultiversX SDK dApp
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> React Router v6
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <span>🔗</span> Backend & Blockchain
              </h3>
              <ul className="space-y-2 text-secondary">
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> Rust Smart Contracts
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> MultiversX Blockchain
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> MultiversX SDK Core
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">▸</span> WASM Execution
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center">
        <div className="bg-accent bg-opacity-10 border-2 border-accent rounded-xl p-10">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Pret a commencer ?
          </h2>
          <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
            Rejoignez la revolution de l'epargne collective decentralisee. Creez votre premier cercle ou rejoignez un cercle existant des maintenant !
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate(RouteNamesEnum.circles)}
              className="bg-btn-primary text-btn-primary px-8 py-4 rounded-lg hover:bg-btn-hover transition-all font-semibold text-lg hover:scale-105"
            >
              Voir les Cercles
            </button>
            <button
              onClick={() => navigate(RouteNamesEnum.createCircle)}
              className="bg-secondary text-primary border-2 border-secondary px-8 py-4 rounded-lg hover:bg-tertiary transition-all font-semibold text-lg"
            >
              Creer un Cercle
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

// FAQ Item Component with collapsible functionality
const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-tertiary transition-colors"
      >
        <span className="font-semibold text-primary pr-4">{question}</span>
        <span className={`text-accent text-2xl flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 border-t border-secondary bg-primary animate-slideUp">
          <p className="text-secondary leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default About;
