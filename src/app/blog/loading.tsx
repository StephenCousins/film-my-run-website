export default function BlogLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 lg:h-20 bg-surface" />

      <div className="py-12 lg:py-16 bg-surface border-b border-border">
        <div className="container">
          <div className="max-w-2xl">
            <div className="h-12 w-48 bg-surface-tertiary rounded-lg animate-pulse mb-4" />
            <div className="h-6 w-96 bg-surface-tertiary rounded animate-pulse" />
          </div>
        </div>
      </div>

      <div className="py-12 lg:py-16">
        <div className="container">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-surface rounded-2xl overflow-hidden border border-border"
                >
                  <div className="aspect-video bg-surface-tertiary animate-pulse" />
                  <div className="p-6 space-y-4">
                    <div className="h-4 w-24 bg-surface-tertiary rounded animate-pulse" />
                    <div className="h-6 w-3/4 bg-surface-tertiary rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-surface-tertiary rounded animate-pulse" />
                      <div className="h-4 w-5/6 bg-surface-tertiary rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-8">
              <div className="bg-surface rounded-2xl p-6 border border-border">
                <div className="h-6 w-32 bg-surface-tertiary rounded animate-pulse mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 bg-surface-tertiary rounded-lg animate-pulse"
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
