import { defineConfig, devices } from "@playwright/test";
import { loadEnvLocal } from "./tests/e2e/helpers/env";

loadEnvLocal();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // One local retry: `next dev` compiles routes on first hit and a cold
  // compile can 404/stall a first visit; a retry hits the warm route.
  retries: process.env.CI ? 2 : 1,
  // Two workers locally: the dev server compiles routes on demand and four
  // parallel browsers push server actions past their timeouts.
  workers: process.env.CI ? 1 : 2,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  // Dev-server compiles routes on first hit; give assertions headroom so a
  // cold compile doesn't read as a failure.
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // Seeds ephemeral Supabase users (student / agents / admin) and captures
    // per-role storageState. The teardown project deletes everything it made.
    {
      name: "setup",
      testMatch: "**/global.setup.ts",
      teardown: "cleanup",
    },
    {
      name: "cleanup",
      testMatch: "**/global.teardown.ts",
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    // Guest flows re-run at a phone viewport; auth/agent/admin flows are
    // desktop-only to keep the matrix small.
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
      dependencies: ["setup"],
      testMatch: "**/guest/*.spec.ts",
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
