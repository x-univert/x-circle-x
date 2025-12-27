import { useState } from 'react';
import { useGetAccountInfo, useGetPendingTransactions } from 'lib';
import * as circleService from '../services/circleService';
import { CreateCircleParams } from '../types/circle.types';

// Export both names for compatibility
export const useCircleContract = () => {
  const { address } = useGetAccountInfo();
  const { hasPendingTransactions } = useGetPendingTransactions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cree un nouveau cercle
   */
  const createCircle = async (params: CreateCircleParams) => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionId = await circleService.createCircle(
        params.name,
        params.contributionAmount,
        params.cycleDuration,
        params.maxMembers,
        address
      );

      setIsLoading(false);
      return sessionId;
    } catch (err: any) {
      setError(err.message || 'Failed to create circle');
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Demande l'adhesion a un cercle
   */
  const requestMembership = async (circleId: number) => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionId = await circleService.requestMembership(circleId, address);
      setIsLoading(false);
      return sessionId;
    } catch (err: any) {
      setError(err.message || 'Failed to request membership');
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Vote pour ou contre un candidat
   */
  const voteForMember = async (
    circleId: number,
    candidateAddress: string,
    approve: boolean
  ) => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionId = await circleService.voteForMember(
        circleId,
        candidateAddress,
        approve,
        address
      );
      setIsLoading(false);
      return sessionId;
    } catch (err: any) {
      setError(err.message || 'Failed to vote');
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Contribue au cycle actuel
   */
  const contribute = async (circleId: number, amount: string) => {
    if (!address) {
      setError('Wallet not connected');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const sessionId = await circleService.contribute(circleId, amount, address);
      setIsLoading(false);
      return sessionId;
    } catch (err: any) {
      setError(err.message || 'Failed to contribute');
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Récupère les infos d'un cercle
   */
  const getCircle = async (circleId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const circle = await circleService.getCircle(circleId);
      setIsLoading(false);
      return circle;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch circle');
      setIsLoading(false);
      return null;
    }
  };

  /**
   * Récupère le prochain ID de cercle
   */
  const getNextCircleId = async () => {
    try {
      return await circleService.getNextCircleId();
    } catch (err: any) {
      console.error('Failed to fetch next circle ID:', err);
      return 1;
    }
  };

  return {
    // État
    isLoading: isLoading || hasPendingTransactions,
    error,
    address,

    // Méthodes
    createCircle,
    requestMembership,
    voteForMember,
    contribute,
    getCircle,
    getNextCircleId,

    // Helpers
    clearError: () => setError(null)
  };
};

// Alias pour compatibilité
export const useCircle = useCircleContract;
