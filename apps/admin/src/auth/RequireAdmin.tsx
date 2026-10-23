// Route guard for admin-only screens.
//
// UX gate only: the API's requireRole("admin") is the real authorisation
// boundary. If a user token reaches here we render an explicit "Admin access
// required" panel (not a silent redirect to login) to avoid conflating
// authentication and authorisation.

import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider.tsx";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status, user, signOut } = useAuth();

  if (status === "loading") {
    return null;
  }

  if (status === "anonymous" || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Admin access required</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account does not have permission to access the QRoute admin panel.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
