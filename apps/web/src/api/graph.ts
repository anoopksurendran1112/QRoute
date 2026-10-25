import { api } from "./client.ts";

export async function getGraphSnapshot() {
  try {
    const res = await fetch(`${api.API_BASE}/v1/graph/snapshot`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to fetch graph snapshot");
    }
    return res.json();
  } catch (e) {
    if ((e as Error).message.includes('Failed to fetch')) {
      throw new Error(`Network error: Unable to connect to server`);
    }
    throw e;
  }
}
