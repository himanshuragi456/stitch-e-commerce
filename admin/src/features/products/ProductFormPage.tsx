import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Star, StarOff, Upload } from 'lucide-react';
import { productsApi } from '@/api/products';
import { categoriesApi } from '@/api/categories';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/hooks/useToast';
import { formatMoney } from '@/lib/format';
import { HttpError } from '@/api/client';
import type { ProductImage } from '@/api/types';

const INTENDED_USES = ['shirt', 'pant', 'suit', 'kurta', 'saree', 'dupatta', 'other'];

interface LengthRow { id?: string; length_metres: number; position: number }

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [intendedUse, setIntendedUse] = useState('shirt');
  const [material, setMaterial] = useState('');
  const [color, setColor] = useState('');
  const [pattern, setPattern] = useState('');
  const [description, setDescription] = useState('');
  const [pricePaise, setPricePaise] = useState<number | null>(null);
  const [comparePaise, setComparePaise] = useState<number | null>(null);
  const [stockMetres, setStockMetres] = useState('');
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [lengths, setLengths] = useState<LengthRow[]>([{ length_metres: 1.5, position: 0 }]);
  const [images, setImages] = useState<ProductImage[]>([]);
  // Files chosen on the "New product" form before it has an id — uploaded
  // automatically right after the product is created.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productsApi.get(id!),
    enabled: isEdit,
  });

  const { data: cats } = useQuery({ queryKey: ['admin-categories'], queryFn: categoriesApi.list });

  useEffect(() => {
    if (!product) return;
    const p = product.data;
    setName(p.name); setSlug(p.slug); setCategoryId(p.category?.id ?? '');
    setIntendedUse(p.intended_use); setMaterial(p.material ?? ''); setColor(p.color ?? '');
    setPattern(p.pattern ?? '');
    setDescription(p.description ?? ''); setPricePaise(p.price_per_metre_paise);
    setComparePaise(p.compare_at_per_metre_paise ?? null);
    setStockMetres(p.stock_metres); setSku(p.sku ?? '');
    setIsActive(p.is_active); setIsFeatured(p.is_featured);
    setMetaTitle(p.meta_title ?? ''); setMetaDesc(p.meta_description ?? '');
    setLengths(p.lengths.map((l) => ({ id: l.id, length_metres: parseFloat(l.length_metres), position: l.position })));
    setImages(p.images);
  }, [product]);

  const catOptions = (cats?.data ?? []).map((c) => ({ value: c.id, label: c.name }));

  const save = async () => {
    // Field-specific messages so it's obvious what's missing.
    if (!name.trim()) { toast.error('Product name is required.'); return; }
    if (!categoryId) { toast.error('Please select a category.'); return; }
    if (!pricePaise) { toast.error('Price per metre is required.'); return; }
    if (stockMetres.trim() === '') { toast.error('Stock metres is required.'); return; }
    if (Number.isNaN(parseFloat(stockMetres)) || parseFloat(stockMetres) < 0) {
      toast.error('Stock metres must be a number of 0 or more.');
      return;
    }
    const cleanLengths = lengths.filter((l) => Number.isFinite(l.length_metres) && l.length_metres > 0);
    if (cleanLengths.length === 0) {
      toast.error('Add at least one valid offered length (e.g. 1.5).');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name, slug: slug || undefined, category_id: categoryId, intended_use: intendedUse,
        material: material || undefined, color: color || undefined,
        pattern: pattern || undefined,
        description: description || undefined,
        price_per_metre_paise: pricePaise,
        compare_at_per_metre_paise: comparePaise || undefined,
        stock_metres: String(parseFloat(stockMetres)),
        sku: sku || undefined, is_active: isActive, is_featured: isFeatured,
        meta_title: metaTitle || undefined, meta_description: metaDesc || undefined,
      };

      let savedId = id;
      if (isEdit) {
        await productsApi.update(id!, payload);
      } else {
        const res = await productsApi.create(payload);
        savedId = res.data.id;
      }

      // Save lengths
      await productsApi.replaceLengths(
        savedId!,
        cleanLengths.map((l, i) => ({ length_metres: l.length_metres, position: i })),
      );

      // On create, upload any images the user picked before the product existed,
      // then send them to the edit page so they can see/manage the uploads.
      if (!isEdit && pendingFiles.length > 0) {
        await uploadImages(pendingFiles, savedId);
        setPendingFiles([]);
        qc.invalidateQueries({ queryKey: ['admin-products'] });
        toast.success('Product created.');
        navigate(`/products/${savedId}/edit`);
        return;
      }

      toast.success(isEdit ? 'Product updated.' : 'Product created.');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      navigate('/products');
    } catch (e) {
      toast.error(e instanceof HttpError ? e.data.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // Upload against an explicit product id (used right after create, when the
  // `id` route param isn't set yet) or the current one when editing.
  const uploadImages = async (files: File[], productId = id) => {
    if (!productId) { toast.info('Save product first before uploading images.'); return; }
    setUploading(true);
    try {
      const res = await productsApi.uploadImages(productId, files);
      setImages((prev) => [...prev, ...res.data]);
      toast.success(`${files.length} image(s) uploaded.`);
    } catch (e) {
      toast.error(e instanceof HttpError ? e.data.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const setPrimary = async (imageId: string) => {
    if (!id) return;
    await productsApi.updateImage(id, imageId, { is_primary: true });
    setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.id === imageId })));
  };

  const deleteImage = async (imageId: string) => {
    if (!id) return;
    await productsApi.deleteImage(id, imageId);
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    toast.success('Image deleted.');
  };

  const addLength = () =>
    setLengths((prev) => [...prev, { length_metres: 1.5, position: prev.length }]);
  const removeLength = (i: number) =>
    setLengths((prev) => prev.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, position: idx })));
  const updateLength = (i: number, raw: string) =>
    setLengths((prev) => prev.map((l, idx) => {
      if (idx !== i) return l;
      // Empty / invalid entry becomes 0 so the input can render "" and be filtered out on save.
      const parsed = raw === '' ? 0 : parseFloat(raw);
      return { ...l, length_metres: Number.isNaN(parsed) ? 0 : parsed };
    }));

  if (isEdit && loadingProduct) return <div className="flex justify-center pt-20"><Spinner /></div>;

  return (
    <div className="max-w-3xl">
      <PageHeader title={isEdit ? 'Edit product' : 'New product'} />

      <div className="flex flex-col gap-6">
        {/* Basics */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input label="Product name" value={name} onChange={(e) => {
                setName(e.target.value);
                if (!isEdit) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
              }} required />
            </div>
            <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} hint="Auto-generated from name" />
            <Input label="SKU (optional)" value={sku} onChange={(e) => setSku(e.target.value)}
              hint="Your internal product code for stock tracking — not shown to customers." />
            <Select
              label="Category *"
              options={catOptions}
              placeholder="Select category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            />
            <Select
              label="Intended use"
              options={INTENDED_USES.map((u) => ({ value: u, label: u.charAt(0).toUpperCase() + u.slice(1) }))}
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
            />
            <Input label="Material" value={material} onChange={(e) => setMaterial(e.target.value)} />
            <Input label="Color name" value={color} onChange={(e) => setColor(e.target.value)} />
            <Input label="Pattern" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="rounded" />
                Featured
              </label>
            </div>
          </div>
        </section>

        {/* Pricing & stock */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">Pricing & Stock</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MoneyInput
              label="Price per metre *"
              valuePaise={pricePaise}
              onChangePaise={setPricePaise}
            />
            <MoneyInput
              label="Compare-at price (optional)"
              valuePaise={comparePaise}
              onChangePaise={setComparePaise}
              hint="Strike-through price"
            />
            <Input
              label="Stock metres *"
              type="number"
              step="0.01"
              min="0"
              value={stockMetres}
              onChange={(e) => setStockMetres(e.target.value)}
            />
          </div>
          {/* Price preview per length */}
          {pricePaise && lengths.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {lengths.filter((l) => l.length_metres > 0).map((l, i) => (
                <span key={i} className="text-xs bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded px-2 py-1">
                  {l.length_metres}m → {formatMoney(Math.round(pricePaise * l.length_metres))}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Offered lengths */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Offered lengths</h2>
            <Button variant="secondary" size="sm" iconLeft={<Plus size={13} />} onClick={addLength}>
              Add
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {lengths.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <GripVertical size={14} className="text-[var(--color-text-subtle)] shrink-0" />
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="100"
                  value={l.length_metres === 0 ? '' : l.length_metres}
                  onChange={(e) => updateLength(i, e.target.value)}
                  className="w-28 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                />
                <span className="text-sm text-[var(--color-text-muted)]">metres</span>
                <button onClick={() => removeLength(i)} className="ml-auto text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Images */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Images</h2>
            <Button variant="secondary" size="sm" iconLeft={<Upload size={13} />}
              onClick={() => fileRef.current?.click()} loading={uploading}>
              {isEdit ? 'Upload' : 'Choose images'}
            </Button>
          </div>
          <input
            ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
            multiple className="hidden"
            onChange={(e) => {
              if (!e.target.files?.length) return;
              const files = Array.from(e.target.files);
              // On the New form there's no product id yet — stage the files and
              // upload them automatically when the product is created.
              if (isEdit) uploadImages(files);
              else setPendingFiles((prev) => [...prev, ...files]);
              e.target.value = ''; // allow re-selecting the same file
            }}
          />
          {!isEdit && (
            <p className="text-sm text-[var(--color-text-muted)] mb-3">
              Pick images now — they'll upload automatically when you create the product. You can set the primary image afterwards.
            </p>
          )}
          {/* Staged (not-yet-uploaded) files on the New form */}
          {pendingFiles.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
              {pendingFiles.map((file, i) => (
                <div key={i} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] aspect-square">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-white hover:text-red-300">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <span className="absolute top-1 left-1 bg-[var(--color-surface)]/90 text-[9px] font-medium px-1 rounded">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="relative group rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)] aspect-square">
                  <img src={img.thumb_url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={() => setPrimary(img.id)} title="Set primary"
                      className="text-white hover:text-yellow-300">
                      {img.is_primary ? <Star size={16} fill="currentColor" /> : <StarOff size={16} />}
                    </button>
                    <button onClick={() => deleteImage(img.id)} className="text-white hover:text-red-300">
                      <Trash2 size={15} />
                    </button>
                  </div>
                  {img.is_primary && (
                    <span className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1 rounded">
                      PRIMARY
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEO */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="font-semibold text-sm mb-4">SEO (optional)</h2>
          <div className="grid gap-4">
            <Input label="Meta title" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} hint="Defaults to product name" />
            <div>
              <label className="block text-sm font-medium mb-1">Meta description</label>
              <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={2}
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 py-2 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]" />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={save} loading={saving}>
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
          <Button variant="secondary" onClick={() => navigate('/products')}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}
