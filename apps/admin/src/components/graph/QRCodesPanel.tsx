import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { generateBulkQR } from "../../api/qr.ts";
import { getFloorGraph } from "../../api/graph.ts";

interface QrEntry {
  node: { id: string; code: string; label?: string | null };
  token: string;
  qrDataUrl: string;
}

export function QRCodesPanel({ floorId, floorLabel }: { floorId: string; floorLabel?: string }) {
  const [entries, setEntries] = useState<QrEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: graphData } = useQuery({
    queryKey: ["floor-graph", floorId],
    queryFn: () => getFloorGraph(floorId),
    enabled: !!floorId,
  });
  const nodeCount = graphData?.graph?.nodes?.length ?? 0;

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const ids: string[] = (graphData?.graph?.nodes ?? []).map((n: any) => n.id);
      if (ids.length === 0) {
        setError("This floor has no nodes to encode.");
        return;
      }
      const result = await generateBulkQR(ids);
      setEntries(result.qrCodes ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function print() {
    const w = window.open("", "_blank");
    if (!w) {
      setError("Popup blocked — allow popups to print QR sheets.");
      return;
    }
    w.document.write(`<!doctype html><html><head><title>QR codes — ${floorLabel ?? ""}</title>
      <style>
        body{font-family:system-ui,sans-serif;margin:24px}
        .sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .card{border:1px solid #ccc;border-radius:6px;padding:10px;text-align:center;page-break-inside:avoid}
        .code{font-weight:600;font-size:13px}
        .label{font-size:11px;color:#555}
        .token{font-size:8px;color:#888;word-break:break-all;margin-top:4px}
      </style></head><body>
      <h2>QR codes — ${floorLabel ?? "Floor"}</h2>
      <div class="sheet">`);
    entries.forEach((e) => {
      w.document.write(
        `<div class="card"><img src="${e.qrDataUrl}" width="160" height="160"/><div class="code">${e.node.code}</div><div class="label">${e.node.label ?? ""}</div><div class="token">${e.token}</div></div>`,
      );
    });
    w.document.write("</div></body></html>");
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#40484f]">{nodeCount} node(s) on this floor</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            disabled={busy}
            className="rounded-md bg-[#006699] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Generating…" : "Generate QR Codes"}
          </button>
          <button
            type="button"
            onClick={print}
            disabled={entries.length === 0}
            className="rounded-md bg-[#0F9D58] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#0b7a44] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Print Sheet
          </button>
        </div>
      </div>
      {error && <p className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">{error}</p>}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {entries.map((e) => (
            <div key={e.node.id} className="rounded-lg border border-[#d0e4ff] p-2 text-center hover:shadow-sm transition-shadow">
              <img src={e.qrDataUrl} alt={e.node.code} className="mx-auto h-20 w-20" />
              <div className="mt-1.5 truncate text-xs font-medium text-[#061d30]">{e.node.code}</div>
              {e.node.label && <div className="truncate text-[10px] text-[#707880]">{e.node.label}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
