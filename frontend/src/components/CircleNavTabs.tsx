import { XCircleLogo } from './Logo/Logo'

export type TabId = 'circle' | 'sc-central' | 'my-sc' | 'staking' | 'nft' | 'token' | 'dao'

interface Tab {
  id: TabId
  label: string
  icon: string | React.ReactNode
  isLogoIcon?: boolean
}

const tabs: Tab[] = [
  { id: 'circle', label: 'Cercle de Vie', icon: '🌀' },
  { id: 'sc-central', label: 'SC Central', icon: '🏠' },
  { id: 'my-sc', label: 'Mon SC Peripherique', icon: '📄' },
  { id: 'staking', label: 'Staking', icon: '💰' },
  { id: 'nft', label: 'Mon NFT', icon: '🎨' },
  { id: 'token', label: 'Token X-CIRCLE-X', icon: '', isLogoIcon: true },
  { id: 'dao', label: 'DAO', icon: '🏛️' }
]

interface CircleNavTabsProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function CircleNavTabs({ activeTab, onTabChange }: CircleNavTabsProps) {
  return (
    <div className="w-full mb-6">
      <div className="flex flex-wrap justify-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.2s',
              border: activeTab === tab.id ? 'none' : '1px solid rgba(255,255,255,0.1)',
              background: activeTab === tab.id
                ? 'linear-gradient(to right, #9333ea, #db2777)'
                : 'rgba(255,255,255,0.05)',
              color: activeTab === tab.id ? 'white' : '#d1d5db',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.isLogoIcon ? <XCircleLogo size={20} animate={activeTab === tab.id} /> : tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CircleNavTabs
