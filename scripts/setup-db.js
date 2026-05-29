require("dotenv").config();

const { db, getDbClient } = require("../src/db");
const { ensureSchema, seedDatabase } = require("../src/schema");

async function main() {
  await db.connect();
  await ensureSchema(db);
  await seedDatabase(db);
  const health = await db.get("SELECT COUNT(*) AS count FROM properties");
  console.log(`Database ready using ${getDbClient()}. Properties: ${health.count}`);
  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
