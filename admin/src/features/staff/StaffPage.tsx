import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, KeyRound } from 'lucide-react';
import { staffApi } from '@/api/staff';
import { useAuthStore } from '@/store/auth.store';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { formatDateTime } from '@/lib/format';
import { HttpError } from '@/api/client';
import type { Staff } from '@/api/types';

const ROLES = [{ value: 'admin', label: 'Admin' }, { value: 'employee', label: 'Employee' }];

interface StaffForm { name: string; email: string; password: string; role: string; is_active: boolean }
const defaultForm = (): StaffForm => ({ name: '', email: '', password: '', role: 'employee', is_active: true });

export default function StaffPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.staff);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [form, setForm] = useState<StaffForm>(defaultForm());
  const [pwdModal, setPwdModal] = useState<Staff | null>(null);
  const [newPwd, setNewPwd] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-staff'], queryFn: staffApi.list });

  const openCreate = () => { setEditing(null); setForm(defaultForm()); setModal(true); };
  const openEdit = (s: Staff) => { setEditing(s); setForm({ name: s.name, email: s.email, password: '', role: s.role, is_active: s.is_active }); setModal(true); };

  const saveMut = useMutation({
    mutationFn: () => {
      if (editing) return staffApi.update(editing.id, { name: form.name, email: form.email, role: form.role, is_active: form.is_active });
      return staffApi.create({ name: form.name, email: form.email, password: form.password, role: form.role, is_active: form.is_active });
    },
    onSuccess: () => {
      toast.success(editing ? 'Staff updated.' : 'Staff created.');
      qc.invalidateQueries({ queryKey: ['admin-staff'] });
      setModal(false);
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Save failed.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => staffApi.delete(id),
    onSuccess: () => { toast.success('Staff deleted.'); qc.invalidateQueries({ queryKey: ['admin-staff'] }); setDeleteId(null); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Delete failed.'),
  });

  const pwdMut = useMutation({
    mutationFn: () => staffApi.resetPassword(pwdModal!.id, newPwd),
    onSuccess: () => { toast.success('Password reset.'); setPwdModal(null); setNewPwd(''); },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Reset failed.'),
  });

  const set = (f: keyof StaffForm, v: string | boolean) => setForm((prev) => ({ ...prev, [f]: v }));

  return (
    <div>
      <PageHeader title="Staff" action={<Button iconLeft={<Plus size={14} />} onClick={openCreate}>Add staff</Button>} />

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No staff members." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden lg:table-cell">Last login</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.data.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-3 font-medium">{s.name} {s.id === me?.id && <span className="text-xs text-[var(--color-text-subtle)]">(you)</span>}</td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] hidden md:table-cell">{s.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={s.role === 'admin' ? 'info' : 'default'}>{s.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] text-xs hidden lg:table-cell">{formatDateTime(s.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => { setPwdModal(s); setNewPwd(''); }}
                        className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]" title="Reset password">
                        <KeyRound size={14} />
                      </button>
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]">
                        <Pencil size={15} />
                      </button>
                      {s.id !== me?.id && (
                        <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-surface-raised)]">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit staff' : 'New staff member'} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          {!editing && <Input label="Password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} />}
          <Select label="Role" options={ROLES} value={form.role} onChange={(e) => set('role', e.target.value)} />
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

      {/* Password reset modal */}
      <Modal open={!!pwdModal} onClose={() => setPwdModal(null)} title={`Reset password — ${pwdModal?.name}`} size="sm">
        <div className="flex flex-col gap-4">
          <Input label="New password" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setPwdModal(null)}>Cancel</Button>
            <Button onClick={() => pwdMut.mutate()} loading={pwdMut.isPending}>Reset</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)} loading={deleteMut.isPending}
        title="Delete staff" message="Soft-delete this staff account? They will lose access." />
    </div>
  );
}
