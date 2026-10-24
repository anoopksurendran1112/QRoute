import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadFloorPlan } from "../../api/graph.ts";

export function FloorPlanUpload({ floorId, onSuccess }: { floorId: string; onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [metersPerPixel, setMetersPerPixel] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Select a file");
      return uploadFloorPlan(floorId, file, metersPerPixel ? Number(metersPerPixel) : undefined);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["floors"] }),
        queryClient.invalidateQueries({ queryKey: ["floor-graph", floorId] }),
      ]);
      setFile(null);
      onSuccess?.();
    },
  });

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">Upload Floor Plan</h3>
      <div>
        <label className="block text-xs text-slate-600">Image (PNG/JPG)</label>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 block w-full text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-600">Meters per pixel (optional)</label>
        <input
          type="number"
          step="0.000001"
          min="0.000001"
          value={metersPerPixel}
          onChange={(e) => setMetersPerPixel(e.target.value)}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="e.g., 0.02"
        />
      </div>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={!file || mutation.isPending}
        className="w-full rounded bg-blue-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {mutation.isPending ? "Uploading…" : "Upload"}
      </button>
      {mutation.isError && (
        <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
      )}
      {mutation.isSuccess && <p className="text-xs text-green-600">Upload successful — the plan is now the canvas backdrop.</p>}
    </div>
  );
}
