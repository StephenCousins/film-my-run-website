'use client';

import { useEffect, useState } from 'react';
import type { VenueCoordinate } from '@/lib/parkrun-types';

interface VenueMapProps {
  venues: VenueCoordinate[];
}

// Dynamic import for Leaflet (client-side only)
export function VenueMap({ venues }: VenueMapProps) {
  const [MapComponent, setMapComponent] = useState<React.FC<{ venues: VenueCoordinate[] }> | null>(null);

  useEffect(() => {
    // Dynamically import the map component client-side only
    import('./VenueMapClient').then((mod) => {
      setMapComponent(() => mod.VenueMapClient);
    });
  }, []);

  if (!MapComponent) {
    return (
      <div className="h-[400px] bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center">
        <div className="text-zinc-500">Loading map...</div>
      </div>
    );
  }

  return <MapComponent venues={venues} />;
}
