import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getAllCatalogData } from "../api/catalog.ts";
import { getGraphSnapshot } from "../api/graph.ts";
import { getOrigin } from "../utils/session.ts";

export function SearchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  // Keep the scanned start point alive across this detour.
  const origin = (location.state as any)?.origin ?? getOrigin();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>({
    buildings: [],
    floors: [],
    classrooms: [],
    departments: [],
    faculty: [],
  });
  const [graph, setGraph] = useState<any>({ nodes: [], edges: [], buildings: [], floors: [] });

  useEffect(() => {
    Promise.all([
      getAllCatalogData(),
      getGraphSnapshot().catch(() => ({ nodes: [], edges: [], buildings: [], floors: [] })),
    ])
      .then(([catalog, graphData]) => {
        console.log('Catalog data loaded:', catalog);
        console.log('Graph data loaded:', graphData);
        // Normalize catalog data
        setData({
          buildings: catalog.buildings || [],
          floors: catalog.floors || [],
          classrooms: catalog.classrooms || [],
          departments: catalog.departments || [],
          faculty: catalog.faculty || [],
        });
        setGraph(graphData);
      })
      .catch((err) => {
        console.error('Failed to load data:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const classrooms = Array.isArray(data?.classrooms) ? data.classrooms : [];
    const buildings = Array.isArray(data?.buildings) ? data.buildings : [];
    const floors = Array.isArray(data?.floors) ? data.floors : [];
    const departments = Array.isArray(data?.departments) ? data.departments : [];
    const faculty = Array.isArray(data?.faculty) ? data.faculty : [];
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

    try {
      const classroomResults = classrooms
        .filter((c: any) => {
          const building = buildings.find((b: any) => b.id === c.buildingId);
          const floor = floors.find((f: any) => f.id === c.floorId);
          const dept = departments.find((d: any) => d.id === c.departmentId);
          const fac = faculty.find((f: any) => f.id === c.facultyId);

          return (
            c.roomNumber?.toLowerCase().includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            building?.name?.toLowerCase().includes(q) ||
            building?.code?.toLowerCase().includes(q) ||
            floor?.name?.toLowerCase().includes(q) ||
            floor?.level?.toString().includes(q) ||
            dept?.name?.toLowerCase().includes(q) ||
            fac?.name?.toLowerCase().includes(q)
          );
        })
        .map((c: any) => {
          const building = buildings.find((b: any) => b.id === c.buildingId);
          const floor = floors.find((f: any) => f.id === c.floorId);
          const dept = departments.find((d: any) => d.id === c.departmentId);
          const fac = faculty.find((f: any) => f.id === c.facultyId);
          return { type: 'classroom', classroom: c, building, floor, department: dept, faculty: fac };
        });

      const nodeResults = nodes
        .filter((n: any) => {
          const building = buildings.find((b: any) => b.id === n.buildingId);
          const floor = floors.find((f: any) => f.id === n.floorId);
          return (
            n.label?.toLowerCase().includes(q) ||
            n.code?.toLowerCase().includes(q) ||
            n.name?.toLowerCase().includes(q) ||
            building?.name?.toLowerCase().includes(q) ||
            floor?.name?.toLowerCase().includes(q)
          );
        })
        .map((n: any) => {
          const building = buildings.find((b: any) => b.id === n.buildingId);
          const floor = floors.find((f: any) => f.id === n.floorId);
          return { type: 'node', node: n, building, floor };
        });

      return [...classroomResults, ...nodeResults].slice(0, 30);
    } catch (e) {
      console.error('Search error:', e);
      return [];
    }
  }, [query, data, graph]);

  function selectDestination(result: any) {
    if (result.type === 'node') {
      navigate("/route", {
        state: {
          origin,
          destinationNode: result.node,
          destination: result.node,
          destinationInfo: result,
        },
      });
    } else {
      navigate("/route", {
        state: {
          origin,
          destination: result.classroom,
          destinationInfo: result,
        },
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-sm text-[#40484f] hover:text-[#006699]">
            ← Back
          </button>
          <h1 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Search Destination
          </h1>
          <div className="w-12" />
        </header>

        <div className="mb-4 rounded-lg border border-[#d0e4ff] bg-white px-3 py-2">
          {origin ? (
            <p className="text-xs text-[#40484f]">
              <span className="text-[#707880]">From </span>
              <span className="font-medium text-[#061d30]">
                {origin.label || origin.code || "scanned location"}
              </span>
            </p>
          ) : (
            <button
              onClick={() => navigate("/scan")}
              className="text-xs text-[#006699] underline"
            >
              No location set — scan a QR code first
            </button>
          )}
        </div>

        <div className="mb-4 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#707880]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Room, building, department, faculty..."
            className="w-full rounded-lg border border-[#c0c7d0] bg-white pl-10 pr-4 py-2.5 text-sm focus:border-[#006699] focus:outline-none focus:ring-2 focus:ring-[#006699]/10"
            autoFocus
          />
        </div>

        {loading ? (
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
            <p className="text-sm text-[#707880]">Loading...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                getAllCatalogData()
                  .then((result) => setData(result))
                  .catch((err) => setError(err.message))
                  .finally(() => setLoading(false));
              }}
              className="mt-2 text-xs text-red-700 underline"
            >
              Retry
            </button>
          </div>
        ) : query.trim() === "" ? (
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
            <p className="text-sm text-[#707880]">Start typing to search for classrooms</p>
            <p className="text-xs text-[#a0a4a8] mt-1">
              {data.classrooms.length} classrooms available
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
            <p className="text-sm text-[#707880]">No results found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result: any, idx: number) => (
              <button
                key={idx}
                onClick={() => selectDestination(result)}
                className="w-full text-left rounded-lg border border-[#d0e4ff] bg-white p-4 hover:border-[#006699]/50 hover:bg-[#f8f9ff] transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {result.type === 'node' ? (
                      <>
                        <p className="font-medium text-[#061d30]">
                          {result.node.label || result.node.code}
                        </p>
                        <p className="text-sm text-[#40484f] mt-0.5">
                          {result.building?.name} • {result.floor?.name}
                        </p>
                        <p className="text-xs text-[#707880] mt-1 capitalize">{result.node.kind}</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-[#061d30]">
                          {result.classroom.roomNumber || result.classroom.name}
                        </p>
                        <p className="text-sm text-[#40484f] mt-0.5">
                          {result.building?.name} • {result.floor?.name}
                        </p>
                        {result.department && (
                          <p className="text-xs text-[#707880] mt-1">{result.department.name}</p>
                        )}
                      </>
                    )}
                  </div>
                  <svg className="h-5 w-5 text-[#707880] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
