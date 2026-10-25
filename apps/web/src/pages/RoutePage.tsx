import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getShortestPath } from "../api/routing.ts";
import { getGraphSnapshot } from "../api/graph.ts";
import { MapView } from "../components/MapView.tsx";

export function RoutePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any>(null);

  const origin = state?.origin || state?.location;
  const destination = state?.destination;

  useEffect(() => {
    getGraphSnapshot()
      .then((data) => setGraphData(data))
      .catch((err) => console.error("Failed to load graph", err));
  }, []);

  useEffect(() => {
    if (origin && destination && !route && !loading) {
      calculateRoute();
    }
  }, [origin, destination]);

  async function calculateRoute() {
    setLoading(true);
    setError(null);
    try {
      // Try to get node IDs from origin/destination
      const fromNodeId = origin?.nodeId || origin?.node?.id || origin?.id;
      const toNodeId = destination?.nodeId || destination?.node?.id || destination?.id;

      if (!fromNodeId || !toNodeId) {
        throw new Error("Missing node information");
      }

      const data = await getShortestPath(fromNodeId, toNodeId);
      setRoute(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startNavigation() {
    navigate("/guide", { state: { route, origin, destination, destinationInfo: state?.destinationInfo } });
  }

  const floors = graphData?.floors || [];

  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="text-sm text-[#40484f] hover:text-[#006699]">
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Route
          </h1>
          <button onClick={() => navigate("/")} className="text-sm text-[#40484f] hover:text-[#006699]">
            Home
          </button>
        </header>

        <div className="space-y-4">
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-4">
            <h2 className="text-sm font-medium text-[#061d30] mb-3">Route</h2>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-[#006699] mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#707880]">From</p>
                  <p className="text-sm text-[#061d30]">
                    {origin?.node?.name || origin?.name || "Current Location"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#707880]">To</p>
                  <p className="text-sm text-[#061d30]">
                    {destination?.name || destination?.roomNumber || state?.destinationInfo?.classroom?.roomNumber || "Destination"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {loading && (
            <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
              <p className="text-sm text-[#707880]">Calculating route...</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {route && (
            <>
              <MapView route={route} floors={floors} />

              <div className="rounded-lg border border-[#d0e4ff] bg-white p-4">
                <h2 className="text-sm font-medium text-[#061d30] mb-2">Route Summary</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[#40484f]">Distance</span>
                  <span className="text-[#061d30] font-medium">{route.distance ? `${route.distance.toFixed(1)} m` : "N/A"}</span>
                </div>
                {route.instructions && (
                  <p className="text-xs text-[#707880] mt-2">{route.instructions.length} steps</p>
                )}
              </div>

              <button
                onClick={startNavigation}
                className="w-full rounded-lg bg-[#006699] px-4 py-3 text-sm font-medium text-white hover:bg-[#004b72] shadow-sm"
              >
                Start Turn-by-Turn Navigation
              </button>
            </>
          )}

          {!loading && !route && !error && (!origin || !destination) && (
            <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
              <p className="text-sm text-[#707880] mb-4">No route to display</p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate("/scan")}
                  className="w-full rounded-lg bg-[#006699] px-4 py-2 text-sm text-white hover:bg-[#004b72]"
                >
                  Scan QR Code
                </button>
                <button
                  onClick={() => navigate("/search")}
                  className="w-full rounded-lg border border-[#c0c7d0] px-4 py-2 text-sm text-[#40484f] hover:bg-[#f5f7fa]"
                >
                  Search Destination
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
