import { db } from "./db";

function escape(s: string): string {
  return s.replace(/'/g, "''");
}

export async function searchUsers(query: string) {
  const safe = escape(query);
  return db.query(`SELECT * FROM users WHERE name LIKE '%${safe}%'`);
}
