import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const files = process.argv.slice(2);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL. Example:");
  console.error('$env:DATABASE_URL="postgresql://user:password@host:5432/gen"; npm.cmd run db:setup');
  process.exit(1);
}

if (files.length === 0) {
  console.error("Pass at least one SQL file.");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1") ? undefined : { rejectUnauthorized: false }
});

try {
  await client.connect();
  for (const file of files) {
    const absolutePath = path.resolve(file);
    const sql = await readFile(absolutePath, "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
  }
  console.log("Database setup complete.");
} finally {
  await client.end().catch(() => {});
}
