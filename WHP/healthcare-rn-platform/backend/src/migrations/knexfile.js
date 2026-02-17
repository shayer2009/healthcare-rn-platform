/** Knex Migration Configuration */
import dotenv from "dotenv";
dotenv.config();

export default {
  development: {
    client: "mariadb",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3307),
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
    client: "mariadb",
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
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
