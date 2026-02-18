/** Knex Migration Configuration */
import dotenv from "dotenv";
dotenv.config();

const dbPort = Number(process.env.DB_PORT || 3307);
const isDO = process.env.DB_SSL === "true" || dbPort === 25060;

const productionConnection = {
  host: process.env.DB_HOST,
  port: dbPort,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};
if (isDO) {
  productionConnection.ssl = { rejectUnauthorized: false };
}

export default {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: dbPort,
      user: process.env.DB_USER || "health_user",
      password: process.env.DB_PASSWORD || "health_pass",
      database: process.env.DB_NAME || "healthcare_app"
    },
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations"
    }
  },
  production: {
    client: "mysql2",
    connection: productionConnection,
    migrations: {
      directory: "./migrations",
      tableName: "knex_migrations"
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};
