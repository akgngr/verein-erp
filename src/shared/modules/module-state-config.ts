import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const CONFIG_FILE = path.join(ROOT_DIR, "src", "config", "modules-state.json");

/** Read-only, framework-independent module state defaults. */
export function getModuleStates(): Record<string, boolean> {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const raw = fs.readFileSync(CONFIG_FILE, "utf8");
      return JSON.parse(raw);
    }
  } catch {
    // Okuma hatası durumunda varsayılan
  }

  return {
    auth: true,
    users: true,
    organization: true,
    audit: true,
    system: true,
    members: true,
    accounting: true,
    documents: true,
    meetings: true,
    donations: true,
  };
}
