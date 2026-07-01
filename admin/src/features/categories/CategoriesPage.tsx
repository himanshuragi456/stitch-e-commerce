import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { categoriesApi } from '@/api/categories';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { HttpError } from '@/api/client';
import type { Category } from '@/api/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  meta_title: string;
  meta_description: string;
}

const defaultForm = (): FormState => ({
  name: '', slug: '', description: '', is_active: true, meta_title: '', meta_description: '',
});

export default function CategoriesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['admin-categories'], queryFn: categoriesApi.list });

  const openCreate = () => { setEditing(null); setForm(defaultForm()); setImageFile(null); setModal(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, slug: c.slug, description: c.description ?? '', is_active: c.is_active, meta_title: c.meta_title ?? '', meta_description: c.meta_description ?? '' });
    setImageFile(null);
    setModal(true);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v)));
      if (imageFile) fd.append('image', imageFile);
      return editing ? categoriesApi.update(editing.id, fd) : categoriesApi.create(fd);
    },
    onSuccess: () => {
      toast.success(editing ? 'Category updated.' : 'Category created.');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setModal(false);
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Save failed.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: () => {
      toast.success('Category deleted.');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteId(null);
    },
    onError: (e) => toast.error(e instanceof HttpError ? e.data.message : 'Delete failed.'),
  });

  const set = (field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  return (
    <div>
      <PageHeader
        title="Categories"
        action={<Button iconLeft={<Plus size={14} />} onClick={openCreate}>Add category</Button>}
      />

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !data?.data.length ? (
          <EmptyState message="No categories yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-raised)] border-b border-[var(--color-border)]">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide hidden md:table-cell">Slug</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {data.data.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--color-surface-raised)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.image_url && <img src={c.image_url} alt={c.name} className="h-8 w-8 rounded object-cover border border-[var(--color-border)]" />}
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-text-muted)] font-mono text-xs hidden md:table-cell">{c.slug}</td>
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

      {/* Create/Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit category' : 'New category'} size="md">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={form.name} onChange={(e) => {
            set('name', e.target.value);
            if (!editing) set('slug', e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
          }} />
          <Input label="Slug" value={form.slug} onChange={(e) => set('slug', e.target.value)} />
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Image</label>
            <input ref={fileRef} type="file" accept="image/*" className="text-sm" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} className="rounded" />
            Active
          </label>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title="Delete category" message="Soft-delete this category? Products in it will remain but the category won't appear on the storefront."
      />
    </div>
  );
}
