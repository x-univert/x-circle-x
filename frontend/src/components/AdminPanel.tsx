import { useState } from 'react';
import { useGetAccountInfo } from 'lib';
import * as circleOfLifeService from '../services/circleOfLifeService';
import toast from 'react-hot-toast';

// Adresse du owner du contrat (deployer)
const OWNER_ADDRESS = 'erd1ff267s6mprn09d3zcuptyqc3h44psl3dfpp7uza5j74qv0kyflfq5z9tyg';

interface AdminPanelProps {
  onRefresh?: () => void;
}

export const AdminPanel = ({ onRefresh }: AdminPanelProps) => {
  const { address } = useGetAccountInfo();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verifier si l'utilisateur est admin (owner du contrat)
  const isAdmin = address?.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  // En mode devnet, afficher pour tous les utilisateurs connectes
  // En production, decommenter la verification admin ci-dessous
  // if (!isAdmin) {
  //   return null;
  // }

  // Ne pas afficher si pas connecte
  if (!address) {
    return null;
  }

  const handleResetCycle = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const result = await circleOfLifeService.resetCycle(address);
      if (result?.transactionHash) {
        toast.success('Cycle reinitialise !');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error resetting cycle:', error);
      toast.error('Erreur lors du reset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateNextDay = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const result = await circleOfLifeService.simulateNextDay(address);
      if (result?.transactionHash) {
        toast.success('Jour suivant simule - Cycle en timeout !');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error simulating next day:', error);
      toast.error('Erreur lors de la simulation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFailCycle = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const result = await circleOfLifeService.failCycle(address);
      if (result?.transactionHash) {
        toast.success('Cycle echoue declare - SC banni !');
        onRefresh?.();
      }
    } catch (error) {
      console.error('Error failing cycle:', error);
      toast.error('Erreur lors de la declaration d\'echec');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = () => {
    toast.success('Test notification - Succes !');
    toast.error('Test notification - Erreur !');
    toast('Test notification - Info !', { icon: 'i' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg font-semibold transition-all flex items-center gap-2"
      >
        <span>Admin Panel</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl p-6 w-80 border-2 border-purple-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          Admin Panel
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          X
        </button>
      </div>

      <div className="space-y-3">
        {/* Test Notifications */}
        <button
          onClick={handleTestNotification}
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Tester Notifications
        </button>

        {/* Reset Cycle */}
        <button
          onClick={handleResetCycle}
          disabled={isLoading}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Reset Cycle Quotidien
        </button>

        {/* Simulate Next Day */}
        <button
          onClick={handleSimulateNextDay}
          disabled={isLoading}
          className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Simuler Fin de Journee (Timeout)
        </button>

        {/* Fail Cycle + Ban */}
        <button
          onClick={handleFailCycle}
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Declarer Cycle Echoue (Ban SC)
        </button>

        <div className="border-t border-purple-500/30 pt-3 mt-4">
          {isAdmin ? (
            <p className="text-xs text-green-400 text-center">
              Vous etes admin - Acces complet
            </p>
          ) : (
            <p className="text-xs text-yellow-400 text-center">
              Note: Seul l&apos;admin peut executer ces fonctions
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
