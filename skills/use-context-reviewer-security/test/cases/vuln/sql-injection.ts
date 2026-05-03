import { db } from "./db";

export async function getUserById(id: string) {
  return db.query(`SELECT * FROM users WHERE id = '${id}'`);
}
