'use client';

import { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Star,
  MapPin,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouteComparison } from '@/contexts/RouteComparisonContext';
import { RouteData, formatDistance, formatDuration, formatElevation } from '@/lib/route-comparison';

interface RouteCardProps {
  route: RouteData;
}

export default function RouteCard({ route }: RouteCardProps) {
  const {
    selectedRouteIds,
    referenceRouteId,
    toggleRouteSelection,
    setReferenceRoute,
    removeRoute,
  } = useRouteComparison();

  const [isExpanded, setIsExpanded] = useState(false);

  const isSelected = selectedRouteIds.includes(route.id);
  const isReference = referenceRouteId === route.id;

  return (
    <div
      className={cn(
        'rounded-lg border transition-all',
        isSelected
          ? 'border-l-4 bg-white dark:bg-zinc-800/50'
          : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/30 opacity-60',
        isReference && 'ring-2 ring-orange-500/50'
      )}
      style={{
        borderLeftColor: isSelected ? route.color : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3">
        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: route.color }}
        />

        {/* Name */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
            {route.displayName}
          </p>
          <p className="text-xs text-zinc-500 truncate">{route.filename}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Reference indicator */}
          {isReference && (
            <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded">
              REF
            </span>
          )}

          {/* Toggle visibility */}
          <button
            onClick={() => toggleRouteSelection(route.id)}
            className={cn(
              'p-1.5 rounded transition-colors',
              isSelected
                ? 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            )}
            title={isSelected ? 'Hide route' : 'Show route'}
          >
            {isSelected ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>

          {/* Set as reference */}
          <button
            onClick={() => setReferenceRoute(isReference ? null : route.id)}
            className={cn(
              'p-1.5 rounded transition-colors',
              isReference
                ? 'text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                : 'text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            )}
            title={isReference ? 'Remove as reference' : 'Set as reference'}
          >
            <Star className={cn('w-4 h-4', isReference && 'fill-current')} />
          </button>

          {/* Remove */}
          <button
            onClick={() => removeRoute(route.id)}
            className="p-1.5 rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Remove route"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="px-3 pb-2 flex items-center gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {formatDistance(route.stats.distance)}
        </span>
        {route.stats.duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(route.stats.duration)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {formatElevation(route.stats.elevationGain)}
        </span>
      </div>

      {/* Expand/collapse button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors border-t border-zinc-200 dark:border-zinc-700"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3 h-3" />
            Less
          </>
        ) : (
          <>
            <ChevronDown className="w-3 h-3" />
            More
          </>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
          <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
            <div>
              <p className="text-zinc-500">Min Elevation</p>
              <p className="text-zinc-900 dark:text-white font-medium">
                {formatElevation(route.stats.minElevation)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Max Elevation</p>
              <p className="text-zinc-900 dark:text-white font-medium">
                {formatElevation(route.stats.maxElevation)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Elev. Gain</p>
              <p className="text-zinc-900 dark:text-white font-medium">
                {formatElevation(route.stats.elevationGain)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Elev. Loss</p>
              <p className="text-zinc-900 dark:text-white font-medium">
                {formatElevation(route.stats.elevationLoss)}
              </p>
            </div>
          </div>

          {/* Data availability indicators */}
          <div className="flex flex-wrap gap-1 pt-1">
            {route.heartRates.some((hr) => hr !== null) && (
              <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded">
                HR
              </span>
            )}
            {route.cadences.some((c) => c !== null) && (
              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded">
                Cadence
              </span>
            )}
            {route.powers.some((p) => p !== null) && (
              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded">
                Power
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
