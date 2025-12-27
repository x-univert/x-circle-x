import { useEffect } from 'react';
import { websocketService } from '../services/websocketService';
import { useToast } from '../contexts/ToastContext';

/**
 * Custom hook for WebSocket notifications
 *
 * Automatically connects to WebSocket, listens for events,
 * and displays toast notifications.
 *
 * @param electionId - Optional election ID to join room
 * @param organizerAddress - Optional organizer address to subscribe
 *
 * @example
 * ```typescript
 * // In Election Detail page
 * useWebSocketNotifications(electionId);
 *
 * // In Organizer Dashboard
 * useWebSocketNotifications(undefined, address);
 * ```
 */
export const useWebSocketNotifications = (
  electionId?: number,
  organizerAddress?: string
) => {
  const { showToast } = useToast();

  useEffect(() => {
    // Connect to WebSocket
    websocketService.connect();

    // Join election room if provided
    if (electionId) {
      websocketService.joinElection(electionId);
    }

    // Subscribe to organizer events if provided
    if (organizerAddress) {
      websocketService.subscribeToOrganizer(organizerAddress);
    }

    // Setup event listeners
    const handleVoteReceived = (payload: any) => {
      showToast({
        type: 'info',
        title: '🗳️ Nouveau vote',
        message: `Un électeur vient de voter${payload.electionId ? ` dans l'élection #${payload.electionId}` : ''}`,
        duration: 4000,
      });
    };

    const handleElectionActivated = (payload: any) => {
      showToast({
        type: 'success',
        title: '✅ Élection activée',
        message: 'Les électeurs peuvent maintenant voter',
        duration: 5000,
      });
    };

    const handleElectionClosed = (payload: any) => {
      showToast({
        type: 'warning',
        title: '🔒 Élection clôturée',
        message: 'Le vote est maintenant fermé',
        duration: 5000,
      });
    };

    const handleElectionFinalized = (payload: any) => {
      showToast({
        type: 'success',
        title: '🎉 Élection finalisée',
        message: 'Les résultats sont maintenant officiels',
        duration: 6000,
      });
    };

    const handleVoteDecrypted = (payload: any) => {
      showToast({
        type: 'success',
        title: '🔓 Votes déchiffrés',
        message: 'Les résultats sont maintenant disponibles',
        duration: 5000,
      });
    };

    const handleCandidateAdded = (payload: any) => {
      showToast({
        type: 'info',
        title: '👤 Nouveau candidat',
        message: payload.data?.name || 'Un nouveau candidat a été ajouté',
        duration: 4000,
      });
    };

    const handleCoOrganizerAdded = (payload: any) => {
      showToast({
        type: 'info',
        title: '👥 Nouveau co-organisateur',
        message: payload.data?.address?.substring(0, 10) + '...',
        duration: 4000,
      });
    };

    const handleCoOrganizerRemoved = (payload: any) => {
      showToast({
        type: 'warning',
        title: '👥 Co-organisateur retiré',
        message: payload.data?.address?.substring(0, 10) + '...',
        duration: 4000,
      });
    };

    // Register event listeners
    websocketService.on('vote:received', handleVoteReceived);
    websocketService.on('election:activated', handleElectionActivated);
    websocketService.on('election:closed', handleElectionClosed);
    websocketService.on('election:finalized', handleElectionFinalized);
    websocketService.on('vote:decrypted', handleVoteDecrypted);
    websocketService.on('candidate:added', handleCandidateAdded);
    websocketService.on('coorganizer:added', handleCoOrganizerAdded);
    websocketService.on('coorganizer:removed', handleCoOrganizerRemoved);

    // Cleanup
    return () => {
      if (electionId) {
        websocketService.leaveElection(electionId);
      }

      if (organizerAddress) {
        websocketService.unsubscribeFromOrganizer(organizerAddress);
      }

      // Remove all event listeners
      websocketService.off('vote:received', handleVoteReceived);
      websocketService.off('election:activated', handleElectionActivated);
      websocketService.off('election:closed', handleElectionClosed);
      websocketService.off('election:finalized', handleElectionFinalized);
      websocketService.off('vote:decrypted', handleVoteDecrypted);
      websocketService.off('candidate:added', handleCandidateAdded);
      websocketService.off('coorganizer:added', handleCoOrganizerAdded);
      websocketService.off('coorganizer:removed', handleCoOrganizerRemoved);
    };
  }, [electionId, organizerAddress, showToast]);
};
