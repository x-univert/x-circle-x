import {
  Address,
  AddressValue,
  SmartContractTransactionsFactory,
  TransactionsFactoryConfig
} from '@multiversx/sdk-core';
import { signAndSendTransactions, signAndSendTransactionsWithHash } from '../helpers/signAndSendTransactions';
import BigNumber from 'bignumber.js';
import { CIRCLE_OF_LIFE_ADDRESS } from '../config/contracts';
import { getNetworkConfig } from '../config';

// Lecture dynamique du reseau a chaque appel (pas au chargement du module)
const getApiUrl = () => getNetworkConfig().apiUrl;
const getChainId = () => getNetworkConfig().chainId;

// Factory configuration dynamique basee sur le reseau selectionne
const getFactoryConfig = () => new TransactionsFactoryConfig({ chainID: getChainId() });
const getFactory = () => new SmartContractTransactionsFactory({ config: getFactoryConfig() });

// Gas limits pour Circle of Life v3 (avec transferts cross-contract)
const GAS_LIMITS = {
  joinCircle: 150_000_000,     // Deploie un SC peripherique (augmente pour deploy_from_source)
  signAndForward: 100_000_000,  // Appel cross-contract + process pending (AUGMENTE: transfert vers SC suivant ou retour vers SC0)
  startDailyCycle: 30_000_000,  // Transfert vers le premier SC (augmente pour cross-contract)
  setActive: 8_000_000,
  setInactive: 8_000_000,
  leaveCircle: 10_000_000,
  deposit: 30_000_000,          // Augmente pour calculs de distribution EGLD
  preSign: 8_000_000,          // Pre-signature (pas de transfert)
  processNextTransfer: 50_000_000, // Traitement d'un seul transfert en attente
  processAllPendingTransfers: 200_000_000, // Traitement de TOUS les transferts en attente (batch)
  failCycle: 50_000_000,       // Echec du cycle + ban du SC responsable (augmente)
  resetCycle: 10_000_000,      // Admin: Reset du cycle (TEST ONLY)
  simulateNextDay: 30_000_000,  // Admin: Simuler passage au jour suivant (TEST ONLY)
  claimRewards: 15_000_000,    // Reclamer les recompenses XCIRCLEX
  enableAutoSign: 8_000_000,   // Activer auto-sign permanent
  enableAutoSignForCycles: 8_000_000,  // Activer auto-sign pour N cycles
  disableAutoSign: 15_000_000,  // Desactiver auto-sign
  processLiquidity: 250_000_000,  // Admin: Process liquidite xExchange (cross-shard async)
  lockPendingLpTokens: 100_000_000,  // Admin: Lock LP tokens apres addLiquidity
};

// Types
export interface CircleInfo {
  totalMembers: number;
  activeMembers: number;
  entryFee: string;         // en EGLD
  circulationAmount: string; // en EGLD
  cycleDay: number;
  currentCycleIndex: number;
}

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
    const addr = Address.newFromHex(hex);
    return addr.toBech32();
  } catch (e) {
    console.error('Error converting hex to bech32:', e);
    return `erd1${hex.slice(0, 8)}...${hex.slice(-8)}`;
  }
};

const bech32ToHex = (bech32: string): string => {
  try {
    const addr = new Address(bech32);
    return addr.toHex();
  } catch (e) {
    console.error('Error converting bech32 to hex:', e);
    return '';
  }
};

const parseU64 = (hex: string): number => {
  return parseInt(hex || '0', 16);
};

const parseBigUint = (hex: string): string => {
  if (!hex || hex === '') return '0';
  const wei = BigInt('0x' + hex);
  const egld = Number(wei) / 1e18;
  return egld.toString();
};

/**
 * Query the smart contract
 */
const queryContract = async (funcName: string, args: string[] = []): Promise<any> => {
  try {
    const apiUrl = getApiUrl();
    const url = `${apiUrl}/vm-values/query`;

    // Debug: log network config on first call
    if (funcName === 'getCircleInfo') {
      console.log('[CircleOfLife] Network config:', {
        apiUrl,
        contractAddress: CIRCLE_OF_LIFE_ADDRESS,
        chainId: getChainId(),
        network: localStorage.getItem('selectedNetwork')
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scAddress: CIRCLE_OF_LIFE_ADDRESS,
        funcName,
        args
      })
    });

    const data = await response.json();

    if (data.data?.data?.returnData) {
      return data.data.data.returnData;
    }

    return null;
  } catch (error) {
    console.error(`Error querying ${funcName}:`, error);
    return null;
  }
};

// ==================== VIEW FUNCTIONS ====================

/**
 * Recupere les informations generales du cercle
 */
export const getCircleInfo = async (): Promise<CircleInfo | null> => {
  try {
    const returnData = await queryContract('getCircleInfo');

    if (!returnData || returnData.length < 6) {
      return null;
    }

    // Parse les 6 valeurs retournees: total, active, fee, amount, day, index
    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    return {
      totalMembers: parseU64(hexValues[0]),
      activeMembers: parseU64(hexValues[1]),
      entryFee: parseBigUint(hexValues[2]),
      circulationAmount: parseBigUint(hexValues[3]),
      cycleDay: parseU64(hexValues[4]),
      currentCycleIndex: parseU64(hexValues[5])
    };
  } catch (error) {
    console.error('Error fetching circle info:', error);
    return null;
  }
};

/**
 * Verifie si l'utilisateur est membre du cercle
 */
export const isMember = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('isMember', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    // "AQ==" = 1 (true), "" ou "AA==" = 0 (false)
    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isMember:', error);
    return false;
  }
};

/**
 * Verifie si le membre est actif
 */
export const isActive = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('isActive', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isActive:', error);
    return false;
  }
};

/**
 * Verifie si c'est le tour de l'utilisateur
 */
export const isMyTurn = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('isMyTurn', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isMyTurn:', error);
    return false;
  }
};

/**
 * Recupere la liste des contrats peripheriques actifs (SC1, SC2...)
 */
export const getActiveContracts = async (): Promise<string[]> => {
  try {
    const returnData = await queryContract('getActiveContracts');

    if (!returnData || returnData.length === 0) {
      return [];
    }

    const contracts: string[] = [];
    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      // Chaque adresse fait 32 bytes = 64 caracteres hex
      if (hex.length === 64) {
        contracts.push(hexToBech32(hex));
      } else {
        // Si plusieurs adresses concatenees
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            contracts.push(hexToBech32(addressHex));
          }
        }
      }
    }

    return contracts;
  } catch (error) {
    console.error('Error fetching active contracts:', error);
    return [];
  }
};

/**
 * Recupere tous les contrats peripheriques (SC1, SC2...)
 */
export const getAllContracts = async (): Promise<string[]> => {
  try {
    const returnData = await queryContract('getAllContracts');

    if (!returnData || returnData.length === 0) {
      return [];
    }

    const contracts: string[] = [];
    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      if (hex.length === 64) {
        contracts.push(hexToBech32(hex));
      } else {
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            contracts.push(hexToBech32(addressHex));
          }
        }
      }
    }

    return contracts;
  } catch (error) {
    console.error('Error fetching all contracts:', error);
    return [];
  }
};

/**
 * Recupere le contrat peripherique d'un membre
 */
export const getMyContract = async (memberAddress: string): Promise<string | null> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return null;

    const returnData = await queryContract('getMyContract', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    if (hex.length !== 64) return null;

    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching my contract:', error);
    return null;
  }
};

/**
 * Recupere le owner du contrat SC0
 */
export const getOwner = async (): Promise<string | null> => {
  try {
    const returnData = await queryContract('getOwner');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching owner:', error);
    return null;
  }
};

/**
 * Verifie si le contrat est en pause
 */
export const isPaused = async (): Promise<boolean> => {
  try {
    const returnData = await queryContract('isPaused');

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isPaused:', error);
    return false;
  }
};

/**
 * Recupere le solde du contrat en EGLD
 */
export const getContractBalance = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getContractBalance');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching contract balance:', error);
    return '0';
  }
};

/**
 * Recupere les soldes EGLD de plusieurs adresses (SC peripheriques)
 * Utilise l'API MultiversX pour recuperer les soldes
 */
export const getPeripheralBalances = async (addresses: string[]): Promise<Map<string, string>> => {
  const balances = new Map<string, string>();

  if (!addresses || addresses.length === 0) {
    return balances;
  }

  try {
    // Fetch balances in parallel (max 10 at a time to avoid rate limiting)
    const batchSize = 10;
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const promises = batch.map(async (addr) => {
        try {
          const response = await fetch(`${getApiUrl()}/accounts/${addr}`);
          if (response.ok) {
            const data = await response.json();
            const balanceWei = data.balance || '0';
            // Convert from wei to EGLD (18 decimals)
            const balanceEgld = new BigNumber(balanceWei).dividedBy(new BigNumber(10).pow(18)).toFixed(4);
            return { addr, balance: balanceEgld };
          }
          return { addr, balance: '0' };
        } catch {
          return { addr, balance: '0' };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(({ addr, balance }) => {
        balances.set(addr, balance);
      });
    }
  } catch (error) {
    console.error('Error fetching peripheral balances:', error);
  }

  return balances;
};

/**
 * Recupere le SC qui detient actuellement le montant en circulation
 */
export const getCycleHolder = async (): Promise<string | null> => {
  try {
    const returnData = await queryContract('getCycleHolder');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    if (hex.length !== 64) return null;

    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching cycle holder:', error);
    return null;
  }
};

/**
 * Recupere le jour actuel du cycle
 */
export const getCycleDay = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCycleDay');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching cycle day:', error);
    return 0;
  }
};

/**
 * Recupere le nombre de membres
 */
export const getMemberCount = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getMemberCount');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching member count:', error);
    return 0;
  }
};

/**
 * Recupere l'epoch du cycle actuel
 */
export const getCycleEpoch = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCycleEpoch');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching cycle epoch:', error);
    return 0;
  }
};

/**
 * Verifie si un membre a pre-signe pour le cycle actuel
 */
export const hasPreSigned = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('hasPreSigned', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking hasPreSigned:', error);
    return false;
  }
};

/**
 * Verifie si un membre a deja signe/transfere dans ce cycle
 */
export const hasSignedThisCycle = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('hasSignedThisCycle', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking hasSignedThisCycle:', error);
    return false;
  }
};

/**
 * Recupere la liste des membres qui ont pre-signe
 */
export const getPreSignedMembers = async (): Promise<string[]> => {
  try {
    const returnData = await queryContract('getPreSignedMembers');

    if (!returnData || returnData.length === 0) {
      return [];
    }

    const members: string[] = [];
    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      if (hex.length === 64) {
        members.push(hexToBech32(hex));
      } else {
        for (let i = 0; i < hex.length; i += 64) {
          const addressHex = hex.slice(i, i + 64);
          if (addressHex.length === 64) {
            members.push(hexToBech32(addressHex));
          }
        }
      }
    }

    return members;
  } catch (error) {
    console.error('Error fetching pre-signed members:', error);
    return [];
  }
};

/**
 * Recupere le nombre de transferts en attente qui peuvent etre traites automatiquement
 */
export const getPendingAutoTransfers = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getPendingAutoTransfers');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching pending auto transfers:', error);
    return 0;
  }
};

// Types for cycle statistics
export interface CycleStats {
  cyclesCompleted: number;
  cyclesFailed: number;
  totalCycles: number;
}

// Types for per-SC statistics
export interface ScStats {
  scAddress: string;
  cyclesCompleted: number;
  cyclesFailed: number;
  banUntil: number;
  isBanned: boolean;
}

// Types for rewards
export interface RewardsInfo {
  rewardsPool: string;          // Pool de recompenses disponible (en tokens)
  rewardPerCycle: string;       // Recompense par cycle (en tokens)
  rewardTokenId: string;        // Token ID (XCIRCLEX-xxx)
  totalRewardsDistributed: string; // Total distribue
}

export interface CanClaimResult {
  isSunday: boolean;
  pendingRewards: string;
  hasRewards: boolean;
}

// Types for auto-sign
export interface AutoSignStatus {
  isPermanent: boolean;       // Auto-sign permanent active
  untilEpoch: number;         // Epoch jusqu'a laquelle auto-sign est actif (0 si desactive)
  remainingCycles: number;    // Nombre de cycles restants
}

/**
 * Recupere le nombre de cycles complets (reussis)
 */
export const getCyclesCompleted = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCyclesCompleted');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching cycles completed:', error);
    return 0;
  }
};

/**
 * Recupere le nombre de cycles echoues
 */
export const getCyclesFailed = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCyclesFailed');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching cycles failed:', error);
    return 0;
  }
};

/**
 * Recupere les statistiques completes des cycles (completed, failed, total)
 */
export const getCycleStats = async (): Promise<CycleStats> => {
  try {
    const returnData = await queryContract('getCycleStats');

    if (!returnData || returnData.length < 3) {
      return { cyclesCompleted: 0, cyclesFailed: 0, totalCycles: 0 };
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    return {
      cyclesCompleted: parseU64(hexValues[0]),
      cyclesFailed: parseU64(hexValues[1]),
      totalCycles: parseU64(hexValues[2])
    };
  } catch (error) {
    console.error('Error fetching cycle stats:', error);
    return { cyclesCompleted: 0, cyclesFailed: 0, totalCycles: 0 };
  }
};

// ==================== TRANSACTION FUNCTIONS ====================

/**
 * Rejoindre le cercle (payer les frais d'entree)
 * @param senderAddress - Adresse du nouvel adherent
 * @param entryFee - Frais d'entree en EGLD (defaut: 1)
 * @param referrerAddress - Adresse optionnelle du parrain (membre existant)
 */
export const joinCircle = async (
  senderAddress: string,
  entryFee: string = '1',
  referrerAddress?: string
) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  // Convertir en wei
  const feeInWei = new BigNumber(entryFee).multipliedBy('1000000000000000000').toFixed(0);

  // Construire les arguments (optionnel: adresse du parrain)
  // Pour OptionalValue<ManagedAddress> en Rust:
  // - Aucun argument = None
  // - Juste l'adresse (32 bytes) = Some(address)
  // NE PAS utiliser OptionValue qui ajoute un prefixe 01
  const args: any[] = [];
  if (referrerAddress && referrerAddress.startsWith('erd1')) {
    // Passer directement l'adresse sans wrapper OptionValue
    args.push(new AddressValue(new Address(referrerAddress)));
  }
  // Si pas de referrer, args reste vide = OptionalValue::None

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'joinCircle',
    gasLimit: BigInt(GAS_LIMITS.joinCircle),
    arguments: args,
    nativeTransferAmount: BigInt(feeInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Adhesion au cercle en cours...',
      errorMessage: 'Erreur lors de l\'adhesion',
      successMessage: 'Bienvenue dans le cercle !'
    },
    senderAddress
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Signe et valide le cycle
 */
export const signAndForward = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'signAndForward',
    gasLimit: BigInt(GAS_LIMITS.signAndForward),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Signature en cours...',
      errorMessage: 'Erreur lors de la signature',
      successMessage: 'Signature validee !'
    },
    senderAddress
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Demarre le cycle quotidien
 */
export const startDailyCycle = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'startDailyCycle',
    gasLimit: BigInt(GAS_LIMITS.startDailyCycle),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Demarrage du cycle...',
      errorMessage: 'Erreur lors du demarrage',
      successMessage: 'Cycle demarre !'
    },
    senderAddress
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Declarer un cycle echoue (timeout) - banni le SC responsable pour 7 jours
 * Peut etre appele par n'importe qui si le cycle est en timeout (jour suivant)
 */
export const failCycle = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'failCycle',
    gasLimit: BigInt(GAS_LIMITS.failCycle),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Declaration du cycle echoue...',
      errorMessage: 'Erreur lors de la declaration',
      successMessage: 'Cycle echoue declare - SC responsable banni pour 7 jours'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Se mettre inactif (ne participe plus aux cycles)
 */
export const setInactive = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'setInactive',
    gasLimit: BigInt(GAS_LIMITS.setInactive),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Passage en inactif...',
      errorMessage: 'Erreur',
      successMessage: 'Vous etes maintenant inactif'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Se remettre actif
 */
export const setActive = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'setActive',
    gasLimit: BigInt(GAS_LIMITS.setActive),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Reactivation...',
      errorMessage: 'Erreur',
      successMessage: 'Vous etes maintenant actif'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Quitter le cercle definitivement
 */
export const leaveCircle = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'leaveCircle',
    gasLimit: BigInt(GAS_LIMITS.leaveCircle),
    arguments: []
  });

  return await signAndSendTransactions({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Sortie du cercle...',
      errorMessage: 'Erreur',
      successMessage: 'Vous avez quitte le cercle'
    }
  });
};

/**
 * Deposer des EGLD dans le contrat
 */
export const deposit = async (amount: string, senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const amountInWei = new BigNumber(amount).multipliedBy('1000000000000000000').toFixed(0);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'deposit',
    gasLimit: BigInt(GAS_LIMITS.deposit),
    arguments: [],
    nativeTransferAmount: BigInt(amountInWei)
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Depot en cours...',
      errorMessage: 'Erreur lors du depot',
      successMessage: 'Depot effectue !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== PRE-SIGN FUNCTIONS ====================

/**
 * Pre-signe pour le cycle (peut etre fait a l'avance, meme si ce n'est pas son tour)
 * Le transfert s'executera automatiquement quand c'est le tour du membre
 */
export const preSign = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'preSign',
    gasLimit: BigInt(GAS_LIMITS.preSign),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Pre-signature en cours...',
      errorMessage: 'Erreur lors de la pre-signature',
      successMessage: 'Pre-signature enregistree ! Le transfert s\'executera automatiquement.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Traite UN SEUL transfert en attente pour les membres qui ont pre-signe
 * Peut etre appele par n'importe qui (permissionless)
 */
export const processNextTransfer = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'processNextTransfer',
    gasLimit: BigInt(GAS_LIMITS.processNextTransfer),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Traitement du transfert...',
      errorMessage: 'Erreur lors du traitement',
      successMessage: 'Transfert execute !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Traite TOUS les transferts en attente en une seule transaction
 * Boucle sur tous les SC qui ont pre-signe (manuellement ou auto-sign) et execute leurs transferts
 * Peut etre appele par n'importe qui (permissionless)
 * Retourne le nombre de transferts effectues
 */
export const processAllPendingTransfers = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'processAllPendingTransfers',
    gasLimit: BigInt(GAS_LIMITS.processAllPendingTransfers),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Traitement de tous les transferts en attente...',
      errorMessage: 'Erreur lors du traitement',
      successMessage: 'Tous les transferts ont ete executes !'
    },
    senderAddress
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== AUTO-SIGN FUNCTIONS ====================

/**
 * Recupere le statut de l'auto-sign pour un membre
 */
export const getAutoSignStatus = async (memberAddress: string): Promise<AutoSignStatus> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { isPermanent: false, untilEpoch: 0, remainingCycles: 0 };
    }

    const returnData = await queryContract('getAutoSignStatus', [addressHex]);

    if (!returnData || returnData.length < 3) {
      return { isPermanent: false, untilEpoch: 0, remainingCycles: 0 };
    }

    const isPermanent = returnData[0] === 'AQ==';
    const untilEpochHex = base64ToHex(returnData[1]);
    const remainingHex = base64ToHex(returnData[2]);

    return {
      isPermanent,
      untilEpoch: parseU64(untilEpochHex),
      remainingCycles: parseU64(remainingHex)
    };
  } catch (error) {
    console.error('Error fetching auto-sign status:', error);
    return { isPermanent: false, untilEpoch: 0, remainingCycles: 0 };
  }
};

/**
 * Active l'auto-sign permanent (pre-signature automatique pour tous les cycles futurs)
 */
export const enableAutoSign = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'enableAutoSign',
    gasLimit: BigInt(GAS_LIMITS.enableAutoSign),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Activation de l\'auto-sign permanent...',
      errorMessage: 'Erreur lors de l\'activation',
      successMessage: 'Auto-sign permanent active ! Vos transferts seront automatiques.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Active l'auto-sign pour les N prochains cycles
 * @param numCycles: nombre de cycles (1-365)
 */
export const enableAutoSignForCycles = async (senderAddress: string, numCycles: number) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  // Encoder numCycles en hex
  const numCyclesHex = numCycles.toString(16).padStart(2, '0');

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'enableAutoSignForCycles',
    gasLimit: BigInt(GAS_LIMITS.enableAutoSignForCycles),
    arguments: [BigInt(numCycles)]
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: `Activation de l'auto-sign pour ${numCycles} cycles...`,
      errorMessage: 'Erreur lors de l\'activation',
      successMessage: `Auto-sign active pour les ${numCycles} prochains cycles !`
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Desactive l'auto-sign (permanent et limite)
 */
export const disableAutoSign = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'disableAutoSign',
    gasLimit: BigInt(GAS_LIMITS.disableAutoSign),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Desactivation de l\'auto-sign...',
      errorMessage: 'Erreur lors de la desactivation',
      successMessage: 'Auto-sign desactive.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== CONTRACT OWNER FUNCTIONS ====================

/**
 * Recupere le proprietaire (wallet) d'un contrat peripherique specifique
 */
export const getContractOwner = async (scAddress: string): Promise<string | null> => {
  try {
    const addressHex = bech32ToHex(scAddress);
    if (!addressHex) return null;

    const returnData = await queryContract('getContractOwner', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    if (hex.length !== 64) return null;

    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching contract owner:', error);
    return null;
  }
};

/**
 * Recupere tous les contrats peripheriques avec leurs proprietaires
 * Retourne une Map<scAddress, ownerAddress>
 */
export const getAllContractsWithOwners = async (): Promise<Map<string, string>> => {
  try {
    const returnData = await queryContract('getAllContractsWithOwners');
    const result = new Map<string, string>();

    if (!returnData || returnData.length === 0) {
      return result;
    }

    // Le format de retour est MultiValueEncoded<MultiValue2<ManagedAddress, ManagedAddress>>
    // Chaque element est une paire (sc_address, owner_address)
    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      // Chaque paire fait 128 caracteres hex (64 pour chaque adresse)
      if (hex.length === 128) {
        const scHex = hex.slice(0, 64);
        const ownerHex = hex.slice(64, 128);
        const scAddress = hexToBech32(scHex);
        const ownerAddress = hexToBech32(ownerHex);
        result.set(scAddress, ownerAddress);
      } else if (hex.length === 64) {
        // Si les adresses sont retournees separement
        // On doit les apparier 2 par 2
        // Ce cas est gere par la boucle suivante
      }
    }

    // Si les adresses sont retournees separement (une par element)
    if (result.size === 0 && returnData.length >= 2) {
      for (let i = 0; i < returnData.length - 1; i += 2) {
        const scHex = base64ToHex(returnData[i]);
        const ownerHex = base64ToHex(returnData[i + 1]);
        if (scHex.length === 64 && ownerHex.length === 64) {
          const scAddress = hexToBech32(scHex);
          const ownerAddress = hexToBech32(ownerHex);
          result.set(scAddress, ownerAddress);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching all contracts with owners:', error);
    return new Map();
  }
};

// ==================== SC STATISTICS & BAN FUNCTIONS ====================

/**
 * Recupere les statistiques d'un SC peripherique specifique
 * Retourne: cyclesCompleted, cyclesFailed, banUntil, isBanned
 */
export const getScStats = async (scAddress: string): Promise<ScStats | null> => {
  try {
    const addressHex = bech32ToHex(scAddress);
    if (!addressHex) return null;

    const returnData = await queryContract('getScStats', [addressHex]);

    if (!returnData || returnData.length < 4) {
      return null;
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    return {
      scAddress,
      cyclesCompleted: parseU64(hexValues[0]),
      cyclesFailed: parseU64(hexValues[1]),
      banUntil: parseU64(hexValues[2]),
      isBanned: returnData[3] === 'AQ=='
    };
  } catch (error) {
    console.error('Error fetching SC stats:', error);
    return null;
  }
};

/**
 * Verifie si un SC est banni et retourne la date de fin de ban
 */
export const isBanned = async (scAddress: string): Promise<{ isBanned: boolean; banUntil: number }> => {
  try {
    const addressHex = bech32ToHex(scAddress);
    if (!addressHex) return { isBanned: false, banUntil: 0 };

    const returnData = await queryContract('isBanned', [addressHex]);

    if (!returnData || returnData.length < 2) {
      return { isBanned: false, banUntil: 0 };
    }

    const isBannedResult = returnData[0] === 'AQ==';
    const banUntilHex = base64ToHex(returnData[1]);
    const banUntil = parseU64(banUntilHex);

    return { isBanned: isBannedResult, banUntil };
  } catch (error) {
    console.error('Error checking if banned:', error);
    return { isBanned: false, banUntil: 0 };
  }
};

/**
 * Recupere les statistiques de tous les SC peripheriques
 */
export const getAllScStats = async (): Promise<Map<string, ScStats>> => {
  try {
    const returnData = await queryContract('getAllScStats');
    const result = new Map<string, ScStats>();

    if (!returnData || returnData.length === 0) {
      return result;
    }

    // Le format de retour est MultiValueEncoded<MultiValue5<ManagedAddress, u64, u64, u64, bool>>
    // Chaque element est un tuple (sc_address, completed, failed, ban_until, is_banned)
    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      // Address (32 bytes = 64 hex) + 4 u64 values (8 bytes each = 16 hex each) + 1 bool = 64 + 64 + 1 = 129
      // En pratique les u64 peuvent etre tronques si 0
      // Parsons en supposant l'adresse est toujours complete

      if (hex.length >= 64) {
        const scHex = hex.slice(0, 64);
        const scAddress = hexToBech32(scHex);

        // Pour simplifier, on va utiliser la fonction getScStats pour chaque SC
        // si le parsing est trop complexe
        const stats = await getScStats(scAddress);
        if (stats) {
          result.set(scAddress, stats);
        }
      }
    }

    // Fallback: si le parsing ne fonctionne pas, recuperer tous les contrats et leurs stats individuellement
    if (result.size === 0) {
      const allContracts = await getAllContracts();
      for (const scAddr of allContracts) {
        const stats = await getScStats(scAddr);
        if (stats) {
          result.set(scAddr, stats);
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error fetching all SC stats:', error);
    return new Map();
  }
};

// ==================== ADMIN FUNCTIONS (TEST ONLY) ====================

/**
 * Reset le cycle quotidien (Admin only)
 * Incremente l'epoch et efface le holder
 */
export const resetCycle = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'resetCycle',
    gasLimit: BigInt(GAS_LIMITS.resetCycle),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Reset du cycle en cours...',
      errorMessage: 'Erreur lors du reset',
      successMessage: 'Cycle reinitialise !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Simule le passage au jour suivant (Admin only)
 * Decremente cycle_day pour forcer le timeout
 */
export const simulateNextDay = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'simulateNextDay',
    gasLimit: BigInt(GAS_LIMITS.simulateNextDay),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Simulation jour suivant...',
      errorMessage: 'Erreur lors de la simulation',
      successMessage: 'Jour suivant simule - Le cycle est maintenant en timeout !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== REWARDS FUNCTIONS ====================

/**
 * Recupere les recompenses en attente pour un membre
 */
export const getPendingRewardsForMember = async (memberAddress: string): Promise<string> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return '0';

    const returnData = await queryContract('getPendingRewards', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    // Parse comme BigUint avec 18 decimales (XCIRCLEX)
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(4);
  } catch (error) {
    console.error('Error fetching pending rewards:', error);
    return '0';
  }
};

/**
 * Recupere le pool de recompenses disponible
 */
export const getRewardsPool = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getRewardsPool');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(2);
  } catch (error) {
    console.error('Error fetching rewards pool:', error);
    return '0';
  }
};

/**
 * Recupere la recompense par cycle
 */
export const getRewardPerCycle = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getRewardPerCycle');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(2);
  } catch (error) {
    console.error('Error fetching reward per cycle:', error);
    return '0';
  }
};

/**
 * Recupere le token ID de recompense
 */
export const getRewardTokenId = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getRewardTokenId');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '';
    }

    // Le token ID est retourne en base64
    const decoded = atob(returnData[0]);
    return decoded;
  } catch (error) {
    console.error('Error fetching reward token ID:', error);
    return '';
  }
};

/**
 * Recupere le total des recompenses distribuees
 */
export const getTotalRewardsDistributed = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalRewardsDistributed');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(2);
  } catch (error) {
    console.error('Error fetching total rewards distributed:', error);
    return '0';
  }
};

/**
 * Verifie si c'est dimanche (jour de claim)
 */
export const isSunday = async (): Promise<boolean> => {
  try {
    const returnData = await queryContract('isSunday');

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isSunday:', error);
    return false;
  }
};

/**
 * Recupere le jour de la semaine (0 = Dimanche, 6 = Samedi)
 */
export const getDayOfWeek = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getDayOfWeek');

    if (!returnData || returnData.length === 0) {
      return -1;
    }

    // Empty string in base64 means 0 (Sunday)
    if (returnData[0] === '' || returnData[0] === null || returnData[0] === undefined) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching day of week:', error);
    return -1;
  }
};

/**
 * Verifie si un membre peut reclamer ses recompenses
 * Retourne: isSunday, pendingRewards, hasRewards
 */
export const canClaimRewards = async (memberAddress: string): Promise<CanClaimResult> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { isSunday: false, pendingRewards: '0', hasRewards: false };
    }

    const returnData = await queryContract('canClaimRewards', [addressHex]);

    if (!returnData || returnData.length < 3) {
      return { isSunday: false, pendingRewards: '0', hasRewards: false };
    }

    const isSundayResult = returnData[0] === 'AQ==';
    const pendingHex = base64ToHex(returnData[1]);
    const wei = pendingHex ? BigInt('0x' + pendingHex) : BigInt(0);
    const pendingRewards = (Number(wei) / 1e18).toFixed(4);
    const hasRewards = returnData[2] === 'AQ==';

    return { isSunday: isSundayResult, pendingRewards, hasRewards };
  } catch (error) {
    console.error('Error checking canClaimRewards:', error);
    return { isSunday: false, pendingRewards: '0', hasRewards: false };
  }
};

/**
 * Recupere toutes les informations de recompenses
 */
export const getRewardsInfo = async (): Promise<RewardsInfo> => {
  try {
    const [poolResult, perCycleResult, tokenIdResult, totalDistributedResult] = await Promise.all([
      getRewardsPool(),
      getRewardPerCycle(),
      getRewardTokenId(),
      getTotalRewardsDistributed()
    ]);

    return {
      rewardsPool: poolResult,
      rewardPerCycle: perCycleResult,
      rewardTokenId: tokenIdResult,
      totalRewardsDistributed: totalDistributedResult
    };
  } catch (error) {
    console.error('Error fetching rewards info:', error);
    return {
      rewardsPool: '0',
      rewardPerCycle: '0',
      rewardTokenId: '',
      totalRewardsDistributed: '0'
    };
  }
};

/**
 * Reclame les recompenses XCIRCLEX (uniquement le dimanche)
 */
export const claimRewards = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'claimRewards',
    gasLimit: BigInt(GAS_LIMITS.claimRewards),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Reclamation des recompenses en cours...',
      errorMessage: 'Erreur lors de la reclamation',
      successMessage: 'Recompenses reclamees avec succes !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== BURN STATS FUNCTIONS ====================

// Types for burn statistics
export interface BurnStats {
  totalBurned: string;           // Total tokens burned (with decimals)
  burnPerSc: string;             // Burn amount per SC per cycle
  estimatedNextBurn: string;     // Estimated burn for next cycle
}

// Types for starter bonus
export interface StarterBonusInfo {
  percentage: number;            // Bonus percentage (base 10000, ex: 1000 = 10%)
  cycleStarter: string | null;   // Address of who started the current cycle
  potentialBonus: string;        // Potential bonus amount in tokens
  totalDistributed: string;      // Total starter bonus distributed
}

/**
 * Recupere le total de tokens brules
 */
export const getTotalBurned = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalBurned');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(4);
  } catch (error) {
    console.error('Error fetching total burned:', error);
    return '0';
  }
};

/**
 * Recupere le montant de burn par SC actif
 */
export const getBurnPerSc = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getBurnPerSc');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(4);
  } catch (error) {
    console.error('Error fetching burn per SC:', error);
    return '0';
  }
};

/**
 * Recupere les statistiques completes de burn
 * (totalBurned, burnPerSc, estimatedNextBurn)
 */
export const getBurnStats = async (): Promise<BurnStats> => {
  try {
    const returnData = await queryContract('getBurnStats');

    if (!returnData || returnData.length < 3) {
      return { totalBurned: '0', burnPerSc: '0', estimatedNextBurn: '0' };
    }

    const parseTokenAmount = (b64: string): string => {
      if (!b64) return '0';
      const hex = base64ToHex(b64);
      if (!hex || hex === '') return '0';
      const wei = BigInt('0x' + hex);
      const tokens = Number(wei) / 1e18;
      return tokens.toFixed(4);
    };

    return {
      totalBurned: parseTokenAmount(returnData[0]),
      burnPerSc: parseTokenAmount(returnData[1]),
      estimatedNextBurn: parseTokenAmount(returnData[2])
    };
  } catch (error) {
    console.error('Error fetching burn stats:', error);
    return { totalBurned: '0', burnPerSc: '0', estimatedNextBurn: '0' };
  }
};

// ==================== STARTER BONUS FUNCTIONS ====================

/**
 * Recupere les informations du starter bonus
 * Retourne: percentage, cycleStarter (optional), potentialBonus, totalDistributed
 */
export const getStarterBonusInfo = async (): Promise<StarterBonusInfo> => {
  try {
    const returnData = await queryContract('getStarterBonusInfo');

    if (!returnData || returnData.length < 3) {
      return { percentage: 0, cycleStarter: null, potentialBonus: '0', totalDistributed: '0' };
    }

    // Parse token amount helper
    const parseTokenAmount = (b64: string): string => {
      if (!b64) return '0';
      const hex = base64ToHex(b64);
      if (!hex || hex === '') return '0';
      const wei = BigInt('0x' + hex);
      const tokens = Number(wei) / 1e18;
      return tokens.toFixed(4);
    };

    // Parse percentage (u64) - always first
    const percentageHex = base64ToHex(returnData[0]);
    const percentage = parseU64(percentageHex);

    // Check if returnData[1] is an address (64 hex chars = 32 bytes) or a BigUint
    const secondValueHex = base64ToHex(returnData[1]);

    let cycleStarter: string | null = null;
    let potentialBonus: string;
    let totalDistributed: string;

    // If second value is 64 hex chars, it's the cycle starter address
    if (secondValueHex.length === 64) {
      cycleStarter = hexToBech32(secondValueHex);
      potentialBonus = parseTokenAmount(returnData[2]);
      totalDistributed = returnData.length > 3 ? parseTokenAmount(returnData[3]) : '0';
    } else {
      // No cycle starter, second value is potential bonus
      cycleStarter = null;
      potentialBonus = parseTokenAmount(returnData[1]);
      totalDistributed = returnData.length > 2 ? parseTokenAmount(returnData[2]) : '0';
    }

    return { percentage, cycleStarter, potentialBonus, totalDistributed };
  } catch (error) {
    console.error('Error fetching starter bonus info:', error);
    return { percentage: 0, cycleStarter: null, potentialBonus: '0', totalDistributed: '0' };
  }
};

/**
 * Recupere le pourcentage du bonus starter (base 10000)
 */
export const getStarterBonusPercentage = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getStarterBonusPercentage');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching starter bonus percentage:', error);
    return 0;
  }
};

/**
 * Recupere l'adresse de celui qui a demarre le cycle actuel
 */
export const getCycleStarter = async (): Promise<string | null> => {
  try {
    const returnData = await queryContract('getCycleStarter');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    if (hex.length !== 64) return null;

    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching cycle starter:', error);
    return null;
  }
};

/**
 * Recupere le total des bonus starter distribues
 */
export const getTotalStarterBonusDistributed = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalStarterBonusDistributed');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(4);
  } catch (error) {
    console.error('Error fetching total starter bonus distributed:', error);
    return '0';
  }
};

// ==================== SYSTÈME DE RÉCOMPENSES π × 360 ====================

// Types for π × 360 reward system
export interface OptionFInfo {
  currentReward: string;           // Current cycle reward (with halving applied)
  currentEra: number;              // Current era (number of halvings)
  nextCircleComplete: number;      // Next cycle that triggers π% bonus (360, 720...)
  cyclesUntilHalving: number;      // Cycles remaining until next halving
  piBonusAmount: string;           // Potential π% bonus amount
}

/**
 * Recupere les informations completes du systeme π × 360
 * (current_reward, current_era, next_circle_complete, cycles_until_halving, pi_bonus_amount)
 */
export const getOptionFInfo = async (): Promise<OptionFInfo> => {
  try {
    const returnData = await queryContract('getOptionFInfo');

    if (!returnData || returnData.length < 5) {
      return {
        currentReward: '0',
        currentEra: 0,
        nextCircleComplete: 360,
        cyclesUntilHalving: 360,
        piBonusAmount: '0'
      };
    }

    // Parse token amount helper
    const parseTokenAmount = (b64: string): string => {
      if (!b64) return '0';
      const hex = base64ToHex(b64);
      if (!hex || hex === '') return '0';
      const wei = BigInt('0x' + hex);
      const tokens = Number(wei) / 1e18;
      return tokens.toFixed(2);
    };

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    return {
      currentReward: parseTokenAmount(returnData[0]),
      currentEra: parseU64(hexValues[1]),
      nextCircleComplete: parseU64(hexValues[2]),
      cyclesUntilHalving: parseU64(hexValues[3]),
      piBonusAmount: parseTokenAmount(returnData[4])
    };
  } catch (error) {
    console.error('Error fetching π × 360 info:', error);
    return {
      currentReward: '0',
      currentEra: 0,
      nextCircleComplete: 360,
      cyclesUntilHalving: 360,
      piBonusAmount: '0'
    };
  }
};

/**
 * Recupere la recompense actuelle pour un cycle (avec halving applique)
 */
export const getCurrentCycleReward = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getCurrentCycleReward');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return '0';
    const wei = BigInt('0x' + hex);
    const tokens = Number(wei) / 1e18;
    return tokens.toFixed(2);
  } catch (error) {
    console.error('Error fetching current cycle reward:', error);
    return '0';
  }
};

/**
 * Recupere l'ere actuelle (nombre de halvings effectues)
 */
export const getCurrentEra = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCurrentEra');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching current era:', error);
    return 0;
  }
};

/**
 * Recupere le prochain cycle qui declenchera un bonus cercle complet (360, 720, 1080...)
 */
export const getNextCircleCompleteCycle = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getNextCircleCompleteCycle');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 360;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching next circle complete cycle:', error);
    return 360;
  }
};

/**
 * Recupere les cycles restants avant le prochain halving
 */
export const getCyclesUntilNextHalving = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getCyclesUntilNextHalving');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 360;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching cycles until next halving:', error);
    return 360;
  }
};

/**
 * Verifie si le prochain cycle complete sera un "cercle complet" (360, 720, ...)
 */
export const isNextCycleCircleComplete = async (): Promise<boolean> => {
  try {
    const returnData = await queryContract('isNextCycleCircleComplete');

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isNextCycleCircleComplete:', error);
    return false;
  }
};

/**
 * Recupere la table des recompenses par ere (pour affichage)
 * Retourne les 5 prochaines eres avec leurs recompenses
 */
export interface RewardScheduleEntry {
  era: number;
  startCycle: number;
  rewardAmount: string;
}

export const getRewardSchedule = async (): Promise<RewardScheduleEntry[]> => {
  try {
    const returnData = await queryContract('getRewardSchedule');

    if (!returnData || returnData.length === 0) {
      // Return default schedule if query fails
      const defaultSchedule: RewardScheduleEntry[] = [];
      for (let era = 0; era < 5; era++) {
        defaultSchedule.push({
          era,
          startCycle: era * 360,
          rewardAmount: (36000 / Math.pow(2, era)).toFixed(2)
        });
      }
      return defaultSchedule;
    }

    const schedule: RewardScheduleEntry[] = [];

    for (const base64Data of returnData) {
      if (!base64Data) continue;
      const hex = base64ToHex(base64Data);

      // Each entry is (era: u64, start_cycle: u64, reward: BigUint)
      // Try to parse - format may vary
      if (hex.length >= 16) {
        // Parse as separate values - this depends on how MultiversX encodes MultiValue3
        // For now, generate from constants
      }
    }

    // Fallback: generate schedule from known constants
    if (schedule.length === 0) {
      for (let era = 0; era < 5; era++) {
        schedule.push({
          era,
          startCycle: era * 360,
          rewardAmount: (36000 / Math.pow(2, era)).toFixed(2)
        });
      }
    }

    return schedule;
  } catch (error) {
    console.error('Error fetching reward schedule:', error);
    // Return default schedule on error
    const defaultSchedule: RewardScheduleEntry[] = [];
    for (let era = 0; era < 5; era++) {
      defaultSchedule.push({
        era,
        startCycle: era * 360,
        rewardAmount: (36000 / Math.pow(2, era)).toFixed(2)
      });
    }
    return defaultSchedule;
  }
};

// ==================== PIONEER FUNCTIONS (Bonus π% pour les 360 premiers SC) ====================

// Types for pioneer status
export interface PioneerInfo {
  isPioneer: boolean;            // Is the member a pioneer (in first 360)
  index: number;                 // SC index (1-360 for pioneers)
  bonusPercentage: number;       // Bonus in basis points (314 = 3.14%)
  remainingSlots: number;        // Remaining pioneer slots
  totalPioneers: number;         // Total pioneers (360 - remaining)
}

/**
 * Recupere les informations pionnier pour un membre
 * Retourne: isPioneer, index, bonusPercentage, remainingSlots
 */
export const getPioneerInfo = async (memberAddress: string): Promise<PioneerInfo> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { isPioneer: false, index: 0, bonusPercentage: 0, remainingSlots: 360, totalPioneers: 0 };
    }

    const returnData = await queryContract('getPioneerInfo', [addressHex]);

    if (!returnData || returnData.length < 4) {
      return { isPioneer: false, index: 0, bonusPercentage: 0, remainingSlots: 360, totalPioneers: 0 };
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    const isPioneer = returnData[0] === 'AQ==';
    const index = parseU64(hexValues[1]);
    const bonusPercentage = parseU64(hexValues[2]);
    const remainingSlots = parseU64(hexValues[3]);
    const totalPioneers = 360 - remainingSlots;

    return { isPioneer, index, bonusPercentage, remainingSlots, totalPioneers };
  } catch (error) {
    console.error('Error fetching pioneer info:', error);
    return { isPioneer: false, index: 0, bonusPercentage: 0, remainingSlots: 360, totalPioneers: 0 };
  }
};

/**
 * Verifie si un membre est un pionnier
 */
export const isPioneer = async (memberAddress: string): Promise<boolean> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return false;

    const returnData = await queryContract('isPioneer', [addressHex]);

    if (!returnData || returnData.length === 0) {
      return false;
    }

    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking isPioneer:', error);
    return false;
  }
};

/**
 * Recupere le nombre de places pionniers restantes
 */
export const getRemainingPioneerSlots = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getRemainingPioneerSlots');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 360;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching remaining pioneer slots:', error);
    return 360;
  }
};

/**
 * Recupere l'index du SC peripherique d'un membre
 */
export const getPeripheralIndex = async (memberAddress: string): Promise<number> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return 0;

    const returnData = await queryContract('getPeripheralIndex', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching peripheral index:', error);
    return 0;
  }
};

// ==================== DEPOSIT BONUS FUNCTIONS (1 EGLD = 1%, max 360%) ====================

// Types for deposit bonus
export interface DepositBonusInfo {
  totalDeposits: string;         // Total EGLD deposited (in EGLD)
  bonusPercent: number;          // Bonus percentage (1-360)
  bonusBps: number;              // Bonus in basis points (100-36000)
  maxBonusPercent: number;       // Maximum bonus (360%)
}

// Types for all bonuses combined
export interface AllBonusesInfo {
  isPioneer: boolean;            // Is the member a pioneer
  pioneerBonusBps: number;       // Pioneer bonus in BPS (314 = 3.14%)
  depositBonusBps: number;       // Deposit bonus in BPS (100-36000)
  referralBonusBps: number;      // Referral bonus in BPS (100-36000)
  totalBonusBps: number;         // Total bonus in BPS
}

/**
 * Recupere les informations de bonus de depot pour un membre
 * Retourne: totalDeposits, bonusPercent, bonusBps, maxBonusPercent
 */
export const getDepositBonusInfo = async (memberAddress: string): Promise<DepositBonusInfo> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { totalDeposits: '0', bonusPercent: 0, bonusBps: 0, maxBonusPercent: 360 };
    }

    const returnData = await queryContract('getDepositBonusInfo', [addressHex]);

    if (!returnData || returnData.length < 4) {
      return { totalDeposits: '0', bonusPercent: 0, bonusBps: 0, maxBonusPercent: 360 };
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    const totalDeposits = parseBigUint(hexValues[0]);
    const bonusPercent = parseU64(hexValues[1]);
    const bonusBps = parseU64(hexValues[2]);
    const maxBonusPercent = parseU64(hexValues[3]);

    return { totalDeposits, bonusPercent, bonusBps, maxBonusPercent };
  } catch (error) {
    console.error('Error fetching deposit bonus info:', error);
    return { totalDeposits: '0', bonusPercent: 0, bonusBps: 0, maxBonusPercent: 360 };
  }
};

/**
 * Recupere le total des EGLD deposes par un membre
 */
export const getMemberEgldDeposits = async (memberAddress: string): Promise<string> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return '0';

    const returnData = await queryContract('getMemberEgldDeposits', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching member EGLD deposits:', error);
    return '0';
  }
};

/**
 * Recupere le bonus de depot en pourcentage (1-360%)
 */
export const getDepositBonusPercent = async (memberAddress: string): Promise<number> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return 0;

    const returnData = await queryContract('getDepositBonusPercent', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching deposit bonus percent:', error);
    return 0;
  }
};

/**
 * Recupere le total global des EGLD deposes
 */
export const getTotalEgldDeposits = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalEgldDeposits');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }

    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching total EGLD deposits:', error);
    return '0';
  }
};

/**
 * Recupere tous les bonus pour un membre (pioneer + deposit + referral)
 * Retourne: isPioneer, pioneerBonusBps, depositBonusBps, referralBonusBps, totalBonusBps
 */
export const getAllBonuses = async (memberAddress: string): Promise<AllBonusesInfo> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { isPioneer: false, pioneerBonusBps: 0, depositBonusBps: 0, referralBonusBps: 0, totalBonusBps: 0 };
    }

    const returnData = await queryContract('getAllBonuses', [addressHex]);

    if (!returnData || returnData.length < 5) {
      return { isPioneer: false, pioneerBonusBps: 0, depositBonusBps: 0, referralBonusBps: 0, totalBonusBps: 0 };
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    const isPioneer = returnData[0] === 'AQ==';
    const pioneerBonusBps = parseU64(hexValues[1]);
    const depositBonusBps = parseU64(hexValues[2]);
    const referralBonusBps = parseU64(hexValues[3]);
    const totalBonusBps = parseU64(hexValues[4]);

    return { isPioneer, pioneerBonusBps, depositBonusBps, referralBonusBps, totalBonusBps };
  } catch (error) {
    console.error('Error fetching all bonuses:', error);
    return { isPioneer: false, pioneerBonusBps: 0, depositBonusBps: 0, referralBonusBps: 0, totalBonusBps: 0 };
  }
};

// ==================== REFERRAL FUNCTIONS (1 parrainage = 1%, max 360%) ====================

// Types for referral info
export interface ReferralBonusInfo {
  count: number;            // Number of referrals
  bonusPercent: number;     // Bonus percentage (1-360)
  bonusBps: number;         // Bonus in basis points (100-36000)
  remainingSlots: number;   // Remaining referral slots (max 360)
}

/**
 * Get the number of referrals for a member
 */
export const getReferralCount = async (memberAddress: string): Promise<number> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return 0;

    const returnData = await queryContract('getReferralCount', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching referral count:', error);
    return 0;
  }
};

/**
 * Get who referred a member (returns null if no referrer)
 */
export const getReferrer = async (memberAddress: string): Promise<string | null> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) return null;

    const returnData = await queryContract('getReferrer', [addressHex]);

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return null;
    }

    const hex = base64ToHex(returnData[0]);
    if (!hex || hex === '') return null;

    return hexToBech32(hex);
  } catch (error) {
    console.error('Error fetching referrer:', error);
    return null;
  }
};

/**
 * Get referral bonus info for a member
 * Returns: count, bonusPercent, bonusBps, remainingSlots
 */
export const getReferralBonusInfo = async (memberAddress: string): Promise<ReferralBonusInfo> => {
  try {
    const addressHex = bech32ToHex(memberAddress);
    if (!addressHex) {
      return { count: 0, bonusPercent: 0, bonusBps: 0, remainingSlots: 360 };
    }

    const returnData = await queryContract('getReferralBonusInfo', [addressHex]);

    if (!returnData || returnData.length < 4) {
      return { count: 0, bonusPercent: 0, bonusBps: 0, remainingSlots: 360 };
    }

    const hexValues = returnData.map((b64: string) => b64 ? base64ToHex(b64) : '');

    const count = parseU64(hexValues[0]);
    const bonusPercent = parseU64(hexValues[1]);
    const bonusBps = parseU64(hexValues[2]);
    const remainingSlots = parseU64(hexValues[3]);

    return { count, bonusPercent, bonusBps, remainingSlots };
  } catch (error) {
    console.error('Error fetching referral bonus info:', error);
    return { count: 0, bonusPercent: 0, bonusBps: 0, remainingSlots: 360 };
  }
};

/**
 * Get total number of referrals in the system
 */
export const getTotalReferrals = async (): Promise<number> => {
  try {
    const returnData = await queryContract('getTotalReferrals');

    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return 0;
    }

    const hex = base64ToHex(returnData[0]);
    return parseU64(hex);
  } catch (error) {
    console.error('Error fetching total referrals:', error);
    return 0;
  }
};

/**
 * Validate a referral code (check if it's a valid member address)
 * @param code - Either an address (erd1...) or a herotag (@name)
 * @returns The resolved address if valid, null otherwise
 */
export const validateReferralCode = async (code: string): Promise<string | null> => {
  try {
    let address = code;

    // If it's a herotag, resolve it
    if (code.startsWith('@')) {
      const herotag = code.substring(1);
      const response = await fetch(`${getApiUrl()}/usernames/${herotag}`);
      if (!response.ok) return null;
      const data = await response.json();
      address = data.address;
    }

    // Check if it's a valid address
    if (!address || !address.startsWith('erd1')) {
      return null;
    }

    // Check if the address is a member
    const isMemberResult = await isMember(address);
    if (!isMemberResult) {
      return null;
    }

    return address;
  } catch (error) {
    console.error('Error validating referral code:', error);
    return null;
  }
};

// ==================== DISTRIBUTION STATS ====================

export interface DistributionStats {
  totalDistributedTreasury: string;  // 3.14% reste dans SC0
  totalDistributedDao: string;       // 30% du restant va au DAO
  pendingLiquidityEgld: string;      // 70% du restant en attente pour LP
  distributionEnabled: boolean;
}

/**
 * Get total EGLD distributed to treasury (3.14%)
 */
export const getTotalDistributedTreasury = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalDistributedTreasury');
    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }
    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching total distributed treasury:', error);
    return '0';
  }
};

/**
 * Get total EGLD distributed to DAO (30% of remaining after 3.14%)
 */
export const getTotalDistributedDao = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getTotalDistributedDao');
    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }
    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching total distributed DAO:', error);
    return '0';
  }
};

/**
 * Get pending EGLD for liquidity (70% of remaining after 3.14%)
 */
export const getPendingLiquidityEgld = async (): Promise<string> => {
  try {
    const returnData = await queryContract('getPendingLiquidityEgld');
    if (!returnData || returnData.length === 0 || !returnData[0]) {
      return '0';
    }
    const hex = base64ToHex(returnData[0]);
    return parseBigUint(hex);
  } catch (error) {
    console.error('Error fetching pending liquidity EGLD:', error);
    return '0';
  }
};

/**
 * Check if distribution is enabled
 */
export const isDistributionEnabled = async (): Promise<boolean> => {
  try {
    const returnData = await queryContract('isDistributionEnabled');
    if (!returnData || returnData.length === 0) {
      return false;
    }
    return returnData[0] === 'AQ==';
  } catch (error) {
    console.error('Error checking distribution enabled:', error);
    return false;
  }
};

/**
 * Get all distribution stats
 */
export const getDistributionStats = async (): Promise<DistributionStats> => {
  try {
    const [treasury, dao, liquidity, enabled] = await Promise.all([
      getTotalDistributedTreasury(),
      getTotalDistributedDao(),
      getPendingLiquidityEgld(),
      isDistributionEnabled()
    ]);

    return {
      totalDistributedTreasury: treasury,
      totalDistributedDao: dao,
      pendingLiquidityEgld: liquidity,
      distributionEnabled: enabled
    };
  } catch (error) {
    console.error('Error fetching distribution stats:', error);
    return {
      totalDistributedTreasury: '0',
      totalDistributedDao: '0',
      pendingLiquidityEgld: '0',
      distributionEnabled: false
    };
  }
};

// ==================== ADMIN: LIQUIDITY PROCESSING (DEPRECATED) ====================
// NOTE: Utiliser les 4 etapes individuelles ci-dessous pour un meilleur controle

/** @deprecated Utiliser liquidityStep1_WrapEgld */
export const processLiquidity = async (senderAddress: string) => {
  // Alias vers l'etape 1 pour compatibilite
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep1_WrapEgld',
    gasLimit: BigInt(120_000_000),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 1: Wrap EGLD -> WEGLD...',
      errorMessage: 'Erreur lors du wrap',
      successMessage: 'Wrap reussi ! Utilisez les 4 etapes dans Admin Panel.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/** @deprecated Utiliser liquidityStep4_LockLp */
export const lockPendingLpTokens = async (senderAddress: string) => {
  // Alias vers l'etape 4 pour compatibilite
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep4_LockLp',
    gasLimit: BigInt(80_000_000),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 4: Lock LP tokens (365 jours)...',
      errorMessage: 'Erreur lors du lock',
      successMessage: 'LP tokens lockes pour 365 jours !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== LIQUIDITY STEPS (4 etapes independantes) ====================

/**
 * Etape 1: Wrap EGLD -> WEGLD
 * Utilise les EGLD en attente (pending_liquidity_egld)
 */
export const liquidityStep1_WrapEgld = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep1_WrapEgld',
    gasLimit: BigInt(120_000_000), // 120M pour wrap cross-shard + callback
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 1: Wrap EGLD -> WEGLD...',
      errorMessage: 'Erreur lors du wrap',
      successMessage: 'Wrap reussi ! Continuez avec Etape 2.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Etape 2: Swap WEGLD -> XCIRCLEX (50%)
 * Appeler apres que l'etape 1 soit terminee
 */
export const liquidityStep2_Swap = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep2_Swap',
    gasLimit: BigInt(100_000_000), // 100M pour swap cross-shard
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 2: Swap WEGLD -> XCIRCLEX...',
      errorMessage: 'Erreur lors du swap',
      successMessage: 'Swap reussi ! Continuez avec Etape 3.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Etape 3: Add Liquidity (WEGLD + XCIRCLEX)
 * Appeler apres que l'etape 2 soit terminee
 */
export const liquidityStep3_AddLiquidity = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep3_AddLiquidity',
    gasLimit: BigInt(150_000_000), // 150M pour addLiquidity cross-shard
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 3: Ajout de liquidite...',
      errorMessage: 'Erreur lors de l\'ajout de liquidite',
      successMessage: 'Liquidite ajoutee ! Continuez avec Etape 4.'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Etape 4: Lock LP tokens pour 365 jours
 * Appeler apres que l'etape 3 soit terminee
 */
export const liquidityStep4_LockLp = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'liquidityStep4_LockLp',
    gasLimit: BigInt(80_000_000), // 80M pour lock
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Etape 4: Lock LP tokens (365 jours)...',
      errorMessage: 'Erreur lors du lock',
      successMessage: 'LP tokens lockes pour 365 jours !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

/**
 * Admin: Recuperer les XCIRCLEX orphelins et les ajouter au pool de recompenses
 * Ces tokens sont retournes par xExchange lors de l'ajout de liquidite
 */
export const recoverOrphanXcirclex = async (senderAddress: string) => {
  const contractAddress = new Address(CIRCLE_OF_LIFE_ADDRESS);
  const sender = new Address(senderAddress);

  const transaction = await getFactory().createTransactionForExecute(sender, {
    contract: contractAddress,
    function: 'recoverOrphanXcirclex',
    gasLimit: BigInt(20_000_000),
    arguments: []
  });

  const result = await signAndSendTransactionsWithHash({
    transactions: [transaction],
    transactionsDisplayInfo: {
      processingMessage: 'Recuperation des XCIRCLEX orphelins...',
      errorMessage: 'Erreur lors de la recuperation',
      successMessage: 'XCIRCLEX orphelins ajoutes au pool de recompenses !'
    }
  });

  return {
    sessionId: result.sessionId,
    transactionHash: result.transactionHashes[0] || null
  };
};

// ==================== ALIASES (pour compatibilite) ====================
export const resumeProcessingFromWegld = liquidityStep2_Swap;
export const resumeFromAddLiquidity = liquidityStep3_AddLiquidity;

// ==================== LEGACY ALIASES (pour compatibilite) ====================
export const createPeripheralContract = joinCircle;
export const getActiveMembers = getActiveContracts; // Alias pour compatibilite
export const getAllMembers = getAllContracts; // Alias pour compatibilite
