export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header placeholder */}
      <div className="h-16 lg:h-20 bg-white dark:bg-zinc-900" />

      {/* Hero skeleton */}
      <div className="py-12 lg:py-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container">
          <div className="max-w-2xl">
            <div className="h-12 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-80 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="h-10 w-64 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Products grid skeleton */}
      <div className="py-8 lg:py-12">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
              >
                <div className="aspect-square bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                  <div className="h-4 w-20 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
                  <div className="h-6 w-24 bg-orange-100 dark:bg-orange-900/20 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
