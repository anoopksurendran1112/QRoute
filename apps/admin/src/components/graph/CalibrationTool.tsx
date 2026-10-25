import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateFloor } from "../../api/catalog.ts";

export function CalibrationTool({ floorId, currentMetersPerPixel }: { floorId: string; currentMetersPerPixel?: number | null }) {
  const [distanceM, setDistanceM] = useState("");
  const [pixelDistance, setPixelDistance] = useState("");
  const [metersPerPixel, setMetersPerPixel] = useState(currentMetersPerPixel?.toString() || "");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (mpp: number) => updateFloor(floorId, { metersPerPixel: mpp }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["floors"] });
      queryClient.invalidateQueries({ queryKey: ["floor-graph", floorId] });
      alert("Calibration saved");
    },
  });

  const calculate = () => {
    const dM = Number(distanceM);
    const dPx = Number(pixelDistance);
    if (dM > 0 && dPx > 0) {
      const mpp = dM / dPx;
      setMetersPerPixel(mpp.toFixed(6));
    }
  };

  return (
    <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
      <div className="border-b border-[#d0e4ff] px-4 py-2.5 bg-[#f8f9ff]">
        <h3 className="text-sm font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
          Calibration
        </h3>
        <p className="text-xs text-[#40484f]">Set scale for distance calculations</p>
      </div>
      <div className="p-4 space-y-2.5">
        <div>
          <label className="block text-xs font-medium text-[#061d30] mb-1">Known distance (meters)</label>
          <input
            type="number"
            step="0.1"
            value={distanceM}
            onChange={(e) => setDistanceM(e.target.value)}
            className="w-full rounded-md border border-[#c0c7d0] px-2.5 py-1.5 text-xs text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
            placeholder="e.g., 5.0"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#061d30] mb-1">Pixel distance</label>
          <input
            type="number"
            value={pixelDistance}
            onChange={(e) => setPixelDistance(e.target.value)}
            className="w-full rounded-md border border-[#c0c7d0] px-2.5 py-1.5 text-xs text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
            placeholder="Measure on canvas"
          />
        </div>
        <button
          type="button"
          onClick={calculate}
          className="w-full rounded-md border border-[#c0c7d0] px-2.5 py-1.5 text-xs text-[#40484f] transition-colors hover:bg-[#f5f7fa]"
        >
          Calculate
        </button>
        <div>
          <label className="block text-xs font-medium text-[#061d30] mb-1">Meters per pixel</label>
          <input
            type="number"
            step="0.000001"
            value={metersPerPixel}
            onChange={(e) => setMetersPerPixel(e.target.value)}
            className="w-full rounded-md border border-[#c0c7d0] px-2.5 py-1.5 text-xs text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
          />
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate(Number(metersPerPixel))}
          disabled={!metersPerPixel || mutation.isPending}
          className="w-full rounded-md bg-[#006699] px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Saving..." : "Save Calibration"}
        </button>
      </div>
    </section>
  );
}
