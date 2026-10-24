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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">Calibration</h3>
      <p className="mt-1 text-xs text-slate-600">Set meters per pixel</p>
      
      <div className="mt-3 space-y-2">
        <div>
          <label className="block text-xs text-slate-600">Known distance (meters)</label>
          <input
            type="number"
            step="0.1"
            value={distanceM}
            onChange={(e) => setDistanceM(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            placeholder="e.g., 5.0"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-600">Pixel distance</label>
          <input
            type="number"
            value={pixelDistance}
            onChange={(e) => setPixelDistance(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            placeholder="Measure on canvas"
          />
        </div>
        <button
          type="button"
          onClick={calculate}
          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
        >
          Calculate
        </button>
        <div>
          <label className="block text-xs text-slate-600">Meters per pixel</label>
          <input
            type="number"
            step="0.000001"
            value={metersPerPixel}
            onChange={(e) => setMetersPerPixel(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate(Number(metersPerPixel))}
          disabled={!metersPerPixel || mutation.isPending}
          className="w-full rounded bg-blue-600 text-white px-2 py-1 text-xs disabled:opacity-50"
        >
          {mutation.isPending ? "Saving..." : "Save Calibration"}
        </button>
      </div>
    </div>
  );
}
