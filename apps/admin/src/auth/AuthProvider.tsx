// Session state with localStorage persistence.
//
// The token and decoded user are persisted so a page refresh keeps the admin
// signed in. On mount the token is revalidated (expired/malformed → discard),
// and ApiError 401s flow through the client's single hook to call signOut().
// The role used by RequireAdmin comes from decodeToken, not the raw response
// body, matching the threat model's separation of UI convenience from authority.

import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient } from "@tanstack/react-query";
import { loginRequest, type AuthUser } from "../api/auth.ts";
import { setOnUnauthorized } from "../api/client.ts";
import { decodeToken, isExpired } from "../lib/jwt.ts";

const TOKEN_KEY = "qroute.token";
const USER_KEY = "qroute.user";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

function readStoredSession(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }

    const payload = decodeToken(token);
    if (!payload || isExpired(payload)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return { token: null, user: null };
    }

    const storedUser = localStorage.getItem(USER_KEY);
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as StoredUser;
        if (
          typeof parsed.id === "string" &&
          typeof parsed.email === "string" &&
          typeof parsed.name === "string" &&
          (parsed.role === "user" || parsed.role === "admin")
        ) {
          return { token, user: parsed };
        }
      } catch {
        // Fall through to decode from the token.
      }
    }

    return {
      token,
      user: {
        id: payload.sub,
        email: payload.email,
        name: payload.email,
        role: payload.role,
      },
    };
  } catch {
    return { token: null, user: null };
  }
}

function writeSession(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage can be unavailable in some test environments; the session
    // still lives in React state for the current load.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export interface AuthProviderProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function AuthProvider({ children, queryClient }: AuthProviderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    const session = readStoredSession();
    setToken(session.token);
    setUser(session.user);
    setStatus(session.token ? "authenticated" : "anonymous");
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setToken(null);
      setUser(null);
      setStatus("anonymous");
      if (queryClient) {
        queryClient.clear();
      }
    };

    setOnUnauthorized(handleUnauthorized);
    return () => setOnUnauthorized(null);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      status,
      signIn: async (email: string, password: string) => {
        const response = await loginRequest(email, password);
        const payload = decodeToken(response.token);
        if (!payload || isExpired(payload)) {
          throw new Error("The session token was invalid.");
        }

        // The role is taken from the signed token (UI convenience only), never
        // trusted from an arbitrary claim in the response body alone.
        const sessionUser: AuthUser = {
          id: payload.sub,
          email: response.user?.email ?? payload.email,
          name: response.user?.name ?? response.user?.email ?? payload.email,
          role: payload.role,
        };

        writeSession(response.token, sessionUser);
        setToken(response.token);
        setUser(sessionUser);
        setStatus("authenticated");
        return sessionUser;
      },
      signOut: () => {
        clearSession();
        setToken(null);
        setUser(null);
        setStatus("anonymous");
        if (queryClient) {
          queryClient.clear();
        }
      },
    }),
    [token, user, status, queryClient],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error("useAuth() must be used within an AuthProvider");
  }
  return context;
}
