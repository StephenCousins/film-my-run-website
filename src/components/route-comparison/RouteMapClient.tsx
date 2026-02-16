'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { RouteData } from '@/lib/route-comparison/types';
import { calculateMapBounds } from '@/lib/route-comparison/types';

interface RouteMapClientProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}

function FitBounds({ routes }: { routes: RouteData[] }) {
  const map = useMap();
  const prevBoundsRef = useRef<string>('');

  useEffect(() => {
    if (routes.length === 0) return;

    const bounds = calculateMapBounds(routes);
    if (!bounds) return;

    const boundsKey = `${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}`;
    if (boundsKey === prevBoundsRef.current) return;
    prevBoundsRef.current = boundsKey;

    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { padding: [20, 20], maxZoom: 16 }
    );
  }, [map, routes]);

  return null;
}

export function RouteMapClient({ routes, selectedRouteIds, referenceRouteId }: RouteMapClientProps) {
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));

  if (visibleRoutes.length === 0) {
    return (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Select routes to display on the map</p>
      </div>
    );
  }

  const center = visibleRoutes[0].coordinates[0];

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      className="z-0 rounded-lg"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      <FitBounds routes={visibleRoutes} />

      {/* Render non-reference routes first, reference on top */}
      {visibleRoutes
        .sort((a, b) => {
          if (a.id === referenceRouteId) return 1;
          if (b.id === referenceRouteId) return -1;
          return 0;
        })
        .map((route) => {
          const positions = route.coordinates.map((c) => [c.lat, c.lng] as [number, number]);
          const isRef = route.id === referenceRouteId;
          const startCoord = route.coordinates[0];

          return (
            <div key={route.id}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: route.color,
                  weight: isRef ? 4 : 3,
                  opacity: isRef ? 1 : 0.8,
                }}
              >
                <Tooltip sticky>
                  <span className="text-xs font-medium">{route.displayName}</span>
                </Tooltip>
              </Polyline>

              {/* Start marker */}
              <CircleMarker
                center={[startCoord.lat, startCoord.lng]}
                radius={6}
                pathOptions={{
                  fillColor: route.color,
                  fillOpacity: 1,
                  color: '#fff',
                  weight: 2,
                }}
              >
                <Tooltip>
                  <span className="text-xs">{route.displayName} — Start</span>
                </Tooltip>
              </CircleMarker>
            </div>
          );
        })}
    </MapContainer>
  );
}
