import fs from "node:fs";
import path from "node:path";

export const AUTH_DIR = path.resolve(process.cwd(), "playwright", ".auth");

export const STORAGE_STATE = {
  student: path.join(AUTH_DIR, "student.json"),
  agent: path.join(AUTH_DIR, "agent.json"),
  pendingAgent: path.join(AUTH_DIR, "pending-agent.json"),
  admin: path.join(AUTH_DIR, "admin.json"),
} as const;

export interface SeedCreds {
  email: string;
  password: string;
}

/** Everything global.setup.ts created; global.teardown.ts deletes it all. */
export interface SeedFile {
  userIds: string[];
  agentIds: string[];
  creds: {
    student: SeedCreds;
    agent: SeedCreds;
    pendingAgent: SeedCreds;
    admin: SeedCreds;
  };
}

const SEED_PATH = path.join(AUTH_DIR, "seed.json");

export function writeSeed(seed: SeedFile): void {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(SEED_PATH, JSON.stringify(seed, null, 2));
}

export function readSeed(): SeedFile {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as SeedFile;
}

export function seedExists(): boolean {
  return fs.existsSync(SEED_PATH);
}

export function removeSeedArtifacts(): void {
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}
