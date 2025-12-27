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
 * Hook pour récupérer le herotag et l'URL de profil de n'importe quelle adresse
 * @param address - Adresse wallet à vérifier (optionnel)
 */
export const useGetHerotag = (address?: string) => {
  const [profileUrl, setProfileUrl] = useState('');
  const [herotag, setHerotag] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) {
      return;
    }

    const fetchUserProfileUrl = async () => {
      setLoading(true);
      const data = await getUserProfileData(address);
      setProfileUrl(data?.profile?.url);
      setHerotag(data?.herotag);
      setLoading(false);
    };

    fetchUserProfileUrl();
  }, [address]);

  return { herotag, profileUrl, loading };
};
