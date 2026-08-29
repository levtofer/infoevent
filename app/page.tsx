import Link from "next/link";
import { getAllEvents } from "@/lib/events";
import { getIsAdmin } from "@/lib/auth";
import EventCard from "@/components/EventCard";
import LogoutButton from "@/components/LogoutButton";
import { Sparkles } from "lucide-react";

export const revalidate = 0; // Ensures fresh database data on load

export default async function HomePage() {
  const [rawEvents, isAdmin] = await Promise.all([
    getAllEvents(),
    getIsAdmin(),
  ]);

  const events = rawEvents.map((event) => ({
    ...event,
    galleryUrls: event.galleryUrls ?? [],
    tags: event.tags ?? [],
  }));

  return (
    <div className="min-h-screen bg-cream text-ink">
      {/* Header Bar */}
      <header className="border-b-2 border-ink bg-cream/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-ink" />
            <span className="text-2xl sm:text-3xl">InfoEvent</span>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-xs bg-blush border-2 border-ink px-2.5 py-1 rounded-full">
                Admin mode
              </span>
              <LogoutButton />
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-10 text-center sm:text-left">
          <h1 className="text-3xl sm:text-5xl mb-2 sketch-underline w-fit mx-auto sm:mx-0">
            Upcoming Events & Gatherings
          </h1>
          <p className="text-ink/70 text-sm sm:text-base max-w-2xl mx-auto sm:mx-0 mt-3">
            Explore community pop-ups, conventions, and gatherings with live
            photos and location guides.
          </p>
        </div>

        {/* Event Cards Grid */}
        {events.length === 0 ? (
          <div className="sketch-border bg-white/60 p-10 sm:p-12 text-center max-w-md mx-auto space-y-2">
            <p className="font-medium text-lg">No events published yet!</p>
            <p className="text-sm text-ink/60">Check back soon (・w・)</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
