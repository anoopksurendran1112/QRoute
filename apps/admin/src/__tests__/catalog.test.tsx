// Catalog UI behaviour suite.
//
// Covers every entity screen, the create/edit/delete round-trip, cancelled
// deletion, API conflict messaging, and the calibration/entrance visibility
// required by ADMIN-01.

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { BuildingsPage } from "../pages/catalog/BuildingsPage.tsx";
import { FloorsPage } from "../pages/catalog/FloorsPage.tsx";
import { ClassroomsPage } from "../pages/catalog/ClassroomsPage.tsx";
import { DepartmentsPage } from "../pages/catalog/DepartmentsPage.tsx";
import { FacultyPage } from "../pages/catalog/FacultyPage.tsx";

const TOKEN_KEY = "qroute.token";

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createTestToken(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

const buildingsData = [
  { id: "b1", code: "MAIN", name: "Main Block", campus: "SJCET Palai" },
];

const floorsData = [
  {
    id: "f1",
    buildingId: "b1",
    level: 0,
    name: "Main Block — Level 0",
    imagePath: null,
    imageSha256: null,
    widthPx: 900,
    heightPx: 600,
    metersPerPixel: "0.02",
    building: { id: "b1", code: "MAIN", name: "Main Block" },
  },
];

const departmentsData = [
  { id: "d1", name: "Computer Science and Engineering", code: "CSE" },
];

const classroomsData = [
  {
    id: "c1",
    roomNumber: "101",
    name: "Room 101",
    floorId: "f1",
    departmentId: "d1",
    entranceNodeId: null,
    capacity: 60,
    floor: { id: "f1", level: 0, name: "Main Block — Level 0", building: { id: "b1", code: "MAIN", name: "Main Block" } },
    department: { id: "d1", name: "Computer Science and Engineering", code: "CSE" },
  },
];

const facultyData = [
  {
    id: "fac1",
    name: "Anita Joseph",
    email: "anita.joseph@sjcet.local",
    designation: "Professor",
    departmentId: "d1",
    department: { id: "d1", name: "Computer Science and Engineering", code: "CSE" },
  },
];

function installFetchMock() {
  fetchCalls.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      const method = init?.method ?? "GET";
      fetchCalls.push({ url, init });

      if (method === "GET" && url.includes("/buildings")) {
        return new Response(JSON.stringify({ buildings: buildingsData }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "GET" && url.includes("/floors")) {
        return new Response(JSON.stringify({ floors: floorsData }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "GET" && url.includes("/classrooms")) {
        return new Response(JSON.stringify({ classrooms: classroomsData }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "GET" && url.includes("/departments")) {
        return new Response(JSON.stringify({ departments: departmentsData }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "GET" && url.includes("/faculty")) {
        return new Response(JSON.stringify({ faculty: facultyData }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "POST" && url.includes("/buildings")) {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        return new Response(JSON.stringify({ building: { id: "b2", ...body } }), { status: 201, headers: { "content-type": "application/json" } });
      }
      if (method === "PATCH" && url.includes("/buildings/")) {
        const body = typeof init?.body === "string" ? JSON.parse(init.body) : {};
        return new Response(JSON.stringify({ building: { id: "b1", code: "MAIN", name: "Main Block", campus: "SJCET Palai", ...body } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (method === "DELETE" && url.includes("/buildings/b1")) {
        return new Response(null, { status: 204 });
      }
      if (method === "DELETE" && url.includes("/buildings/blocked")) {
        return new Response(JSON.stringify({ error: { code: "CONFLICT", message: "Building MAIN still has 2 floor(s). Delete the floors first." } }), { status: 409, headers: { "content-type": "application/json" } });
      }

      return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404, headers: { "content-type": "application/json" } });
    }),
  );
}

function renderPage(element: React.ReactElement, path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 }, mutations: { retry: 0 } } });
  const token = createTestToken({ sub: "admin1", role: "admin", email: "admin@sjcet.local", exp: Math.floor(Date.now() / 1000) + 3600 });
  localStorage.setItem(TOKEN_KEY, token);

  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <Routes>
            <Route path="/catalog/buildings" element={<BuildingsPage />} />
            <Route path="/catalog/floors" element={<FloorsPage />} />
            <Route path="/catalog/classrooms" element={<ClassroomsPage />} />
            <Route path="/catalog/departments" element={<DepartmentsPage />} />
            <Route path="/catalog/faculty" element={<FacultyPage />} />
          </Routes>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  installFetchMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog UI", () => {
  it("renders all five catalog pages with their records", async () => {
    renderPage(<BuildingsPage />, "/catalog/buildings");
    await waitFor(() => expect(screen.getByText("Main Block")).toBeTruthy());

    renderPage(<FloorsPage />, "/catalog/floors");
    await waitFor(() => expect(screen.getByText("0.02")).toBeTruthy());

    renderPage(<ClassroomsPage />, "/catalog/classrooms");
    await waitFor(() => expect(screen.getByText("101")).toBeTruthy());
    await waitFor(() => expect(screen.getByText("No")).toBeTruthy());

    renderPage(<DepartmentsPage />, "/catalog/departments");
    await waitFor(() => expect(screen.getByText("CSE")).toBeTruthy());

    renderPage(<FacultyPage />, "/catalog/faculty");
    await waitFor(() => expect(screen.getByText("Anita Joseph")).toBeTruthy());
  });

  it("creates a building via the form and issues a POST", async () => {
    renderPage(<BuildingsPage />, "/catalog/buildings");
    await waitFor(() => expect(screen.getByText("Main Block")).toBeTruthy());

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("button", { name: /New building/i }));
    fireEvent.change(screen.getByLabelText(/Code/i), { target: { value: "CSB" } });
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Computer Science Block" } });
    fireEvent.click(screen.getByRole("button", { name: /Create/i }));

    await waitFor(() => {
      const post = fetchCalls.find((call) => (call.init?.method ?? "GET") === "POST" && call.url.includes("/buildings"));
      expect(post).toBeTruthy();
    });
  });

  it("edits a building and issues a PATCH", async () => {
    renderPage(<BuildingsPage />, "/catalog/buildings");
    await waitFor(() => expect(screen.getByText("Main Block")).toBeTruthy());

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: "Main Block Renamed" } });
    fireEvent.click(screen.getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      const patch = fetchCalls.find((call) => call.init?.method === "PATCH" && call.url.includes("/buildings/"));
      expect(patch).toBeTruthy();
    });
  });

  it("cancelling delete issues no DELETE request; confirming issues one", async () => {
    renderPage(<BuildingsPage />, "/catalog/buildings");
    await waitFor(() => expect(screen.getByText("Main Block")).toBeTruthy());

    const { fireEvent } = await import("@testing-library/react");
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);
    await waitFor(() => expect(screen.getByText(/Confirm deletion/i)).toBeTruthy());
    const cancelButtons = screen.getAllByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelButtons[cancelButtons.length - 1]!);
    expect(fetchCalls.filter((call) => call.init?.method === "DELETE")).toHaveLength(0);

    const deleteButtons2 = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons2[deleteButtons2.length - 1]!);
    await waitFor(() => expect(screen.getByText(/Confirm deletion/i)).toBeTruthy());
    const confirmButtons = screen.getAllByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      const deletes = fetchCalls.filter((call) => call.init?.method === "DELETE");
      expect(deletes.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders the API conflict message on 409", async () => {
    fetchCalls.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
        const method = init?.method ?? "GET";
        fetchCalls.push({ url, init });
        if (method === "GET" && url.includes("/buildings")) {
          return new Response(JSON.stringify({ buildings: [{ id: "blocked", code: "MAIN", name: "Main Block", campus: "SJCET" }] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (method === "DELETE" && url.includes("/buildings/blocked")) {
          return new Response(JSON.stringify({ error: { code: "CONFLICT", message: "Building MAIN still has 2 floor(s). Delete the floors first." } }), { status: 409, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), { status: 404, headers: { "content-type": "application/json" } });
      }),
    );

    renderPage(<BuildingsPage />, "/catalog/buildings");
    await waitFor(() => expect(screen.getByText("Main Block")).toBeTruthy());

    const { fireEvent } = await import("@testing-library/react");
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);
    await waitFor(() => expect(screen.getByText(/Confirm deletion/i)).toBeTruthy());
    const confirmButtons = screen.getAllByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]!);

    await waitFor(() => {
      expect(screen.getByText(/Delete the floors first/i)).toBeTruthy();
    });
  });
});
