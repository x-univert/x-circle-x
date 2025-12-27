import { useState } from 'react';
import {
  useNotifications,
  createCircleCreatedNotification,
  createCircleJoinedNotification,
  createContributionNotification,
  createDistributionNotification,
  createMembershipRequestNotification,
  createMembershipApprovedNotification,
  createMembershipRejectedNotification,
  createVoteReceivedNotification,
  createCycleCompletedNotification,
  createTransactionNotification
} from 'hooks/useNotifications';

export const NotificationTester = () => {
  const { addNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const testCircleNotifications = () => {
    addNotification(createCircleCreatedNotification(1, 'Cercle Epargne Famille'));
    addNotification(createCircleJoinedNotification(1, 'Cercle Epargne Famille'));
    addNotification(createContributionNotification(1, 'Cercle Epargne Famille', '0.1'));
    addNotification(createDistributionNotification(1, 'Cercle Epargne Famille', '0.5', 'erd1...abc'));
  };

  const testMembershipNotifications = () => {
    addNotification(createMembershipRequestNotification(2, 'Cercle Amis', 'erd1...xyz'));
    addNotification(createMembershipApprovedNotification(2, 'Cercle Amis'));
    addNotification(createMembershipRejectedNotification(3, 'Cercle VIP'));
  };

  const testVoteNotifications = () => {
    addNotification(createVoteReceivedNotification(1, 'Cercle Epargne Famille', 'erd1...abc', true));
    addNotification(createVoteReceivedNotification(1, 'Cercle Epargne Famille', 'erd1...def', false));
    addNotification(createCycleCompletedNotification(1, 'Cercle Epargne Famille', 3));
  };

  const testTransactionNotifications = () => {
    addNotification(createTransactionNotification(
      'abc123def456',
      'success',
      'Cercle cree avec succes!',
      'https://devnet-explorer.multiversx.com/transactions/abc123'
    ));
    addNotification(createTransactionNotification(
      'xyz789',
      'pending',
      'Transaction en cours...',
      'https://devnet-explorer.multiversx.com/transactions/xyz789'
    ));
    addNotification(createTransactionNotification(
      'failed123',
      'failed',
      'Erreur: Solde insuffisant',
      'https://devnet-explorer.multiversx.com/transactions/failed123'
    ));
  };

  const testAllNotifications = () => {
    testCircleNotifications();
    setTimeout(() => testMembershipNotifications(), 500);
    setTimeout(() => testVoteNotifications(), 1000);
    setTimeout(() => testTransactionNotifications(), 1500);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg font-semibold transition-all"
      >
        Tester Notifications
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-gray-800 rounded-lg shadow-2xl p-6 w-80 border-2 border-purple-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">
          Test Notifications
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-200"
        >
          X
        </button>
      </div>

      <div className="space-y-2">
        <button
          onClick={testCircleNotifications}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Cercles (4)
        </button>

        <button
          onClick={testMembershipNotifications}
          className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Adhesions (3)
        </button>

        <button
          onClick={testVoteNotifications}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Votes & Cycles (3)
        </button>

        <button
          onClick={testTransactionNotifications}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all text-sm"
        >
          Transactions (3)
        </button>

        <div className="border-t border-gray-600 pt-2 mt-4">
          <button
            onClick={testAllNotifications}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-3 rounded-lg font-bold transition-all"
          >
            Tester TOUT (13 notifs)
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-2">
          Les notifications apparaissent dans la cloche
        </p>
      </div>
    </div>
  );
};
