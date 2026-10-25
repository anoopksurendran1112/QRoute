import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  type RouteObject,
} from "react-router-dom";
import { RequireAdmin } from "./auth/RequireAdmin.tsx";
import { AdminLayout } from "./components/AdminLayout.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { BuildingsPage } from "./pages/catalog/BuildingsPage.tsx";
import { FloorsPage } from "./pages/catalog/FloorsPage.tsx";
import { ClassroomsPage } from "./pages/catalog/ClassroomsPage.tsx";
import { DepartmentsPage } from "./pages/catalog/DepartmentsPage.tsx";
import { FacultyPage } from "./pages/catalog/FacultyPage.tsx";
import { GraphEditorPage } from "./pages/GraphEditorPage.tsx";

function DashboardPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#061d30] mb-2" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
          Dashboard
        </h1>
        <p className="text-sm text-[#40484f]">
          Welcome to QRoute Admin - Campus Navigation Management System
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border border-[#d0e4ff] bg-white p-4 shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#525f75]">Buildings</p>
              <p className="text-2xl font-semibold text-[#061d30] mt-1">-</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#e0f2fe] flex items-center justify-center text-lg">
              🏢
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#d0e4ff] bg-white p-4 shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#525f75]">Floors</p>
              <p className="text-2xl font-semibold text-[#061d30] mt-1">-</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#f0fdf4] flex items-center justify-center text-lg">
              🏗️
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#d0e4ff] bg-white p-4 shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#525f75]">Nodes</p>
              <p className="text-2xl font-semibold text-[#061d30] mt-1">-</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#fefce8] flex items-center justify-center text-lg">
              📍
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-[#d0e4ff] bg-white p-4 shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#525f75]">QR Codes</p>
              <p className="text-2xl font-semibold text-[#061d30] mt-1">-</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#f3e8ff] flex items-center justify-center text-lg">
              📱
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-[#d0e4ff] bg-white shadow-[0_1px_3px_0_rgba(11,25,44,0.04)]">
        <div className="border-b border-[#d0e4ff] px-6 py-4">
          <h3 className="text-lg font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            System Overview
          </h3>
          <p className="mt-1 text-sm text-[#40484f]">
            QR-based indoor navigation system for campus wayfinding
          </p>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-[#40484f]">
            Use the sidebar to manage campus infrastructure, configure the navigation graph, and generate QR codes for wayfinding.
          </p>
        </div>
      </section>
    </AdminLayout>
  );
}

const routes: RouteObject[] = [
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAdmin>
        <DashboardPage />
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/buildings",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <BuildingsPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/floors",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <FloorsPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/classrooms",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <ClassroomsPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/departments",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <DepartmentsPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/faculty",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <FacultyPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  {
    path: "/graph-editor",
    element: (
      <RequireAdmin>
        <AdminLayout>
          <GraphEditorPage />
        </AdminLayout>
      </RequireAdmin>
    ),
  },
  { path: "*", element: <Navigate to="/" replace /> },
];

export function AppRoutes() {
  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path ?? "*"} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppRoutes />
      </QueryClientProvider>
    </BrowserRouter>
  );
}
