import { readFileSync } from "node:fs";
import path from "node:path";
import { close, q } from "./db";

async function main() {
  const schema = readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  // Neon's HTTP driver runs one statement per request, so split on statement boundaries.
  const statements = schema
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  for (const s of statements) await q(s);
  console.log(`✔ Applied ${statements.length} schema statements.`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
