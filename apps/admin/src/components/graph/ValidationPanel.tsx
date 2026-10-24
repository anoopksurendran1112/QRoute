import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { validateGraph } from "../../api/qr.ts";

export function ValidationPanel({ floorId }: { floorId: string }) {
  const [show, setShow] = useState(false);
  
  const { data, refetch, isFetching } = useQuery({
    queryKey: ["validation", floorId],
    queryFn: () => validateGraph(floorId),
    enabled: false,
  });

  const handleValidate = () => {
    setShow(true);
    refetch();
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <button
        type="button"
        onClick={handleValidate}
        disabled={isFetching}
        className="w-full rounded bg-slate-900 text-white px-3 py-1.5 text-sm disabled:opacity-50"
      >
        {isFetching ? "Validating..." : "Validate Graph"}
      </button>
      
      {show && data && (
        <div className="mt-3 space-y-2">
          <div className={`text-xs font-medium ${data.valid ? "text-green-600" : "text-red-600"}`}>
            {data.valid ? "✓ Valid" : "✗ Has Errors"}
          </div>
          <div className="text-xs text-slate-600">
            Nodes: {data.stats.nodeCount} • Edges: {data.stats.edgeCount} • Components: {data.stats.componentCount}
          </div>
          {data.issues.length > 0 && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {data.issues.map((issue: any, idx: number) => (
                <div
                  key={idx}
                  className={`text-xs p-2 rounded ${
                    issue.type === "error" ? "bg-red-50 text-red-700" : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  <div className="font-medium">{issue.code}</div>
                  <div>{issue.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
