import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RouteNamesEnum } from 'localConstants';

interface Tab {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

interface AdminLayoutProps {
  children: ReactNode;
  tabs?: Tab[];
}

const defaultTabs: Tab[] = [
  {
    id: 'overview',
    label: 'Vue d\'ensemble',
    icon: '📊',
    route: RouteNamesEnum.admin
  },
  {
    id: 'elections',
    label: 'Élections',
    icon: '🗳️',
    route: RouteNamesEnum.adminElections
  },
  {
    id: 'budget',
    label: 'Budget Participatif',
    icon: '💰',
    route: RouteNamesEnum.adminBudget
  },
  {
    id: 'dao',
    label: 'DAO Political',
    icon: '🏛️',
    route: RouteNamesEnum.adminDAO
  },
  {
    id: 'petitions',
    label: 'Pétitions',
    icon: '✍️',
    route: RouteNamesEnum.adminPetitions
  },
  {
    id: 'polls',
    label: 'Sondages',
    icon: '📊',
    route: RouteNamesEnum.adminPolls
  },
  {
    id: 'ric',
    label: 'RIC',
    icon: '📜',
    route: RouteNamesEnum.adminRIC
  }
];

export const AdminLayout = ({ children, tabs = defaultTabs }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = tabs.find(tab => location.pathname === tab.route) || tabs[0];

  return (
    <div className='container mx-auto px-4 py-8 max-w-7xl'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <h1 className='text-4xl font-bold text-primary'>
            ⚙️ Panneau d'Administration
          </h1>
        </div>
        <p className='text-secondary text-lg'>
          Gérez tous les modules de DEMOCRATIX depuis un seul endroit
        </p>
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
                {tab.badge && tab.badge > 0 && (
                  <span className='px-2 py-0.5 bg-error text-primary text-xs rounded-full font-bold'>
                    {tab.badge}
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

export default AdminLayout;
