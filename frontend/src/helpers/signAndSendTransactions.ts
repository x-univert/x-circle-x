import {
  getAccountProvider,
  Transaction,
  TransactionManager,
  TransactionsDisplayInfoType
} from 'lib';
import { multiversxApiUrl } from 'config';

type SignAndSendTransactionsProps = {
  transactions: Transaction[];
  transactionsDisplayInfo?: TransactionsDisplayInfoType;
  senderAddress?: string;
};

export const signAndSendTransactions = async ({
  transactions,
  transactionsDisplayInfo
}: SignAndSendTransactionsProps) => {
  const provider = getAccountProvider();
  const txManager = TransactionManager.getInstance();

  const signedTransactions = await provider.signTransactions(transactions);
  const sentTransactions = await txManager.send(signedTransactions);
  const sessionId = await txManager.track(sentTransactions, {
    transactionsDisplayInfo
  });

  return sessionId;
};

// Récupérer le hash de la dernière transaction d'un compte via l'API
const getLatestTransactionHash = async (address: string, maxWait = 10000): Promise<string | null> => {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    try {
      const response = await fetch(
        `${multiversxApiUrl}/accounts/${address}/transactions?size=1&order=desc&status=pending,success`
      );
      if (response.ok) {
        const txs = await response.json();
        if (txs && txs.length > 0 && txs[0].txHash) {
          // Vérifier que c'est une transaction récente (moins de 30 secondes)
          const txTime = txs[0].timestamp * 1000;
          if (Date.now() - txTime < 30000) {
            console.log('[Helper] Found recent transaction:', txs[0].txHash);
            return txs[0].txHash;
          }
        }
      }
    } catch (e) {
      console.error('[Helper] Error fetching latest transaction:', e);
    }

    // Attendre 1 seconde avant de réessayer
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return null;
};

// Helper pour extraire le hash d'une transaction
const extractTransactionHash = (tx: any): string | null => {
  try {
    // Méthode 1: propriété directe hash
    if (tx.hash && typeof tx.hash === 'string' && tx.hash.length === 64) {
      return tx.hash;
    }

    // Méthode 2: getHash() qui retourne un objet TransactionHash
    if (typeof tx.getHash === 'function') {
      const hashObj = tx.getHash();
      if (hashObj) {
        if (typeof hashObj.hex === 'function') {
          const hex = hashObj.hex();
          if (hex && hex.length === 64) return hex;
        }
        if (typeof hashObj.toString === 'function') {
          const str = hashObj.toString();
          if (str && str.length === 64) return str;
        }
        if (typeof hashObj === 'string' && hashObj.length === 64) {
          return hashObj;
        }
      }
    }

    // Méthode 3: txHash
    if ((tx as any).txHash && typeof (tx as any).txHash === 'string') {
      return (tx as any).txHash;
    }

    // Méthode 4: chercher dans toutes les propriétés
    for (const key of Object.keys(tx)) {
      const val = tx[key];
      if (typeof val === 'string' && val.length === 64 && /^[a-f0-9]+$/i.test(val)) {
        console.log(`[Helper] Found potential hash in property '${key}':`, val);
        return val;
      }
    }

    return null;
  } catch (e) {
    console.error('[Helper] Error extracting hash:', e);
    return null;
  }
};

// Version avec hash de transaction pour récupérer les résultats
export const signAndSendTransactionsWithHash = async ({
  transactions,
  transactionsDisplayInfo,
  senderAddress
}: SignAndSendTransactionsProps) => {
  const provider = getAccountProvider();
  const txManager = TransactionManager.getInstance();

  console.log('[Helper] === START signAndSendTransactionsWithHash ===');

  // 1. Signer les transactions
  console.log('[Helper] 1. Signing transactions...');
  const signedTransactions = await provider.signTransactions(transactions);
  console.log('[Helper] Signed count:', signedTransactions.length);

  // Extraire les hashes des transactions signées
  const hashesFromSigned = signedTransactions.map(tx => extractTransactionHash(tx)).filter(Boolean) as string[];
  console.log('[Helper] 2. Hashes from signed:', hashesFromSigned);

  // 2. Envoyer les transactions
  console.log('[Helper] 3. Sending transactions...');
  const sentTransactions = await txManager.send(signedTransactions);
  console.log('[Helper] Sent count:', sentTransactions.length);

  // Extraire les hashes des transactions envoyées
  const hashesFromSent = sentTransactions.map(tx => extractTransactionHash(tx)).filter(Boolean) as string[];
  console.log('[Helper] 4. Hashes from sent:', hashesFromSent);

  // 3. Tracker les transactions
  const sessionId = await txManager.track(sentTransactions, {
    transactionsDisplayInfo
  });
  console.log('[Helper] 5. Session ID:', sessionId);

  // 4. Déterminer les hashes finaux
  let transactionHashes = hashesFromSigned.length > 0 ? hashesFromSigned : hashesFromSent;

  // 5. Si pas de hash et qu'on a l'adresse, récupérer via l'API
  if (transactionHashes.length === 0 && senderAddress) {
    console.log('[Helper] 6. No hash found, fetching from API for address:', senderAddress);
    const apiHash = await getLatestTransactionHash(senderAddress);
    if (apiHash) {
      transactionHashes = [apiHash];
      console.log('[Helper] 7. Got hash from API:', apiHash);
    }
  }

  // 6. Vérifier si sessionId peut être utilisé comme hash
  if (transactionHashes.length === 0 && sessionId) {
    if (typeof sessionId === 'string' && sessionId.length === 64 && /^[a-f0-9]+$/i.test(sessionId)) {
      console.log('[Helper] 8. Using sessionId as hash:', sessionId);
      transactionHashes = [sessionId];
    }
  }

  console.log('[Helper] 9. Final hashes:', transactionHashes);
  console.log('[Helper] === END signAndSendTransactionsWithHash ===');

  return {
    sessionId,
    transactionHashes
  };
};
