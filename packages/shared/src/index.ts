// Barrel for @qroute/shared.
//
// Later plans append their own re-exports here (schemas/auth.ts,
// schemas/catalog.ts) so consumers never change their import path.

export * from "./domain.ts";
export * from "./schemas/auth.ts";
