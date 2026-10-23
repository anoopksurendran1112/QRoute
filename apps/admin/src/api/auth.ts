// Endpoint helpers for the auth surface.

import type { LoginInput, RegisterInput } from "@qroute/shared";
import { apiRequest } from "./client.ts";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface MeResponse {
  user: AuthUser;
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const body: LoginInput = { email, password };
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function registerRequest(
  email: string,
  password: string,
  name: string,
): Promise<LoginResponse> {
  const body: RegisterInput = { email, password, name };
  return apiRequest<LoginResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function meRequest(): Promise<MeResponse> {
  return apiRequest<MeResponse>("/auth/me", { method: "GET" });
}
