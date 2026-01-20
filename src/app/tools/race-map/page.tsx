'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { RaceMapView } from '@/components/race-map/RaceMapView';
import { RaceMapSidebar } from '@/components/race-map/RaceMapSidebar';
import { extractActivityId, extractYear } from '@/lib/race-map/mapUtils';
import type { Race, Routes, Filters, Progress } from '@/lib/race-map/types';

export default function RaceMapPage() {
  const [races, setRaces] = useState<Race[]>([]);
  const [routes, setRoutes] = useState<Routes>({});
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [filters, setFilters] = useState<Filters>({
    showMarathons: true,
    showUltras: true,
    showRoad: true,
    showTrail: true,
    year: 'all',
  });

  // Fetch data on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cached JSON files first
        let racesData: Race[] = [];
        let routesData: Routes = {};

        // Try cached races
        try {
          const racesResponse = await fetch('/races-data.json');
          if (racesResponse.ok) {
            const racesCache = await racesResponse.json();
            racesData = racesCache.races || [];
          }
        } catch {
          // Cache not found
        }

        // Try cached routes
        try {
          const routesResponse = await fetch('/routes-data.json');
          if (routesResponse.ok) {
            const routesCache = await routesResponse.json();
            routesData = routesCache.routes || {};
          }
        } catch {
          // Cache not found
        }

        // If no cached data, fetch from API
        if (racesData.length === 0) {
          const apiResponse = await fetch('/api/race-map');
          const apiData = await apiResponse.json();

          if (!apiData.ok) {
            throw new Error(apiData.error || 'Failed to fetch race data');
          }

          racesData = apiData.races || [];
          routesData = apiData.routes || {};
        }

        setRaces(racesData);
        setRoutes(routesData);
      } catch (err) {
        console.error('Error loading race map data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Apply filters to races
  const filteredRaces = useMemo(() => {
    return races.filter((race) => {
      // Type filters
      if (race.type === 'Marathon' && !filters.showMarathons) return false;
      if (race.type === 'Ultra' && !filters.showUltras) return false;

      // Terrain filters
      if (race.terrain === 'Road' && !filters.showRoad) return false;
      if (race.terrain === 'Trail' && !filters.showTrail) return false;

      // Year filter
      if (filters.year !== 'all') {
        const raceYear = extractYear(race.date);
        if (raceYear !== filters.year) return false;
      }

      return true;
    });
  }, [races, filters]);

  // Filter routes to match filtered races
  const filteredRoutes = useMemo(() => {
    const result: Routes = {};
    filteredRaces.forEach((race) => {
      const activityId = extractActivityId(race.strava);
      if (activityId && routes[activityId]) {
        result[activityId] = routes[activityId];
      }
    });
    return result;
  }, [filteredRaces, routes]);

  const handleFilterChange = (key: keyof Filters, value: boolean | string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleRaceSelect = (race: Race | null) => {
    setSelectedRace(race);
  };

  // Error state
  if (error && races.length === 0) {
    return (
      <>
        <Header />
        <main className="pt-20 lg:pt-24 min-h-screen bg-zinc-950">
          <div className="container py-20">
            <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Unable to load race data</h2>
              <p className="text-zinc-400 mb-6">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="pt-16 lg:pt-20 min-h-screen bg-zinc-950">
        <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)]">
          {/* Sidebar */}
          <RaceMapSidebar
            races={filteredRaces}
            selectedRace={selectedRace}
            onRaceSelect={handleRaceSelect}
            loading={loading}
            progress={progress}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* Map */}
          <div className="flex-1 relative">
            <RaceMapView
              races={filteredRaces}
              routes={filteredRoutes}
              selectedRace={selectedRace}
              onRaceSelect={handleRaceSelect}
            />
          </div>
        </div>
      </main>
    </>
  );
}
