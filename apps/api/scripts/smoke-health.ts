// End-to-end gate for plan 01-02: start a real server on an ephemeral port,
// make a real HTTP request, require a real database round-trip.
//
// The exit code is the only signal the plan's verify block has, so nothing here
// may swallow an error.

import { createApp } from "../src/app.ts";
import { disconnectPrisma } from "../src/lib/prisma.ts";

const app = createApp();
const server = app.listen(0);

function fail(message: string, detail?: unknown): void {
  console.error(`[smoke:health] FAIL — ${message}`);
  if (detail !== undefined) console.error(detail);
  process.exitCode = 1;
}

async function run(): Promise<void> {
  const address = server.address();
  if (address === null || typeof address === "string") {
    fail("server did not bind to a TCP port");
    return;
  }

  const url = `http://127.0.0.1:${address.port}/v1/health`;

  try {
    const response = await fetch(url);
    const body: unknown = await response.json();

    if (response.status !== 200) {
      fail(`expected HTTP 200, observed ${response.status}`, body);
      return;
    }

    if (
      typeof body !== "object" ||
      body === null ||
      (body as Record<string, unknown>)["db"] !== "ok"
    ) {
      fail("expected body.db === \"ok\"", body);
      return;
    }

    console.log(`[smoke:health] OK — ${response.status} ${JSON.stringify(body)}`);
  } catch (error) {
    fail(`request to ${url} failed`, error);
  }
}

run().finally(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await disconnectPrisma();
});
