// Use environment variable or fallback to current host
const getApiBase = () => {
  if ((import.meta as any).env?.VITE_API_BASE) {
    return (import.meta as any).env.VITE_API_BASE;
  }
  // For mobile devices on same network, use the current hostname
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    // If running on localhost, try localhost:4000, else use same host:4000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    return `${protocol}//${hostname}:4000`;
  }
  return "http://localhost:4000";
};

const API_BASE = getApiBase();

async function postJson(path: string, body: unknown) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || res.statusText);
    }
    return res.json();
  } catch (e) {
    if ((e as Error).message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to connect to server. Make sure API is running and accessible.');
    }
    throw e;
  }
}

export const api = { postJson, API_BASE };
