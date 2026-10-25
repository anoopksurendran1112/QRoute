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
    <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px 3px 0_rgba(11,25,44,0.04)]">
      <div className="border-b border-[#d0e4ff] px-4 py-2.5 bg-[#f8f9ff]">
        <h3 className="text-sm font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
          Graph Validation
        </h3>
        <p className="text-xs text-[#40484f]">Check graph integrity</p>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={handleValidate}
          disabled={isFetching}
          className="w-full rounded-md bg-[#006699] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFetching ? "Validating..." : "Validate Graph"}
        </button>
        
        {show && data && (
          <div className="mt-3 space-y-2">
            <div className={`text-xs font-medium flex items-center gap-1 ${data.valid ? "text-[#0F9D58]" : "text-red-600"}`}>
              {data.valid ? "✓ Valid" : "✗ Has Issues"}
            </div>
            <div className="text-xs text-[#40484f] bg-[#f8f9ff] rounded-md p-2">
              Nodes: {data.stats.nodeCount} • Edges: {data.stats.edgeCount} • Components: {data.stats.componentCount}
            </div>
            {data.issues.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.issues.map((issue: any, idx: number) => (
                  <div
                    key={idx}
                    className={`text-xs p-2 rounded-md ${
                      issue.type === "error" ? "bg-red-50 text-red-700 border border-red-200" : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    <div className="font-medium">{issue.code}</div>
                    <div className="mt-0.5">{issue.message}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
