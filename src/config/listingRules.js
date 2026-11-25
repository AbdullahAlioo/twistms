/**
 * Listing settings.
 * Free listing: 90 days (auto-erased / expired after 90 days).
 * Paid: 180 days. Premium: 365 days.
 * Photos: min 5, max 100. Videos: min 1, max 5.
 */
export const LISTING_RULES = {
  freeListingDays: 90,
  photos: { min: 5, max: 100 },
  videos: { min: 1, max: 5 },
};
