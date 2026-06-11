export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 lg:h-20 bg-surface" />

      <div className="py-12 lg:py-16 bg-surface border-b border-border">
        <div className="container">
          <div className="max-w-2xl">
            <div className="h-12 w-32 bg-surface-tertiary rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-80 bg-surface-tertiary rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="py-4 bg-surface border-b border-border">
        <div className="container">
          <div className="flex items-center gap-4">
            <div className="h-10 w-64 bg-surface-tertiary rounded-lg animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-10 w-24 bg-surface-tertiary rounded-full animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 lg:py-12">
        <div className="container">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-surface rounded-2xl overflow-hidden border border-border"
              >
                <div className="aspect-square bg-surface-tertiary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-3 w-16 bg-surface-tertiary rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-surface-tertiary rounded animate-pulse" />
                  <div className="h-4 w-20 bg-surface-tertiary rounded animate-pulse" />
                  <div className="h-6 w-24 bg-brand/10 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
