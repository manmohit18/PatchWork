import { spawnSync } from "node:child_process";

const devUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;
if (!devUrl || !testUrl) throw new Error("Both database URLs are required");
const devName = decodeURIComponent(new URL(devUrl).pathname.slice(1));
const testName = decodeURIComponent(new URL(testUrl).pathname.slice(1));
if (devName === testName || !testName.endsWith("_test")) {
  throw new Error("Refusing unsafe test migration target");
}

const result = spawnSync("npm", ["run", "db:deploy"], {
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
});
process.exit(result.status ?? 1);
