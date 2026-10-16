import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { createPrismaClient } from "@patchwork/db";

loadEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });

function databaseName(url: string): string {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.slice(1));
}

export default async function setup(): Promise<void> {
  const devUrl = process.env.DATABASE_URL;
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!devUrl || !testUrl) throw new Error("Both DATABASE_URL and TEST_DATABASE_URL are required for integration tests");
  if (databaseName(devUrl) === databaseName(testUrl)) throw new Error("Test database name matches development database; refusing to run");
  if (!databaseName(testUrl).endsWith("_test")) throw new Error("Test database name must end in _test");

  const dev = createPrismaClient(devUrl);
  const test = createPrismaClient(testUrl);
  try {
    type Identity = { database: string; host: string | null; port: number; schema: string };
    const [devIdentity] = await dev.$queryRawUnsafe<Identity[]>("SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port, current_schema() AS schema");
    const [testIdentity] = await test.$queryRawUnsafe<Identity[]>("SELECT current_database() AS database, inet_server_addr()::text AS host, inet_server_port() AS port, current_schema() AS schema");
    if (!devIdentity || !testIdentity) throw new Error("Could not identify both databases");
    if (JSON.stringify(devIdentity) === JSON.stringify(testIdentity)) throw new Error("Test URL resolves to development database; refusing to run");
  } finally {
    await Promise.all([dev.$disconnect(), test.$disconnect()]);
  }
}
