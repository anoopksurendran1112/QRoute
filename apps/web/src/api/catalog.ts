import { api } from "./client.ts";

async function fetchJson(path: string) {
  try {
    const res = await fetch(`${api.API_BASE}${path}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Failed to fetch ${path}`);
    }
    return res.json();
  } catch (e) {
    if ((e as Error).message.includes('Failed to fetch')) {
      throw new Error(`Network error: Unable to connect to ${api.API_BASE || 'server'}. Make sure API is running.`);
    }
    throw e;
  }
}

export async function getBuildings() {
  return fetchJson("/v1/buildings");
}

export async function getFloors() {
  return fetchJson("/v1/floors");
}

export async function getClassrooms() {
  return fetchJson("/v1/classrooms");
}

export async function getDepartments() {
  return fetchJson("/v1/departments");
}

export async function getFaculty() {
  return fetchJson("/v1/faculty");
}

export async function getAllCatalogData() {
  const [buildings, floors, classrooms, departments, faculty] = await Promise.all([
    getBuildings(),
    getFloors(),
    getClassrooms(),
    getDepartments(),
    getFaculty(),
  ]);
  return { buildings, floors, classrooms, departments, faculty };
}
