import { api } from "./client.ts";

export async function getShortestPath(fromNodeId: string, toNodeId: string) {
  try {
    const res = await fetch(`${api.API_BASE}/v1/routes/compute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromNodeId, toNodeId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to calculate route");
    }
    return res.json();
  } catch (e) {
    if ((e as Error).message.includes('Failed to fetch')) {
      throw new Error(`Network error: Unable to connect to server`);
    }
    throw e;
  }
}
