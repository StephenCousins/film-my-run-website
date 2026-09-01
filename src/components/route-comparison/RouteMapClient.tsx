'use client';

import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { config, darkMapStyle } from '@/lib/race-map/config';
import { useTheme } from '@/contexts/ThemeContext';
import type { RouteData } from '@/lib/route-comparison/types';
import { calculateMapBounds } from '@/lib/route-comparison/types';

interface RouteMapClientProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}

const containerStyle = { width: '100%', height: '100%' };
const MAX_FIT_ZOOM = 16;

export function RouteMapClient({ routes, selectedRouteIds, referenceRouteId }: RouteMapClientProps) {
  const { resolvedTheme } = useTheme();
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: config.googleMapsApiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const prevBoundsRef = useRef<string>('');

  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
    prevBoundsRef.current = '';
  }, []);

  // Fit the map to the visible routes whenever their combined extent changes
  useEffect(() => {
    if (!map || visibleRoutes.length === 0) return;

    const bounds = calculateMapBounds(visibleRoutes);
    if (!bounds) return;

    const boundsKey = `${bounds.north.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.west.toFixed(4)}`;
    if (boundsKey === prevBoundsRef.current) return;
    prevBoundsRef.current = boundsKey;

    map.fitBounds(
      new google.maps.LatLngBounds(
        { lat: bounds.south, lng: bounds.west },
        { lat: bounds.north, lng: bounds.east }
      ),
      20
    );

    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const zoom = map.getZoom();
      if (zoom !== undefined && zoom > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, visibleRoutes]);

  if (visibleRoutes.length === 0) {
    return (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Select routes to display on the map</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Map failed to load</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Loading map...</p>
      </div>
    );
  }

  const center = visibleRoutes[0].coordinates[0];
  const isDark = resolvedTheme === 'dark';

  // Render non-reference routes first so the reference sits on top
  const orderedRoutes = [...visibleRoutes].sort((a, b) => {
    if (a.id === referenceRouteId) return 1;
    if (b.id === referenceRouteId) return -1;
    return 0;
  });

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: center.lat, lng: center.lng }}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: true,
          fullscreenControl: false,
          styles: isDark ? darkMapStyle : [],
        }}
      >
        {orderedRoutes.map((route, index) => {
          const isRef = route.id === referenceRouteId;
          const start = route.coordinates[0];

          return (
            <Fragment key={route.id}>
              <Polyline
                path={route.coordinates.map((c) => ({ lat: c.lat, lng: c.lng }))}
                options={{
                  strokeColor: route.color,
                  strokeWeight: isRef ? 4 : 3,
                  strokeOpacity: isRef ? 1 : 0.8,
                  zIndex: index,
                }}
              />
              <Marker
                position={{ lat: start.lat, lng: start.lng }}
                title={`${route.displayName} — Start`}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 6,
                  fillColor: route.color,
                  fillOpacity: 1,
                  strokeColor: '#fff',
                  strokeWeight: 2,
                }}
                zIndex={100 + index}
              />
            </Fragment>
          );
        })}
      </GoogleMap>
    </div>
  );
}
