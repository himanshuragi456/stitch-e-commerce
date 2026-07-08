// Lazy-loads the Razorpay Checkout script and opens the payment dialog.
// Only used on the client (checkout island).

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OpenOptions {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (res: RazorpaySuccess) => void;
  onDismiss: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RazorpayCtor = new (options: any) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayCtor;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay.')));
      if (window.Razorpay) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Razorpay. Check your connection and try again.'));
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export async function openRazorpayCheckout(opts: OpenOptions): Promise<void> {
  await loadScript();
  if (!window.Razorpay) throw new Error('Razorpay is unavailable.');

  const rzp = new window.Razorpay({
    key: opts.keyId,
    order_id: opts.razorpayOrderId,
    amount: opts.amountPaise,
    currency: opts.currency,
    name: opts.name,
    description: opts.description,
    prefill: opts.prefill,
    handler: (res: RazorpaySuccess) => opts.onSuccess(res),
    modal: {
      ondismiss: () => opts.onDismiss(),
    },
    theme: { color: '#7c3f00' },
  });

  rzp.open();
}
