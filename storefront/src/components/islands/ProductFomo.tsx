/**
 * FOMO badges on the product page:
 *  - "Only N left in stock" — N is a random 2–6 (NOT the real stock count).
 *  - "N people are viewing this" — random 25–60.
 * Rendered client-side so each visit gets fresh numbers and they aren't baked
 * into the static HTML. Purely marketing urgency.
 */
import { useEffect, useState } from 'react';

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function ProductFomo() {
  const [left, setLeft] = useState<number | null>(null);
  const [viewers, setViewers] = useState<number | null>(null);

  useEffect(() => {
    setLeft(randInt(2, 6));
    setViewers(randInt(25, 60));

    // Drift the viewer count a little so it feels live.
    const t = setInterval(() => {
      setViewers((v) => {
        if (v == null) return v;
        const next = v + randInt(-2, 2);
        return Math.min(60, Math.max(25, next));
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  if (left == null || viewers == null) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--color-error)]">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-error)] opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-error)]" />
        </span>
        Only {left} left in stock
      </span>
      <span className="inline-flex items-center gap-1.5 text-[var(--color-ink-muted)]">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
        {viewers} people are viewing this
      </span>
    </div>
  );
}
