// Credential form wired through the AuthProvider.

import { FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { ApiError } from "../api/client.ts";
import { useAuth } from "../auth/AuthProvider.tsx";

export function LoginPage() {
  const { status, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/";

  if (status === "authenticated") {
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await signIn(email, password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 429) {
          setError(err.message);
        } else if (err.status === 401) {
          setError("Invalid email or password");
        } else {
          setError(err.message);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Sign in failed");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f9ff] px-4 py-10 flex items-center justify-center">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#006699] shadow-sm">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-[#061d30]" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            QRoute Admin
          </h1>
          <p className="mt-2 text-sm text-[#40484f]">Campus Navigation Management Portal</p>
        </div>

        <div className="rounded-lg border border-[#d0e4ff] bg-white p-6 shadow-[0_1px_3px_0_rgba(11,25,44,0.04),0_1px_2px_-1px_rgba(11,25,44,0.04)]">
          <h2 className="text-lg font-semibold text-[#061d30] mb-1" style={{ fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
            Sign In
          </h2>
          <p className="text-sm text-[#40484f] mb-6">Access the campus navigation administration panel</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[#061d30]">Email Address</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-md border border-[#c0c7d0] px-3 py-2 text-sm text-[#061d30] placeholder:text-[#707880] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
                placeholder="admin@sjcet.local"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[#061d30]">Password</span>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-[#c0c7d0] px-3 py-2 text-sm text-[#061d30] placeholder:text-[#707880] focus:border-[#006699] focus:outline-none focus:ring-1 focus:ring-[#006699]/20"
                placeholder="Enter your password"
              />
            </label>

            {error ? (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
                <p role="alert" className="text-sm text-[#ba1a1a]">
                  {error}
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 rounded-md bg-[#006699] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004b72] disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#006699]/30"
            >
              {pending ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-[#707880]">
          QR-Based Indoor Navigation System
        </p>
      </div>
    </main>
  );
}
