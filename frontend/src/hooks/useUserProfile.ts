import { useState, useEffect } from 'react';

export interface UserProfile {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  profession: string;
  bio: string;
  profileImage: string;
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'France',
  profession: '',
  bio: '',
  profileImage: ''
};

export const useUserProfile = (walletAddress: string | null) => {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger le profil depuis localStorage
  useEffect(() => {
    if (walletAddress) {
      const storageKey = `democratix_profile_${walletAddress}`;
      const savedProfile = localStorage.getItem(storageKey);
      if (savedProfile) {
        try {
          setProfile(JSON.parse(savedProfile));
        } catch (err) {
          console.error('Error loading profile:', err);
        }
      }
    }
  }, [walletAddress]);

  // Sauvegarder le profil
  const saveProfile = (updatedProfile: UserProfile) => {
    if (walletAddress) {
      setLoading(true);
      const storageKey = `democratix_profile_${walletAddress}`;

      try {
        // Vérifier la taille avant de sauvegarder
        const profileString = JSON.stringify(updatedProfile);
        const sizeInBytes = new Blob([profileString]).size;
        const sizeInKB = sizeInBytes / 1024;
        const sizeInMB = sizeInKB / 1024;

        console.log(`📦 Taille du profil: ${sizeInKB.toFixed(2)} KB (${sizeInMB.toFixed(2)} MB)`);

        // Si > 2 MB, l'image est trop grande
        if (sizeInMB > 2) {
          alert('L\'image de profil est trop volumineuse. Veuillez choisir une image plus petite (< 500 KB recommandé).');
          setLoading(false);
          return;
        }

        localStorage.setItem(storageKey, profileString);
        setProfile(updatedProfile);
        setIsEditing(false);
        console.log('✅ Profil sauvegardé avec succès');
      } catch (err) {
        console.error('❌ Erreur lors de la sauvegarde du profil:', err);
        if (err instanceof DOMException && err.name === 'QuotaExceededError') {
          alert('Espace de stockage insuffisant. L\'image de profil est probablement trop volumineuse. Veuillez choisir une image plus petite (< 500 KB).');
        } else {
          alert('Erreur lors de la sauvegarde du profil. Veuillez réessayer.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Uploader une image de profil avec compression
  const uploadProfileImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Vérifier la taille du fichier
      const sizeInKB = file.size / 1024;
      console.log(`📷 Taille originale de l'image: ${sizeInKB.toFixed(2)} KB`);

      // Si le fichier est trop gros, on doit le compresser
      if (sizeInKB > 500) {
        console.log('🔄 Compression de l\'image...');
        compressImage(file, 0.7, 800).then(resolve).catch(reject);
      } else {
        // Sinon on le lit normalement
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    });
  };

  // Fonction de compression d'image
  const compressImage = (file: File, quality: number, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionner si nécessaire
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir en JPEG avec compression
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          const compressedSizeKB = (compressedDataUrl.length * 0.75) / 1024;
          console.log(`✅ Image compressée: ${compressedSizeKB.toFixed(2)} KB`);

          resolve(compressedDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    profile,
    setProfile,
    saveProfile,
    uploadProfileImage,
    isEditing,
    setIsEditing,
    loading
  };
};
