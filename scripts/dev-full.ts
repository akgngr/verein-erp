import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const env = {
  ...process.env,
  // Local full-stack development is opt-in through this command only.
  // This command explicitly means full-stack local testing, so both local gates are on.
  AUTOMATION_ENABLED: "true",
  AUTOMATION_WORKER_ENABLED: "true",
};

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const prepare = spawnSync(pnpm, ["run", "predev"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit",
});

if (prepare.error) {
  console.error("[dev:full] Ön hazırlık başlatılamadı.");
  process.exitCode = 1;
} else if (prepare.status !== 0) {
  process.exitCode = prepare.status ?? 1;
} else {
  const children: ChildProcess[] = [];
  let stopping = false;

  const stop = (exitCode: number) => {
    if (stopping) return;
    stopping = true;
    process.exitCode = exitCode;

    for (const child of children) {
      if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
    }

    const forceExit = setTimeout(() => {
      for (const child of children) {
        if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
      }
    }, 10_000);
    forceExit.unref();
  };

  const start = (name: string, script: string) => {
    const child = spawn(pnpm, ["run", script], {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    });
    children.push(child);

    child.once("error", () => {
      console.error("[dev:full] " + name + " süreci başlatılamadı.");
      stop(1);
    });
    child.once("exit", (code) => {
      if (!stopping) {
        console.info("[dev:full] " + name + " süreci durdu.");
        stop(code ?? 1);
      }
    });
  };

  process.once("SIGINT", () => stop(130));
  process.once("SIGTERM", () => stop(143));

  console.info("[dev:full] Web ve automation worker tek terminalden başlatılıyor.");
  console.info("[dev:full] Durdurmak için Ctrl+C kullanın.");
  start("web", "dev:web");
  start("worker", "automation:worker");
}
