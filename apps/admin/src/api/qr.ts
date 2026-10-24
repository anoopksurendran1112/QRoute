import { apiRequest } from "./client.ts";

export async function generateQR(nodeId: string): Promise<any> {
  return apiRequest(`/v1/qr/nodes/${nodeId}`);
}

export async function generateBulkQR(nodeIds: string[]): Promise<any> {
  return apiRequest("/v1/qr/bulk", { method: "POST", body: JSON.stringify({ nodeIds }) });
}

export async function validateGraph(floorId: string): Promise<any> {
  return apiRequest(`/v1/graph/floors/${floorId}/validate`);
}
