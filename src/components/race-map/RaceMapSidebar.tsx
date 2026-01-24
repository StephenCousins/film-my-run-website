'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, X, ExternalLink, Play, FileText } from 'lucide-react';
import type { Race, Filters, Progress } from '@/lib/race-map/types';
import { cn } from '@/lib/utils';

interface RaceMapSidebarProps {
  races: Race[];
  selectedRace: Race | null;
  onRaceSelect: (race: Race | null) => void;
  loading: boolean;
  progress: Progress | null;
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: boolean | string) => void;
}

export function RaceMapSidebar({
  races,
  selectedRace,
  onRaceSelect,
  loading,
  progress,
  filters,
  onFilterChange,
}: RaceMapSidebarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);

  const handleRaceClick = (race: Race) => {
    onRaceSelect(race);
    setDetailsExpanded(true);
  };

  const clearSelection = () => {
    onRaceSelect(null);
  };

  // Get unique years from races
  const getYears = (): string[] => {
    const years = new Set<string>();
    races.forEach((race) => {
      if (race.date) {
        const year = race.date.split('/')[2];
        if (year) years.add(year);
      }
    });
    return Array.from(years).sort().reverse();
  };

  const formatDistance = (distance: string): string => {
    if (!distance) return '';
    return `${distance} miles`;
  };

  const formatElevation = (elevation: string): string => {
    if (!elevation) return '';
    return `${elevation}m`;
  };

  return (
    <div className="w-full lg:w-[380px] h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-green-500/10 to-transparent">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">Race Map</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          <span className="text-green-500 font-semibold">{races.length}</span> races with routes
        </p>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="p-5 text-center bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
          <div className="w-10 h-10 border-3 border-zinc-300 dark:border-zinc-700 border-t-green-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Loading routes...</p>
          {progress && (
            <>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {progress.current} / {progress.total}
              </p>
            </>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          className="flex items-center justify-between w-full p-2 -m-2 rounded-lg hover:bg-green-500/10 transition-colors"
        >
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">Filters</h3>
          {filtersExpanded ? (
            <ChevronDown className="w-4 h-4 text-green-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-green-500" />
          )}
        </button>

        {filtersExpanded && (
          <div className="mt-4 space-y-3">
            <div className="flex gap-4">
              <label className="flex-1 flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.showMarathons}
                  onChange={(e) => onFilterChange('showMarathons', e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Marathons</span>
              </label>
              <label className="flex-1 flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.showUltras}
                  onChange={(e) => onFilterChange('showUltras', e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Ultras</span>
              </label>
            </div>

            <div className="flex gap-4">
              <label className="flex-1 flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.showRoad}
                  onChange={(e) => onFilterChange('showRoad', e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Road</span>
              </label>
              <label className="flex-1 flex items-center gap-2 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                <input
                  type="checkbox"
                  checked={filters.showTrail}
                  onChange={(e) => onFilterChange('showTrail', e.target.checked)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Trail</span>
              </label>
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-2">Year</label>
              <select
                value={filters.year}
                onChange={(e) => onFilterChange('year', e.target.value)}
                className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-white cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-green-500 focus:outline-none transition-colors"
              >
                <option value="all">All Years</option>
                {getYears().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Selected race details */}
      {selectedRace && (
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setDetailsExpanded(!detailsExpanded)}
              className="flex items-center gap-2"
            >
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">
                Selected Race
              </h3>
              {detailsExpanded ? (
                <ChevronDown className="w-4 h-4 text-green-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-green-500" />
              )}
            </button>
            <button
              onClick={clearSelection}
              className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {detailsExpanded && (
            <div>
              <h4 className="text-lg font-semibold text-green-500 mb-1">{selectedRace.name}</h4>
              <p className="text-sm text-zinc-500 mb-4">{selectedRace.date}</p>

              <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl p-1 mb-4">
                <div className="flex justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Distance</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                    {formatDistance(selectedRace.distance)}
                  </span>
                </div>
                <div className="flex justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Time</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                    {selectedRace.time}
                  </span>
                </div>
                <div className="flex justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Elevation</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                    {formatElevation(selectedRace.elevation)}
                  </span>
                </div>
                <div className="flex justify-between p-3 border-b border-zinc-200 dark:border-zinc-800">
                  <span className="text-sm text-zinc-500">Position</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white font-mono">
                    {selectedRace.position || '-'}
                  </span>
                </div>
                <div className="flex justify-between p-3">
                  <span className="text-sm text-zinc-500">Type</span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {selectedRace.type} • {selectedRace.terrain}
                  </span>
                </div>
              </div>

              {/* Links */}
              <div className="flex flex-wrap gap-2">
                {selectedRace.strava && (
                  <a
                    href={selectedRace.strava}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500 text-zinc-900 font-semibold text-sm rounded-lg hover:bg-green-400 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Strava
                  </a>
                )}
                {selectedRace.video && (
                  <a
                    href={selectedRace.video}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold text-sm rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Video
                  </a>
                )}
                {selectedRace.report && (
                  <a
                    href={selectedRace.report}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold text-sm rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Report
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Race list */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[300px]">
        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4 sticky top-0 bg-white dark:bg-zinc-900 py-2 border-b border-zinc-200 dark:border-zinc-800 -mt-2 -mx-4 px-4">
          All Races
        </h3>
        <div className="space-y-2">
          {races.map((race) => (
            <button
              key={race.number}
              onClick={() => handleRaceClick(race)}
              className={cn(
                'w-full p-3.5 bg-zinc-50 dark:bg-zinc-950 border rounded-xl text-left transition-all',
                selectedRace?.number === race.number
                  ? 'border-green-500 border-2 bg-green-500/10'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-green-500/50 hover:bg-green-500/5'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-zinc-900 dark:text-white text-sm flex-1 mr-3">{race.name}</span>
                <span
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-semibold uppercase',
                    race.type === 'Ultra'
                      ? 'bg-pink-500/20 text-pink-500 dark:text-pink-400'
                      : 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
                  )}
                >
                  {race.type || 'Race'}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span>{race.date}</span>
                <span>•</span>
                <span>{formatDistance(race.distance)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
