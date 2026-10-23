import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { disconnectPrisma } from "./lib/prisma.ts";

// config is imported first on purpose: an invalid environment throws here,
// before a socket is opened.
const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`QRoute API listening on http://127.0.0.1:${config.port}`);
});

let shuttingDown = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, shutting down`);

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await disconnectPrisma();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
