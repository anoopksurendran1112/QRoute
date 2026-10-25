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
    <div>
      <header className="mb-6 flex items-center justify-between flex-wrap gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Graph Editor
          </h1>
          <p className="mt-1 text-sm text-[#40484f]">
            Manage spatial nodes, routes, and QR codes for indoor navigation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[#061d30]">Floor:</span>
          <select
            value={selectedFloorId}
            onChange={(e) => setSelectedFloorId(e.target.value)}
            className="rounded-lg border border-[#c0c7d0] bg-white px-3 py-2 text-sm text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20 min-w-[200px]"
          >
            <option value="">Select a floor...</option>
            {floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {buildingName(floor.buildingId)} · Level {floor.level}
                {floor.name ? ` (${floor.name})` : ""}
                {floor.imagePath ? " ✓" : ""}
              </option>
            ))}
          </select>
          {floorsQuery.isLoading && <span className="text-xs text-[#707880]">Loading...</span>}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12 mb-4 items-start">
        <div className="lg:col-span-7 space-y-4">
          <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
            <div className="border-b border-[#d0e4ff] px-5 py-3 bg-[#f8f9ff] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                  Spatial Graph Canvas
                </h2>
                <p className="mt-0.5 text-xs text-[#40484f]">
                  {selectedFloorId
                    ? "Click to add nodes, connect with edges"
                    : "Select a floor to begin editing"}
                </p>
              </div>
              {selectedFloorId && (
                <button
                  type="button"
                  onClick={() => {
                    const container = document.querySelector('[data-graph-container]') as HTMLElement;
                    if (container) {
                      container.requestFullscreen?.().catch(() => {});
                    }
                  }}
                  className="rounded-md border border-[#c0c7d0] px-2.5 py-1 text-xs font-medium text-[#40484f] transition-colors hover:bg-white flex items-center gap-1"
                  title="Enter fullscreen"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  Full View
                </button>
              )}
            </div>
            {selectedFloorId ? (
              <div className="p-2">
                <FloorGraphCanvas key={selectedFloorId} floorId={selectedFloorId} />
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center bg-[#f8f9ff]">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-[#e0f2fe] flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-[#006699]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#061d30]">No Floor Selected</p>
                  <p className="text-xs text-[#707880] mt-1">Select a floor above to start</p>
                </div>
              </div>
            )}
          </section>

          {selectedFloorId && (
            <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)] overflow-hidden">
              <div className="border-b border-[#d0e4ff] px-5 py-3 bg-[#f8f9ff]">
                <h2 className="text-base font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
                  QR Code Management
                </h2>
                <p className="mt-0.5 text-xs text-[#40484f]">
                  Generate and manage QR codes for navigation nodes
                </p>
              </div>
              <div className="p-4">
                <QRCodesPanel
                  floorId={selectedFloorId}
                  floorLabel={
                    selectedFloor
                      ? `${buildingName(selectedFloor.buildingId)} · Level ${selectedFloor.level}`
                      : undefined
                  }
                />
              </div>
            </section>
          )}
        </div>

        <div className="lg:col-span-5 space-y-3">
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
        </div>
      </div>
    </div>
  );
}
