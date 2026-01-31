import axios from 'axios';
import { useEffect, useState } from 'react';
import { ID_API_URL, USERS_API_URL } from 'config';

/**
 * Fetch user profile data from xPortal/MultiversX ID API
 * Can be used outside of React components
 */
export const getUserProfileData = async (address?: string) => {
  if (!address) {
    return null;
  }

  // Build the full URL
  const fullUrl = `${ID_API_URL}${USERS_API_URL}${address}`;

  try {
    const { data } = await axios.get(fullUrl);
    return data;
  } catch (err: any) {
    // Silently fail - user might not have an xPortal profile
    return null;
  }
};

/**
 * Extract profile picture URL from xPortal API response
 */
export const getProfilePictureUrl = (data: any): string | undefined => {
  if (!data) return undefined;
  // profile can be { url: "..." } or just a string
  const profilePic = typeof data?.profile === 'object' ? data?.profile?.url : data?.profile;
  return profilePic || undefined;
};

/**
 * Hook pour récupérer le herotag, l'URL de profil et la bannière de n'importe quelle adresse
 * @param address - Adresse wallet à vérifier (optionnel)
 *
 * Structure de l'API MultiversX ID:
 * {
 *   cover: string | null,        // Banner/cover image URL
 *   profile: { url: string } | null,  // Profile picture
 *   herotag: string,             // Username (e.g. "username.elrond")
 *   description: string | null,  // Bio/description
 *   socialLinks: array           // Social media links
 * }
 */
export const useGetHerotag = (address?: string) => {
  const [profileUrl, setProfileUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [herotag, setHerotag] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      return;
    }

    const fetchUserProfileUrl = async () => {
      setLoading(true);
      const data = await getUserProfileData(address);

      if (!data) {
        setLoading(false);
        return;
      }

      // Use the extracted helper function
      const profilePic = getProfilePictureUrl(data);
      // cover can be { url: "..." } or just a string
      const coverPic = typeof data?.cover === 'object' ? data?.cover?.url : data?.cover;

      setProfileUrl(profilePic || '');
      setCoverUrl(coverPic || '');
      setHerotag(data?.herotag || '');
      setDescription(data?.description || '');
      setLoading(false);
    };

    fetchUserProfileUrl();
  }, [address]);

  return { herotag, profileUrl, coverUrl, description, loading };
};
