// Auth gate behaviour suite.
//
// These assertions are on rendered output and fetch call logs — never on
// source text. A token is forged client-side only to avoid relying on real
// signing keys for the UI gate; the API remains the authority.

import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../App.tsx";
import { AuthProvider } from "../auth/AuthProvider.tsx";

const TOKEN_KEY = "qroute.token";

function base64UrlEncode(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function createTestToken(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function renderApp(initialEntries: string[] = ["/"]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 0 },
      mutations: { retry: 0 },
    },
  });

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider queryClient={queryClient}>
          <AppRoutes />
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

function installFetchMock() {
  fetchCalls.length = 0;

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      fetchCalls.push({ url, init });

      if (url.includes("/auth/login")) {
        const body = init?.body;
        const parsed =
          typeof body === "string" ? (JSON.parse(body) as { email?: string; password?: string }) : {};
        if (parsed.email === "admin@sjcet.local" && parsed.password === "Admin@12345!") {
          const token = createTestToken({
            sub: "user-admin",
            role: "admin",
            email: "admin@sjcet.local",
            exp: Math.floor(Date.now() / 1000) + 3600,
          });
          return new Response(
            JSON.stringify({
              token,
              user: { id: "user-admin", email: "admin@sjcet.local", name: "Campus Administrator", role: "admin" },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        if (parsed.email === "student@sjcet.local" && parsed.password === "Student@12345!") {
          const token = createTestToken({
            sub: "user-student",
            role: "user",
            email: "student@sjcet.local",
            exp: Math.floor(Date.now() / 1000) + 3600,
          });
          return new Response(
            JSON.stringify({
              token,
              user: { id: "user-student", email: "student@sjcet.local", name: "Demo Student", role: "user" },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          );
        }
        return new Response(
          JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid email or password" } }),
          { status: 401, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Not found" } }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  installFetchMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth gate", () => {
  it("redirects an anonymous visitor to the login screen with no dashboard heading", async () => {
    renderApp(["/"]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /QRoute Admin/i })).toBeTruthy();
    });

    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Password/i)).toBeTruthy();
    expect(screen.queryByText(/Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Catalog management/i)).toBeNull();
  });

  it("logs in with valid credentials and lands on the dashboard with the user's email", async () => {
    renderApp(["/login"]);

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "admin@sjcet.local" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "Admin@12345!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/Dashboard/i)).toBeTruthy();
    });

    expect(screen.getByText(/admin@sjcet.local/i)).toBeTruthy();
    expect(screen.getByText(/\(admin\)/i)).toBeTruthy();

    const loginCall = fetchCalls.find((call) => call.url.includes("/auth/login"));
    expect(loginCall?.init?.method).toBe("POST");
    expect(loginCall?.url).toMatch(/\/v1\/auth\/login/);
  });

  it("keeps the user on the login screen with an invalid-credentials message on 401", async () => {
    renderApp(["/login"]);

    const { fireEvent } = await import("@testing-library/react");
    fireEvent.change(screen.getByLabelText(/Email/i), {
      target: { value: "admin@sjcet.local" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toBe("Invalid email or password");
    });

    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.queryByText(/Dashboard/i)).toBeNull();
  });

  it("renders Admin access required for a non-admin token with no catalog controls", async () => {
    const token = createTestToken({
      sub: "user-student",
      role: "user",
      email: "student@sjcet.local",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    localStorage.setItem(TOKEN_KEY, token);

    renderApp(["/"]);

    await waitFor(() => {
      expect(screen.getByText(/Admin access required/i)).toBeTruthy();
    });

    expect(screen.queryByText(/Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Catalog management/i)).toBeNull();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeTruthy();
  });

  it("discards a malformed stored token and lands on the login screen", async () => {
    localStorage.setItem(TOKEN_KEY, "not-a-jwt");

    renderApp(["/"]);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    });

    expect(screen.getByLabelText(/Password/i)).toBeTruthy();
    expect(screen.queryByText(/Dashboard/i)).toBeNull();
    expect(screen.queryByText(/Admin access required/i)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
