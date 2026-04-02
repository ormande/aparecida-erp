import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const envPath = resolve(root, ".env");
if (existsSync(envPath) && !process.env.DATABASE_URL) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)$/);
    if (m) {
      process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
      break;
    }
  }
}

const p = new PrismaClient();
try {
  const rows = await p.$queryRaw`SELECT * FROM pg_extension WHERE extname = 'unaccent'`;
  console.log(rows);
} finally {
  await p.$disconnect();
}
