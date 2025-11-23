/**
 * Event image management utilities
 */

/**
 * Get event image URL
 */
export async function getEventImage(eventId: number): Promise<string | null> {
  try {
    const response = await fetch(`/api/events/${eventId}?image=true`);
    if (!response.ok) {
      throw new Error(`Failed to fetch event image: ${response.status}`);
    }
    const data = await response.json();
    return data.image || null;
  } catch (error) {
    console.error("Error fetching event image:", error);
    return null;
  }
}

/**
 * Upload/Update event image URL
 */
export async function uploadEventImage(
  eventId: number,
  imageUrl: string
): Promise<{ success: boolean; image?: string; message?: string }> {
  try {
    const response = await fetch(`/api/events/image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        event_id: eventId,
        image_url: imageUrl,
        action: 'upload',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to upload image");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading event image:", error);
    throw error;
  }
}

/**
 * Update event image URL
 */
export async function updateEventImage(
  eventId: number,
  imageUrl: string
): Promise<{ success: boolean; image?: string; message?: string }> {
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update image");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating event image:", error);
    throw error;
  }
}

/**
 * Remove event image
 */
export async function removeEventImage(
  eventId: number
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(`/api/events/${eventId}?action=delete-image`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove image");
    }

    return await response.json();
  } catch (error) {
    console.error("Error removing event image:", error);
    throw error;
  }
}

/**
 * Validate image URL format
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    // Check if it's a valid HTTP/HTTPS URL
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get image URL from various sources
 * Supports:
 * - Direct URLs
 * - Data URLs (base64)
 * - Cloudinary URLs
 * - Imgur URLs
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return "";
  
  // If it's already a valid URL, return as-is
  if (isValidImageUrl(url)) {
    return url;
  }
  
  // If it's a data URL, return as-is
  if (url.startsWith("data:image/")) {
    return url;
  }
  
  // If it's a relative path, make it absolute
  if (url.startsWith("/")) {
    return url;
  }
  
  return url;
}

