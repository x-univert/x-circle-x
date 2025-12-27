import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGetAccount } from 'lib';
import { RouteNamesEnum } from 'localConstants';

interface Tab {
  id: string;
  label: string;
  icon: string;
  route: string;
  count?: number;
}

interface ProfileLayoutProps {
  children: ReactNode;
  tabs?: Tab[];
}

const defaultTabs: Tab[] = [
  {
    id: 'general',
    label: 'Informations générales',
    icon: '👤',
    route: RouteNamesEnum.profile
  },
  {
    id: 'elections',
    label: 'Élections',
    icon: '🗳️',
    route: RouteNamesEnum.profileElections
  },
  {
    id: 'budget',
    label: 'Budget Participatif',
    icon: '💰',
    route: RouteNamesEnum.profileBudget
  },
  {
    id: 'dao',
    label: 'DAO Political',
    icon: '🏛️',
    route: RouteNamesEnum.profileDAO
  },
  {
    id: 'petitions',
    label: 'Pétitions',
    icon: '✍️',
    route: RouteNamesEnum.profilePetitions
  },
  {
    id: 'polls',
    label: 'Sondages',
    icon: '📊',
    route: RouteNamesEnum.profilePolls
  },
  {
    id: 'ric',
    label: 'RIC',
    icon: '📜',
    route: RouteNamesEnum.profileRIC
  }
];

export const ProfileLayout = ({ children, tabs = defaultTabs }: ProfileLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { address } = useGetAccount();

  const activeTab = tabs.find(tab => location.pathname === tab.route) || tabs[0];

  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <h1 className='text-4xl font-bold text-primary'>
                👤 Mon Profil
              </h1>
            </div>
            <p className='text-secondary text-lg'>
              Gérez votre activité sur tous les modules
            </p>
          </div>

          {/* Wallet Address Card */}
          <div className='bg-secondary border-2 border-secondary vibe-border rounded-lg px-4 py-2'>
            <p className='text-xs text-secondary mb-1'>Adresse connectée</p>
            <p className='font-mono text-sm text-accent'>
              {address ? `${address.slice(0, 10)}...${address.slice(-6)}` : 'Non connecté'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className='mb-8 overflow-x-auto'>
        <div className='flex gap-2 min-w-max pb-2'>
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.route;

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.route)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap flex items-center gap-2 border-2 ${
                  isActive
                    ? 'bg-accent text-primary border-accent shadow-lg'
                    : 'bg-secondary text-secondary border-secondary vibe-border hover:bg-tertiary hover:text-accent'
                }`}
              >
                <span className='text-xl'>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count && tab.count > 0 && (
                  <span className='px-2 py-0.5 bg-accent text-primary text-xs rounded-full font-bold'>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className='bg-secondary border-2 border-secondary vibe-border rounded-xl shadow-lg p-6'>
        {children}
      </div>
    </div>
  );
};

export default ProfileLayout;
