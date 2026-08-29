"use client";

import { useState } from "react";

interface EventGalleryProps {
  gallery: string[];
  eventName: string;
  status: { label: string; className: string };
}

export default function EventGallery({ gallery, eventName, status }: EventGalleryProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  return (
    <div className="lg:col-span-7 space-y-4">
      {/* Container constrained on desktop (max-w-lg) so it shrinks down cleanly */}
      <div className="relative w-full lg:max-w-lg mx-auto sketch-border sketch-shadow overflow-hidden">
        {/* Status Badge */}
        <span
          className={`absolute top-3 left-3 z-10 text-xs font-bold px-3 py-1 rounded-full border-2 sketch-shadow-sm ${status.className}`}
        >
          {status.label}
        </span>

        {/* Scaled-down image hugging the border */}
        <img
          src={gallery[activeImageIndex]}
          alt={eventName}
          className="w-full h-auto block transition-all duration-300"
        />
      </div>

      {/* Thumbnail Selector List (matching desktop max width) */}
      {gallery.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 lg:max-w-lg mx-auto">
          {gallery.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveImageIndex(idx)}
              className={`h-16 sm:h-20 sketch-border-sm overflow-hidden text-left transition-all ${
                activeImageIndex === idx
                  ? "ring-4 ring-rose opacity-100 scale-95"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={img}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}