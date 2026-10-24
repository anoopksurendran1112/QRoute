import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listBuildings, listFloors, type FloorDto } from "../api/catalog.ts";
import { FloorPlanUpload } from "../components/graph/FloorPlanUpload.tsx";
import { FloorGraphCanvas } from "../components/graph/FloorGraphCanvas.tsx";
import { CalibrationTool } from "../components/graph/CalibrationTool.tsx";
import { ValidationPanel } from "../components/graph/ValidationPanel.tsx";
import { QRCodesPanel } from "../components/graph/QRCodesPanel.tsx";

export function GraphEditorPage() {
  const [selectedFloorId, setSelectedFloorId] = useState<string>("");

  const buildingsQuery = useQuery({ queryKey: ["buildings"], queryFn: () => listBuildings() });
  const floorsQuery = useQuery({ queryKey: ["floors"], queryFn: () => listFloors() });

  const floors = (floorsQuery.data ?? []) as FloorDto[];
  const buildings = buildingsQuery.data ?? [];
  const buildingName = (id: string) => buildings.find((b) => b.id === id)?.name ?? "Building";
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Graph Editor</h1>
            <p className="mt-1 text-sm text-slate-600">
              Upload floor plans, draw the walkable graph, calibrate, validate and generate QR codes.
            </p>
          </div>
          <Link to="/" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            Back to Dashboard
          </Link>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-medium text-slate-900">Select Floor</h2>
              {floorsQuery.isLoading && <p className="mt-2 text-xs text-slate-500">Loading floors…</p>}
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {floors.map((floor) => (
                  <button
                    key={floor.id}
                    type="button"
                    onClick={() => setSelectedFloorId(floor.id)}
                    className={`w-full rounded border px-3 py-2 text-left text-sm ${
                      selectedFloorId === floor.id
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {buildingName(floor.buildingId)} · Level {floor.level}
                    {floor.name ? ` (${floor.name})` : ""}
                    {floor.imagePath ? " ✓" : ""}
                  </button>
                ))}
                {!floorsQuery.isLoading && floors.length === 0 && (
                  <p className="text-xs text-slate-500">No floors yet — create one under Catalog → Floors.</p>
                )}
              </div>
            </div>

            {selectedFloorId && (
              <FloorPlanUpload floorId={selectedFloorId} />
            )}

            {selectedFloorId && (
              <CalibrationTool
                floorId={selectedFloorId}
                currentMetersPerPixel={
                  selectedFloor?.metersPerPixel ? Number(selectedFloor.metersPerPixel) : undefined
                }
              />
            )}

            {selectedFloorId && <ValidationPanel floorId={selectedFloorId} />}

            {selectedFloorId && (
              <QRCodesPanel
                floorId={selectedFloorId}
                floorLabel={
                  selectedFloor
                    ? `${buildingName(selectedFloor.buildingId)} · Level ${selectedFloor.level}`
                    : undefined
                }
              />
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-medium text-slate-900">Canvas</h2>
                <p className="mt-1 text-xs text-slate-600">
                  {selectedFloorId
                    ? "Click to add a node, drag handles to connect, drag nodes to reposition."
                    : "Select a floor to begin."}
                </p>
              </div>
              {selectedFloorId ? (
                <FloorGraphCanvas key={selectedFloorId} floorId={selectedFloorId} />
              ) : (
                <div className="flex h-[600px] items-center justify-center bg-slate-100">
                  <p className="text-sm text-slate-500">Select a floor from the sidebar</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
