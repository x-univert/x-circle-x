import {
  Address,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig,
  BigUIntValue,
  U64Value,
  U32Value,
  BytesValue,
  AddressValue,
  BooleanValue
} from '@multiversx/sdk-core';
import { signAndSendTransactions, signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import { CIRCLE_MANAGER_ADDRESS, GAS_LIMITS } from '../config/contracts';
import { getNetworkConfig } from '../config';

// Lecture dynamique du reseau a chaque appel
const getApiUrl = () => getNetworkConfig().apiUrl;
const getChainId = () => getNetworkConfig().chainId;

// Dynamic factory based on selected network
const getFactoryConfig = () => new TransactionsFactoryConfig({ chainID: getChainId() });
const getFactory = () => new SmartContractTransactionsFactory({ config: getFactoryConfig() });

/**
 * Cree un nouveau cercle d'epargne
 * @param name - Nom du cercle
 * @param contributionAmount - Montant de contribution en EGLD
 * @param cycleDuration - Duree du cycle en secondes (min 86400 = 1 jour)
 * @param maxMembers - Nombre max de membres (5-20)
 */
export const createCircle = async (
  name: string,
  contributionAmount: string,
  cycleDuration: number,
  maxMembers: number,
  senderAddress: string
) => {
  // Convertir EGLD en wei (multiply by 10^18)
  const amountInWei = new BigNumber(contributionAmount).multipliedBy('1000000000000000000');

  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);

  console.log('Building transaction with:', {
    sender: senderAddress,
    contract: CIRCLE_MANAGER_ADDRESS,
    amountInWei: amountInWei.toFixed(0),
    cycleDuration,
    maxMembers,
    name
  });

  try {
    // Utiliser les TypedValues pour les arguments
    const transaction = await getFactory().createTransactionForExecute(sender, {
      contract: contractAddress,
      function: 'createCircle',
      gasLimit: BigInt(GAS_LIMITS.createCircle),
      arguments: [
        new BigUIntValue(amountInWei),    // contribution_amount: BigUint
        new U64Value(BigInt(cycleDuration)), // cycle_duration: u64
        new U32Value(maxMembers),            // max_members: u32
        BytesValue.fromUTF8(name)            // name: ManagedBuffer
      ]
    });

    console.log('Transaction built:', transaction);

    const result = await signAndSendTransactionsWithHash({
      transactions: [transaction],
      transactionsDisplayInfo: {
        processingMessage: 'Creation du cercle en cours...',
        errorMessage: 'Erreur lors de la creation du cercle',
        successMessage: 'Cercle cree avec succes !'
      }
    });

    return {
      sessionId: result.sessionId,
      transactionHash: result.transactionHashes[0] || null
    };
  } catch (err) {
    console.error('Error building/sending transaction:', err);
    throw err;
  }
};

/**
 * Demande l'adhesion a un cercle
 */
export const requestMembership = async (circleId: number, senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'requestMembership',
    gasLimit: BigInt(GAS_LIMITS.requestMembership),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const sessionId = await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Envoi de la demande d\'adhesion...',
      errorMessage: 'Erreur lors de la demande',
      successMessage: 'Demande d\'adhesion envoyee !'
    }
  });

  return sessionId;
};

/**
 * Vote pour ou contre un membre candidat
 */
export const voteForMember = async (
  circleId: number,
  candidateAddress: string,
  approve: boolean,
  senderAddress: string
) => {
  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);
  const candidate = new Address(candidateAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'voteForMember',
    gasLimit: BigInt(GAS_LIMITS.voteForMember),
    arguments: [
      new U64Value(BigInt(circleId)),
      new AddressValue(candidate),
      new BooleanValue(approve)
    ]
  });

  const sessionId = await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Enregistrement du vote...',
      errorMessage: 'Erreur lors du vote',
      successMessage: `Vote ${approve ? 'positif' : 'negatif'} enregistre !`
    }
  });

  return sessionId;
};

/**
 * Contribue au cycle actuel d'un cercle
 * @returns Object with sessionId and transactionHash
 */
export const contribute = async (circleId: number, amount: string, senderAddress: string) => {
  // Convertir EGLD en wei
  const amountInWei = new BigNumber(amount).multipliedBy('1000000000000000000').toFixed(0);

  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'contribute',
    gasLimit: BigInt(GAS_LIMITS.contribute),
    arguments: [new U64Value(BigInt(circleId))],
    nativeTransferAmount: BigInt(amountInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Envoi de la contribution...',
      errorMessage: 'Erreur lors de la contribution',
      successMessage: 'Contribution envoyee avec succes !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Recupere les informations d'un cercle via l'API
 */
export const getCircle = async (circleId: number) => {
  try {
    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCircle',
          args: [Buffer.from(new BigNumber(circleId).toString(16).padStart(16, '0'), 'hex').toString('base64')]
        })
      }
    );

    const data = await response.json();

    if (data.data?.data?.returnData) {
      return data.data.data.returnData;
    }

    return null;
  } catch (error) {
    console.error('Error fetching circle:', error);
    return null;
  }
};

/**
 * Recupere le nombre total de cercles
 */
export const getCircleCount = async (): Promise<number> => {
  try {
    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCircleCount',
          args: []
        })
      }
    );

    const data = await response.json();

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const base64Value = data.data.data.returnData[0];
      if (base64Value === '') return 0;
      const hexValue = Buffer.from(base64Value, 'base64').toString('hex');
      return hexValue ? parseInt(hexValue, 16) : 0;
    }

    return 0;
  } catch (error) {
    console.error('Error fetching circle count:', error);
    return 0;
  }
};

/**
 * Recupere le prochain ID de cercle disponible
 */
export const getNextCircleId = async (): Promise<number> => {
  const count = await getCircleCount();
  return count + 1;
};

/**
 * Recupere les membres d'un cercle
 */
export const getCircleMembers = async (circleId: number): Promise<string[]> => {
  try {
    // API accepts hex args directly (not base64)
    const circleIdHex = circleId.toString(16).padStart(2, '0');

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCircleMembers',
          args: [circleIdHex]
        })
      }
    );

    const data = await response.json();
    console.log('getCircleMembers response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      // Les adresses peuvent etre concatenees dans un seul element
      // Chaque adresse fait 32 bytes = 64 caracteres hex
      const members: string[] = [];

      for (const base64Data of data.data.data.returnData) {
        if (!base64Data) continue;
        const hex = base64ToHex(base64Data);

        // Decouper le hex en morceaux de 64 caracteres (32 bytes par adresse)
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            members.push(hexToBech32(addressHex));
          }
        }
      }

      return members;
    }

    return [];
  } catch (error) {
    console.error('Error fetching circle members:', error);
    return [];
  }
};

/**
 * Recupere les demandes d'adhesion en attente
 */
export const getPendingRequests = async (circleId: number): Promise<string[]> => {
  try {
    // API accepts hex args directly (not base64)
    const circleIdHex = circleId.toString(16).padStart(2, '0');

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getPendingRequests',
          args: [circleIdHex]
        })
      }
    );

    const data = await response.json();
    console.log('getPendingRequests response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      // Les adresses peuvent etre concatenees dans un seul element
      // Chaque adresse fait 32 bytes = 64 caracteres hex
      const requests: string[] = [];

      for (const base64Data of data.data.data.returnData) {
        if (!base64Data) continue;
        const hex = base64ToHex(base64Data);

        // Decouper le hex en morceaux de 64 caracteres (32 bytes par adresse)
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            requests.push(hexToBech32(addressHex));
          }
        }
      }

      return requests;
    }

    return [];
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    return [];
  }
};

/**
 * Verifie si une adresse est membre d'un cercle
 */
export const isMember = async (circleId: number, address: string): Promise<boolean> => {
  try {
    // API accepts hex args directly (not base64)
    const circleIdHex = circleId.toString(16).padStart(2, '0');
    // Convertir l'adresse bech32 en hex
    const addressHex = bech32ToHex(address);

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'isMember',
          args: [circleIdHex, addressHex]
        })
      }
    );

    const data = await response.json();
    console.log('isMember response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const result = data.data.data.returnData[0];
      // "AQ==" = 1 (true), "" ou "AA==" = 0 (false)
      return result === 'AQ==';
    }

    return false;
  } catch (error) {
    console.error('Error checking membership:', error);
    return false;
  }
};

/**
 * Verifie si un membre a deja vote pour un candidat
 */
export const hasVoted = async (circleId: number, candidateAddress: string, voterAddress: string): Promise<boolean> => {
  try {
    const circleIdHex = circleId.toString(16).padStart(2, '0');
    const candidateHex = bech32ToHex(candidateAddress);
    const voterHex = bech32ToHex(voterAddress);

    if (!candidateHex || !voterHex) return false;

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'hasVoted',
          args: [circleIdHex, candidateHex, voterHex]
        })
      }
    );

    const data = await response.json();
    console.log('hasVoted response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const result = data.data.data.returnData[0];
      // "AQ==" = 1 (true), "" ou "AA==" = 0 (false)
      return result === 'AQ==';
    }

    return false;
  } catch (error) {
    console.error('Error checking vote status:', error);
    return false;
  }
};

/**
 * Verifie si un membre a contribue pour le cycle en cours
 */
export const hasContributed = async (circleId: number, memberAddress: string): Promise<boolean> => {
  try {
    const circleIdHex = circleId.toString(16).padStart(2, '0');
    const memberHex = bech32ToHex(memberAddress);

    if (!memberHex) return false;

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'hasContributed',
          args: [circleIdHex, memberHex]
        })
      }
    );

    const data = await response.json();
    console.log('hasContributed response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const result = data.data.data.returnData[0];
      // "AQ==" = 1 (true), "" ou "AA==" = 0 (false)
      return result === 'AQ==';
    }

    return false;
  } catch (error) {
    console.error('Error checking contribution status:', error);
    return false;
  }
};

/**
 * Recupere la liste des contributeurs pour le cycle en cours
 */
export const getCycleContributors = async (circleId: number): Promise<string[]> => {
  try {
    const circleIdHex = circleId.toString(16).padStart(2, '0');

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCycleContributors',
          args: [circleIdHex]
        })
      }
    );

    const data = await response.json();
    console.log('getCycleContributors response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const contributors: string[] = [];

      for (const base64Data of data.data.data.returnData) {
        if (!base64Data) continue;
        const hex = base64ToHex(base64Data);

        // Decouper le hex en morceaux de 64 caracteres (32 bytes par adresse)
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            contributors.push(hexToBech32(addressHex));
          }
        }
      }

      return contributors;
    }

    return [];
  } catch (error) {
    console.error('Error fetching cycle contributors:', error);
    return [];
  }
};

/**
 * Recupere le nombre de contributeurs pour le cycle en cours
 */
export const getCycleContributorCount = async (circleId: number): Promise<number> => {
  try {
    const circleIdHex = circleId.toString(16).padStart(2, '0');

    const response = await fetch(
      `${getApiUrl()}/vm-values/query`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scAddress: CIRCLE_MANAGER_ADDRESS,
          funcName: 'getCycleContributorCount',
          args: [circleIdHex]
        })
      }
    );

    const data = await response.json();
    console.log('getCycleContributorCount response:', data);

    if (data.data?.data?.returnData && data.data.data.returnData.length > 0) {
      const base64Value = data.data.data.returnData[0];
      if (base64Value === '') return 0;
      const hexValue = Buffer.from(base64Value, 'base64').toString('hex');
      return hexValue ? parseInt(hexValue, 16) : 0;
    }

    return 0;
  } catch (error) {
    console.error('Error fetching contributor count:', error);
    return 0;
  }
};

/**
 * Distribue les fonds au beneficiaire du cycle
 */
export const distributeFunds = async (circleId: number, senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'distributeFunds',
    gasLimit: BigInt(GAS_LIMITS.contribute), // Meme gas limit que contribute
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Distribution des fonds en cours...',
      errorMessage: 'Erreur lors de la distribution',
      successMessage: 'Fonds distribues avec succes !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Force la distribution des fonds (createur uniquement)
 * Ignore la verification du temps de distribution
 */
export const forceDistribute = async (circleId: number, senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_MANAGER_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'forceDistribute',
    gasLimit: BigInt(GAS_LIMITS.contribute),
    arguments: [new U64Value(BigInt(circleId))]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Distribution forcee en cours...',
      errorMessage: 'Erreur lors de la distribution forcee',
      successMessage: 'Fonds distribues avec succes !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// Helper functions
const base64ToHex = (base64: string): string => {
  const binary = atob(base64);
  let hex = '';
  for (let i = 0; i < binary.length; i++) {
    hex += binary.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
};

const hexToBech32 = (hex: string): string => {
  try {
    // SDK v15: use Address.newFromHex()
    const addr = Address.newFromHex(hex);
    return addr.toBech32();
  } catch (e) {
    console.error('Error converting hex to bech32:', e);
    // Fallback: retourner le hex tronque
    return `erd1${hex.slice(0, 8)}...${hex.slice(-8)}`;
  }
};

const bech32ToHex = (bech32: string): string => {
  try {
    // SDK v15: use new Address(bech32String)
    const addr = new Address(bech32);
    return addr.toHex();
  } catch (e) {
    console.error('Error converting bech32 to hex:', e);
    return '';
  }
};
