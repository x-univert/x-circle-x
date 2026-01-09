import axios from 'axios';
import { useEffect, useState } from 'react';
import { ID_API_URL, USERS_API_URL } from 'config';

const getUserProfileData = async (address?: string) => {
  if (!address) {
    return;
  }

  try {
    const { data } = await axios.get(`${USERS_API_URL}${address}`, {
      baseURL: ID_API_URL
    });

    return data;
  } catch (err) {
    console.error('Unable to fetch profile url');
  }
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
      // profile can be { url: "..." } or just a string
      const profilePic = typeof data?.profile === 'object' ? data?.profile?.url : data?.profile;
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
