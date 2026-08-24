import { defineConfig, devices } from '@playwright/test';

// Assumes the backend (`./gradlew bootRun` in server/) and the frontend
// (`bun run dev` in client/) are already running, per the README's "Running
// locally" steps. There's no `webServer` entry here on purpose: Playwright
// UI mode doesn't reliably detect an already-running dev server and would
// try to spawn a second one on the same port, which just hangs.
export default defineConfig({
	testDir: './e2e',
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'retain-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
	]
});
