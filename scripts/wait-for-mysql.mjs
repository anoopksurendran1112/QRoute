#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const container = 'qroute-mysql';
const maxSeconds = 120;
const intervalSeconds = 2;

let attempts = 0;
const maxAttempts = Math.ceil(maxSeconds / intervalSeconds);

while (attempts < maxAttempts) {
  attempts += 1;
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', container], {
    encoding: 'utf8',
  });
  const status = (result.stdout || '').trim();
  console.log(`[wait-for-mysql] attempt ${attempts}/${maxAttempts}: ${status || '(empty)'}`);
  if (status === 'healthy') {
    process.exit(0);
  }
  if (status === 'unhealthy') {
    console.error(`[wait-for-mysql] container ${container} is unhealthy`);
    process.exit(1);
  }
  const waitMs = intervalSeconds * 1000;
  await new Promise((resolve) => setTimeout(resolve, waitMs));
}

console.error(`[wait-for-mysql] timeout after ${maxSeconds}s waiting for ${container} to become healthy`);
process.exit(1);
