import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "4173";
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  use: {
    baseURL,
    viewport: { width: 390, height: 844 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
