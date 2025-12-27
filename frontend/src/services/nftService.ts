import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  AddressValue,
  TokenTransfer,
  Token
} from '@multiversx/sdk-core';
import { signAndSendTransactions } from '../helpers/signAndSendTransactions';
import { NFT_CONTRACT_ADDRESS, NFT_TOKEN_ID } from '../config/contracts';

const factoryConfig = new TransactionsFactoryConfig({ chainID: 'D' });
const factory = new SmartContractTransactionsFactory({ config: factoryConfig });

// Gas limits pour NFT
const NFT_GAS_LIMITS = {
  claimNft: 20_000_000,       // Mint d'un nouveau NFT
  evolveNft: 30_000_000,      // Evolution du NFT (envoie au contrat, mise a jour, retour)
  burnAndReclaim: 25_000_000, // Burn ancien NFT et mint nouveau
};

/**
 * Verifier si l'utilisateur possede deja un NFT de la collection
 */
export const checkUserHasNft = async (userAddress: string): Promise<{
  hasNft: boolean;
  nonce: number;
  balance: number;
}> => {
  try {
    if (!NFT_TOKEN_ID) {
      return { hasNft: false, nonce: 0, balance: 0 };
    }

    // Requeter l'API pour les NFTs de l'utilisateur
    const response = await fetch(
      `https://devnet-api.multiversx.com/accounts/${userAddress}/nfts?collection=${NFT_TOKEN_ID}`
    );

    if (!response.ok) {
      console.error('Error fetching user NFTs:', response.statusText);
      return { hasNft: false, nonce: 0, balance: 0 };
    }

    const nfts = await response.json();

    if (nfts && nfts.length > 0) {
      // L'utilisateur a au moins un NFT de cette collection
      const nft = nfts[0];
      return {
        hasNft: true,
        nonce: parseInt(nft.nonce) || 0,
        balance: parseInt(nft.balance) || 1
      };
    }

    return { hasNft: false, nonce: 0, balance: 0 };
  } catch (error) {
    console.error('Error checking user NFT:', error);
    return { hasNft: false, nonce: 0, balance: 0 };
  }
};

/**
 * Obtenir les attributs du NFT depuis la blockchain
 */
export const getNftAttributes = async (nonce: number): Promise<{
  level: number;
  cyclesCompleted: number;
  memberAddress: string;
  lastUpdate: number;
} | null> => {
  try {
    if (!NFT_TOKEN_ID || nonce === 0) {
      return null;
    }

    // Requeter les details du NFT
    const nonceHex = nonce.toString(16).padStart(2, '0');
    const identifier = `${NFT_TOKEN_ID}-${nonceHex}`;

    const response = await fetch(
      `https://devnet-api.multiversx.com/nfts/${identifier}`
    );

    if (!response.ok) {
      console.error('Error fetching NFT details:', response.statusText);
      return null;
    }

    const nft = await response.json();

    // Parser les attributs (format: level:X;cycles:Y;member:Z;updated:T)
    if (nft.attributes) {
      const attrStr = atob(nft.attributes);
      const attrs: { [key: string]: string } = {};

      attrStr.split(';').forEach((pair: string) => {
        const [key, value] = pair.split(':');
        if (key && value) {
          attrs[key] = value;
        }
      });

      return {
        level: parseInt(attrs['level']) || 0,
        cyclesCompleted: parseInt(attrs['cycles']) || 0,
        memberAddress: attrs['member'] || '',
        lastUpdate: parseInt(attrs['updated']) || 0
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting NFT attributes:', error);
    return null;
  }
};

/**
 * Reclamer (mint) un NFT pour l'utilisateur connecte
 * Prerequis: L'utilisateur doit etre membre du Circle of Life
 */
export const claimNft = async (senderAddress: string): Promise<string[]> => {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT contract not deployed');
  }

  const sender = new Address(senderAddress);
  const contract = new Address(NFT_CONTRACT_ADDRESS);

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'claimNft',
    gasLimit: BigInt(NFT_GAS_LIMITS.claimNft),
    arguments: []
  });

  const sessionId = await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Mint de votre NFT en cours...',
      errorMessage: 'Erreur lors du mint du NFT',
      successMessage: 'NFT mint avec succes!'
    }
  });

  return [sessionId || ''];
};

/**
 * Evoluer un NFT existant (mettre a jour les attributs et l'image selon le niveau)
 * L'utilisateur envoie son NFT au contrat, qui le met a jour et le renvoie
 *
 * @param senderAddress - L'adresse de l'utilisateur
 * @param nftNonce - Le nonce du NFT a evoluer
 */
export const evolveNft = async (
  senderAddress: string,
  nftNonce: number
): Promise<string[]> => {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT contract not deployed');
  }

  if (!NFT_TOKEN_ID) {
    throw new Error('NFT token ID not configured');
  }

  const sender = new Address(senderAddress);
  const contract = new Address(NFT_CONTRACT_ADDRESS);

  // Creer le transfert NFT - l'utilisateur envoie son NFT au contrat
  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: NFT_TOKEN_ID, nonce: BigInt(nftNonce) }),
    amount: BigInt(1)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'evolveNft',
    gasLimit: BigInt(NFT_GAS_LIMITS.evolveNft),
    arguments: [],
    tokenTransfers: [tokenTransfer]
  });

  const sessionId = await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Evolution du NFT en cours...',
      errorMessage: 'Erreur lors de l\'evolution du NFT',
      successMessage: 'NFT evolue avec succes!'
    }
  });

  return [sessionId || ''];
};

/**
 * Obtenir les statistiques globales de la collection NFT
 */
export const getCollectionStats = async (): Promise<{
  totalMinted: number;
  holders: number;
}> => {
  try {
    if (!NFT_TOKEN_ID) {
      return { totalMinted: 0, holders: 0 };
    }

    const response = await fetch(
      `https://devnet-api.multiversx.com/collections/${NFT_TOKEN_ID}`
    );

    if (!response.ok) {
      return { totalMinted: 0, holders: 0 };
    }

    const collection = await response.json();

    return {
      totalMinted: parseInt(collection.nfts) || 0,
      holders: parseInt(collection.holders) || 0
    };
  } catch (error) {
    console.error('Error getting collection stats:', error);
    return { totalMinted: 0, holders: 0 };
  }
};

/**
 * Burn l'ancien NFT et mint un nouveau avec le SVG inline
 * Utile pour les utilisateurs qui ont mint un NFT avant la mise a jour du SVG
 *
 * @param senderAddress - L'adresse de l'utilisateur
 * @param nftNonce - Le nonce du NFT a bruler
 */
export const burnAndReclaim = async (
  senderAddress: string,
  nftNonce: number
): Promise<string[]> => {
  if (!NFT_CONTRACT_ADDRESS) {
    throw new Error('NFT contract not deployed');
  }

  if (!NFT_TOKEN_ID) {
    throw new Error('NFT token ID not configured');
  }

  const sender = new Address(senderAddress);
  const contract = new Address(NFT_CONTRACT_ADDRESS);

  // Creer le transfert NFT (SFT avec nonce)
  const tokenTransfer = new TokenTransfer({
    token: new Token({ identifier: NFT_TOKEN_ID, nonce: BigInt(nftNonce) }),
    amount: BigInt(1)
  });

  const transaction = await factory.createTransactionForExecute(sender, {
    contract: contract,
    function: 'burnAndReclaim',
    gasLimit: BigInt(NFT_GAS_LIMITS.burnAndReclaim),
    arguments: [],
    tokenTransfers: [tokenTransfer]
  });

  const sessionId = await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Remplacement de votre NFT en cours...',
      errorMessage: 'Erreur lors du remplacement du NFT',
      successMessage: 'NFT remplace avec succes! Le nouveau NFT a le SVG integre.'
    }
  });

  return [sessionId || ''];
};
