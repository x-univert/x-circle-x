import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RouteNamesEnum } from 'localConstants';

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary mb-4 animate-pageFadeIn">
          {t('about.title')}
        </h1>
        <p className="text-xl text-secondary max-w-3xl mx-auto">
          {t('about.subtitle')}
        </p>
      </div>

      {/* What is X-CIRCLE-X */}
      <section className="mb-16">
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">⭕</span>
            <h2 className="text-3xl font-bold text-primary">{t('about.what.title')}</h2>
          </div>
          <p className="text-lg text-secondary leading-relaxed mb-4">
            {t('about.what.description1')}
          </p>
          <p className="text-lg text-secondary leading-relaxed">
            {t('about.what.description2')}
          </p>
        </div>
      </section>

      {/* Circle of Life Principle */}
      <section className="mb-16">
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-2 border-purple-500/30 rounded-xl p-8 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-4xl">🌀</span>
            <h2 className="text-3xl font-bold text-primary">{t('about.circleOfLife.title')}</h2>
          </div>

          <p className="text-lg text-secondary leading-relaxed mb-6" dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.intro').replace('<strong>', '<strong class="text-purple-400">') }} />

          {/* Visual Diagram */}
          <div className="bg-black/30 rounded-xl p-6 mb-6">
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <div className="inline-block bg-purple-500/30 border-2 border-purple-500 rounded-full px-6 py-3 mb-2">
                  <span className="text-2xl">🏠</span>
                  <span className="text-white font-bold ml-2">{t('about.circleOfLife.sc0Label')}</span>
                </div>
                <p className="text-gray-400 text-sm">{t('about.circleOfLife.sc0Subtitle')}</p>
              </div>

              <div className="text-3xl text-purple-400 my-2">↓ 1 EGLD ↓</div>

              <div className="flex flex-wrap justify-center gap-4 my-4">
                {['SC1', 'SC2', 'SC3', '...', 'SCn'].map((sc, i) => (
                  <div key={i} className="bg-blue-500/20 border border-blue-500/50 rounded-lg px-4 py-2">
                    <span className="text-blue-300 font-mono">{sc}</span>
                  </div>
                ))}
              </div>

              <div className="text-3xl text-green-400 my-2">↓ {t('about.circleOfLife.transfer')} ↓</div>

              <div className="text-center">
                <div className="inline-block bg-green-500/30 border-2 border-green-500 rounded-full px-6 py-3">
                  <span className="text-2xl">🏠</span>
                  <span className="text-white font-bold ml-2">{t('about.circleOfLife.returnSc0')}</span>
                </div>
                <p className="text-gray-400 text-sm mt-2">{t('about.circleOfLife.cycleComplete')}</p>
              </div>
            </div>
          </div>

          {/* How Circle of Life Works */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <span>📋</span> {t('about.circleOfLife.howItWorks.title')}
              </h3>
              <ul className="space-y-3 text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.howItWorks.step1') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.howItWorks.step2') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.howItWorks.step3') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.howItWorks.step4') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">✓</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.howItWorks.step5') }} />
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                <span>🎁</span> {t('about.circleOfLife.rewards.title')}
              </h3>
              <ul className="space-y-3 text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">★</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.rewards.item1') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">★</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.rewards.item2') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">★</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.rewards.item3') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">★</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.rewards.item4') }} />
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-1">★</span>
                  <span dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.rewards.item5') }} />
                </li>
              </ul>
            </div>
          </div>

          {/* Penalties */}
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2 mb-2">
              <span>⚠️</span> {t('about.circleOfLife.penalties.title')}
            </h3>
            <p className="text-secondary text-sm" dangerouslySetInnerHTML={{ __html: t('about.circleOfLife.penalties.description').replace('<strong>', '<strong class="text-red-400">') }} />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold text-primary mb-8 text-center">
          {t('about.howToParticipate.title')}
        </h2>
        <div className="space-y-6">
          {[
            {
              title: t('about.howToParticipate.steps.step1.title'),
              description: t('about.howToParticipate.steps.step1.description')
            },
            {
              title: t('about.howToParticipate.steps.step2.title'),
              description: t('about.howToParticipate.steps.step2.description')
            },
            {
              title: t('about.howToParticipate.steps.step3.title'),
              description: t('about.howToParticipate.steps.step3.description')
            },
            {
              title: t('about.howToParticipate.steps.step4.title'),
              description: t('about.howToParticipate.steps.step4.description')
            },
            {
              title: t('about.howToParticipate.steps.step5.title'),
              description: t('about.howToParticipate.steps.step5.description')
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
          {t('about.features.title')}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "🔗",
              title: t('about.features.blockchain.title'),
              description: t('about.features.blockchain.description')
            },
            {
              icon: "🔒",
              title: t('about.features.smartContracts.title'),
              description: t('about.features.smartContracts.description')
            },
            {
              icon: "👥",
              title: t('about.features.dao.title'),
              description: t('about.features.dao.description')
            },
            {
              icon: "💰",
              title: t('about.features.fees.title'),
              description: t('about.features.fees.description')
            },
            {
              icon: "⚡",
              title: t('about.features.fast.title'),
              description: t('about.features.fast.description')
            },
            {
              icon: "🌍",
              title: t('about.features.global.title'),
              description: t('about.features.global.description')
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
          {t('about.faq.title')}
        </h2>
        <div className="space-y-4">
          {[
            {
              question: t('about.faq.q1.question'),
              answer: t('about.faq.q1.answer')
            },
            {
              question: t('about.faq.q2.question'),
              answer: t('about.faq.q2.answer')
            },
            {
              question: t('about.faq.q3.question'),
              answer: t('about.faq.q3.answer')
            },
            {
              question: t('about.faq.q4.question'),
              answer: t('about.faq.q4.answer')
            },
            {
              question: t('about.faq.q5.question'),
              answer: t('about.faq.q5.answer')
            },
            {
              question: t('about.faq.q6.question'),
              answer: t('about.faq.q6.answer')
            },
            {
              question: t('about.faq.q7.question'),
              answer: t('about.faq.q7.answer')
            },
            {
              question: t('about.faq.q8.question'),
              answer: t('about.faq.q8.answer')
            },
            {
              question: t('about.faq.q9.question'),
              answer: t('about.faq.q9.answer')
            },
            {
              question: t('about.faq.q10.question'),
              answer: t('about.faq.q10.answer')
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
          {t('about.techStack.title')}
        </h2>
        <div className="bg-secondary border-2 border-secondary vibe-border rounded-xl p-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <span>⚡</span> {t('about.techStack.frontend')}
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
                <span>🔗</span> {t('about.techStack.backend')}
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
            {t('about.cta.title')}
          </h2>
          <p className="text-lg text-secondary mb-6 max-w-2xl mx-auto">
            {t('about.cta.description')}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => navigate(RouteNamesEnum.circles)}
              className="bg-btn-primary text-btn-primary px-8 py-4 rounded-lg hover:bg-btn-hover transition-all font-semibold text-lg hover:scale-105"
            >
              {t('about.cta.viewCircles')}
            </button>
            <button
              onClick={() => navigate(RouteNamesEnum.createCircle)}
              className="bg-secondary text-primary border-2 border-secondary px-8 py-4 rounded-lg hover:bg-tertiary transition-all font-semibold text-lg"
            >
              {t('about.cta.createCircle')}
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
