"use server";

import { ApifyClient } from "apify-client";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminSession } from "@/lib/auth";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN,
});

const UPLOAD_CONCURRENCY_LIMIT = 4;

/**
 * Runs async tasks with a max concurrency, instead of firing all at once.
 * Keeps carousel-post uploads (or any batch) from overwhelming Cloudinary.
 */
async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await fn(items[currentIndex]);
    }
  }

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}

/**
 * Strips query params, hashes, and tracking junk from an Instagram post URL,
 * keeping just the origin + path (e.g. https://www.instagram.com/p/DbxpFldk7_9/).
 * Falls back to the raw string if it isn't a parseable URL.
 */
function cleanInstagramUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    let pathname = parsed.pathname;
    if (!pathname.endsWith("/")) {
      pathname += "/";
    }
    return `${parsed.origin}${pathname}`;
  } catch {
    return rawUrl.trim();
  }
}

export async function processInstagramPost(postUrl: string): Promise<string[]> {
  try {
    await requireAdminSession();

    if (!postUrl || !postUrl.includes("instagram.com")) {
      throw new Error("Please provide a valid Instagram post URL.");
    }

    const cleanUrl = cleanInstagramUrl(postUrl);

    console.log(`🔍 Scraping Instagram post with actor nH2AHrwxeTRJoN5hX: ${cleanUrl}`);

    // Call actor nH2AHrwxeTRJoN5hX with schema parameters
    const run = await apifyClient.actor("nH2AHrwxeTRJoN5hX").call({
      username: [cleanUrl], // Actor nH2AHrwxeTRJoN5hX accepts post URLs inside the username array!
      resultsLimit: 1,
    });

    // Fetch dataset results
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (!items || items.length === 0) {
      throw new Error("No media dataset returned from Apify.");
    }

    const postData = items[0] as any;
    let rawImageUrls: string[] = [];

    // Parse images from response
    if (postData.images && Array.isArray(postData.images) && postData.images.length > 0) {
      rawImageUrls = postData.images;
    } else if (postData.displayUrl) {
      rawImageUrls = [postData.displayUrl];
    } else if (postData.display_url) {
      rawImageUrls = [postData.display_url];
    } else if (postData.url) {
      rawImageUrls = [postData.url];
    } else if (postData.childPosts && Array.isArray(postData.childPosts)) {
      // Handle carousel posts
      rawImageUrls = postData.childPosts
        .map((child: any) => child.displayUrl || child.display_url)
        .filter(Boolean);
    }

    if (rawImageUrls.length === 0) {
      throw new Error("Could not find any image URLs in the scraped Instagram post.");
    }

    console.log(`🖼️ Extracted ${rawImageUrls.length} image URL(s). Uploading to Cloudinary...`);

    // Upload to Cloudinary (limited concurrency to avoid overwhelming the API
    // on carousel posts with many images)
    const permanentCloudinaryUrls = await mapWithConcurrencyLimit(
      rawImageUrls,
      UPLOAD_CONCURRENCY_LIMIT,
      async (imgUrl) => {
        const uploadResult = await cloudinary.uploader.upload(imgUrl, {
          folder: "infoevent_gallery",
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        });
        return uploadResult.secure_url;
      },
    );

    console.log("✅ Stored permanent images in Cloudinary!");

    return permanentCloudinaryUrls;
  } catch (error: any) {
    console.error("❌ Instagram Processing Error:", error.message || error);
    throw new Error(error.message || "Failed to process Instagram link.");
  }
}

export async function deleteCloudinaryImage(imageUrl: string) {
  try {
    await requireAdminSession();

    // Extract public_id from a Cloudinary secure_url, e.g.:
    // https://res.cloudinary.com/<cloud>/image/upload/v1699999999/infoevent_gallery/xyz123.jpg
    // -> "infoevent_gallery/xyz123"
    const uploadMarker = "/upload/";
    const uploadIndex = imageUrl.indexOf(uploadMarker);

    if (uploadIndex === -1) {
      throw new Error("Not a recognizable Cloudinary URL, skipping delete.");
    }

    let pathAfterUpload = imageUrl.slice(uploadIndex + uploadMarker.length);
    const segments = pathAfterUpload.split("/").filter(Boolean);

    // Drop a leading version segment like "v1699999999" if present
    if (segments.length > 0 && /^v\d+$/.test(segments[0])) {
      segments.shift();
    }

    // Drop a leading transformation segment (contains a comma or "_" flags, e.g. "q_auto,f_auto")
    // Cloudinary transformation segments always contain an underscore-separated key, so guard
    // against accidentally eating a real folder name by only stripping when a version segment
    // isn't left as the only remaining piece.
    if (segments.length > 1 && /[,_]/.test(segments[0]) && !/^[\w-]+$/.test(segments[0])) {
      segments.shift();
    }

    if (segments.length === 0) {
      throw new Error("Could not determine Cloudinary public_id from URL.");
    }

    // Last segment is "filename.ext" — strip only the final extension
    const lastSegment = segments[segments.length - 1];
    const lastDot = lastSegment.lastIndexOf(".");
    segments[segments.length - 1] =
      lastDot > 0 ? lastSegment.slice(0, lastDot) : lastSegment;

    const publicId = segments.join("/");

    await cloudinary.uploader.destroy(publicId);
    console.log(`🗑️ Deleted image from Cloudinary: ${publicId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete image from Cloudinary:", error.message || error);
    return { success: false };
  }
}

export async function uploadImageFile(formData: FormData): Promise<string> {
  try {
    await requireAdminSession();

    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No image file provided.");
    }

    // Convert file to array buffer and base64 string for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(base64Image, {
      folder: "infoevent_gallery",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    console.log(
      `✅ Uploaded local image to Cloudinary: ${uploadResult.secure_url}`,
    );
    return uploadResult.secure_url;
  } catch (error: any) {
    console.error("❌ Image Upload Error:", error);
    throw new Error(error.message || "Failed to upload image file.");
  }
}