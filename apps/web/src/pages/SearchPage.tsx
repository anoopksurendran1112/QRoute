import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getAllCatalogData } from "../api/catalog.ts";

export function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    buildings: [],
    floors: [],
    classrooms: [],
    departments: [],
    faculty: [],
  });

  useEffect(() => {
    getAllCatalogData()
      .then(setData)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const { classrooms, buildings, floors, departments, faculty } = data;

    return classrooms
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
        return { classroom: c, building, floor, department: dept, faculty: fac };
      })
      .slice(0, 20);
  }, [query, data]);

  function selectDestination(result: any) {
    navigate("/route", {
      state: {
        destination: result.classroom,
        destinationInfo: result,
      },
    });
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
        ) : query.trim() === "" ? (
          <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 text-center">
            <p className="text-sm text-[#707880]">Start typing to search for classrooms</p>
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
                    <p className="font-medium text-[#061d30]">
                      {result.classroom.roomNumber || result.classroom.name}
                    </p>
                    <p className="text-sm text-[#40484f] mt-0.5">
                      {result.building?.name} • {result.floor?.name}
                    </p>
                    {result.department && (
                      <p className="text-xs text-[#707880] mt-1">{result.department.name}</p>
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
