/** Database Transaction Management (mysql2) */
import { pool } from "../db.js";

export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  const conn = {
    query: async (sql, params = []) => {
      const [result] = await connection.query(sql, params);
      return result;
    },
    release: () => connection.release()
  };
  try {
    const result = await callback(conn);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
