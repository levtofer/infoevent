"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { uploadImageFile, deleteCloudinaryImage } from "@/lib/actions/media";
import { updateEvent, deleteEvent } from "@/lib/actions/events";
import {
  X,
  Loader2,
  Trash2,
  GripVertical,
  Star,
  Upload,
  MapPin,
  ExternalLink,
} from "lucide-react";

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

function extractLatLngFromGoogleMapsUrl(
  url: string,
): { lat: number; lng: number } | null {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return { lat, lng };
    }
  }
  return null;
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" — DB values may be full ISO strings
function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value.slice(0, 16);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function EditEventModal({
  event,
  onClose,
}: {
  event: EventForEdit;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [name, setName] = useState(event.name);
  const [description, setDescription] = useState(event.description || "");
  const [startDate, setStartDate] = useState(toDatetimeLocal(event.startDate));
  const [endDate, setEndDate] = useState(toDatetimeLocal(event.endDate));
  const [locationName, setLocationName] = useState(event.locationName);
  const [googleMapsUrl, setGoogleMapsUrl] = useState(event.googleMapsUrl || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    event.latitude != null && event.longitude != null
      ? { lat: event.latitude, lng: event.longitude }
      : extractLatLngFromGoogleMapsUrl(event.googleMapsUrl || ""),
  );
  const [tagsInput, setTagsInput] = useState((event.tags || []).join(", "));
  const [adminNote, setAdminNote] = useState(event.adminNote || "");
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>(
    event.galleryUrls || [],
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleMapsUrlChange = (value: string) => {
    setGoogleMapsUrl(value);
    setCoords(extractLatLngFromGoogleMapsUrl(value));
  };

  const handleAddManualUrl = () => {
    if (!manualImageUrl) return;
    setGalleryUrls((prev) => [...prev, manualImageUrl.trim()]);
    setManualImageUrl("");
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = galleryUrls[indexToRemove];
    setGalleryUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (urlToRemove.includes("cloudinary.com")) {
      await deleteCloudinaryImage(urlToRemove);
    }
  };

  const handleOnDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(galleryUrls);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    setGalleryUrls(items);
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
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload image.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name || !startDate || !locationName) {
      setErrorMsg("Name, Start Date, and Location are required, sorry! (TwT)");
      return;
    }
    startTransition(async () => {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await updateEvent(event.id, {
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
        router.refresh();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to save changes.");
      }
    });
  };

  const handleDelete = () => {
    setIsDeleting(true);
    startTransition(async () => {
      const res = await deleteEvent(event.id);
      if (res.success) {
        router.push("/");
        router.refresh();
      } else {
        setErrorMsg(res.error || "Failed to delete event.");
        setIsDeleting(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto bg-ink/40 backdrop-blur-sm">
      <div className="sketch-border sketch-shadow bg-cream w-full max-w-2xl my-6 sm:my-0 p-5 sm:p-7 relative">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-blush hover:bg-rose text-ink rounded-full p-1.5 sketch-shadow-sm border-2 border-ink transition"
        >
          <X className="w-4 h-4" />
        </button>

        <h2 className="text-2xl sm:text-3xl mb-4 pr-8 sketch-underline w-fit">
          Edit Event
        </h2>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose/40 border-2 border-ink text-ink text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1">Event Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Location Name *</label>
              <input
                type="text"
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Start Date *</label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">End Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1">Google Maps Link</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-ink/60 absolute left-3 top-3" />
              <input
                type="url"
                value={googleMapsUrl}
                onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                placeholder="Paste a Google Maps share link…"
                className="w-full bg-white/70 border-2 border-ink rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none"
              />
            </div>
            {coords && (
              <div className="mt-3 space-y-2">
                <div className="sketch-border-sm overflow-hidden h-40">
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
            <label className="block text-xs mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Admin Internal Note</label>
              <input
                type="text"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                className="w-full bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Gallery: add/remove/reorder — no Instagram scraper here */}
          <div>
            <label className="block text-xs mb-2">
              Gallery ({galleryUrls.length}) — drag to reorder, first image is cover
            </label>

            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={manualImageUrl}
                onChange={(e) => setManualImageUrl(e.target.value)}
                placeholder="Paste an image URL…"
                className="flex-1 bg-white/70 border-2 border-ink rounded-lg px-3 py-2 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddManualUrl}
                className="sketch-btn bg-blush px-3 text-sm shrink-0"
              >
                Add
              </button>
              <label className="sketch-btn bg-blush px-3 py-2 text-sm shrink-0 flex items-center gap-1.5 cursor-pointer">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>

            {galleryUrls.length === 0 ? (
              <div className="sketch-border-sm p-6 text-center text-sm text-ink/60">
                No images yet.
              </div>
            ) : (
              <DragDropContext onDragEnd={handleOnDragEnd}>
                <Droppable droppableId="edit-gallery" direction="horizontal">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="flex gap-3 overflow-x-auto pb-2 pt-1"
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
                              className={`relative flex-shrink-0 w-28 sketch-border-sm bg-white overflow-hidden ${
                                snapshot.isDragging ? "sketch-shadow-sm" : ""
                              }`}
                            >
                              {index === 0 && (
                                <span className="absolute top-1 left-1 bg-rose text-ink text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 z-10 border border-ink">
                                  <Star className="w-2.5 h-2.5 fill-ink" /> Cover
                                </span>
                              )}
                              <div
                                {...provided.dragHandleProps}
                                className="absolute top-1 right-1 bg-cream/90 p-0.5 rounded text-ink border border-ink cursor-grab z-10"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </div>
                              <div className="h-24 w-full bg-blush/40">
                                <img
                                  src={url}
                                  alt={`Gallery item ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="p-1.5 flex justify-between items-center border-t-2 border-ink">
                                <span className="text-[9px] text-ink/70">
                                  #{index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveImage(index)}
                                  className="text-ink/70 hover:text-rose p-0.5"
                                  title="Remove image"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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

          <div className="sketch-divider" />

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="sketch-btn bg-rose flex-1 py-2.5 text-base font-medium flex justify-center items-center gap-2"
            >
              {isPending && !isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </button>

            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="sketch-btn bg-white px-4 py-2.5 text-sm flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Delete Event
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="sketch-btn bg-ink text-cream px-3 py-2.5 text-sm flex items-center gap-1.5"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Confirm delete?"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="sketch-btn bg-white px-3 py-2.5 text-sm"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}