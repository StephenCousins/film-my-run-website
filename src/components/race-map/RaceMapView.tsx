'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Polyline } from '@react-google-maps/api';
import { config, darkMapStyle } from '@/lib/race-map/config';
import {
  extractActivityId,
  calculateBounds,
  calculateRouteBounds,
  hslToHex,
  ANIMATION_CONFIG,
} from '@/lib/race-map/mapUtils';
import type { Race, Routes } from '@/lib/race-map/types';

const containerStyle = {
  width: '100%',
  height: '100%',
};

interface RaceMapViewProps {
  races: Race[];
  routes: Routes;
  selectedRace: Race | null;
  onRaceSelect: (race: Race | null) => void;
}

export function RaceMapView({ races, routes, selectedRace, onRaceSelect }: RaceMapViewProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: config.googleMapsApiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [glowHue, setGlowHue] = useState(0);

  const onLoad = useCallback(
    (mapInstance: google.maps.Map) => {
      setMap(mapInstance);
      const bounds = calculateBounds(routes);
      if (bounds) {
        mapInstance.fitBounds(bounds);
      }
    },
    [routes]
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Zoom to selected race when it changes
  useEffect(() => {
    if (!map || !selectedRace || !routes) return;

    const activityId = extractActivityId(selectedRace.strava);
    if (!activityId) return;

    const routeData = routes[activityId];
    // Handle both formats: direct array or object with coordinates property
    const coordinates = Array.isArray(routeData) ? routeData : routeData?.coordinates;
    const bounds = calculateRouteBounds(coordinates);

    let timeoutId: NodeJS.Timeout | null = null;

    if (bounds) {
      map.fitBounds(bounds);
      timeoutId = setTimeout(() => {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom > ANIMATION_CONFIG.MAX_ZOOM_LEVEL) {
          map.setZoom(ANIMATION_CONFIG.MAX_ZOOM_LEVEL);
        }
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [selectedRace, map, routes]);

  // Animate rainbow effect for selected route
  useEffect(() => {
    if (!selectedRace) return;

    const intervalId = setInterval(() => {
      setGlowHue((prev) => (prev + 1) % 360);
    }, ANIMATION_CONFIG.ANIMATION_INTERVAL);

    return () => clearInterval(intervalId);
  }, [selectedRace]);

  const resetZoom = useCallback(() => {
    const bounds = calculateBounds(routes);
    if (map && bounds) {
      map.fitBounds(bounds);
    }
  }, [map, routes]);

  const getRouteColor = (race: Race): string => {
    if (race.type === 'Ultra') {
      return '#f472b6'; // Pink for ultras
    }
    return '#60a5fa'; // Blue for marathons
  };

  const handleRouteClick = (activityId: string) => {
    const race = races.find((r) => extractActivityId(r.strava) === activityId);
    if (race && onRaceSelect) {
      onRaceSelect(race);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={config.map.defaultCenter}
      zoom={config.map.defaultZoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: true,
        styles: darkMapStyle,
      }}
    >
      {/* Reset zoom button */}
      {selectedRace && (
        <button
          onClick={resetZoom}
          className="absolute top-3 right-3 px-4 py-2 bg-zinc-800 border-2 border-orange-500 rounded-lg text-orange-500 font-semibold text-sm hover:bg-orange-500 hover:text-white transition-colors z-10"
        >
          🗺️ View All Routes
        </button>
      )}

      {/* Render all race routes */}
      {races &&
        routes &&
        races.map((race) => {
          const activityId = extractActivityId(race.strava);
          if (!activityId) return null;

          const routeData = routes[activityId];
          // Handle both formats: direct array or object with coordinates property
          const coordinates = Array.isArray(routeData) ? routeData : routeData?.coordinates;
          if (!coordinates || coordinates.length === 0) return null;

          const isSelected = selectedRace && extractActivityId(selectedRace.strava) === activityId;

          return (
            <React.Fragment key={activityId}>
              {/* Base route line */}
              <Polyline
                path={coordinates}
                options={{
                  strokeColor: isSelected ? '#667eea' : getRouteColor(race),
                  strokeOpacity: isSelected ? 0.3 : 0.6,
                  strokeWeight: 3,
                  zIndex: isSelected ? 999 : 1,
                  clickable: true,
                }}
                onClick={() => handleRouteClick(activityId)}
              />

              {/* Animated rainbow gradient effect for selected route */}
              {isSelected && (
                <>
                  {(() => {
                    const { NUM_SEGMENTS, STROKE_WEIGHT, STROKE_OPACITY } = ANIMATION_CONFIG;
                    const segmentLength = coordinates.length / NUM_SEGMENTS;
                    const rainbowSegments = [];

                    for (let i = 0; i < NUM_SEGMENTS; i++) {
                      const positionFactor = (i / NUM_SEGMENTS) * 360;
                      const hue = (glowHue - positionFactor + 360) % 360;
                      const color = hslToHex(hue, 100, 50);

                      const startIdx = Math.floor(i * segmentLength);
                      const endIdx = Math.floor((i + 1) * segmentLength);
                      const segmentCoords = coordinates.slice(startIdx, endIdx + 1);

                      if (segmentCoords.length > 1) {
                        rainbowSegments.push(
                          <Polyline
                            key={`rainbow-segment-${i}`}
                            path={segmentCoords}
                            options={{
                              strokeColor: color,
                              strokeOpacity: STROKE_OPACITY,
                              strokeWeight: STROKE_WEIGHT,
                              zIndex: 1001,
                              clickable: true,
                            }}
                            onClick={() => handleRouteClick(activityId)}
                          />
                        );
                      }
                    }

                    return rainbowSegments;
                  })()}
                </>
              )}
            </React.Fragment>
          );
        })}
    </GoogleMap>
  );
}
