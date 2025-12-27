import React, { useEffect, useState, useMemo } from 'react';

interface NftVisualProps {
  level: number;
  cycles: number;
  size?: number;
  animated?: boolean;
  orbitSpeed?: number; // Secondes pour une rotation complete
  seed?: number; // Seed pour les motifs aleatoires (si non fourni, utilise level+cycles)
}

// Couleurs par rarete
const RARITY_COLORS = {
  0: { primary: '#9CA3AF', secondary: '#6B7280', glow: '#9CA3AF' }, // Commun - Gris
  1: { primary: '#22C55E', secondary: '#16A34A', glow: '#22C55E' }, // Peu Commun - Vert
  2: { primary: '#3B82F6', secondary: '#2563EB', glow: '#3B82F6' }, // Rare - Bleu
  3: { primary: '#A855F7', secondary: '#9333EA', glow: '#A855F7' }, // Epique - Violet
  4: { primary: '#F97316', secondary: '#EA580C', glow: '#F97316' }, // Legendaire - Orange
  5: { primary: '#EC4899', secondary: '#DB2777', glow: '#EC4899' }, // Mythique - Rose
  6: { primary: '#06B6D4', secondary: '#0891B2', glow: '#06B6D4' }, // Transcendant - Cyan
  7: { primary: '#FFD700', secondary: '#FFA500', glow: '#FFD700' }, // Cercle Parfait - Or
};

const RARITY_NAMES = [
  'Commun',
  'Peu Commun',
  'Rare',
  'Epique',
  'Legendaire',
  'Mythique',
  'Transcendant',
  'Cercle Parfait'
];

const getRarity = (level: number): number => {
  if (level === 0) return 0;
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 6) return 3;
  if (level <= 8) return 4;
  if (level <= 10) return 5;
  if (level === 11) return 6;
  return 7;
};

// Generateur de nombres pseudo-aleatoires base sur un seed
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Generer les motifs d'arriere-plan bases sur le seed
const generateBackgroundPatterns = (seed: number, size: number, rarity: number) => {
  const patterns: Array<{ type: string; x: number; y: number; r: number; opacity: number; rotation?: number }> = [];
  const numPatterns = 8 + rarity * 3; // Plus de motifs pour les raretes elevees

  for (let i = 0; i < numPatterns; i++) {
    const s = seed + i * 137;
    const type = seededRandom(s) > 0.5 ? 'circle' : 'line';
    const x = seededRandom(s + 1) * size;
    const y = seededRandom(s + 2) * size;
    const r = 2 + seededRandom(s + 3) * (6 + rarity);
    const opacity = 0.03 + seededRandom(s + 4) * 0.08;
    const rotation = seededRandom(s + 5) * 360;

    patterns.push({ type, x, y, r, opacity, rotation });
  }

  // Ajouter des lignes decoratives pour les niveaux eleves
  if (rarity >= 3) {
    for (let i = 0; i < 4 + rarity; i++) {
      const s = seed + i * 251 + 1000;
      patterns.push({
        type: 'decorLine',
        x: seededRandom(s) * size,
        y: seededRandom(s + 1) * size,
        r: 20 + seededRandom(s + 2) * 40,
        opacity: 0.05 + seededRandom(s + 3) * 0.1,
        rotation: seededRandom(s + 4) * 180,
      });
    }
  }

  return patterns;
};

export const NftVisual: React.FC<NftVisualProps> = ({
  level,
  cycles,
  size = 300,
  animated = true,
  orbitSpeed = 60, // 60 secondes pour une rotation complete
  seed
}) => {
  const [rotationAngle, setRotationAngle] = useState(0);

  // Animation de rotation orbitale
  useEffect(() => {
    if (!animated || level === 0) return;

    const startTime = Date.now();
    const duration = orbitSpeed * 1000; // Convertir en ms

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const angle = (elapsed / duration) * 360 % 360;
      setRotationAngle(angle);
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [animated, level, orbitSpeed]);

  const rarity = getRarity(level);
  const colors = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS];
  const rarityName = RARITY_NAMES[rarity];

  const centerX = size / 2;
  const centerY = size / 2;
  const mainRadius = size * 0.12;
  const orbitRadius = size * 0.32;
  const pointRadius = size * 0.035;

  // Generer les motifs d'arriere-plan (memoises pour eviter les recalculs)
  const patternSeed = seed ?? (level * 1000 + cycles);
  const backgroundPatterns = useMemo(
    () => generateBackgroundPatterns(patternSeed, size, rarity),
    [patternSeed, size, rarity]
  );

  // Calculer les positions des points orbitaux avec espacement egal sur 12 positions
  const getOrbitalPoints = () => {
    const points = [];
    for (let i = 0; i < level; i++) {
      // Repartir les points sur 12 positions fixes (comme une horloge)
      // Position 0 = en haut (12h), ensuite dans le sens horaire
      const baseAngle = (i / 12) * 2 * Math.PI - Math.PI / 2;
      // Ajouter la rotation animee
      const angle = baseAngle + (rotationAngle * Math.PI / 180);
      const x = centerX + Math.cos(angle) * orbitRadius;
      const y = centerY + Math.sin(angle) * orbitRadius;
      points.push({ x, y, index: i });
    }
    return points;
  };

  const orbitalPoints = getOrbitalPoints();

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="rounded-xl"
      >
        {/* Definitions */}
        <defs>
          {/* Glow filter */}
          <filter id={`glow-${level}-${size}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Stronger glow for high levels */}
          <filter id={`strongGlow-${level}-${size}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="10" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Radial gradient for center */}
          <radialGradient id={`centerGradient-${level}-${size}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="1"/>
            <stop offset="60%" stopColor={colors.secondary} stopOpacity="0.9"/>
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.4"/>
          </radialGradient>

          {/* Orbital point gradient */}
          <radialGradient id={`orbitalGradient-${level}-${size}`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8"/>
            <stop offset="50%" stopColor={colors.primary} stopOpacity="1"/>
            <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.8"/>
          </radialGradient>

          {/* Background gradient */}
          <radialGradient id={`bgGradient-${level}-${size}`} cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#1e1e3f" stopOpacity="1"/>
            <stop offset="100%" stopColor="#0a0a1a" stopOpacity="1"/>
          </radialGradient>
        </defs>

        {/* Background */}
        <rect width={size} height={size} fill={`url(#bgGradient-${level}-${size})`} rx="16"/>

        {/* Random Background Patterns */}
        {backgroundPatterns.map((pattern, idx) => {
          if (pattern.type === 'circle') {
            return (
              <circle
                key={`pattern-${idx}`}
                cx={pattern.x}
                cy={pattern.y}
                r={pattern.r}
                fill={colors.primary}
                opacity={pattern.opacity}
              />
            );
          } else if (pattern.type === 'line') {
            return (
              <line
                key={`pattern-${idx}`}
                x1={pattern.x}
                y1={pattern.y}
                x2={pattern.x + pattern.r * 2}
                y2={pattern.y + pattern.r}
                stroke={colors.secondary}
                strokeWidth="1"
                opacity={pattern.opacity}
                transform={`rotate(${pattern.rotation}, ${pattern.x}, ${pattern.y})`}
              />
            );
          } else if (pattern.type === 'decorLine') {
            return (
              <g key={`pattern-${idx}`} transform={`rotate(${pattern.rotation}, ${pattern.x}, ${pattern.y})`}>
                <line
                  x1={pattern.x - pattern.r / 2}
                  y1={pattern.y}
                  x2={pattern.x + pattern.r / 2}
                  y2={pattern.y}
                  stroke={colors.primary}
                  strokeWidth="0.5"
                  opacity={pattern.opacity}
                />
              </g>
            );
          }
          return null;
        })}

        {/* Outer decorative ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius + pointRadius * 2}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="1"
          opacity="0.15"
        />

        {/* Orbit path (cercle pointille) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={orbitRadius}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="1.5"
          strokeDasharray="6 6"
          opacity="0.4"
        />

        {/* Position markers for all 12 slots (cercles vides) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * 2 * Math.PI - Math.PI / 2 + (rotationAngle * Math.PI / 180);
          const x = centerX + Math.cos(angle) * orbitRadius;
          const y = centerY + Math.sin(angle) * orbitRadius;
          const isFilled = i < level;

          if (isFilled) return null; // Les positions remplies sont gerees separement

          return (
            <circle
              key={`slot-${i}`}
              cx={x}
              cy={y}
              r={pointRadius * 0.5}
              fill="none"
              stroke={colors.secondary}
              strokeWidth="1"
              opacity="0.2"
            />
          );
        })}

        {/* Orbital points (filled positions) */}
        {orbitalPoints.map((point, idx) => (
          <g key={`point-${idx}`}>
            {/* Outer glow */}
            <circle
              cx={point.x}
              cy={point.y}
              r={pointRadius * 2}
              fill={colors.glow}
              opacity="0.3"
              filter={level >= 7 ? `url(#glow-${level}-${size})` : undefined}
            />
            {/* Main point */}
            <circle
              cx={point.x}
              cy={point.y}
              r={pointRadius}
              fill={`url(#orbitalGradient-${level}-${size})`}
              stroke={colors.primary}
              strokeWidth="1"
            />
            {/* Inner highlight */}
            <circle
              cx={point.x - pointRadius * 0.3}
              cy={point.y - pointRadius * 0.3}
              r={pointRadius * 0.3}
              fill="white"
              opacity="0.5"
            />
          </g>
        ))}

        {/* Center outer glow for high levels */}
        {level >= 5 && (
          <circle
            cx={centerX}
            cy={centerY}
            r={mainRadius * 2.5}
            fill={colors.glow}
            opacity={level >= 10 ? 0.4 : 0.2}
            filter={`url(#strongGlow-${level}-${size})`}
          >
            {animated && (
              <animate
                attributeName="opacity"
                values={level >= 10 ? "0.4;0.6;0.4" : "0.2;0.35;0.2"}
                dur="2.5s"
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}

        {/* Center circle outer ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={mainRadius * 1.3}
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Center circle main */}
        <circle
          cx={centerX}
          cy={centerY}
          r={mainRadius}
          fill={`url(#centerGradient-${level}-${size})`}
          filter={level >= 7 ? `url(#glow-${level}-${size})` : undefined}
        >
          {animated && level >= 10 && (
            <animate
              attributeName="r"
              values={`${mainRadius};${mainRadius * 1.08};${mainRadius}`}
              dur="2s"
              repeatCount="indefinite"
            />
          )}
        </circle>

        {/* Inner ring for level 6+ */}
        {level >= 6 && (
          <circle
            cx={centerX}
            cy={centerY}
            r={mainRadius * 0.6}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.4"
          />
        )}

        {/* Crown rays for level 12 (Cercle Parfait) */}
        {level === 12 && (
          <>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = (i / 6) * Math.PI - Math.PI / 2;
              const x1 = centerX + Math.cos(angle) * (mainRadius * 1.4);
              const y1 = centerY + Math.sin(angle) * (mainRadius * 1.4);
              const x2 = centerX + Math.cos(angle) * (mainRadius * 2);
              const y2 = centerY + Math.sin(angle) * (mainRadius * 2);
              return (
                <line
                  key={`ray-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={colors.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity="0.8"
                  filter={`url(#glow-${level}-${size})`}
                >
                  {animated && (
                    <animate
                      attributeName="opacity"
                      values="0.8;1;0.8"
                      dur="1.5s"
                      repeatCount="indefinite"
                      begin={`${i * 0.2}s`}
                    />
                  )}
                </line>
              );
            })}
          </>
        )}

        {/* X-CIRCLE-X Logo in center */}
        <g>
          {/* Logo "X" stylise */}
          <text
            x={centerX}
            y={centerY + mainRadius * 0.25}
            textAnchor="middle"
            fill="white"
            fontSize={mainRadius * 1.2}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
          >
            X
          </text>
          {/* Petit cercle autour du X */}
          <circle
            cx={centerX}
            cy={centerY}
            r={mainRadius * 0.85}
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            opacity="0.6"
          />
        </g>

        {/* Level indicator badge */}
        <g>
          <circle
            cx={centerX + mainRadius * 1.1}
            cy={centerY - mainRadius * 0.9}
            r={mainRadius * 0.4}
            fill={colors.primary}
            stroke="white"
            strokeWidth="1.5"
          />
          <text
            x={centerX + mainRadius * 1.1}
            y={centerY - mainRadius * 0.9 + mainRadius * 0.15}
            textAnchor="middle"
            fill="white"
            fontSize={mainRadius * 0.45}
            fontWeight="bold"
            fontFamily="system-ui, sans-serif"
          >
            {level}
          </text>
        </g>

        {/* Rarity badge background */}
        <rect
          x={size * 0.08}
          y={size * 0.84}
          width={size * 0.84}
          height={size * 0.12}
          rx="6"
          fill="rgba(0,0,0,0.6)"
          stroke={colors.secondary}
          strokeWidth="1"
          opacity="0.9"
        />

        {/* Rarity text */}
        <text
          x={centerX}
          y={size * 0.915}
          textAnchor="middle"
          fill={colors.primary}
          fontSize={size * 0.038}
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
        >
          {rarityName.toUpperCase()}
        </text>

        {/* Cycles count */}
        <text
          x={centerX}
          y={size * 0.075}
          textAnchor="middle"
          fill="white"
          fontSize={size * 0.032}
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
          opacity="0.8"
        >
          {cycles} cycles
        </text>
      </svg>
    </div>
  );
};

export default NftVisual;
