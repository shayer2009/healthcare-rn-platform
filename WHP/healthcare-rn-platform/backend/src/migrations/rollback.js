/** Rollback Database Migrations */
import knex from "knex";
import knexfile from "./knexfile.js";

const environment = process.env.NODE_ENV || "development";
const config = knexfile[environment];

const db = knex(config);

async function rollback() {
  try {
    const batch = process.argv[2] || "1";
    console.log(`Rolling back ${batch} batch(es)...`);
    await db.migrate.rollback({}, true);
    console.log("Rollback completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Rollback failed:", error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

rollback();
