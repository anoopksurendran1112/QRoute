import { useEffect, useRef, useState, useCallback } from "react";
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
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Zoom and pan state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentFloor = floors.find((f: any) => f.id === selectedFloorId) || floors[0];
  const floorPlanUrl = getFloorPlanUrl(currentFloor);

  useEffect(() => {
    if (currentFloorId) {
      setSelectedFloorId(currentFloorId);
    }
  }, [currentFloorId]);

  useEffect(() => {
    // Reset zoom/pan when floor changes
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [selectedFloorId]);

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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.5), 4));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev * 1.2, 4));
  const zoomOut = () => setScale((prev) => Math.max(prev * 0.8, 0.5));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  function getScaledPoint(node: any) {
    const x = node.x ?? node.positionX ?? node.posX ?? node.canvasX ?? node.px ?? 0;
    const y = node.y ?? node.positionY ?? node.posY ?? node.canvasY ?? node.py ?? 0;
    
    if (!imageSize.width || !imageSize.height || !containerSize.width || !containerSize.height) {
      const baseX = x * 0.5;
      const baseY = y * 0.5;
      return { x: baseX * scale + position.x, y: baseY * scale + position.y };
    }

    // Better coordinate scaling - use actual image dimensions
    const scaleX = containerSize.width / imageSize.width;
    const scaleY = containerSize.height / imageSize.height;
    const baseScale = Math.min(scaleX, scaleY);
    
    const offsetX = (containerSize.width - imageSize.width * baseScale) / 2;
    const offsetY = (containerSize.height - imageSize.height * baseScale) / 2;
    
    const finalScale = baseScale * scale;
    
    return {
      x: x * finalScale + offsetX + position.x,
      y: y * finalScale + offsetY + position.y,
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

      <div ref={containerRef} className="relative w-full h-[300px] sm:h-[400px] bg-white rounded-lg border border-[#d0e4ff] overflow-hidden touch-none">
        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.1s ease-out",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {floorPlanUrl ? (
            <img
              ref={imageRef}
              src={floorPlanUrl}
              alt={currentFloor?.name || "Floor plan"}
              className="w-full h-full object-contain pointer-events-none"
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
        </div>

        {/* Route overlay */}
        {floorPath.length > 1 && imageSize.width > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
            <g style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, transformOrigin: "center center" }}>
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
            </g>
          </svg>
        )}

        {/* Zoom controls */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-1" style={{ zIndex: 20 }}>
          <button
            onClick={zoomIn}
            className="w-8 h-8 bg-white/95 border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-white shadow-sm"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={zoomOut}
            className="w-8 h-8 bg-white/95 border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-white shadow-sm"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="w-8 h-8 bg-white/95 border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-white shadow-sm"
            title="Reset zoom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Route indicator */}
        {floorPath.length > 0 && (
          <div className="absolute top-2 left-2 bg-white/95 px-2 py-1 rounded-md shadow-sm border border-[#d0e4ff]" style={{ zIndex: 20 }}>
            <p className="text-xs text-[#006699] font-medium">
              {floorPath.length === 1 ? "At location" : `${floorPath.length - 1} segments • Drag to pan • Scroll to zoom`}
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
