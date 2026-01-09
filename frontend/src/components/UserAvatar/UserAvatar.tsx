import { useState, useEffect } from 'react';
import { useGetAccount } from 'lib';
import { useUserProfile } from 'hooks/useUserProfile';
import { useGetHerotag } from 'hooks/useGetHerotag';
import { getLocalProfile, ExtendedUserProfile } from '../../services/profileService';

interface UserAvatarProps {
  address?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showHerotag?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl'
};

/**
 * Composant Avatar utilisateur
 * Affiche l'image de profil ou les initiales + herotag optionnel
 */
export const UserAvatar = ({
  address: propAddress,
  size = 'md',
  showHerotag = false,
  className = ''
}: UserAvatarProps) => {
  const { address: connectedAddress } = useGetAccount();
  const address = propAddress || connectedAddress;

  const { profile: oldProfile } = useUserProfile(address);
  const { herotag, profileUrl } = useGetHerotag(address);
  const [extendedProfile, setExtendedProfile] = useState<ExtendedUserProfile | null>(null);

  // Charger le profil etendu depuis le nouveau systeme
  useEffect(() => {
    if (address) {
      const profile = getLocalProfile(address);
      setExtendedProfile(profile);
    }
  }, [address]);

  // Obtenir l'URL de l'avatar (nouveau systeme prioritaire)
  const getAvatarUrl = (): string | undefined => {
    // Nouveau systeme de profil (NFT ou upload)
    if (extendedProfile?.avatarUrl && (extendedProfile.avatarType === 'upload' || extendedProfile.avatarType === 'nft')) {
      return extendedProfile.avatarUrl;
    }
    // Ancien systeme de profil
    if (oldProfile?.profileImage) {
      return oldProfile.profileImage;
    }
    // Fallback: xPortal profile picture
    if (profileUrl) {
      return profileUrl;
    }
    return undefined;
  };

  // Generer les initiales a partir du nom ou de l'adresse
  const getInitials = () => {
    if (extendedProfile?.displayName) {
      const parts = extendedProfile.displayName.trim().split(' ');
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return extendedProfile.displayName.substring(0, 2).toUpperCase();
    }
    if (oldProfile?.firstName && oldProfile?.lastName) {
      return `${oldProfile.firstName[0]}${oldProfile.lastName[0]}`.toUpperCase();
    }
    if (address) {
      return address.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Generer une couleur basee sur l'adresse
  const getColorFromAddress = (addr: string | undefined) => {
    if (!addr) return 'bg-gray-500';

    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500'
    ];

    const hash = addr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const avatarUrl = getAvatarUrl();
  const displayName = showHerotag && herotag ? `@${herotag}` : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar */}
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white ${avatarUrl ? '' : getColorFromAddress(address)}`}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials()}</span>
        )}
      </div>

      {/* Herotag */}
      {showHerotag && displayName && (
        <span className="text-sm font-medium text-primary">
          {displayName}
        </span>
      )}
    </div>
  );
};
