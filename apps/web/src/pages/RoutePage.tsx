import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getShortestPath, type ComputedRoute } from "../api/routing.ts";
import { getGraphSnapshot } from "../api/graph.ts";
import { MapView } from "../components/MapView.tsx";
import { getOrigin, saveOrigin } from "../utils/session.ts";

/** A classroom is routed via its entrance node, so the id it carries is not a node id. */
function isClassroom(value: any): boolean {
  return Boolean(value) && (value.roomNumber !== undefined || value.entranceNodeId !== undefined);
}

function nodeIdOf(value: any): string | undefined {
  return value?.nodeId ?? value?.node?.id ?? value?.id ?? value?._id;
}

export function RoutePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as any;
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<ComputedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<any>(null);

  // `state` is authoritative when present; the tab-level copy covers the
  // Route -> Search -> Route round trip (and a page reload), which used to
  // forget the scan and render "Current location" with no route.
  //
  // Memoised on purpose: `getOrigin()` parses JSON and returns a new object
  // every call, so re-reading it on each render would make the route effect
  // below fire forever.
  const stateOrigin = state?.origin || state?.location;
  const origin = useMemo(() => stateOrigin || getOrigin(), [stateOrigin]);
  const destination = state?.destinationNode || state?.destination;

  useEffect(() => {
    if (origin?.id) {
      saveOrigin(origin);
    }
  }, [origin]);

  useEffect(() => {
    getGraphSnapshot()
      .then((data) => setGraphData(data))
      .catch((err) => console.error("Failed to load graph", err));
  }, []);

  useEffect(() => {
    if (origin && destination) {
      void calculateRoute();
    }
    // Only the endpoints should trigger a recomputation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination]);

  async function calculateRoute() {
    setLoading(true);
    setError(null);
    setRoute(null);
    try {
      const startNodeId = nodeIdOf(origin);
      const destinationIsClassroom = isClassroom(destination);

      if (!startNodeId) {
        throw new Error("Unknown start location — scan a QR code first.");
      }
      if (!destination?.id) {
        throw new Error("No destination selected.");
      }

      const computed = await getShortestPath({
        startNodeId,
        // The API resolves a classroom to its entrance node; sending the
        // classroom id as a node id is a guaranteed 404.
        ...(destinationIsClassroom
          ? { endClassroomId: destination.id }
          : { endNodeId: destination.id }),
        algorithm: "both",
      });

      setRoute(computed);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function startNavigation() {
    navigate("/guide", { state: { ...state, route, origin, destination } });
  }

  const floors = graphData?.floors || [];
  const startLabel =
    origin?.label || origin?.code || origin?.node?.label || origin?.node?.code || "Current location";
  const destinationLabel =
    destination?.label ||
    destination?.name ||
    destination?.roomNumber ||
    state?.destinationInfo?.classroom?.roomNumber ||
    state?.destinationInfo?.node?.label ||
    "Destination";

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
                  <p className="text-sm text-[#061d30]">{startLabel}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                <div className="flex-1">
                  <p className="text-xs text-[#707880]">To</p>
                  <p className="text-sm text-[#061d30]">{destinationLabel}</p>
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
              <button
                onClick={() => void calculateRoute()}
                className="mt-2 text-xs text-red-700 underline"
              >
                Try again
              </button>
            </div>
          )}

          {route && (
            <>
              <MapView route={route} floors={floors} />

              <div className="rounded-lg border border-[#d0e4ff] bg-white p-4">
                <h2 className="text-sm font-medium text-[#061d30] mb-2">Route Summary</h2>
                <div className="flex justify-between text-sm">
                  <span className="text-[#40484f]">Distance</span>
                  <span className="text-[#061d30] font-medium">{route.distance.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-[#40484f]">Steps</span>
                  <span className="text-[#061d30] font-medium">{route.instructions.length}</span>
                </div>
                {route.dijkstra && route.astar && (
                  <div className="mt-3 border-t border-[#e0e8f0] pt-2 text-xs text-[#707880]">
                    <p>
                      Dijkstra expanded {route.dijkstra.metrics.nodesExpanded} nodes • A* expanded{" "}
                      {route.astar.metrics.nodesExpanded}
                    </p>
                    <p className={route.agreed ? "text-green-700" : "text-red-700"}>
                      {route.agreed
                        ? "Both algorithms agree on the shortest cost"
                        : "Algorithms disagree — see the API logs"}
                    </p>
                  </div>
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

          {!loading && !route && !error && !origin && (
            <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
              <p className="text-sm text-[#061d30] font-medium mb-1">No location yet</p>
              <p className="text-xs text-[#707880] mb-4">
                Scan a QR code at a checkpoint so the app knows where you are standing.
              </p>
              <button
                onClick={() => navigate("/scan")}
                className="w-full rounded-lg bg-[#006699] px-4 py-2 text-sm text-white hover:bg-[#004b72]"
              >
                Scan QR Code
              </button>
            </div>
          )}

          {!loading && !route && !error && origin && !destination && (
            <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
              <p className="text-sm text-[#061d30] font-medium mb-1">You are at {startLabel}</p>
              <p className="text-xs text-[#707880] mb-4">Choose where you want to go.</p>
              <div className="space-y-2">
                <button
                  onClick={() =>
                    navigate("/search", {
                      state: { origin, originLocation: state?.originLocation },
                    })
                  }
                  className="w-full rounded-lg bg-[#006699] px-4 py-2 text-sm text-white hover:bg-[#004b72]"
                >
                  Search Destination
                </button>
                <button
                  onClick={() => navigate("/scan")}
                  className="w-full rounded-lg border border-[#c0c7d0] px-4 py-2 text-sm text-[#40484f] hover:bg-[#f5f7fa]"
                >
                  Scan a different QR code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
