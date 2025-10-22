export function BalanceSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-[#00ff88]/20 rounded-full" />
            <div className="h-6 bg-[#00ff88]/20 rounded w-1/3" />
          </div>

          <div className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-xl p-4 mb-4">
            <div className="h-4 bg-[#00ff88]/20 rounded w-1/4 mb-3" />
            <div className="h-12 bg-[#00ff88]/20 rounded w-2/3" />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="bg-[#00ff88]/5 border border-[#00ff88]/10 rounded-lg p-3">
                <div className="h-3 bg-[#00ff88]/20 rounded w-1/2 mb-2" />
                <div className="h-6 bg-[#00ff88]/20 rounded w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
