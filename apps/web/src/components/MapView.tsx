import { useEffect, useRef, useState } from "react";
import { getFloorPlanUrl } from "../utils/graph.ts";

interface MapViewProps {
  route?: any;
  floors?: any[];
  currentFloorId?: string;
  onFloorChange?: (floorId: string) => void;
}

export function MapView({ route, floors = [], currentFloorId, onFloorChange }: MapViewProps) {
  const [selectedFloorId, setSelectedFloorId] = useState(currentFloorId || floors[0]?.id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const currentFloor = floors.find((f: any) => f.id === selectedFloorId) || floors[0];
  const floorPlanUrl = getFloorPlanUrl(currentFloor);

  useEffect(() => {
    if (currentFloorId) {
      setSelectedFloorId(currentFloorId);
    }
  }, [currentFloorId]);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

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

  // Filter path nodes for current floor
  const floorPath = path.filter((node: any) => {
    if (!node.floorId && !currentFloor) return true;
    return node.floorId === selectedFloorId || node.floor?.id === selectedFloorId;
  });

  function handleFloorChange(floorId: string) {
    setSelectedFloorId(floorId);
    if (onFloorChange) onFloorChange(floorId);
  }

  function getScaledPoint(node: any) {
    const x = node.x ?? node.positionX ?? node.posX ?? node.canvasX ?? 0;
    const y = node.y ?? node.positionY ?? node.posY ?? node.canvasY ?? 0;
    
    if (!imageSize.width || !imageSize.height || !containerSize.width || !containerSize.height) {
      return { x: x * 0.5, y: y * 0.5 };
    }

    // Scale to fit container maintaining aspect ratio
    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (containerSize.width - imageSize.width * scale) / 2;
    const offsetY = (containerSize.height - imageSize.height * scale) / 2;
    
    return {
      x: x * scale + offsetX,
      y: y * scale + offsetY,
    };
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

      <div ref={containerRef} className="relative w-full h-[300px] sm:h-[400px] bg-white rounded-lg border border-[#d0e4ff] overflow-hidden">
        {floorPlanUrl ? (
          <img
            src={floorPlanUrl}
            alt={currentFloor?.name || "Floor plan"}
            className="w-full h-full object-contain"
            onLoad={(e) => {
              const img = e.currentTarget;
              setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f8f9ff]">
            <p className="text-sm text-[#707880]">No floor plan available</p>
          </div>
        )}

        {/* Route overlay */}
        {floorPath.length > 1 && imageSize.width > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
            <polyline
              points={floorPath.map((node: any) => {
                const pt = getScaledPoint(node);
                return `${pt.x},${pt.y}`;
              }).join(" ")}
              fill="none"
              stroke="#006699"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
            {/* Start marker */}
            {floorPath[0] && (
              <g>
                <circle
                  cx={getScaledPoint(floorPath[0]).x}
                  cy={getScaledPoint(floorPath[0]).y}
                  r="8"
                  fill="#22c55e"
                  stroke="white"
                  strokeWidth="3"
                />
                <circle
                  cx={getScaledPoint(floorPath[0]).x}
                  cy={getScaledPoint(floorPath[0]).y}
                  r="3"
                  fill="white"
                />
              </g>
            )}
            {/* End marker */}
            {floorPath[floorPath.length - 1] && floorPath.length > 1 && (
              <g>
                <circle
                  cx={getScaledPoint(floorPath[floorPath.length - 1]).x}
                  cy={getScaledPoint(floorPath[floorPath.length - 1]).y}
                  r="8"
                  fill="#ef4444"
                  stroke="white"
                  strokeWidth="3"
                />
                <circle
                  cx={getScaledPoint(floorPath[floorPath.length - 1]).x}
                  cy={getScaledPoint(floorPath[floorPath.length - 1]).y}
                  r="3"
                  fill="white"
                />
              </g>
            )}
          </svg>
        )}

        {/* Route indicator */}
        {floorPath.length > 0 && (
          <div className="absolute top-2 left-2 bg-white/95 px-2 py-1 rounded-md shadow-sm border border-[#d0e4ff]" style={{ zIndex: 20 }}>
            <p className="text-xs text-[#006699] font-medium">
              {floorPath.length === 1 ? "At location" : "Route shown"}
            </p>
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
