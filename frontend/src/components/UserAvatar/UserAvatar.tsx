import { useGetAccount } from 'lib';
import { useUserProfile } from 'hooks/useUserProfile';
import { useGetHerotag } from 'hooks/useGetHerotag';

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

  const { profile } = useUserProfile(address);
  const { herotag } = useGetHerotag(address);

  // Générer les initiales à partir du prénom/nom ou de l'adresse
  const getInitials = () => {
    if (profile.firstName && profile.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
    }
    if (address) {
      return address.substring(0, 2).toUpperCase();
    }
    return '??';
  };

  // Générer une couleur basée sur l'adresse
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

  const displayName = showHerotag && herotag ? `@${herotag}` : null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar */}
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold text-white ${profile.profileImage ? '' : getColorFromAddress(address)}`}>
        {profile.profileImage ? (
          <img
            src={profile.profileImage}
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
