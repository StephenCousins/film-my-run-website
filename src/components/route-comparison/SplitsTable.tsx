'use client';

import { useMemo } from 'react';
import { RouteData, Split } from '@/lib/route-comparison/types';
import { calculateSplits } from '@/lib/route-comparison/analysis';
import {
  formatSplitPace,
  formatSplitTime,
  formatSplitElevation,
  formatSplitHR,
  formatSplitGap,
  getPaceColor,
} from '@/lib/route-comparison/formatting';

interface SplitsTableProps {
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
}

export default function SplitsTable({ routes, selectedRouteIds, referenceRouteId }: SplitsTableProps) {
  const visibleRoutes = routes.filter((r) => selectedRouteIds.includes(r.id));

  const routeSplits = useMemo(() => {
    const map = new Map<string, Split[]>();
    for (const route of visibleRoutes) {
      map.set(route.id, calculateSplits(route, 1.0));
    }
    return map;
  }, [visibleRoutes]);

  const referenceRoute = visibleRoutes.find((r) => r.id === referenceRouteId);
  const referenceSplits = referenceRoute ? routeSplits.get(referenceRoute.id) || [] : [];
  const maxSplitCount = Math.max(...Array.from(routeSplits.values()).map((s) => s.length), 0);

  // Calculate pace range for color coding
  const allPaces = Array.from(routeSplits.values())
    .flat()
    .map((s) => s.pace)
    .filter((p): p is number => p !== null && p > 0 && p < 20);
  const minPace = allPaces.length > 0 ? Math.min(...allPaces) : 4;
  const maxPace = allPaces.length > 0 ? Math.max(...allPaces) : 8;

  if (visibleRoutes.length === 0 || maxSplitCount === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-zinc-500 text-sm">No splits data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800 sticky top-0">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider w-12">
              km
            </th>
            {visibleRoutes.map((route) => (
              <th
                key={route.id}
                className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider"
                colSpan={referenceRoute && route.id !== referenceRouteId ? 2 : 1}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: route.color }}
                  />
                  <span className="truncate max-w-[100px]" style={{ color: route.color }}>
                    {route.displayName}
                  </span>
                </div>
              </th>
            ))}
          </tr>
          <tr className="border-t border-zinc-200 dark:border-zinc-700">
            <th className="px-3 py-1 text-left text-xs text-zinc-400" />
            {visibleRoutes.map((route) => (
              referenceRoute && route.id !== referenceRouteId ? (
                <th key={`${route.id}-sub`} className="px-3 py-1 text-right text-xs text-zinc-400" colSpan={2}>
                  <div className="flex justify-end gap-4">
                    <span>Pace</span>
                    <span>Gap</span>
                  </div>
                </th>
              ) : (
                <th key={`${route.id}-sub`} className="px-3 py-1 text-right text-xs text-zinc-400">
                  Pace
                </th>
              )
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {Array.from({ length: maxSplitCount }, (_, splitIdx) => {
            const refSplit = referenceSplits[splitIdx];

            return (
              <tr key={splitIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                  {splitIdx + 1}
                </td>
                {visibleRoutes.map((route) => {
                  const splits = routeSplits.get(route.id) || [];
                  const split = splits[splitIdx];
                  if (!split) {
                    return referenceRoute && route.id !== referenceRouteId ? (
                      <td key={route.id} colSpan={2} className="px-3 py-1.5 text-right text-zinc-400 text-xs">—</td>
                    ) : (
                      <td key={route.id} className="px-3 py-1.5 text-right text-zinc-400 text-xs">—</td>
                    );
                  }

                  const paceColor = getPaceColor(split.pace, minPace, maxPace);

                  if (referenceRoute && route.id !== referenceRouteId) {
                    // Show pace + gap vs reference
                    const gap = split.duration !== null && refSplit?.duration !== null
                      ? (split.duration ?? 0) - (refSplit?.duration ?? 0)
                      : null;

                    return (
                      <td key={route.id} colSpan={2} className="px-3 py-1.5">
                        <div className="flex justify-end gap-4 text-xs font-mono">
                          <span style={{ color: paceColor }}>
                            {formatSplitPace(split.pace)}
                          </span>
                          <span className={
                            gap !== null
                              ? gap > 0
                                ? 'text-red-500'
                                : gap < 0
                                  ? 'text-green-500'
                                  : 'text-zinc-400'
                              : 'text-zinc-400'
                          }>
                            {formatSplitGap(gap)}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={route.id} className="px-3 py-1.5 text-right text-xs font-mono" style={{ color: paceColor }}>
                      {formatSplitPace(split.pace)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
