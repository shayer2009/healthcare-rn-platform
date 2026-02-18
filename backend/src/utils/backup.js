/** Automated Database Backup Utility */
import { exec } from "child_process";
import { promisify } from "util";
import logger from "./logger.js";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync } from "fs";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, "../../backups");

if (!existsSync(BACKUP_DIR)) {
  mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`);

  const {
    DB_HOST = "127.0.0.1",
    DB_PORT = 3307,
    DB_USER = "health_user",
    DB_PASSWORD = "health_pass",
    DB_NAME = "healthcare_app"
  } = process.env;

  try {
    const command = `mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > ${backupFile}`;
    await execAsync(command);
    
    logger.info("Database backup completed", { backupFile });
    return backupFile;
  } catch (error) {
    logger.error("Database backup failed", { error: error.message });
    throw error;
  }
}

// Run backup daily (can be called from cron job)
export function scheduleBackups() {
  // This would be called from a cron job or scheduled task
  // Example: node -e "import('./src/utils/backup.js').then(m => m.backupDatabase())"
}
