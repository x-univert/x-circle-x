import React, { useState, useEffect } from 'react';
import { getNftGifUrl } from '../config/contracts';

interface NftGifVisualProps {
  level: number;
  size?: number;
  className?: string;
  showFallback?: boolean; // Afficher le SVG en fallback si le GIF ne charge pas
  refreshKey?: number; // Cle pour forcer le rechargement de l'image
}

// Noms des raretés par niveau
const RARITY_NAMES: { [key: number]: string } = {
  0: 'Genesis',
  1: 'Common',
  2: 'Common',
  3: 'Uncommon',
  4: 'Uncommon',
  5: 'Rare',
  6: 'Rare',
  7: 'Epic',
  8: 'Epic',
  9: 'Legendary',
  10: 'Legendary',
  11: 'Mythic',
  12: 'Transcendent',
};

// Couleurs par niveau pour le badge
const RARITY_COLORS: { [key: number]: string } = {
  0: 'from-yellow-500 to-orange-500',   // Genesis - Gold
  1: 'from-gray-400 to-gray-500',       // Common
  2: 'from-gray-400 to-gray-500',       // Common
  3: 'from-green-400 to-green-600',     // Uncommon
  4: 'from-green-400 to-green-600',     // Uncommon
  5: 'from-blue-400 to-blue-600',       // Rare
  6: 'from-blue-400 to-blue-600',       // Rare
  7: 'from-purple-400 to-purple-600',   // Epic
  8: 'from-purple-400 to-purple-600',   // Epic
  9: 'from-orange-400 to-orange-600',   // Legendary
  10: 'from-orange-400 to-orange-600',  // Legendary
  11: 'from-pink-400 to-pink-600',      // Mythic
  12: 'from-yellow-300 to-yellow-500',  // Transcendent - Bright Gold
};

export const NftGifVisual: React.FC<NftGifVisualProps> = ({
  level,
  size = 300,
  className = '',
  showFallback = true,
  refreshKey = 0,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset states quand le niveau ou refreshKey change
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [level, refreshKey]);

  // URL du GIF sans cache-buster (IPFS est content-addressed, pas besoin de cache-buster)
  const gifUrl = getNftGifUrl(level);
  const rarityName = RARITY_NAMES[level] || 'Unknown';
  const rarityColor = RARITY_COLORS[level] || 'from-gray-400 to-gray-500';

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Loading placeholder */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2 animate-pulse">✨</div>
            <div className="text-gray-400 text-sm">Loading NFT...</div>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {imageError && showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/30 to-purple-900/30 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🎨</div>
            <div className="text-gray-400 text-sm">Level {level}</div>
            <div className={`text-transparent bg-clip-text bg-gradient-to-r ${rarityColor} font-bold`}>
              {rarityName}
            </div>
          </div>
        </div>
      )}

      {/* GIF Image */}
      <img
        key={`nft-gif-${level}-${refreshKey}`}
        src={gifUrl}
        alt={`XCIRCLEX NFT Level ${level} - ${rarityName}`}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />

      {/* Level badge overlay */}
      {imageLoaded && (
        <div className="absolute top-2 right-2">
          <div className={`bg-gradient-to-r ${rarityColor} text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg`}>
            Lvl {level}
          </div>
        </div>
      )}

      {/* Rarity name overlay */}
      {imageLoaded && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className={`text-transparent bg-clip-text bg-gradient-to-r ${rarityColor} font-bold text-sm`}>
            {rarityName}
          </div>
        </div>
      )}
    </div>
  );
};

export default NftGifVisual;
