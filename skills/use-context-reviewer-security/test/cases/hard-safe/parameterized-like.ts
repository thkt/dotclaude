import { db } from "./db";

export async function searchUsers(query: string) {
  return db.query("SELECT * FROM users WHERE name LIKE $1", [`%${query}%`]);
}
