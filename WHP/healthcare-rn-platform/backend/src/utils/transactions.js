/** Database Transaction Management */
import { pool } from "../db.js";

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Example usage:
// await withTransaction(async (conn) => {
//   await conn.query("INSERT INTO ...");
//   await conn.query("UPDATE ...");
// });
