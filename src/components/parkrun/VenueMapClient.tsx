'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { VenueCoordinate } from '@/lib/parkrun-types';

interface VenueMapClientProps {
  venues: VenueCoordinate[];
}

export function VenueMapClient({ venues }: VenueMapClientProps) {
  // Center map on UK if no venues, otherwise calculate center
  const center = venues.length > 0
    ? {
        lat: venues.reduce((sum, v) => sum + v.latitude, 0) / venues.length,
        lng: venues.reduce((sum, v) => sum + v.longitude, 0) / venues.length,
      }
    : { lat: 53.5, lng: -2 }; // UK center

  // Color based on visit count
  const getMarkerColor = (visitCount: number): string => {
    if (visitCount >= 50) return '#22c55e'; // Green - home venue
    if (visitCount >= 10) return '#3b82f6'; // Blue - frequent
    if (visitCount >= 5) return '#8b5cf6';  // Purple - regular
    if (visitCount > 1) return '#f59e0b';   // Amber - visited multiple
    return '#ef4444';                        // Red - single visit
  };

  // Size based on visit count
  const getMarkerRadius = (visitCount: number): number => {
    if (visitCount >= 50) return 12;
    if (visitCount >= 10) return 10;
    if (visitCount >= 5) return 8;
    return 6;
  };

  return (
    <div className="h-[400px] rounded-xl overflow-hidden border border-zinc-800">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {venues.map((venue) => (
          <CircleMarker
            key={venue.event}
            center={[venue.latitude, venue.longitude]}
            radius={getMarkerRadius(venue.visit_count)}
            pathOptions={{
              fillColor: getMarkerColor(venue.visit_count),
              fillOpacity: 0.8,
              color: '#fff',
              weight: 2,
            }}
          >
            <Popup className="parkrun-popup">
              <div className="text-sm">
                <p className="font-bold text-gray-900">{venue.event}</p>
                <p className="text-gray-600">{venue.visit_count} visit{venue.visit_count !== 1 ? 's' : ''}</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-zinc-900/90 backdrop-blur-sm rounded-lg p-3 border border-zinc-700 z-[1000]">
        <p className="text-xs text-zinc-400 mb-2 font-medium">Visit frequency</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-zinc-300">50+ visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-zinc-300">10-49 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-xs text-zinc-300">5-9 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs text-zinc-300">2-4 visits</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-zinc-300">1 visit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
