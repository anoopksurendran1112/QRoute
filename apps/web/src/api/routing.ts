import { api } from "./client.ts";

export async function getShortestPath(fromNodeId: string, toNodeId: string) {
  const res = await fetch(`${api.API_BASE}/v1/route/shortest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromNodeId, toNodeId }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to calculate route");
  }
  return res.json();
}
