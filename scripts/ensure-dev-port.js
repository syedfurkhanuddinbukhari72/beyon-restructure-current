#!/usr/bin/env node

const killPort = require('kill-port');

const DEFAULT_PORT = 3000;
const port = Number.parseInt(process.env.PORT || DEFAULT_PORT, 10);

async function clearPort(targetPort) {
  try {
    await killPort(targetPort, 'tcp');
    console.log(`[dev] Cleared processes listening on port ${targetPort}.`);
  } catch (error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('no process running')) {
      console.log(`[dev] Port ${targetPort} already free.`);
    } else {
      console.warn(`[dev] Unable to clear port ${targetPort}: ${error.message || error}`);
    }
  }
}

clearPort(port).catch((error) => {
  console.warn(`[dev] Failed to ensure dev port ${port}: ${error.message || error}`);
});
