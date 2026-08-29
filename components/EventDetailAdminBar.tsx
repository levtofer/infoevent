"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import EditEventModal from "./EditEventModal";

interface EventForEdit {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  locationName: string;
  googleMapsUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  galleryUrls: string[];
  tags: string[];
  adminNote: string | null;
}

export default function EventDetailAdminBar({ event }: { event: EventForEdit }) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsEditing(true)}
        className="sketch-btn bg-blush hover:bg-rose px-3.5 py-2 text-sm flex items-center gap-1.5"
      >
        <Pencil className="w-4 h-4" /> Edit Event
      </button>

      {isEditing && (
        <EditEventModal event={event} onClose={() => setIsEditing(false)} />
      )}
    </>
  );
}