"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Pencil,
} from "lucide-react";
import EditEventModal from "./EditEventModal";

interface EventCardProps {
  event: {
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
  };
  isAdmin?: boolean;
}

export default function EventCard({ event, isAdmin = false }: EventCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const images =
    event.galleryUrls && event.galleryUrls.length > 0
      ? event.galleryUrls
      : [
          "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80",
        ];

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getEventStatus = () => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : null;

    if (end && now >= start && now <= end) {
      return {
        label: "Ongoing",
        className: "bg-emerald-200 text-ink border-ink",
      };
    }
    if (!end && now.toDateString() === start.toDateString()) {
      return {
        label: "Ongoing",
        className: "bg-emerald-200 text-ink border-ink",
      };
    }
    if (now < start) {
      return { label: "Upcoming", className: "bg-blush text-ink border-ink" };
    }
    return { label: "Passed", className: "bg-cream text-ink/60 border-ink/40" };
  };

  const status = getEventStatus();

  return (
    <>
      <div className="relative sketch-border sketch-shadow bg-white/70 overflow-hidden hover:-translate-y-0.5 transition-transform flex flex-col group">
        {isAdmin && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsEditing(true);
            }}
            title="Edit event"
            className="absolute top-2.5 right-2.5 z-10 bg-cream hover:bg-rose text-ink p-1.5 rounded-full border-2 border-ink sketch-shadow-sm transition"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}

        <Link href={`/events/${event.id}`} className="contents">
          {/* --- Image Carousel Header --- */}
          <div className="relative w-full h-52 bg-blush/40 overflow-hidden select-none">
            {/* Status Badge */}
            <span
              className={`absolute top-2.5 left-2.5 z-10 text-xs font-bold px-2.5 py-0.5 rounded-full border-2 sketch-shadow-sm ${status.className}`}
            >
              {status.label}
            </span>

            <img
              src={images[currentImageIndex]}
              alt={event.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-ink/70 hover:bg-ink text-cream p-1.5 rounded-full transition opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-ink/70 hover:bg-ink text-cream p-1.5 rounded-full transition opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-ink/60 backdrop-blur-sm px-2 py-1 rounded-full">
                  {images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "bg-rose w-3"
                          : "bg-cream/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* --- Card Body --- */}
          <div className="p-5 flex-1 flex flex-col justify-between">
            <div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {event.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blush text-ink border-2 border-ink text-[11px] font-semibold px-2 py-0.5 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <h2 className="text-2xl mb-2 line-clamp-1 group-hover:sketch-underline w-fit">
                {event.name}
              </h2>

              <div className="space-y-1.5 text-sm text-ink/80 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-ink/60 flex-shrink-0" />
                  <span>
                    {formatDate(event.startDate)}
                    {event.endDate && ` - ${formatDate(event.endDate)}`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-ink/60 flex-shrink-0" />
                  <span className="truncate">{event.locationName}</span>
                  {event.googleMapsUrl && (
                    <ExternalLink className="w-3.5 h-3.5 text-ink/40 flex-shrink-0" />
                  )}
                </div>
              </div>

              {event.description && (
                <p className="text-sm text-ink/70 line-clamp-2 mb-4 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>

            <div className="pt-4 sketch-divider flex justify-between items-center">
              <span className="text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                View Event Details <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {isEditing && (
        <EditEventModal event={event} onClose={() => setIsEditing(false)} />
      )}
    </>
  );
}
