import { useEffect, useRef, useState, useCallback } from "react";
import { getFloorPlanUrl } from "../utils/graph.ts";

interface MapViewProps {
  route?: any;
  floors?: any[];
  currentFloorId?: string;
  onFloorChange?: (floorId: string) => void;
}

export function MapView({ route, floors = [], currentFloorId, onFloorChange }: MapViewProps) {
  const path = route?.path || route?.nodes || [];

  // Default to the floor the route starts on. Defaulting to `floors[0]` showed
  // the first floor in the campus, which for a route in another building is a
  // floor the route never touches — an empty panel with no tab to escape it.
  const [selectedFloorId, setSelectedFloorId] = useState(
    currentFloorId || path[0]?.floorId || floors[0]?.id,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageFailed, setImageFailed] = useState(false);
  
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
    // A floor plan that is missing or fails to load must not hide the route.
    setImageFailed(false);
  }, [floorPlanUrl]);

  // The drawing space is the floor's declared pixel grid, not the bitmap's
  // natural size. Node `x`/`y` and `metersPerPixel` are authored against
  // `widthPx`/`heightPx`; a plan image that happens to be stored at a different
  // resolution (or that was replaced after calibration) must be stretched to
  // that grid, otherwise the route is drawn at the wrong scale and runs off the
  // panel.
  const gridSize = {
    width: currentFloor?.widthPx || imageSize.width || 900,
    height: currentFloor?.heightPx || imageSize.height || 600,
  };


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

  // Returns a point in the container's *untransformed* coordinate space.
  // The <g> that draws the route applies the same translate/scale as the image
  // wrapper, so baking zoom/pan in here as well would move the route twice and
  // desynchronise it from the floor plan on every zoom.
  function getScaledPoint(node: any) {
    const x = node.x ?? node.positionX ?? node.posX ?? node.canvasX ?? node.px ?? 0;
    const y = node.y ?? node.positionY ?? node.posY ?? node.canvasY ?? node.py ?? 0;
    
    if (!gridSize.width || !gridSize.height || !containerSize.width || !containerSize.height) {
      return { x: x * 0.5, y: y * 0.5 };
    }

    // The image is stretched to the same box (`object-fill`), so a plain
    // per-axis ratio is the exact inverse of that stretch.
    return {
      x: x * (containerSize.width / gridSize.width),
      y: y * (containerSize.height / gridSize.height),
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
          {floorPlanUrl && !imageFailed ? (
            <img
              ref={imageRef}
              src={floorPlanUrl}
              alt={currentFloor?.name || "Floor plan"}
              className="w-full h-full object-fill pointer-events-none"
              onLoad={(e) => {
                const img = e.currentTarget;
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
              }}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-start pt-3 bg-[#f8f9ff] gap-1">
              <p className="text-sm text-[#707880]">
                {floorPlanUrl ? "Floor plan could not be loaded" : "No floor plan uploaded for this level"}
              </p>
              <p className="text-xs text-[#a0a8b0]">Route is still shown to scale</p>
            </div>
          )}
        </div>

        {/* Route overlay */}
        {floorPath.length > 1 && (
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

      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-[#707880]">
          {floorPath.length === 1
            ? "You are at this location"
            : `${Math.max(floorPath.length - 1, 0)} plan segments • drag to pan • scroll or pinch to zoom`}
        </p>

        {/* Kept outside the map: overlaying them hid whichever marker happened
            to sit in that corner. */}
        <div className="flex shrink-0 gap-1">
          <button
            onClick={zoomIn}
            className="w-8 h-8 bg-white border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-[#f5f7fa] shadow-sm"
            title="Zoom in"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={zoomOut}
            className="w-8 h-8 bg-white border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-[#f5f7fa] shadow-sm"
            title="Zoom out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            className="w-8 h-8 bg-white border border-[#c0c7d0] rounded-md flex items-center justify-center hover:bg-[#f5f7fa] shadow-sm"
            title="Reset zoom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
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
