/**
 * Account page island — login/register tabs + orders list + profile edit.
 * Reads/writes the nanostores auth store.
 */
import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $authToken, $customer, setAuth, clearAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { formatPaise } from '../../lib/format';
import type { CustomerOrder, CustomerProfile } from '../../lib/types';

// ── Auth forms ────────────────────────────────────────────────────────────────

function Field({
  label,
  type = 'text',
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-[var(--color-ink)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        className="h-10 rounded-[var(--radius)] border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/20"
      />
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: (token: string, p: CustomerProfile) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.customer.login({ email, password });
      onSuccess(res.token, res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email address" type="email" value={email} onChange={setEmail} required autoComplete="email" />
      <Field label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function RegisterForm({ onSuccess }: { onSuccess: (token: string, p: CustomerProfile) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.customer.register({ name, email, password, password_confirmation: confirm });
      onSuccess(res.token, res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Full name" value={name} onChange={setName} required autoComplete="name" />
      <Field label="Email address" type="email" value={email} onChange={setEmail} required autoComplete="email" />
      <Field label="Password" type="password" value={password} onChange={setPassword} required autoComplete="new-password" />
      <Field label="Confirm password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" />
      {error && <p className="text-sm text-[var(--color-error)]">{error}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center disabled:opacity-60">
        {loading ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  );
}

// ── Orders tab ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-orange-100 text-orange-800',
};

function OrdersTab({ authToken }: { authToken: string }) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.customer.orders(authToken)
      .then((r) => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, [authToken]);

  if (loading) return <div className="flex justify-center py-10"><div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div>;

  if (orders.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-[var(--color-ink-muted)]">No orders yet.</p>
        <a href="/" className="btn btn-primary mt-4">Start shopping</a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((o) => (
        <a
          key={o.id}
          href={`/account/orders/${o.id}`}
          className="block rounded-[var(--radius-lg)] border border-[var(--color-border)] p-5 transition-shadow hover:shadow-[var(--shadow)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[var(--color-ink)]">Order #{o.order_number}</p>
              <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">
                {new Date(o.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {o.status}
              </span>
              <span className="text-sm font-semibold">{formatPaise(o.total_paise)}</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            {o.items.length} {o.items.length === 1 ? 'item' : 'items'} · {o.shipping_address.city}, {o.shipping_address.state}
          </p>
        </a>
      ))}
    </div>
  );
}

// ── Profile tab ───────────────────────────────────────────────────────────────

function ProfileTab({ authToken, profile }: { authToken: string; profile: CustomerProfile }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      const updated = await api.customer.updateProfile(authToken, { name, email });
      setAuth(authToken, updated);
      setSaveMsg('Profile updated.');
    } catch (err) {
      setSaveMsg((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return; }
    setPwLoading(true);
    setPwMsg('');
    try {
      await api.customer.updatePassword(authToken, {
        current_password: curPw,
        password: newPw,
        password_confirmation: confirmPw,
      });
      setPwMsg('Password changed successfully.');
      setCurPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg((err as Error).message);
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <form onSubmit={saveProfile} className="flex flex-col gap-4">
        <h3 className="font-semibold">Personal details</h3>
        <Field label="Name" value={name} onChange={setName} required autoComplete="name" />
        <Field label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        {saveMsg && <p className="text-sm text-[var(--color-success)]">{saveMsg}</p>}
        <button type="submit" disabled={saving} className="btn btn-primary w-fit disabled:opacity-60">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form onSubmit={changePassword} className="flex flex-col gap-4">
        <h3 className="font-semibold">Change password</h3>
        <Field label="Current password" type="password" value={curPw} onChange={setCurPw} required autoComplete="current-password" />
        <Field label="New password" type="password" value={newPw} onChange={setNewPw} required autoComplete="new-password" />
        <Field label="Confirm new password" type="password" value={confirmPw} onChange={setConfirmPw} required autoComplete="new-password" />
        {pwMsg && <p className={`text-sm ${pwMsg.includes('success') ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'}`}>{pwMsg}</p>}
        <button type="submit" disabled={pwLoading} className="btn btn-ghost border border-[var(--color-border)] w-fit disabled:opacity-60">
          {pwLoading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Tab = 'orders' | 'profile';
type AuthTab = 'login' | 'register';

export default function AccountPage() {
  const authToken = useStore($authToken);
  const customerStore = useStore($customer);
  const [tab, setTab] = useState<Tab>('orders');
  const [authTab, setAuthTab] = useState<AuthTab>('login');
  const [profile, setProfile] = useState<CustomerProfile | null>(null);

  // If logged in, fetch fresh profile once
  useEffect(() => {
    if (!authToken) return;
    api.customer.me(authToken)
      .then((p) => { setProfile(p); setAuth(authToken, p); })
      .catch(() => clearAuth());
  }, [authToken]);

  // Check URL for ?tab=register hint
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'register') setAuthTab('register');
  }, []);

  function handleAuthSuccess(token: string, p: CustomerProfile) {
    setAuth(token, p);
    setProfile(p);
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    if (next) {
      window.location.href = next;
    } else if (window.location.pathname.startsWith('/account/login')) {
      // Land on the account dashboard after signing in from the login page.
      window.location.href = '/account';
    }
    // On /account itself the island re-renders in place to the dashboard.
  }

  async function logout() {
    if (authToken) {
      await api.customer.logout(authToken).catch(() => {});
    }
    clearAuth();
    setProfile(null);
  }

  // Not logged in
  if (!authToken || !customerStore.id) {
    return (
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex rounded-[var(--radius-lg)] border border-[var(--color-border)] p-1">
          {(['login', 'register'] as AuthTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setAuthTab(t)}
              className={`flex-1 rounded-[var(--radius)] py-2 text-sm font-semibold capitalize transition-colors ${
                authTab === t
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
              }`}
            >
              {t === 'login' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        {authTab === 'login' ? (
          <LoginForm onSuccess={handleAuthSuccess} />
        ) : (
          <RegisterForm onSuccess={handleAuthSuccess} />
        )}
      </div>
    );
  }

  const displayProfile = profile ?? {
    id: customerStore.id ?? '',
    name: customerStore.name ?? '',
    email: customerStore.email ?? '',
    phone: null,
    created_at: '',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-heading)] text-2xl font-semibold">My account</h1>
          <p className="mt-0.5 text-sm text-[var(--color-ink-muted)]">{displayProfile.email}</p>
        </div>
        <button onClick={logout} className="btn btn-ghost border border-[var(--color-border)] text-sm">
          Sign out
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-[var(--color-border)]">
        {([['orders', 'Orders'], ['profile', 'Profile']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 pb-3 text-sm font-semibold transition-colors ${
              tab === t
                ? 'border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'orders' && <OrdersTab authToken={authToken} />}
      {tab === 'profile' && <ProfileTab authToken={authToken} profile={displayProfile} />}
    </div>
  );
}
