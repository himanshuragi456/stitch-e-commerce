import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { settingsApi } from '@/api/settings';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { HttpError } from '@/api/client';

export default function SettingsPage() {
  const toast = useToast();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: settingsApi.list });

  const [storeName, setStoreName] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [flatRatePaise, setFlatRatePaise] = useState<number | null>(null);
  const [freeThresholdPaise, setFreeThresholdPaise] = useState<number | null>(null);
  const [fbUrl, setFbUrl] = useState('');
  const [igUrl, setIgUrl] = useState('');
  const [ytUrl, setYtUrl] = useState('');
  const [styleVideoEnabled, setStyleVideoEnabled] = useState(false);
  const [styleVideoUrl, setStyleVideoUrl] = useState('');
  const [styleVideoTitle, setStyleVideoTitle] = useState('');

  useEffect(() => {
    if (!data) return;
    const d = data.data as Record<string, Record<string, unknown>>;
    setStoreName(String(d?.['store']?.name ?? ''));
    setStoreEmail(String(d?.['store']?.email ?? ''));
    setStorePhone(String(d?.['store']?.phone ?? ''));
    setFlatRatePaise(Number(d?.['shipping']?.flat_rate_paise ?? 0));
    setFreeThresholdPaise(Number(d?.['shipping']?.free_threshold_paise ?? 0));
    setFbUrl(String(d?.['social']?.facebook ?? ''));
    setIgUrl(String(d?.['social']?.instagram ?? ''));
    setYtUrl(String(d?.['social']?.youtube ?? ''));
    setStyleVideoEnabled(Boolean(d?.['style_video']?.enabled));
    setStyleVideoUrl(String(d?.['style_video']?.youtube_url ?? ''));
    setStyleVideoTitle(String(d?.['style_video']?.title ?? ''));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => settingsApi.update({
      'store.name': storeName, 'store.email': storeEmail, 'store.phone': storePhone,
      'shipping.flat_rate_paise': flatRatePaise, 'shipping.free_threshold_paise': freeThresholdPaise,
      'social.facebook': fbUrl, 'social.instagram': igUrl, 'social.youtube': ytUrl,
      'style_video.enabled': styleVideoEnabled, 'style_video.youtube_url': styleVideoUrl,
      'style_video.title': styleVideoTitle,
    }),
    onSuccess: () => toast.success('Settings saved.'),
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Save failed.'),
  });

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" />

      <div className="flex flex-col gap-6">
        {/* Store */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Store info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Store name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
            <Input label="Contact email" type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} />
            <Input label="Phone" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} />
          </div>
        </section>

        {/* Shipping */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Shipping</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput label="Flat shipping rate" valuePaise={flatRatePaise} onChangePaise={setFlatRatePaise} />
            <MoneyInput label="Free shipping threshold" valuePaise={freeThresholdPaise} onChangePaise={setFreeThresholdPaise} hint="0 = always charged" />
          </div>
        </section>

        {/* Social */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Social links</h2>
          <div className="grid gap-4">
            <Input label="Facebook URL" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)} />
            <Input label="Instagram URL" value={igUrl} onChange={(e) => setIgUrl(e.target.value)} />
            <Input label="YouTube URL" value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} />
          </div>
        </section>

        {/* Style video */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Daily style video</h2>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={styleVideoEnabled} onChange={(e) => setStyleVideoEnabled(e.target.checked)} className="rounded" />
              Enable on storefront home page
            </label>
            <Input label="YouTube URL" value={styleVideoUrl} onChange={(e) => setStyleVideoUrl(e.target.value)}
              hint="Full YouTube watch / share URL" />
            <Input label="Section title" value={styleVideoTitle} onChange={(e) => setStyleVideoTitle(e.target.value)} />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save settings</Button>
        </div>
      </div>
    </div>
  );
}
