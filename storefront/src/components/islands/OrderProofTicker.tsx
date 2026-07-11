/**
 * Social-proof toast: "<Name> from <City> just placed an order."
 * Purely decorative marketing — the names/cities are a fixed random pool, not
 * real orders. Shows a small toast bottom-left every so often, then hides.
 */
import { useEffect, useState } from 'react';

const NAMES = [
  'Priya', 'Rahul', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rohan',
  'Meera', 'Aditya', 'Isha', 'Karan', 'Divya', 'Siddharth', 'Pooja', 'Nikhil',
  'Riya', 'Aakash', 'Neha', 'Manish', 'Shreya', 'Varun', 'Tanvi', 'Harsh',
  'Ayesha', 'Rajat', 'Simran', 'Dev', 'Naina', 'Kabir',
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur',
  'Surat', 'Indore', 'Chennai', 'Kolkata', 'Lucknow', 'Nagpur', 'Chandigarh',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Proof {
  id: number;
  name: string;
  city: string;
  mins: number;
}

export default function OrderProofTicker() {
  const [proof, setProof] = useState<Proof | null>(null);

  useEffect(() => {
    let counter = 0;
    let hideTimer: ReturnType<typeof setTimeout>;

    const show = () => {
      setProof({
        id: ++counter,
        name: pick(NAMES),
        city: pick(CITIES),
        mins: Math.floor(Math.random() * 27) + 2, // 2–28 mins ago
      });
      hideTimer = setTimeout(() => setProof(null), 5000); // visible 5s
    };

    // First one after a short delay, then repeat on a randomized interval.
    const first = setTimeout(show, 6000);
    const loop = setInterval(show, 16000 + Math.random() * 8000); // ~16–24s

    return () => {
      clearTimeout(first);
      clearTimeout(hideTimer);
      clearInterval(loop);
    };
  }, []);

  if (!proof) return null;

  return (
    <div
      key={proof.id}
      className="order-proof fixed bottom-4 left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 shadow-[var(--shadow-lg)]"
      role="status"
      aria-live="polite"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xs font-semibold text-white">
        {proof.name[0]}
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-tight text-[var(--color-ink)]">
          <span className="font-semibold">{proof.name}</span> from {proof.city} just placed an order
        </p>
        <p className="text-[11px] text-[var(--color-ink-muted)]">{proof.mins} min ago · verified buyer</p>
      </div>
      <style>{`
        .order-proof { animation: proof-in 360ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes proof-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .order-proof { animation: none; }
        }
      `}</style>
    </div>
  );
}
