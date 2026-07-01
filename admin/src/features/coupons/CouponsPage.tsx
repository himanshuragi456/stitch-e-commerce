import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { couponsApi, type CouponInput } from '@/api/coupons';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { formatMoney, formatDate } from '@/lib/format';
import { HttpError } from '@/api/client';
import type { Coupon } from '@/api/types';

interface FormState {
  code: string; type: 'percent' | 'fixed'; value: string;
  min_order_paise: number | null; usage_limit: string;
  starts_at: string; expires_at: string; is_active: boolean;
}
const defaultForm = (): FormState => ({
  code: '', type: 'percent', value: '', min_order_paise: null, usage_limit: '',
  starts_at: '', expires_at: '', is_active: true,
});

export default function CouponsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-coupons'], queryFn: couponsApi.list });

  const openCreate = () => { setEditing(null); setForm(defaultForm()); setModal(true); };
  const openEdit = (c: Coupon) => {
    setEditing(c);
    setForm({
      code: c.code, type: c.type, value: String(c.type === 'percent' ? c.value : c.value / 100),
      min_order_paise: c.min_order_paise, usage_limit: c.usage_limit != null ? String(c.usage_limit) : '',
      starts_at: c.starts_at ? c.starts_at.slice(0, 10) : '',
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      is_active: c.is_active,
    });
    setModal(true);
  };

  const toInput = (): CouponInput => ({
    code: form.code.toUpperCase(),
    type: form.type,
    value: form.type === 'percent' ? Number(form.value) : Math.round(Number(form.value) * 100),
    min_order_paise: form.min_order_paise || null,
    usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
    starts_at: form.starts_at || null,
    expires_at: form.expires_at || null,
    is_active: form.is_active,
  });

  const saveMut = useMutation({
    mutationFn: () => editing ? couponsApi.update(editing.id, toInput()) : couponsApi.create(toInput()),
    onSuccess: () => {
      toast.success(editing ? 'Coupon updated.' : 'Coupon created.');
      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      setModal(false);
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Save failed.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => couponsApi.delete(id),
    onSuccess: () => { toast.success('Coupon deleted.'); qc.invalidateQueries({ queryKey: ['admin-coupons'] }); setDeleteId(null); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Delete failed.'),
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <PageHeader title="Coupons" action={<Button iconLeft={<Plus size={14} />} onClick={openCreate}>Add coupon</Button>} />

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No coupons yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Discount</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Usage</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.data.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-3 font-mono font-medium text-[var(--color-primary)]">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.type === 'percent' ? `${c.value}%` : formatMoney(c.value)} off
                    {c.min_order_paise ? ` (min ${formatMoney(c.min_order_paise)})` : ''}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">
                    {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ''}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden lg:table-cell">
                    {c.expires_at ? formatDate(c.expires_at) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={c.is_active ? 'success' : 'muted'}>{c.is_active ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-raised)]">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit coupon' : 'New coupon'} size="md">
        <div className="flex flex-col gap-4">
          <Input label="Code" value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} hint="e.g. SAVE10" />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" options={[{ value: 'percent', label: 'Percent off' }, { value: 'fixed', label: 'Fixed amount off' }]}
              value={form.type} onChange={(e) => set('type', e.target.value as 'percent' | 'fixed')} />
            <Input label={form.type === 'percent' ? 'Percent (%)' : 'Amount (₹)'}
              type="number" value={form.value} onChange={(e) => set('value', e.target.value)} />
          </div>
          <MoneyInput label="Min order value" valuePaise={form.min_order_paise} onChangePaise={(v) => set('min_order_paise', v)} />
          <Input label="Usage limit" type="number" value={form.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} hint="Blank = unlimited" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Starts at" type="date" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
            <Input label="Expires at" type="date" value={form.expires_at} onChange={(e) => set('expires_at', e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            Active
          </label>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Delete coupon" message="Delete this coupon permanently?" />
    </div>
  );
}
