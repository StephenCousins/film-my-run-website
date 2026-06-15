'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, Star, ChevronDown } from 'lucide-react';
import ShoeCard from './ShoeCard';

interface ShoeReview {
  source: string;
  sourceUrl: string | null;
  expertScore: number | null;
  userScore: number | null;
  userCount: number | null;
  summary: string | null;
}

export interface Shoe {
  id: number;
  brand: string;
  model: string;
  slug: string;
  terrain: string;
  category: string;
  dropMm: number | null;
  weightG: number | null;
  stackHeightMm: number | null;
  priceGbp: number | null;
  releaseYear: number | null;
  description: string | null;
  imageUrl: string | null;
  buyUrl: string | null;
  avgScore: number | null;
  reviewCount: number;
  lastReviewed: string | null;
  reviews: ShoeReview[];
}

interface Meta {
  brands: string[];
  categories: string[];
  total: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  daily_trainer: 'Daily Trainer',
  race: 'Race',
  long_run: 'Long Run',
  speed: 'Speed',
  ultra: 'Ultra',
  stability: 'Stability',
  max_cushion: 'Max Cushion',
  minimal: 'Minimal',
};

const DROP_OPTIONS = [
  { label: 'Any drop', value: '' },
  { label: 'Zero drop (0mm)', value: '0-0' },
  { label: 'Low drop (1–4mm)', value: '1-4' },
  { label: 'Mid drop (5–8mm)', value: '5-8' },
  { label: 'High drop (9mm+)', value: '9-20' },
];

export default function ShoeFinderClient() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [meta, setMeta] = useState<Meta>({ brands: [], categories: [], total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [terrain, setTerrain] = useState('all');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [drop, setDrop] = useState('');
  const [sort, setSort] = useState('score');
  const [showFilters, setShowFilters] = useState(false);

  const fetchShoes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (terrain !== 'all') params.set('terrain', terrain);
    if (category) params.set('category', category);
    if (brand) params.set('brand', brand);
    if (sort) params.set('sort', sort);
    if (search) params.set('search', search);
    if (drop) {
      const [min, max] = drop.split('-');
      params.set('minDrop', min);
      params.set('maxDrop', max);
    }

    const res = await fetch(`/api/shoes?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setShoes(data.shoes);
      setMeta(data.meta);
    }
    setLoading(false);
  }, [terrain, category, brand, sort, search, drop]);

  useEffect(() => {
    const t = setTimeout(fetchShoes, search ? 400 : 0);
    return () => clearTimeout(t);
  }, [fetchShoes, search]);

  const clearFilters = () => {
    setSearch('');
    setTerrain('all');
    setCategory('');
    setBrand('');
    setDrop('');
    setSort('score');
  };

  const hasActiveFilters = terrain !== 'all' || category || brand || drop || search;
  const scoredShoes = shoes.filter(s => s.avgScore !== null);
  const unscoredShoes = shoes.filter(s => s.avgScore === null);

  return (
    <div>
      {/* Search + controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] w-4 h-4" />
          <input
            type="text"
            placeholder="Search brand or model..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-[#18181b] dark:text-[#fafafa] placeholder:text-[#a1a1aa] focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
          />
        </div>

        {/* Terrain tabs */}
        <div className="flex rounded-xl border border-[#e4e4e7] dark:border-[#27272a] overflow-hidden bg-white dark:bg-[#18181b]">
          {['all', 'road', 'trail'].map(t => (
            <button
              key={t}
              onClick={() => setTerrain(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
                terrain === t
                  ? 'bg-orange-500 text-white'
                  : 'text-[#52525b] dark:text-[#a1a1aa] hover:bg-[#f4f4f5] dark:hover:bg-[#27272a]'
              }`}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-orange-500 text-orange-500 bg-orange-50 dark:bg-orange-950/30'
              : 'border-[#e4e4e7] dark:border-[#27272a] text-[#52525b] dark:text-[#a1a1aa] bg-white dark:bg-[#18181b]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-orange-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center">
              !
            </span>
          )}
        </button>

        {/* Sort */}
        <div className="relative">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#18181b] text-[#52525b] dark:text-[#a1a1aa] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <option value="score">Top Rated</option>
            <option value="brand">Brand A–Z</option>
            <option value="newest">Newest First</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
        </div>
      </div>

      {/* Expanded filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#18181b] border border-[#e4e4e7] dark:border-[#27272a] rounded-xl p-4 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Brand */}
              <div>
                <label className="block text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] mb-1.5">
                  Brand
                </label>
                <div className="relative">
                  <select
                    value={brand}
                    onChange={e => setBrand(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#27272a] text-[#18181b] dark:text-[#fafafa] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All brands</option>
                    {meta.brands.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] mb-1.5">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#27272a] text-[#18181b] dark:text-[#fafafa] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All categories</option>
                    {meta.categories.map(c => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                </div>
              </div>

              {/* Drop */}
              <div>
                <label className="block text-xs font-medium text-[#52525b] dark:text-[#a1a1aa] mb-1.5">
                  Heel-to-Toe Drop
                </label>
                <div className="relative">
                  <select
                    value={drop}
                    onChange={e => setDrop(e.target.value)}
                    className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg border border-[#e4e4e7] dark:border-[#27272a] bg-white dark:bg-[#27272a] text-[#18181b] dark:text-[#fafafa] text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {DROP_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {terrain !== 'all' && (
            <FilterPill label={`Terrain: ${terrain}`} onRemove={() => setTerrain('all')} />
          )}
          {category && (
            <FilterPill
              label={`Category: ${CATEGORY_LABELS[category] ?? category}`}
              onRemove={() => setCategory('')}
            />
          )}
          {brand && <FilterPill label={`Brand: ${brand}`} onRemove={() => setBrand('')} />}
          {drop && (
            <FilterPill
              label={`Drop: ${DROP_OPTIONS.find(o => o.value === drop)?.label ?? drop}`}
              onRemove={() => setDrop('')}
            />
          )}
          {search && <FilterPill label={`"${search}"`} onRemove={() => setSearch('')} />}
          <button
            onClick={clearFilters}
            className="text-xs text-[#71717a] hover:text-[#18181b] dark:hover:text-[#fafafa] underline transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-[#71717a] dark:text-[#71717a]">
          {loading ? 'Loading...' : `${meta.total} shoes`}
          {scoredShoes.length > 0 && !loading && (
            <span className="ml-1">({scoredShoes.length} with scores)</span>
          )}
        </p>
        {scoredShoes.length === 0 && !loading && (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <Star className="w-3.5 h-3.5" />
            Run the review fetch script to populate scores
          </div>
        )}
      </div>

      {/* Shoe grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-64 rounded-2xl bg-[#f4f4f5] dark:bg-[#27272a] animate-pulse"
            />
          ))}
        </div>
      ) : shoes.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#71717a] dark:text-[#71717a] mb-2">No shoes found</p>
          <button onClick={clearFilters} className="text-orange-500 text-sm hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {scoredShoes.map((shoe, i) => (
                <motion.div
                  key={shoe.slug}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03, duration: 0.3 }}
                >
                  <ShoeCard shoe={shoe} rank={i + 1} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Unscored shoes section */}
          {unscoredShoes.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-medium text-[#71717a] dark:text-[#71717a] mb-4 flex items-center gap-2">
                <span className="flex-1 h-px bg-[#e4e4e7] dark:bg-[#27272a]" />
                Shoes awaiting review scores ({unscoredShoes.length})
                <span className="flex-1 h-px bg-[#e4e4e7] dark:bg-[#27272a]" />
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {unscoredShoes.map(shoe => (
                  <ShoeCard key={shoe.slug} shoe={shoe} rank={null} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 rounded-full px-3 py-1 text-xs font-medium">
      {label}
      <button onClick={onRemove} className="hover:opacity-70 transition-opacity">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
