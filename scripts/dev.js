import { spawn } from "node:child_process";
import net from "node:net";

const isWindows = process.platform === "win32";
const shell = isWindows;

function findOpenPort(preferredPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on("error", () => resolve(findOpenPort(preferredPort + 1)));
    server.listen(preferredPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function run(name, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell,
    env: { ...process.env, ...extraEnv },
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`\n${name} exited with code ${code}.`);
    }
  });

  return child;
}

const backendPort = await findOpenPort(Number(process.env.PORT || 5001));
const frontendPort = await findOpenPort(5173);
const backendUrl = `http://localhost:${backendPort}`;
const frontendUrl = `http://localhost:${frontendPort}`;

console.log(`Starting UrbanWear backend on ${backendUrl} ...`);
const backend = run("backend", "node", ["server/server.js"], {
  PORT: String(backendPort),
  CORS_ORIGIN: frontendUrl,
});

setTimeout(() => {
  console.log(`Starting UrbanWear frontend on ${frontendUrl} ...`);
  run("frontend", isWindows ? "npx.cmd" : "npx", ["vite", "--config", "client/vite.config.js", "--port", String(frontendPort)], {
    VITE_API_PROXY_TARGET: backendUrl,
  });
}, 1500);

function shutdown() {
  backend.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
