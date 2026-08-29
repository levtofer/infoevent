import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/events";
import { getIsAdmin } from "@/lib/auth";
import EventDetailAdminBar from "@/components/EventDetailAdminBar";
import { Calendar, MapPin, ArrowLeft, ExternalLink, Sparkles } from "lucide-react";

export const revalidate = 0;

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, isAdmin] = await Promise.all([getEventById(id), getIsAdmin()]);

  if (!event) {
    notFound();
  }

  // Fallback null to empty arrays so TypeScript is happy (・w・)ゞ
  const formattedEvent = {
    ...event,
    galleryUrls: event.galleryUrls ?? [],
    tags: event.tags ?? [],
  };

  const gallery =
    event.galleryUrls && event.galleryUrls.length > 0
      ? event.galleryUrls
      : ["https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80"];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink pb-16">
      {/* Header Bar */}
      <header className="border-b-2 border-ink bg-cream/90 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-ink hover:sketch-underline text-sm font-medium flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> All Events
          </Link>

          <div className="flex items-center gap-3">
            {isAdmin && <EventDetailAdminBar event={formattedEvent} />}
            <div className="hidden sm:flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-ink" />
              <span className="text-xl">InfoEvent</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Gallery Column */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative w-full h-[300px] sm:h-[450px] bg-blush/40 sketch-border sketch-shadow overflow-hidden">
              <img
                src={gallery[0]}
                alt={event.name}
                className="w-full h-full object-cover"
              />
            </div>

            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {gallery.map((img, idx) => (
                  <div
                    key={idx}
                    className="h-16 sm:h-24 sketch-border-sm overflow-hidden"
                  >
                    <img
                      src={img}
                      alt={`Gallery ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-4">
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-blush text-ink border-2 border-ink text-xs font-semibold px-2.5 py-1 rounded-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <h1 className="text-3xl sm:text-4xl leading-tight">
                {event.name}
              </h1>

              <div className="flex items-start gap-3 bg-white/60 sketch-border-sm p-3.5 text-sm">
                <Calendar className="w-5 h-5 text-ink/70 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Date & Time</p>
                  <p className="text-ink/70 text-xs mt-0.5">
                    {formatDate(event.startDate)}
                    {event.endDate && ` - ${formatDate(event.endDate)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white/60 sketch-border-sm p-3.5 text-sm">
                <MapPin className="w-5 h-5 text-ink/70 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Location</p>
                  <p className="text-ink/70 text-xs mt-0.5">
                    {event.locationName}
                  </p>
                </div>
                {event.googleMapsUrl && (
                  <a
                    href={event.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blush hover:bg-rose text-ink border-2 border-ink p-2 rounded-lg transition"
                    title="Open Directions in Google Maps"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {event.latitude != null && event.longitude != null && (
                <div className="sketch-border-sm overflow-hidden h-48">
                  <iframe
                    title="Location map"
                    className="w-full h-full"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                      event.longitude - 0.01
                    },${event.latitude - 0.01},${event.longitude + 0.01},${
                      event.latitude + 0.01
                    }&marker=${event.latitude},${event.longitude}`}
                  />
                </div>
              )}

              {event.description && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs uppercase font-bold text-ink/60 tracking-wider">
                    About Event
                  </h3>
                  <p className="text-ink/80 text-sm leading-relaxed whitespace-pre-line">
                    {event.description}
                  </p>
                </div>
              )}
            </div>

            {event.googleMapsUrl && (
              <a
                href={event.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="sketch-btn bg-rose w-full py-3 px-4 flex items-center justify-center gap-2 text-base font-medium"
              >
                <MapPin className="w-4 h-4" /> Get Directions on Google Maps
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}