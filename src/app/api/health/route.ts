import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    const result = await db.execute(sql`SELECT NOW() AS now`);

    return Response.json({
      success: true,
      database: "connected",
      time: result[0]?.now ?? null,
    });
  } catch (error) {
    console.error("Health check failed:", error);

    return Response.json(
      {
        success: false,
        database: "disconnected",
      },
      { status: 500 },
    );
  }
}
