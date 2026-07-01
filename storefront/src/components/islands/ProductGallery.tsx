/**
 * Product image gallery island.
 * Single image → plain <img>. Multiple images → slider with thumbnails,
 * keyboard arrows, and swipe support.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ProductImage } from '../../lib/types';

interface Props {
  images: ProductImage[];
  productName: string;
  fallbackSrc: string;
  /** color_hex from the product — applied as a multiply tint over the fallback fabric base. */
  colorHex?: string | null;
}

export default function ProductGallery({ images, productName, fallbackSrc, colorHex }: Props) {
  const [active, setActive] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const count = images.length;
  const primary = count > 0 ? images[active] : null;
  const src = primary?.url ?? fallbackSrc;
  const alt = primary?.alt ?? `${productName} — view ${active + 1}`;
  // Show tint only when we're actually displaying the fallback (no real images).
  const showTint = count === 0 && !!colorHex;

  const prev = useCallback(() => setActive((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setActive((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, prev, next]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) dx < 0 ? next() : prev();
    touchStartX.current = null;
  }

  if (count <= 1) {
    return (
      <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)]">
        <img
          src={src}
          alt={alt}
          width={720}
          height={900}
          loading="eager"
          fetchPriority="high"
          className="aspect-[4/5] w-full object-cover"
        />
        {showTint && (
          <div
            className="pointer-events-none absolute inset-0 mix-blend-multiply"
            style={{ backgroundColor: colorHex!, opacity: 0.72 }}
            aria-hidden="true"
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-surface)] select-none"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          key={active}
          src={src}
          alt={alt}
          width={720}
          height={900}
          loading="eager"
          fetchPriority="high"
          className="aspect-[4/5] w-full object-cover transition-opacity duration-200"
        />

        {/* Prev/next arrows */}
        <button
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg)]/85 shadow backdrop-blur-sm transition-opacity hover:bg-[var(--color-bg)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button
          onClick={next}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-bg)]/85 shadow backdrop-blur-sm transition-opacity hover:bg-[var(--color-bg)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
        </button>

        {/* Dot counter */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5" aria-hidden="true">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {images.map((img, i) => (
          <button
            key={img.id}
            onClick={() => setActive(i)}
            aria-label={`View image ${i + 1}`}
            className={`shrink-0 overflow-hidden rounded-[var(--radius)] border-2 transition-all duration-150 ${
              i === active
                ? 'border-[var(--color-primary)]'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={img.thumb_url}
              alt={img.alt ?? `${productName} thumbnail ${i + 1}`}
              width={80}
              height={80}
              loading="lazy"
              className="h-16 w-16 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
