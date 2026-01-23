'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouteComparison } from '@/contexts/RouteComparisonContext';

interface FileDropZoneProps {
  className?: string;
  compact?: boolean;
}

export default function FileDropZone({ className, compact = false }: FileDropZoneProps) {
  const { addRoutes, isLoading, error } = useRouteComparison();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter(
        (file) =>
          file.name.endsWith('.gpx') || file.name.endsWith('.fit')
      );

      if (files.length > 0) {
        await addRoutes(files);
      }
    },
    [addRoutes]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await addRoutes(Array.from(files));
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [addRoutes]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  if (compact) {
    return (
      <div className={className}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,.fit"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={handleClick}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileUp className="w-4 h-4" />
          )}
          Add Files
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".gpx,.fit"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all',
          isDragging
            ? 'border-orange-500 bg-orange-500/10'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-orange-500 hover:bg-orange-500/5',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
            <p className="text-zinc-600 dark:text-zinc-400 text-center">
              Processing files...
            </p>
          </>
        ) : (
          <>
            <Upload
              className={cn(
                'w-12 h-12 mb-4 transition-colors',
                isDragging ? 'text-orange-500' : 'text-zinc-400'
              )}
            />
            <p className="text-zinc-900 dark:text-white font-medium text-center mb-2">
              {isDragging ? 'Drop files here' : 'Drag & drop GPX or FIT files'}
            </p>
            <p className="text-zinc-500 text-sm text-center">
              or click to browse
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
