import React from 'react'

interface CircleSkeletonProps {
  numPeripherals?: number
}

/**
 * Skeleton loading component for the Circle of Life visualization
 * Shows animated placeholder circles while data is loading
 */
export const CircleSkeleton: React.FC<CircleSkeletonProps> = ({ numPeripherals = 6 }) => {
  // Generate positions for peripheral skeletons
  const getPosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2
    const radius = 120
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    }
  }

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto min-h-[260px]">
      <svg
        viewBox="-180 -180 360 360"
        className="w-full h-full max-h-[70vh]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Animated gradient definitions */}
        <defs>
          <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)">
              <animate attributeName="offset" values="-1;1" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="50%" stopColor="rgba(255,255,255,0.2)">
              <animate attributeName="offset" values="-0.5;1.5" dur="1.5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="rgba(255,255,255,0.1)">
              <animate attributeName="offset" values="0;2" dur="1.5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        {/* Orbit circle skeleton */}
        <circle
          cx="0"
          cy="0"
          r="120"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
          strokeDasharray="5,5"
          className="animate-pulse"
        />

        {/* Peripheral SC skeletons */}
        {Array.from({ length: numPeripherals }).map((_, index) => {
          const pos = getPosition(index, numPeripherals)
          return (
            <g key={`skeleton-${index}`}>
              {/* Line to center */}
              <line
                x1="0"
                y1="0"
                x2={pos.x * 0.7}
                y2={pos.y * 0.7}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
              />
              {/* Skeleton circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r="30"
                fill="rgba(255,255,255,0.1)"
                className="animate-pulse"
                style={{ animationDelay: `${index * 0.1}s` }}
              />
              {/* Badge skeleton */}
              <circle
                cx={pos.x + (pos.x / 120) * 38}
                cy={pos.y + (pos.y / 120) * 38}
                r="8"
                fill="rgba(255,255,255,0.05)"
                className="animate-pulse"
              />
            </g>
          )
        })}

        {/* SC0 center skeleton */}
        <g>
          {/* Outer glow rings */}
          <circle
            cx="0"
            cy="0"
            r="48"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="4"
            className="animate-pulse"
          />
          <circle
            cx="0"
            cy="0"
            r="43"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="3"
          />
          {/* Main center circle */}
          <circle
            cx="0"
            cy="0"
            r="35"
            fill="rgba(255,255,255,0.15)"
            className="animate-pulse"
          />
        </g>
      </svg>

      {/* Loading text overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-2">&#x1F300;</div>
          <p className="text-gray-400 text-sm">Chargement...</p>
        </div>
      </div>
    </div>
  )
}

export default CircleSkeleton
