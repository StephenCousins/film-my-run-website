export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header placeholder */}
      <div className="h-16 lg:h-20 bg-white dark:bg-zinc-900" />

      {/* Hero skeleton */}
      <div className="py-12 lg:py-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container">
          <div className="max-w-2xl">
            <div className="h-12 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-96 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="py-12 lg:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-6 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-zinc-100 dark:bg-zinc-900 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800">
                <div className="h-6 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
