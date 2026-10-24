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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-medium text-slate-900">QR Codes</h3>
      <p className="mt-1 text-xs text-slate-600">{nodeCount} node(s) on this floor</p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="flex-1 rounded bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          {busy ? "Generating…" : "Generate"}
        </button>
        <button
          type="button"
          onClick={print}
          disabled={entries.length === 0}
          className="flex-1 rounded bg-green-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
        >
          Print sheet
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {entries.length > 0 && (
        <div className="mt-3 grid max-h-56 grid-cols-3 gap-2 overflow-y-auto">
          {entries.map((e) => (
            <div key={e.node.id} className="rounded border border-slate-200 p-1 text-center">
              <img src={e.qrDataUrl} alt={e.node.code} className="mx-auto h-16 w-16" />
              <div className="mt-1 truncate text-[10px] font-medium text-slate-800">{e.node.code}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
