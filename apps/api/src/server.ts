import { createPrismaClient } from "@patchwork/db";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createGitHubOAuth } from "./oauth.js";

const config = readConfig();
if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
const db = createPrismaClient(process.env.DATABASE_URL);
const app = createApp(db, createGitHubOAuth(config), config);
const port = Number(process.env.API_PORT ?? 4000);

const server = app.listen(port, () => console.log(`Patchwork API listening on port ${port}`));
process.on("SIGTERM", () => server.close(() => void db.$disconnect()));
process.on("SIGINT", () => server.close(() => void db.$disconnect()));
