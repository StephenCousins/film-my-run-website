'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { RouteData, getNextColor, parseFile, ROUTE_COLORS } from '@/lib/route-comparison';

interface RouteComparisonContextType {
  // State
  routes: RouteData[];
  selectedRouteIds: string[];
  referenceRouteId: string | null;
  compareMode: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  addRoute: (file: File) => Promise<void>;
  addRoutes: (files: File[]) => Promise<void>;
  removeRoute: (id: string) => void;
  clearRoutes: () => void;
  selectRoute: (id: string) => void;
  deselectRoute: (id: string) => void;
  toggleRouteSelection: (id: string) => void;
  selectAllRoutes: () => void;
  deselectAllRoutes: () => void;
  setReferenceRoute: (id: string | null) => void;
  setCompareMode: (enabled: boolean) => void;
  updateRouteColor: (id: string, color: string) => void;
  updateRouteDisplayName: (id: string, name: string) => void;
  getRouteById: (id: string) => RouteData | undefined;
}

const RouteComparisonContext = createContext<RouteComparisonContextType | undefined>(
  undefined
);

export function RouteComparisonProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [referenceRouteId, setReferenceRouteId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get used colors
  const getUsedColors = useCallback(() => {
    return routes.map((r) => r.color);
  }, [routes]);

  // Add a single route
  const addRoute = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const color = getNextColor(getUsedColors());
        const routeData = await parseFile(file, color);
        setRoutes((prev) => [...prev, routeData]);
        setSelectedRouteIds((prev) => [...prev, routeData.id]);

        // Set as reference if it's the first route
        setReferenceRouteId((prev) => (prev === null ? routeData.id : prev));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse file';
        setError(message);
        console.error('Error parsing file:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [getUsedColors]
  );

  // Add multiple routes
  const addRoutes = useCallback(
    async (files: File[]) => {
      setIsLoading(true);
      setError(null);

      const usedColors = getUsedColors();
      const newRoutes: RouteData[] = [];
      const errors: string[] = [];

      for (const file of files) {
        try {
          const color = getNextColor([...usedColors, ...newRoutes.map((r) => r.color)]);
          const routeData = await parseFile(file, color);
          newRoutes.push(routeData);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to parse file';
          errors.push(`${file.name}: ${message}`);
        }
      }

      if (newRoutes.length > 0) {
        setRoutes((prev) => [...prev, ...newRoutes]);
        setSelectedRouteIds((prev) => [...prev, ...newRoutes.map((r) => r.id)]);

        // Set first route as reference if none exists
        setReferenceRouteId((prev) => (prev === null ? newRoutes[0].id : prev));
      }

      if (errors.length > 0) {
        setError(errors.join('\n'));
      }

      setIsLoading(false);
    },
    [getUsedColors]
  );

  // Remove a route
  const removeRoute = useCallback((id: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    setSelectedRouteIds((prev) => prev.filter((rid) => rid !== id));
    setReferenceRouteId((prev) => {
      if (prev === id) {
        // Set new reference to first remaining route
        const remaining = routes.filter((r) => r.id !== id);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prev;
    });
  }, [routes]);

  // Clear all routes
  const clearRoutes = useCallback(() => {
    setRoutes([]);
    setSelectedRouteIds([]);
    setReferenceRouteId(null);
    setCompareMode(false);
    setError(null);
  }, []);

  // Selection methods
  const selectRoute = useCallback((id: string) => {
    setSelectedRouteIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  }, []);

  const deselectRoute = useCallback((id: string) => {
    setSelectedRouteIds((prev) => prev.filter((rid) => rid !== id));
  }, []);

  const toggleRouteSelection = useCallback((id: string) => {
    setSelectedRouteIds((prev) =>
      prev.includes(id)
        ? prev.filter((rid) => rid !== id)
        : [...prev, id]
    );
  }, []);

  const selectAllRoutes = useCallback(() => {
    setSelectedRouteIds(routes.map((r) => r.id));
  }, [routes]);

  const deselectAllRoutes = useCallback(() => {
    setSelectedRouteIds([]);
  }, []);

  // Reference route
  const setReference = useCallback((id: string | null) => {
    setReferenceRouteId(id);
  }, []);

  // Compare mode
  const setCompareModeValue = useCallback((enabled: boolean) => {
    setCompareMode(enabled);
  }, []);

  // Update route color
  const updateRouteColor = useCallback((id: string, color: string) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, color } : r))
    );
  }, []);

  // Update route display name
  const updateRouteDisplayName = useCallback((id: string, name: string) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, displayName: name } : r))
    );
  }, []);

  // Get route by ID
  const getRouteById = useCallback(
    (id: string) => {
      return routes.find((r) => r.id === id);
    },
    [routes]
  );

  const value: RouteComparisonContextType = {
    routes,
    selectedRouteIds,
    referenceRouteId,
    compareMode,
    isLoading,
    error,
    addRoute,
    addRoutes,
    removeRoute,
    clearRoutes,
    selectRoute,
    deselectRoute,
    toggleRouteSelection,
    selectAllRoutes,
    deselectAllRoutes,
    setReferenceRoute: setReference,
    setCompareMode: setCompareModeValue,
    updateRouteColor,
    updateRouteDisplayName,
    getRouteById,
  };

  return (
    <RouteComparisonContext.Provider value={value}>
      {children}
    </RouteComparisonContext.Provider>
  );
}

export function useRouteComparison() {
  const context = useContext(RouteComparisonContext);
  if (context === undefined) {
    throw new Error(
      'useRouteComparison must be used within a RouteComparisonProvider'
    );
  }
  return context;
}
