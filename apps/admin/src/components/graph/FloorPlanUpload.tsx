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
    <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
      <div className="border-b border-[#d0e4ff] px-4 py-2.5 bg-[#f8f9ff]">
        <h3 className="text-sm font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
          Upload Floor Plan
        </h3>
        <p className="text-xs text-[#40484f]">Add or update floor plan image</p>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-[#061d30] mb-1">Image (PNG/JPG)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-[#40484f] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#e0f2fe] file:text-[#004d75] hover:file:bg-[#bae6fd]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#061d30] mb-1">Meters per pixel (optional)</label>
          <input
            type="number"
            step="0.000001"
            min="0.000001"
            value={metersPerPixel}
            onChange={(e) => setMetersPerPixel(e.target.value)}
            className="w-full rounded-md border border-[#c0c7d0] px-2.5 py-1.5 text-xs text-[#061d30] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
            placeholder="e.g., 0.02"
          />
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!file || mutation.isPending}
          className="w-full rounded-md bg-[#006699] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending ? "Uploading…" : "Upload"}
        </button>
        {mutation.isError && (
          <p className="text-xs text-red-600">{(mutation.error as Error).message}</p>
        )}
        {mutation.isSuccess && <p className="text-xs text-[#0F9D58]">Upload successful — plan updated.</p>}
      </div>
    </section>
  );
}
