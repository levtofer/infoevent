"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import {
  uploadImageFile,
  processInstagramPost,
  deleteCloudinaryImage,
} from "@/lib/actions/media";
import { createEvent } from "@/lib/actions/events";
import {
  Loader2,
  Trash2,
  GripVertical,
  Camera,
  Star,
  Upload,
  LogOut,
  Sparkles,
  MapPin,
  ExternalLink,
  ArrowLeft, // Added
  Home, // Added
} from "lucide-react";

/**
 * Tries to pull a lat,lng pair out of a pasted Google Maps URL.
 * Handles the common formats: ".../@-6.914744,107.60981,17z", "?q=-6.9,107.6",
 * and "?ll=-6.9,107.6". Short links (maps.app.goo.gl) can't be parsed client-side
 * since they redirect server-side — those just won't get a preview.
 */
function extractLatLngFromGoogleMapsUrl(
  url: string,
): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // .../@lat,lng,zoomz
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?q=lat,lng
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/, // ?ll=lat,lng
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return { lat, lng };
      }
    }
  }

  return null;
}

export default function AdminPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [locationName, setLocationName] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [tagsInput, setTagsInput] = useState("");
  const [adminNote, setAdminNote] = useState("");

  // Gallery & Scraping state
  const [instagramUrl, setInstagramUrl] = useState("");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [isScraping, setIsScraping] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Handle Logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle Google Maps link paste — try to pull coordinates for the preview
  const handleGoogleMapsUrlChange = (value: string) => {
    setGoogleMapsUrl(value);
    setCoords(extractLatLngFromGoogleMapsUrl(value));
  };

  // 1. Handle Instagram Link Processing
  const handleFetchInstagram = async () => {
    if (!instagramUrl) return;
    setIsScraping(true);
    setErrorMsg("");

    try {
      const newUrls = await processInstagramPost(instagramUrl);
      setGalleryUrls((prev) => [...prev, ...newUrls]);
      setInstagramUrl("");
      setSuccessMsg(`Added ${newUrls.length} image(s) from Instagram! (≧w≦)`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process Instagram link.");
    } finally {
      setIsScraping(false);
    }
  };

  // 2. Add manual image URL
  const handleAddManualUrl = () => {
    if (!manualImageUrl) return;
    setGalleryUrls((prev) => [...prev, manualImageUrl.trim()]);
    setManualImageUrl("");
  };

  // 3. Remove image from gallery and optionally delete from Cloudinary
  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = galleryUrls[indexToRemove];
    setGalleryUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));

    if (urlToRemove.includes("cloudinary.com")) {
      await deleteCloudinaryImage(urlToRemove);
    }
  };

  // 4. Drag & Drop Reordering Handler
  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(galleryUrls);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setGalleryUrls(items);
  };

  // 5. Submit Event Form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name || !startDate || !locationName) {
      setErrorMsg(
        "Please fill in all required fields (Name, Start Date, Location).",
      );
      return;
    }

    startTransition(async () => {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await createEvent({
        name,
        description,
        startDate,
        endDate,
        locationName,
        googleMapsUrl,
        latitude: coords?.lat,
        longitude: coords?.lng,
        galleryUrls,
        tags,
        adminNote,
      });

      if (res.success) {
        setSuccessMsg("🎉 Event created successfully!");
        router.push("/");
      } else {
        setErrorMsg(res.error || "Failed to create event.");
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMsg("");

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);

        const uploadedUrl = await uploadImageFile(formData);
        setGalleryUrls((prev) => [...prev, uploadedUrl]);
      }
      setSuccessMsg(`Uploaded ${files.length} image(s) from gallery! (◠w◠)`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload file.");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 text-ink bg-cream min-h-screen">
      {/* Top Navigation / Header Bar */}
      <div className="grid grid-cols-3 items-center pb-5 mb-6 w-full opacity-100 gap-2">
        {/* Left Action Box */}
        <div className="flex items-center justify-start">
          <button
            onClick={() => router.push("/")}
            className="sketch-btn bg-white hover:bg-cream p-2 text-xs font-semibold flex items-center justify-center gap-1.5 shrink-0 text-ink opacity-100"
            title="Back to Main Site"
          >
            <ArrowLeft className="w-4 h-4 text-ink" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>

        {/* Center Title & Icon - Stays centered on the same row for Mobile & Desktop */}
        <div className="flex justify-center items-center gap-1.5 sm:gap-2 text-center w-full">
          <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 text-ink opacity-100 shrink-0 translate-y-0.5" />
          <h1 className="text-2xl sm:text-2xl md:text-3xl text-ink font-bold sketch-underline tracking-wide opacity-100 whitespace-nowrap">
            Event Admin Panel
          </h1>
        </div>

        {/* Right Action Box */}
        <div className="flex items-center justify-end">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="sketch-btn bg-white hover:bg-blush px-2.5 sm:px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 sm:gap-2 shrink-0 opacity-100 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-ink" />
                <span className="hidden sm:inline text-ink">
                  Signing out...
                </span>
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 text-ink" />
                <span className="hidden sm:inline text-ink">Logout</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 mb-4 rounded-lg bg-rose/40 border-2 border-ink text-ink text-sm">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 mb-4 rounded-lg bg-blush/70 border-2 border-ink text-ink text-sm">
          {successMsg}
        </div>
      )}

      {/* --- Section 1: Media Scraper & Input --- */}
      <div className="sketch-border bg-white/60 p-5 sm:p-6 mb-8 space-y-4">
        <h2 className="text-xl sm:text-2xl flex items-center gap-2">
          <Camera className="w-5 h-5" /> Load Images from Instagram
        </h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            placeholder="Paste Instagram post URL (e.g. https://www.instagram.com/p/...)"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            className="flex-1 bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={handleFetchInstagram}
            disabled={isScraping || !instagramUrl}
            className="sketch-btn bg-rose px-4 py-2 text-sm font-medium flex items-center justify-center gap-2 shrink-0"
          >
            {isScraping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Scraping...
              </>
            ) : (
              "Import Post"
            )}
          </button>
        </div>

        {/* Upload Local Image from Device Gallery */}
        <div className="pt-4 sketch-divider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Upload from Device Gallery</p>
            <p className="text-xs text-ink/60">
              Select image files (PNG, JPG, WEBP) from your phone or PC.
            </p>
          </div>

          <label className="sketch-btn bg-blush px-4 py-2 text-sm font-medium flex items-center gap-2 cursor-pointer shrink-0">
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload Files
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={isUploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* --- Section 2: Drag & Drop Gallery --- */}
      <div className="sketch-border bg-white/60 p-5 sm:p-6 mb-8">
        <h2 className="text-xl sm:text-2xl mb-2">
          Event Gallery ({galleryUrls.length})
        </h2>
        <p className="text-xs text-ink/60 mb-4">
          Drag and drop cards to reorder images. The first image will be used as
          the primary cover!
        </p>

        {galleryUrls.length === 0 ? (
          <div className="sketch-border-sm p-8 text-center text-ink/50">
            No gallery images added yet.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="gallery" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex gap-4 overflow-x-auto pb-4 pt-2"
                >
                  {galleryUrls.map((url, index) => (
                    <Draggable
                      key={`${url}-${index}`}
                      draggableId={`${url}-${index}`}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`relative flex-shrink-0 w-40 sketch-border-sm bg-white overflow-hidden group ${
                            snapshot.isDragging ? "sketch-shadow-sm" : ""
                          }`}
                        >
                          {/* First Image Indicator Badge */}
                          {index === 0 && (
                            <span className="absolute top-2 left-2 bg-rose text-ink text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 z-10 border border-ink">
                              <Star className="w-3 h-3 fill-ink" /> Cover
                            </span>
                          )}

                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="absolute top-2 right-2 bg-cream/90 p-1 rounded text-ink border border-ink cursor-grab z-10"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Image Preview */}
                          <div className="h-32 w-full bg-blush/40">
                            <img
                              src={url}
                              alt={`Gallery item ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Card Footer Actions */}
                          <div className="p-2 flex justify-between items-center border-t-2 border-ink">
                            <span className="text-[10px] text-ink/60">
                              #{index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="text-ink/70 hover:text-rose p-1"
                              title="Delete Image"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* --- Section 3: Event Metadata Form --- */}
      <form
        onSubmit={handleSubmit}
        className="sketch-border bg-white/60 p-5 sm:p-6 space-y-4"
      >
        <h2 className="text-xl sm:text-2xl mb-2">Event Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">
              Event Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Location Name *
            </label>
            <input
              type="text"
              required
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">
              Start Date *
            </label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Google Maps Link
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-ink/50 absolute left-3 top-3" />
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
              placeholder="Paste a Google Maps share link…"
              className="w-full bg-white/80 border-2 border-ink rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
            />
          </div>

          {googleMapsUrl && !coords && (
            <p className="text-[11px] text-ink/60 mt-1.5">
              Couldn't read coordinates from this link (short links like
              maps.app.goo.gl can't be previewed) — the link will still be saved
              and shown on the event page (・w・)
            </p>
          )}

          {coords && (
            <div className="mt-3 space-y-2">
              <div className="sketch-border-sm overflow-hidden h-48">
                <iframe
                  title="Location preview"
                  className="w-full h-full"
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    coords.lng - 0.01
                  },${coords.lat - 0.01},${coords.lng + 0.01},${
                    coords.lat + 0.01
                  }&marker=${coords.lat},${coords.lng}`}
                />
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs underline"
              >
                Open in Google Maps <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            placeholder="music, festival, outdoor"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1">
            Admin Internal Note
          </label>
          <input
            type="text"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="w-full bg-white/80 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="sketch-btn bg-rose w-full py-3 text-base font-medium flex justify-center items-center gap-2 mt-4"
        >
          {isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Saving Event...
            </>
          ) : (
            "Save & Publish Event"
          )}
        </button>
      </form>
    </div>
  );
}
