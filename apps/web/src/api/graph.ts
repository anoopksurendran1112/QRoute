import { api } from "./client.ts";

export async function getGraphSnapshot() {
  const res = await fetch(`${api.API_BASE}/v1/graph/snapshot`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to fetch graph snapshot");
  }
  return res.json();
}
