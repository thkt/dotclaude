import { NextResponse } from "next/server";
import { db } from "./db";

export async function GET() {
  const sensitive = await db.query("SELECT * FROM analytics_pii");
  return NextResponse.json(sensitive);
}
