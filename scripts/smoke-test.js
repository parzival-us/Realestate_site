require("dotenv").config();

const { db } = require("../src/db");
const { ensureSchema, seedDatabase } = require("../src/schema");

async function main() {
  await db.connect();
  await ensureSchema(db);
  await seedDatabase(db);

  const properties = await db.all("SELECT id, title, listing_type, city FROM properties ORDER BY id LIMIT 3");
  const content = await db.get("SELECT title FROM content_blocks WHERE slug = ?", ["hero"]);
  const admin = await db.get("SELECT email, role FROM users WHERE role = ?", ["admin"]);

  console.log("Smoke test passed");
  console.log(`Hero: ${content.title}`);
  console.log(`Admin: ${admin.email} (${admin.role})`);
  console.log(`Sample properties: ${properties.map((item) => item.title).join(", ")}`);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
