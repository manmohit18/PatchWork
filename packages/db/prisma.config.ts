import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { fileURLToPath } from "node:url";

// npm workspace scripts run with packages/db as the working directory.
config({ path: fileURLToPath(new URL("../../.env", import.meta.url)), quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
