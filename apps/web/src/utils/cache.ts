const GRAPH_CACHE_KEY = "qroute_graph_cache";
const GRAPH_REVISION_KEY = "qroute_graph_revision";

export function saveGraphSnapshot(data: any, revision?: number) {
  try {
    localStorage.setItem(GRAPH_CACHE_KEY, JSON.stringify(data));
    if (revision !== undefined) {
      localStorage.setItem(GRAPH_REVISION_KEY, String(revision));
    }
  } catch (e) {
    console.warn("Failed to cache graph snapshot", e);
  }
}

export function getCachedGraphSnapshot() {
  try {
    const data = localStorage.getItem(GRAPH_CACHE_KEY);
    const revision = localStorage.getItem(GRAPH_REVISION_KEY);
    if (!data) return null;
    return { data: JSON.parse(data), revision: revision ? Number(revision) : null };
  } catch (e) {
    console.warn("Failed to read cached graph snapshot", e);
    return null;
  }
}
