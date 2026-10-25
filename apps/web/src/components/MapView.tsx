import { useEffect, useState } from "react";
import { getFloorPlanUrl } from "../utils/graph.ts";

interface MapViewProps {
  route?: any;
  floors?: any[];
  currentFloorId?: string;
  onFloorChange?: (floorId: string) => void;
}

export function MapView({ route, floors = [], currentFloorId, onFloorChange }: MapViewProps) {
  const [selectedFloorId, setSelectedFloorId] = useState(currentFloorId || floors[0]?.id);
  const currentFloor = floors.find((f: any) => f.id === selectedFloorId) || floors[0];
  const floorPlanUrl = getFloorPlanUrl(currentFloor);

  useEffect(() => {
    if (currentFloorId) {
      setSelectedFloorId(currentFloorId);
    }
  }, [currentFloorId]);

  const path = route?.path || route?.nodes || [];
  const instructions = route?.instructions || [];

  // Get unique floors from route
  const routeFloors = Array.from(
    new Set(
      path
        .map((node: any) => node.floorId)
        .filter(Boolean)
    )
  );

  const displayFloors = routeFloors.length > 0 ? routeFloors.map((fid) => floors.find((f: any) => f.id === fid)).filter(Boolean) : floors;

  function handleFloorChange(floorId: string) {
    setSelectedFloorId(floorId);
    if (onFloorChange) onFloorChange(floorId);
  }

  return (
    <div className="w-full">
      {displayFloors.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {displayFloors.map((floor: any) => (
            <button
              key={floor.id}
              onClick={() => handleFloorChange(floor.id)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors ${
                selectedFloorId === floor.id
                  ? "bg-[#006699] text-white"
                  : "bg-white border border-[#c0c7d0] text-[#40484f] hover:bg-[#f5f7fa]"
              }`}
            >
              {floor.name || `Floor ${floor.level}`}
            </button>
          ))}
        </div>
      )}

      <div className="relative w-full h-[300px] sm:h-[400px] bg-white rounded-lg border border-[#d0e4ff] overflow-hidden">
        {floorPlanUrl ? (
          <img
            src={floorPlanUrl}
            alt={currentFloor?.name || "Floor plan"}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f8f9ff]">
            <p className="text-sm text-[#707880]">No floor plan available</p>
          </div>
        )}

        {/* Route overlay indicator */}
        {path.length > 0 && (
          <div className="absolute top-2 left-2 bg-white/95 px-2 py-1 rounded-md shadow-sm border border-[#d0e4ff]">
            <p className="text-xs text-[#006699] font-medium">Route on this floor</p>
          </div>
        )}
      </div>

      {instructions.length > 0 && (
        <div className="mt-3 p-3 bg-white rounded-lg border border-[#d0e4ff]">
          <p className="text-xs font-medium text-[#061d30] mb-1">Next Step</p>
          <p className="text-sm text-[#40484f]">
            {typeof instructions[0] === "string" ? instructions[0] : instructions[0]?.instruction || instructions[0]?.text}
          </p>
        </div>
      )}
    </div>
  );
}
