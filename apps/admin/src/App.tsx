import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  Link,
  type RouteObject,
} from "react-router-dom";
import { RequireAdmin } from "./auth/RequireAdmin.tsx";
import { useAuth } from "./auth/AuthProvider.tsx";
import { LoginPage } from "./pages/LoginPage.tsx";
import { BuildingsPage } from "./pages/catalog/BuildingsPage.tsx";
import { FloorsPage } from "./pages/catalog/FloorsPage.tsx";
import { ClassroomsPage } from "./pages/catalog/ClassroomsPage.tsx";
import { DepartmentsPage } from "./pages/catalog/DepartmentsPage.tsx";
import { FacultyPage } from "./pages/catalog/FacultyPage.tsx";

function DashboardPage() {
  const { user, signOut } = useAuth();

  const links = [
    { to: "/catalog/buildings", label: "Buildings" },
    { to: "/catalog/floors", label: "Floors" },
    { to: "/catalog/classrooms", label: "Classrooms" },
    { to: "/catalog/departments", label: "Departments" },
    { to: "/catalog/faculty", label: "Faculty" },
  ];

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">QRoute Admin</h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as {user?.email} ({user?.role})
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
          >
            Sign out
          </button>
        </header>

        <nav className="mt-6 flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Dashboard</h2>
          <p className="mt-2 text-sm text-slate-600">
            Use the navigation above to manage buildings, floors, classrooms, departments and faculty.
          </p>
        </section>
      </div>
    </main>
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
        <BuildingsPage />
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/floors",
    element: (
      <RequireAdmin>
        <FloorsPage />
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/classrooms",
    element: (
      <RequireAdmin>
        <ClassroomsPage />
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/departments",
    element: (
      <RequireAdmin>
        <DepartmentsPage />
      </RequireAdmin>
    ),
  },
  {
    path: "/catalog/faculty",
    element: (
      <RequireAdmin>
        <FacultyPage />
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
