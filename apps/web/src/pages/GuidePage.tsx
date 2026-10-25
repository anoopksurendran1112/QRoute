import { useLocation, useNavigate } from "react-router-dom";

export function GuidePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const route = state?.route;
  const instructions = route?.instructions || [];

  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-[#40484f] hover:text-[#006699]">
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Turn-by-Turn Guidance
          </h1>
          <button onClick={() => navigate("/")} className="text-sm text-[#40484f] hover:text-[#006699]">
            Home
          </button>
        </header>

        {instructions.length === 0 ? (
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
            <p className="text-sm text-[#707880] mb-4">No guidance available</p>
            <button
              onClick={() => navigate("/")}
              className="rounded-lg bg-[#006699] px-4 py-2 text-sm text-white hover:bg-[#004b72]"
            >
              Start Over
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-[#d0e4ff] bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium text-[#061d30]">Route Summary</h2>
                {route?.distance && (
                  <span className="text-sm text-[#006699] font-medium">{route.distance.toFixed(1)} m</span>
                )}
              </div>
              <div className="text-xs text-[#707880] space-y-1">
                <p>From: {state?.origin?.node?.name || state?.origin?.name || "Start"}</p>
                <p>To: {state?.destination?.name || state?.destination?.roomNumber || "Destination"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-[#d0e4ff] bg-white overflow-hidden">
              <div className="p-4 border-b border-[#e0e8f0]">
                <h2 className="text-sm font-medium text-[#061d30]">Directions</h2>
              </div>
              <div className="divide-y divide-[#f0f4f8]">
                {instructions.map((step: any, idx: number) => (
                  <div key={idx} className="p-4 flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#006699]/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-[#006699]">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#061d30] leading-relaxed">
                        {typeof step === "string" ? step : step.instruction || step.text || JSON.stringify(step)}
                      </p>
                      {step.type && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-[#f0f4f8] text-[#40484f]">
                          {step.type}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => navigate("/route", { state })}
              className="w-full rounded-lg border border-[#c0c7d0] bg-white px-4 py-2.5 text-sm font-medium text-[#40484f] hover:bg-[#f5f7fa]"
            >
              View on Map
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
