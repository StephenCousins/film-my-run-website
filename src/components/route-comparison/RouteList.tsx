'use client';

import { Trash2, Eye, EyeOff } from 'lucide-react';
import { useRouteComparison } from '@/contexts/RouteComparisonContext';
import RouteCard from './RouteCard';
import FileDropZone from './FileDropZone';

export default function RouteList() {
  const {
    routes,
    selectedRouteIds,
    selectAllRoutes,
    deselectAllRoutes,
    clearRoutes,
  } = useRouteComparison();

  const allSelected = routes.length > 0 && selectedRouteIds.length === routes.length;
  const noneSelected = selectedRouteIds.length === 0;

  if (routes.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="font-display font-semibold text-zinc-900 dark:text-white">
            Routes
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Add GPX or FIT files to compare
          </p>
        </div>
        <div className="flex-1 p-4">
          <FileDropZone />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-zinc-900 dark:text-white">
            Routes ({routes.length})
          </h2>
          <button
            onClick={clearRoutes}
            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            title="Clear all routes"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? deselectAllRoutes : selectAllRoutes}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-colors"
          >
            {allSelected ? (
              <>
                <EyeOff className="w-3 h-3" />
                Hide All
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                Show All
              </>
            )}
          </button>
          <span className="text-xs text-zinc-400">
            {selectedRouteIds.length} visible
          </span>
        </div>
      </div>

      {/* Route list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {routes.map((route) => (
          <RouteCard key={route.id} route={route} />
        ))}
      </div>

      {/* Add more files */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-700">
        <FileDropZone compact />
      </div>
    </div>
  );
}
