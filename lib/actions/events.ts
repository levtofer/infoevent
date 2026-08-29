"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";

export async function createEvent(formData: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  locationName: string;
  googleMapsUrl?: string;
  latitude?: number;
  longitude?: number;
  galleryUrls: string[];
  tags?: string[];
  adminNote?: string;
}) {
  try {
    await requireAdminSession();

    const id = `evt_${Date.now()}`;

    await db.insert(events).values({
      id,
      name: formData.name,
      description: formData.description || null,
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      locationName: formData.locationName,
      googleMapsUrl: formData.googleMapsUrl || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      galleryUrls: formData.galleryUrls || [],
      tags: formData.tags || [],
      adminNote: formData.adminNote || null,
    });

    revalidatePath("/");
    return { success: true, id };
  } catch (error: any) {
    console.error("Failed to create event:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEvent(
  id: string,
  formData: {
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    locationName: string;
    googleMapsUrl?: string;
    latitude?: number;
    longitude?: number;
    galleryUrls: string[];
    tags?: string[];
    adminNote?: string;
  },
) {
  try {
    await requireAdminSession();

    if (!id) {
      throw new Error("Missing event id.");
    }

    await db
      .update(events)
      .set({
        name: formData.name,
        description: formData.description || null,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        locationName: formData.locationName,
        googleMapsUrl: formData.googleMapsUrl || null,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        galleryUrls: formData.galleryUrls || [],
        tags: formData.tags || [],
        adminNote: formData.adminNote || null,
      })
      .where(eq(events.id, id));

    revalidatePath("/");
    revalidatePath(`/events/${id}`);
    return { success: true, id };
  } catch (error: any) {
    console.error("Failed to update event:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEvent(id: string) {
  try {
    await requireAdminSession();

    if (!id) {
      throw new Error("Missing event id.");
    }

    await db.delete(events).where(eq(events.id, id));

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete event:", error);
    return { success: false, error: error.message };
  }
}