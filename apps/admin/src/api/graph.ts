import { apiRequest } from "./client.ts";

export async function uploadFloorPlan(
  floorId: string,
  file: File,
  metersPerPixel?: number,
): Promise<any> {
  const formData = new FormData();
  formData.append("image", file);
  if (metersPerPixel !== undefined) {
    formData.append("metersPerPixel", String(metersPerPixel));
  }

  const token = localStorage.getItem("qroute.token");
  const res = await fetch(`/v1/graph/floors/${floorId}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: "Upload failed" } }));
    throw new Error(error.error?.message || "Upload failed");
  }

  return res.json();
}

export async function getFloorGraph(floorId: string): Promise<any> {
  return apiRequest(`/v1/graph/floors/${floorId}/graph`);
}

export async function createNode(data: any): Promise<any> {
  return apiRequest("/v1/graph/nodes", { method: "POST", body: JSON.stringify(data) });
}

export async function updateNode(id: string, data: any): Promise<any> {
  return apiRequest(`/v1/graph/nodes/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteNode(id: string): Promise<void> {
  return apiRequest(`/v1/graph/nodes/${id}`, { method: "DELETE" });
}

export async function createEdge(data: any): Promise<any> {
  return apiRequest("/v1/graph/edges", { method: "POST", body: JSON.stringify(data) });
}

export async function updateEdge(id: string, data: any): Promise<any> {
  return apiRequest(`/v1/graph/edges/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteEdge(id: string): Promise<void> {
  return apiRequest(`/v1/graph/edges/${id}`, { method: "DELETE" });
}
