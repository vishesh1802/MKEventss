/**
 * Review and rating utilities
 */

export interface Review {
  id: number;
  user_id: number;
  event_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

/**
 * Fetch reviews for an event
 */
export async function fetchReviews(eventId: number): Promise<ReviewsResponse> {
  try {
    const response = await fetch(`/api/reviews?event_id=${eventId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reviews: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return {
      reviews: [],
      averageRating: 0,
      totalReviews: 0,
    };
  }
}

/**
 * Submit a review for an event
 */
export async function submitReview(
  eventId: number,
  rating: number,
  reviewText?: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        event_id: eventId,
        rating,
        review_text: reviewText || null,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to submit review");
    }

    return await response.json();
  } catch (error) {
    console.error("Error submitting review:", error);
    throw error;
  }
}

/**
 * Get star rating display
 */
export function getStarRating(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  return "⭐".repeat(fullStars) + (hasHalfStar ? "½" : "") + "☆".repeat(emptyStars);
}

/**
 * Format rating text
 */
export function formatRating(rating: number, totalReviews: number): string {
  if (totalReviews === 0) {
    return "No reviews yet";
  }
  return `${rating.toFixed(1)} (${totalReviews} ${totalReviews === 1 ? "review" : "reviews"})`;
}

/**
 * Get rating color based on value
 */
export function getRatingColor(rating: number): string {
  if (rating >= 4.5) return "text-green-600 dark:text-green-400";
  if (rating >= 4.0) return "text-green-500 dark:text-green-500";
  if (rating >= 3.5) return "text-yellow-500 dark:text-yellow-500";
  if (rating >= 3.0) return "text-orange-500 dark:text-orange-500";
  return "text-red-500 dark:text-red-500";
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

/**
 * Format timestamp to full date and time
 */
export function formatFullTimestamp(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format timestamp - shows relative time with full date on hover
 */
export function formatReviewTimestamp(timestamp: string | Date, updatedAt?: string | Date): string {
  const created = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const updated = updatedAt ? (typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt) : null;
  
  // If review was updated and it's different from created date, show "Updated X ago"
  if (updated && updated.getTime() !== created.getTime()) {
    return `Updated ${formatRelativeTime(updated)}`;
  }
  
  return formatRelativeTime(created);
}

