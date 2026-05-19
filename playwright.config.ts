import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 1435);
const baseURL = `http://127.0.0.1:${port}`;
const includeLocalLlm = process.env.E2E_LOCAL_LLM === "true";

const chromiumProject = {
  name: "chromium",
  testIgnore: ["**/*.setup.ts", "**/*llm.spec.ts"],
  use: { ...devices["Desktop Chrome"] },
};

const localLlmProjects = [
  {
    name: "setup-local-llm",
    testMatch: "**/local-llm.setup.ts",
  },
  {
    name: "local-llm",
    testMatch: "**/local-llm.spec.ts",
    dependencies: ["setup-local-llm"],
    workers: 1,
    use: { ...devices["Desktop Chrome"] },
  },
];

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: includeLocalLlm
    ? [chromiumProject, ...localLlmProjects]
    : [chromiumProject],
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      VITE_E2E: "true",
    },
  },
});
