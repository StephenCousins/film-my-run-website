'use client';

import { useEffect, useState } from 'react';
import type { RouteData } from '@/lib/route-comparison/types';

interface RouteMapProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}

export default function RouteMap({ routes, selectedRouteIds, referenceRouteId }: RouteMapProps) {
  const [MapComponent, setMapComponent] = useState<React.FC<RouteMapProps> | null>(null);

  useEffect(() => {
    import('./RouteMapClient').then((mod) => {
      setMapComponent(() => mod.RouteMapClient);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="h-full bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
        <div className="text-zinc-500 text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <MapComponent
      routes={routes}
      selectedRouteIds={selectedRouteIds}
      referenceRouteId={referenceRouteId}
    />
  );
}
