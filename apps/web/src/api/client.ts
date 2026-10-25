// Use environment variable or fallback to current host
const getApiBase = () => {
  if ((import.meta as any).env?.VITE_API_BASE) {
    return (import.meta as any).env.VITE_API_BASE;
  }
  // Use relative path for dev/proxy or same origin
  return "";
};

const API_BASE = getApiBase();
console.log('API Base URL:', API_BASE || '(relative)');

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
