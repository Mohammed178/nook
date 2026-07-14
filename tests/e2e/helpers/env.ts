import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env.local loader for the Playwright process (config, setup,
 * teardown). Next.js loads .env.local for the app itself; this covers the
 * test runner side without adding a dotenv dependency. Never overrides
 * variables already present in the environment.
 */
export function loadEnvLocal(): void {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
