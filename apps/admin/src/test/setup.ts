import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react does not auto-cleanup when globals are disabled.
afterEach(() => {
  cleanup();
  localStorage.clear();
});
