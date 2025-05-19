import { spawn } from "child_process";

console.log("Starting development environment...");

const server = spawn("npm", ["run", "server"], {
  stdio: "inherit",
  shell: true,
});

const client = spawn("npm", ["run", "client"], {
  stdio: "inherit",
  shell: true,
});

const cleanup = () => {
  console.log("Shutting down development environment...");
  server.kill();
  client.kill();
  process.exit();
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
