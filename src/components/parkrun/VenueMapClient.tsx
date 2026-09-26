'use client';

import { useCallback, useEffect, useState } from 'react';
import { GoogleMap, InfoWindow, Marker, useJsApiLoader } from '@react-google-maps/api';
import { config, darkMapStyle } from '@/lib/race-map/config';
import { useTheme } from '@/contexts/ThemeContext';
import type { VenueCoordinate } from '@/lib/parkrun-types';

// Google Maps since 26 Sep 2026: Carto's free basemap now watermarks its tiles
// "API KEY REQUIRED" (the route-comparison map moved for the same reason). Same
// loader id and key as the race map and route comparison, so one script loads.

interface VenueMapClientProps {
  venues: VenueCoordinate[];
}

const containerStyle = { width: '100%', height: '100%' };
const UK_CENTRE = { lat: 53.5, lng: -2 };

// Colour by visit count.
const markerColour = (visits: number): string => {
  if (visits >= 50) return '#22c55e'; // Green - home venue
  if (visits >= 10) return '#3b82f6'; // Blue - frequent
  if (visits >= 5) return '#8b5cf6'; // Purple - regular
  if (visits > 1) return '#f59e0b'; // Amber - visited multiple
  return '#ef4444'; // Red - single visit
};

// Size by visit count (radius in px, as the Leaflet circles were).
const markerRadius = (visits: number): number => {
  if (visits >= 50) return 12;
  if (visits >= 10) return 10;
  if (visits >= 5) return 8;
  return 6;
};

export function VenueMapClient({ venues }: VenueMapClientProps) {
  const { resolvedTheme } = useTheme();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: config.googleMapsApiKey,
  });
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [open, setOpen] = useState<VenueCoordinate | null>(null);

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  // Fit every venue on screen; one venue gets a sensible zoom rather than street level.
  useEffect(() => {
    if (!map || venues.length === 0) return;
    if (venues.length === 1) {
      map.setCenter({ lat: venues[0].latitude, lng: venues[0].longitude });
      map.setZoom(11);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    venues.forEach((v) => bounds.extend({ lat: v.latitude, lng: v.longitude }));
    map.fitBounds(bounds, 40);
  }, [map, venues]);

  const frame = 'relative h-[400px] rounded-xl overflow-hidden border border-border';

  if (loadError || !isLoaded) {
    return (
      <div className={`${frame} bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center`}>
        <p className="text-zinc-500 text-sm">{loadError ? 'Map failed to load' : 'Loading map...'}</p>
      </div>
    );
  }

  return (
    <div className={frame}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={UK_CENTRE}
        zoom={6}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => setOpen(null)}
        options={{
          styles: resolvedTheme === 'dark' ? darkMapStyle : undefined,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {venues.map((venue) => (
          <Marker
            key={venue.event}
            position={{ lat: venue.latitude, lng: venue.longitude }}
            title={venue.event}
            onClick={() => setOpen(venue)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: markerRadius(venue.visit_count),
              fillColor: markerColour(venue.visit_count),
              fillOpacity: 0.85,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
          />
        ))}
        {open && (
          <InfoWindow position={{ lat: open.latitude, lng: open.longitude }} onCloseClick={() => setOpen(null)}>
            <div className="text-sm">
              <p className="font-bold text-gray-900">{open.event}</p>
              <p className="text-gray-600">
                {open.visit_count} visit{open.visit_count !== 1 ? 's' : ''}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-surface/90 backdrop-blur-sm rounded-lg p-3 border border-border z-10">
        <p className="text-xs text-muted mb-2 font-medium">Visit frequency</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-secondary">50+ visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-secondary">10-49 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-secondary">5-9 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-secondary">2-4 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-secondary">1 visit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
