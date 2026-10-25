import { api } from "./client.ts";

export async function getBuildings() {
  const res = await fetch(`${api.API_BASE}/v1/catalog/buildings`);
  if (!res.ok) throw new Error("Failed to fetch buildings");
  return res.json();
}

export async function getFloors() {
  const res = await fetch(`${api.API_BASE}/v1/catalog/floors`);
  if (!res.ok) throw new Error("Failed to fetch floors");
  return res.json();
}

export async function getClassrooms() {
  const res = await fetch(`${api.API_BASE}/v1/catalog/classrooms`);
  if (!res.ok) throw new Error("Failed to fetch classrooms");
  return res.json();
}

export async function getDepartments() {
  const res = await fetch(`${api.API_BASE}/v1/catalog/departments`);
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

export async function getFaculty() {
  const res = await fetch(`${api.API_BASE}/v1/catalog/faculty`);
  if (!res.ok) throw new Error("Failed to fetch faculty");
  return res.json();
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
