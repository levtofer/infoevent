import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),

  locationName: text("location_name").notNull(),
  googleMapsUrl: text("google_maps_url"),
  latitude: real("latitude"),
  longitude: real("longitude"),

  galleryUrls: text("gallery_urls", { mode: "json" }).$type<string[]>(),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  adminNote: text("admin_note"),

  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Event = typeof events.$inferSelect;