/**
 * Checkout page island — address form + order summary + place order.
 * Reads cart from backend, posts to /checkout, redirects to /order/{id}/confirmation.
 */
import { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { $cartToken, clearCart, stashLastOrder } from '../../lib/cart';
import { $authToken, $customer } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import { openRazorpayCheckout } from '../../lib/razorpay';
import type { Cart, PaymentMethod } from '../../lib/types';

interface AddrForm {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

const EMPTY_ADDR: AddrForm = { name: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/; // Indian 10-digit mobile

type FieldErrors = Record<string, string>;

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman and Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

function Field({
  label,
  value,
  onChange,
  required,
  type = 'text',
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}{required && <span className="ml-0.5 text-[var(--color-error)]">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        aria-invalid={error ? true : undefined}
        className={`h-10 rounded-[var(--radius)] border bg-white px-3 text-sm focus:outline-none focus:ring-1 ${
          error
            ? 'border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20'
            : 'border-[var(--color-border)] focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/20'
        }`}
      />
      {error && <p className="text-xs font-medium text-[var(--color-error)]">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const token = useStore($cartToken);
  const authToken = useStore($authToken);
  const customer = useStore($customer);

  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [addr, setAddr] = useState<AddrForm>(EMPTY_ADDR);
  const [notes, setNotes] = useState('');
  const [samePhone, setSamePhone] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('razorpay');

  const loadCart = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    try {
      const res = await api.cart.get(token);
      setCart(res.data);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadCart(); }, [loadCart]);

  // Pre-fill from logged-in customer
  useEffect(() => {
    if (customer.name) setCustomerName(customer.name);
    if (customer.email) setCustomerEmail(customer.email);
  }, [customer.name, customer.email]);

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      // Once the highlighted fields are all resolved, drop the banner too.
      if (Object.keys(next).length === 0) setError('');
      return next;
    });
  }

  function setAddrField<K extends keyof AddrForm>(key: K, val: string) {
    setAddr((prev) => ({ ...prev, [key]: val }));
    clearFieldError(`addr.${key}`);
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};

    if (!customerName.trim()) e.name = 'Full name is required.';

    if (!customerEmail.trim()) e.email = 'Email is required.';
    else if (!EMAIL_RE.test(customerEmail.trim())) e.email = 'Enter a valid email address.';

    if (!customerPhone.trim()) e.phone = 'Phone is required.';
    else if (!PHONE_RE.test(customerPhone.trim())) e.phone = 'Enter a valid 10-digit mobile number.';

    if (!addr.name.trim()) e['addr.name'] = 'Recipient name is required.';
    if (!addr.line1.trim()) e['addr.line1'] = 'Address line 1 is required.';
    if (!addr.city.trim()) e['addr.city'] = 'City is required.';
    if (!addr.state) e['addr.state'] = 'Please select a state.';

    if (!addr.pincode.trim()) e['addr.pincode'] = 'Pincode is required.';
    else if (!/^\d{6}$/.test(addr.pincode.trim())) e['addr.pincode'] = 'Pincode must be 6 digits.';

    if (!samePhone) {
      if (!addr.phone.trim()) e['addr.phone'] = 'Delivery phone is required.';
      else if (!PHONE_RE.test(addr.phone.trim())) e['addr.phone'] = 'Enter a valid 10-digit mobile number.';
    }

    return e;
  }

  async function place() {
    if (!token || !cart || cart.items.length === 0) return;

    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setPlacing(true);
    setError('');
    const deliveryPhone = (samePhone ? customerPhone : addr.phone).trim();
    try {
      const res = await api.checkout.place(
        token,
        {
          email: customerEmail.trim(),
          phone: deliveryPhone,
          shipping_address: {
            name: addr.name,
            line1: addr.line1,
            line2: addr.line2 || undefined,
            city: addr.city,
            state: addr.state,
            pincode: addr.pincode,
            phone: deliveryPhone,
          },
          payment_method: paymentMethod,
          notes: notes || undefined,
        },
        authToken || null
      );

      const { order, razorpay } = res.data;
      stashLastOrder({ id: order.id, order_number: order.order_number, email: customerEmail.trim() });

      // Cash on delivery — order is already placed; go straight to confirmation.
      if (paymentMethod === 'cod' || !razorpay) {
        clearCart();
        window.location.href = `/order/${order.id}/confirmation`;
        return;
      }

      // Online payment — open the Razorpay widget, then verify server-side.
      await openRazorpayCheckout({
        keyId: razorpay.key_id,
        razorpayOrderId: razorpay.razorpay_order_id,
        amountPaise: razorpay.amount_paise,
        currency: razorpay.currency,
        name: 'Shree Krishna Collection',
        description: `Order ${order.order_number}`,
        prefill: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          contact: deliveryPhone,
        },
        onSuccess: async (payment) => {
          try {
            await api.checkout.verify(
              {
                order_id: order.id,
                razorpay_payment_id: payment.razorpay_payment_id,
                razorpay_order_id: payment.razorpay_order_id,
                razorpay_signature: payment.razorpay_signature,
              },
              authToken || null
            );
            clearCart();
            window.location.href = `/order/${order.id}/confirmation`;
          } catch (e) {
            setError(
              `Payment received but we couldn't confirm it automatically. Your order number is ${order.order_number} — please contact us with this number. (${(e as Error).message})`
            );
            setPlacing(false);
          }
        },
        onDismiss: () => {
          // Customer closed the payment dialog without paying. The order exists
          // as pending/unpaid; let them retry from the confirmation page.
          setError('Payment was not completed. Your order is saved as unpaid — you can retry payment or choose cash on delivery.');
          setPlacing(false);
        },
      });
    } catch (e) {
      setError((e as Error).message);
      setPlacing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" />
      </div>
    );
  }

  if (!token || !cart || cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-[var(--color-ink-muted)]">Your cart is empty.</p>
        <a href="/" className="btn btn-primary mt-4">Start shopping</a>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
      {/* Left — forms */}
      <div className="flex flex-col gap-8">
        {/* Contact */}
        <section>
          <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Contact</h2>
          {!authToken && (
            <p className="mb-4 text-sm text-[var(--color-ink-muted)]">
              Have an account?{' '}
              <a href="/account/login?next=/checkout" className="text-[var(--color-primary)] underline">
                Sign in
              </a>{' '}
              for faster checkout.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Full name"
              value={customerName}
              onChange={(v) => { setCustomerName(v); clearFieldError('name'); }}
              required
              error={fieldErrors.name}
            />
            <Field
              label="Email"
              type="email"
              value={customerEmail}
              onChange={(v) => { setCustomerEmail(v); clearFieldError('email'); }}
              required
              error={fieldErrors.email}
            />
            <div className="sm:col-span-2">
              <Field
                label="Phone"
                type="tel"
                value={customerPhone}
                onChange={(v) => { setCustomerPhone(v); clearFieldError('phone'); }}
                required
                placeholder="10-digit mobile"
                error={fieldErrors.phone}
              />
            </div>
          </div>
        </section>

        {/* Shipping address */}
        <section>
          <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Shipping address</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Full name (recipient)" value={addr.name} onChange={(v) => setAddrField('name', v)} required error={fieldErrors['addr.name']} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Address line 1" value={addr.line1} onChange={(v) => setAddrField('line1', v)} required placeholder="House no., street, area" error={fieldErrors['addr.line1']} />
            </div>
            <div className="sm:col-span-2">
              <Field label="Address line 2 (optional)" value={addr.line2} onChange={(v) => setAddrField('line2', v)} placeholder="Landmark, floor, etc." />
            </div>
            <Field label="City" value={addr.city} onChange={(v) => setAddrField('city', v)} required error={fieldErrors['addr.city']} />
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">
                State<span className="ml-0.5 text-[var(--color-error)]">*</span>
              </label>
              <select
                value={addr.state}
                onChange={(e) => setAddrField('state', e.target.value)}
                required
                aria-invalid={fieldErrors['addr.state'] ? true : undefined}
                className={`h-10 rounded-[var(--radius)] border bg-white px-3 text-sm focus:outline-none ${
                  fieldErrors['addr.state']
                    ? 'border-[var(--color-error)] focus:border-[var(--color-error)]'
                    : 'border-[var(--color-border)] focus:border-[var(--color-primary)]'
                }`}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              {fieldErrors['addr.state'] && <p className="text-xs font-medium text-[var(--color-error)]">{fieldErrors['addr.state']}</p>}
            </div>
            <Field label="Pincode" value={addr.pincode} onChange={(v) => setAddrField('pincode', v)} required placeholder="6-digit code" error={fieldErrors['addr.pincode']} />

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={samePhone}
                  onChange={(e) => setSamePhone(e.target.checked)}
                  className="rounded"
                />
                Same phone as contact
              </label>
            </div>
            {!samePhone && (
              <div className="sm:col-span-2">
                <Field label="Delivery phone" type="tel" value={addr.phone} onChange={(v) => setAddrField('phone', v)} required placeholder="10-digit mobile" error={fieldErrors['addr.phone']} />
              </div>
            )}
          </div>
        </section>

        {/* Payment method */}
        <section>
          <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Payment method</h2>
          <div className="flex flex-col gap-3">
            <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-4 ${
              paymentMethod === 'razorpay' ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)]'
            }`}>
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === 'razorpay'}
                onChange={() => setPaymentMethod('razorpay')}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Pay online</span>
                <span className="block text-xs text-[var(--color-ink-muted)]">UPI, cards, netbanking &amp; wallets via Razorpay. Secure and instant.</span>
              </span>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-4 ${
              paymentMethod === 'cod' ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/20' : 'border-[var(--color-border)]'
            }`}>
              <input
                type="radio"
                name="payment_method"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-medium">Cash on delivery</span>
                <span className="block text-xs text-[var(--color-ink-muted)]">Pay in cash when your order arrives. Our team will call to confirm.</span>
              </span>
            </label>
          </div>
        </section>

        {/* Notes */}
        <section>
          <h2 className="mb-3 font-[var(--font-heading)] text-lg font-semibold">Order notes <span className="text-sm font-normal text-[var(--color-ink-muted)]">(optional)</span></h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special instructions for your order…"
            className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none"
          />
        </section>

        {error && (
          <p className="rounded-[var(--radius)] bg-[var(--color-error)]/10 px-4 py-3 text-sm font-medium text-[var(--color-error)]">
            {error}
          </p>
        )}
      </div>

      {/* Right — summary */}
      <div className="h-fit rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 font-[var(--font-heading)] text-lg font-semibold">Order summary</h2>

        <div className="mb-5 flex flex-col gap-3">
          {cart.items.map((item) => {
            const metres = parseFloat(item.length_metres).toFixed(2).replace(/\.?0+$/, '');
            return (
              <div key={item.id} className="flex items-start gap-3 text-sm">
                <div className="relative shrink-0">
                  {item.primary_image_url ? (
                    <img src={item.primary_image_url} alt={item.product_name} className="h-14 w-11 rounded object-cover" />
                  ) : (
                    <div className="h-14 w-11 rounded bg-[var(--color-border)]" />
                  )}
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-ink)] text-[10px] font-semibold text-white">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium leading-tight">{item.product_name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{metres} m</p>
                </div>
                <span className="font-medium">{formatPaise(item.line_total_paise)}</span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Subtotal</span>
            <span>{formatPaise(cart.subtotal_paise)}</span>
          </div>
          {cart.discount_paise > 0 && (
            <div className="flex justify-between text-[var(--color-success)]">
              <span>{cart.coupon_code ? `Coupon (${cart.coupon_code})` : 'Discount'}</span>
              <span>−{formatPaise(cart.discount_paise)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--color-ink-muted)]">Shipping</span>
            <span>{cart.shipping_paise > 0 ? formatPaise(cart.shipping_paise) : 'Free'}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatPaise(cart.total_paise)}</span>
          </div>
        </div>

        <button
          onClick={place}
          disabled={placing}
          className="btn btn-primary mt-6 w-full justify-center disabled:opacity-60"
        >
          {placing
            ? 'Placing order…'
            : paymentMethod === 'razorpay'
              ? `Pay ${formatPaise(cart.total_paise)}`
              : 'Place order (Cash on delivery)'}
        </button>

        <p className="mt-3 text-center text-xs text-[var(--color-ink-muted)]">
          {paymentMethod === 'razorpay'
            ? 'You will be redirected to a secure Razorpay payment window.'
            : 'No payment now — pay in cash when your order is delivered.'}
        </p>
      </div>
    </div>
  );
}
