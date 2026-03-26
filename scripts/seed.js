import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initCmsDatabase } from "../lib/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, "..", "content", "site.json");

async function seed() {
  console.log("Starting database initialization...");
  try {
    const seedData = JSON.parse(await readFile(seedPath, "utf-8"));
    await initCmsDatabase({ seed: seedData });
    console.log("Database initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

seed();
