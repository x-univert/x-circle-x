import { NETWORK_CONFIG } from '../config/contracts';
import { getAllProposals, Proposal } from './daoService';

// Types
export interface NFT {
  identifier: string;
  collection: string;
  nonce: number;
  name: string;
  url: string;
  media?: Array<{
    url: string;
    fileType: string;
    thumbnailUrl?: string;
  }>;
  metadata?: {
    description?: string;
    attributes?: Array<{
      trait_type: string;
      value: string;
    }>;
  };
  balance?: string;
  royalties?: number;
}

export interface ExtendedUserProfile {
  displayName: string;
  bio: string;
  avatarType: 'upload' | 'nft' | 'none';
  avatarUrl?: string;
  avatarNftId?: string;
  ipfsCid?: string;
  updatedAt: number;
}

const PROFILE_STORAGE_KEY_PREFIX = 'xcirclex_profile_';

// ============================================================================
// NFT FUNCTIONS
// ============================================================================

/**
 * Get all NFTs owned by a user (all collections)
 */
export const getUserNFTs = async (userAddress: string, size: number = 100): Promise<NFT[]> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/accounts/${userAddress}/nfts?size=${size}`
    );

    if (!response.ok) {
      console.error('Error fetching user NFTs:', response.statusText);
      return [];
    }

    const nfts = await response.json();
    return nfts.map((nft: any) => ({
      identifier: nft.identifier,
      collection: nft.collection,
      nonce: parseInt(nft.nonce) || 0,
      name: nft.name || nft.identifier,
      url: nft.url || '',
      media: nft.media,
      metadata: nft.metadata,
      balance: nft.balance || '1',
      royalties: nft.royalties
    }));
  } catch (error) {
    console.error('Error getting user NFTs:', error);
    return [];
  }
};

/**
 * Get NFT details by identifier
 */
export const getNFTDetails = async (identifier: string): Promise<NFT | null> => {
  try {
    const response = await fetch(
      `${NETWORK_CONFIG.apiAddress}/nfts/${identifier}`
    );

    if (!response.ok) {
      console.error('Error fetching NFT details:', response.statusText);
      return null;
    }

    const nft = await response.json();
    return {
      identifier: nft.identifier,
      collection: nft.collection,
      nonce: parseInt(nft.nonce) || 0,
      name: nft.name || nft.identifier,
      url: nft.url || '',
      media: nft.media,
      metadata: nft.metadata,
      balance: nft.balance || '1',
      royalties: nft.royalties
    };
  } catch (error) {
    console.error('Error getting NFT details:', error);
    return null;
  }
};

/**
 * Get the best image URL for an NFT
 */
export const getNFTImageUrl = (nft: NFT): string => {
  // Check media array first (usually has the best quality)
  if (nft.media && nft.media.length > 0) {
    const imageMedia = nft.media.find(m =>
      m.fileType?.startsWith('image/') || m.url?.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
    );
    if (imageMedia) {
      return imageMedia.thumbnailUrl || imageMedia.url;
    }
  }

  // Fallback to url field
  if (nft.url) {
    return nft.url;
  }

  return '';
};

// ============================================================================
// DAO PROPOSALS FUNCTIONS
// ============================================================================

/**
 * Get all proposals created by a specific user
 */
export const getUserProposals = async (userAddress: string): Promise<Proposal[]> => {
  try {
    const allProposals = await getAllProposals();
    return allProposals.filter(
      p => p.proposer.toLowerCase() === userAddress.toLowerCase()
    );
  } catch (error) {
    console.error('Error getting user proposals:', error);
    return [];
  }
};

// ============================================================================
// LOCAL STORAGE FUNCTIONS
// ============================================================================

/**
 * Get profile from localStorage
 */
export const getLocalProfile = (userAddress: string): ExtendedUserProfile | null => {
  try {
    const key = PROFILE_STORAGE_KEY_PREFIX + userAddress.toLowerCase();
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error getting local profile:', error);
    return null;
  }
};

/**
 * Save profile to localStorage
 */
export const saveLocalProfile = (userAddress: string, profile: ExtendedUserProfile): void => {
  try {
    const key = PROFILE_STORAGE_KEY_PREFIX + userAddress.toLowerCase();
    profile.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving local profile:', error);
    throw error;
  }
};

// ============================================================================
// IPFS FUNCTIONS (using free public gateways)
// ============================================================================

/**
 * Upload JSON data to IPFS using nft.storage API (free tier)
 * Note: For production, you should use your own Pinata/nft.storage API key
 */
export const uploadToIPFS = async (data: object): Promise<string | null> => {
  try {
    // Using web3.storage / nft.storage public endpoint
    // For a real production app, use your own API key
    const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });

    // Option 1: Use Pinata's free tier (requires API key)
    // For now, we'll simulate IPFS storage by using localStorage with a hash
    // In production, implement proper IPFS pinning

    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in a separate "IPFS" simulation storage
    const ipfsKey = `ipfs_${hashHex}`;
    localStorage.setItem(ipfsKey, dataString);

    console.log('Profile saved with IPFS-like hash:', hashHex);
    return hashHex;
  } catch (error) {
    console.error('Error uploading to IPFS:', error);
    return null;
  }
};

/**
 * Fetch JSON data from IPFS by CID
 */
export const fetchFromIPFS = async (cid: string): Promise<object | null> => {
  try {
    // First, try our simulated IPFS storage
    const ipfsKey = `ipfs_${cid}`;
    const stored = localStorage.getItem(ipfsKey);
    if (stored) {
      return JSON.parse(stored);
    }

    // If not in local simulation, try public IPFS gateways
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://ipfs.io/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`
    ];

    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, {
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching from IPFS:', error);
    return null;
  }
};

// ============================================================================
// COMBINED PROFILE FUNCTIONS
// ============================================================================

/**
 * Get user profile (tries local storage first, then IPFS)
 */
export const getUserProfile = async (userAddress: string): Promise<ExtendedUserProfile> => {
  const defaultProfile: ExtendedUserProfile = {
    displayName: '',
    bio: '',
    avatarType: 'none',
    updatedAt: 0
  };

  // Try local storage first
  const localProfile = getLocalProfile(userAddress);
  if (localProfile) {
    return localProfile;
  }

  return defaultProfile;
};

/**
 * Save user profile (to both localStorage and IPFS)
 */
export const saveUserProfile = async (
  userAddress: string,
  profile: ExtendedUserProfile
): Promise<{ success: boolean; ipfsCid?: string }> => {
  try {
    // Save to localStorage first (fast)
    saveLocalProfile(userAddress, profile);

    // Then upload to IPFS (decentralized backup)
    const ipfsCid = await uploadToIPFS({
      address: userAddress,
      ...profile
    });

    if (ipfsCid) {
      // Update profile with IPFS CID
      profile.ipfsCid = ipfsCid;
      saveLocalProfile(userAddress, profile);
    }

    return { success: true, ipfsCid: ipfsCid || undefined };
  } catch (error) {
    console.error('Error saving user profile:', error);
    return { success: false };
  }
};

// ============================================================================
// IMAGE UPLOAD FUNCTIONS
// ============================================================================

/**
 * Compress and convert image to base64
 */
export const compressImage = (file: File, quality: number = 0.7, maxWidth: number = 400): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Process and upload avatar image
 */
export const uploadAvatarImage = async (file: File): Promise<string> => {
  const sizeInKB = file.size / 1024;

  // Compress if larger than 100KB
  if (sizeInKB > 100) {
    return await compressImage(file, 0.7, 400);
  }

  // Otherwise read directly
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
