import { db } from "./db";

export async function createUser(name: string) {
  await db.query("INSERT INTO users (name) VALUES ($1)", [name]);
}

export async function listUserOrders(userId: string) {
  const user = await db.query("SELECT name FROM users WHERE id = $1", [userId]);
  const tenant = user.rows[0].name;
  return db.query(`SELECT * FROM orders_${tenant}`);
}
