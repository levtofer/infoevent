import "server-only";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Verifies the current request has a valid admin session.
 * Throws if there is no session cookie or it doesn't match a real user.
 * Call this at the top of any server action that writes data.
 */
export async function requireAdminSession() {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get("admin_session")?.value;

  if (!sessionUserId) {
    throw new Error("Not authenticated (´w`)");
  }

  const userList = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionUserId))
    .limit(1);

  if (userList.length === 0) {
    throw new Error("Session is no longer valid, please log in again (TwT)");
  }

  return userList[0];
}

/**
 * Non-throwing check for server components (pages) that just need to know
 * whether to show admin-only UI (Edit/Delete buttons, etc). Returns false
 * on any error instead of throwing, since a public page shouldn't crash
 * just because a visitor isn't an admin.
 */
export async function getIsAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionUserId = cookieStore.get("admin_session")?.value;
    if (!sessionUserId) return false;

    const userList = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUserId))
      .limit(1);

    return userList.length > 0;
  } catch {
    return false;
  }
}