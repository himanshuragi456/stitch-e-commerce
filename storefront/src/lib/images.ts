// Centralised stock/fallback imagery. Real fabric & textile photos (Unsplash)
// used for the hero and as fallbacks where a product has no uploaded image.
// All IDs below are verified-resolving Unsplash photo IDs.

const UNSPLASH = 'https://images.unsplash.com/photo-';

/** Build an optimised Unsplash URL (auto format, cropped, quality-tuned). */
export function unsplash(
  id: string,
  { w = 1200, h, q = 70 }: { w?: number; h?: number; q?: number } = {}
): string {
  const params = new URLSearchParams({
    auto: 'format',
    fit: 'crop',
    q: String(q),
    w: String(w),
  });
  if (h) params.set('h', String(h));
  return `${UNSPLASH}${id}?${params.toString()}`;
}

// Hero: blue & white polka-dot blazer (bespoke tailoring feel).
export const HERO_IMAGE_ID = '1628565931779-4f4f0b4f578a';

// Curated fabric/textile pool — used as product-image fallbacks so nothing
// ever shows an empty swatch even before the admin uploads real photos.
export const FABRIC_IMAGE_IDS = [
  '1594734415578-00fc9540929b', // white textile on wooden table
  '1583339824000-5afecfd41835', // white textile on white textile
  '1634393654272-9f6b168356fd', // soft pink fabric close-up
  '1558769132-cb1aea458c5e', // textile / fashion
  '1591047139829-d91aecb6caea', // stacked folded clothes
  '1489987707025-afc232f7ea0f', // clothing on rack
  '1473966968600-fa801b869a1a', // fabric texture
  '1604176354204-9268737828e4', // linen / neutral cloth
];

/** Deterministic fabric fallback for a given key (e.g. product id/slug). */
export function fabricFallback(
  key: string,
  opts?: { w?: number; h?: number; q?: number }
): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  const id = FABRIC_IMAGE_IDS[hash % FABRIC_IMAGE_IDS.length];
  return unsplash(id, opts);
}

export function heroImage(opts?: { w?: number; h?: number; q?: number }): string {
  return unsplash(HERO_IMAGE_ID, { w: 900, h: 1125, ...opts });
}
