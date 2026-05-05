import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = join(rootDir, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "build"], {
  env: {
    ...process.env,
    NEXT_DIST_DIR: ".next-build-check",
  },
  shell: false,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
