import { db } from "@/db";
import { events } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function getAllEvents() {
  try {
    const result = await db
      .select()
      .from(events)
      .orderBy(desc(events.startDate));

    return result;
  } catch (error) {
    console.error("❌ Failed to fetch events from Turso:", error);
    return [];
  }
}

export async function getEventById(id: string) {
  try {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`❌ Failed to fetch event with ID ${id}:`, error);
    return null;
  }
}