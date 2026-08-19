'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Upload, Sparkles, X } from 'lucide-react';
import { api, API_URL } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Input, Textarea, Spinner } from '@/components/ui';
import { Img } from '@/components/primitives';

const EMPTY = {
  name: '', sku: '', brand: '', category: '', subcategory: '', price: '', compareAtPrice: '',
  costPrice: '', stock: '0', lowStockThreshold: '5', images: [''], tags: '',
  shortDescription: '', description: '', isActive: true, isFeatured: false, seoTitle: '', seoDescription: '',
  variants: [],
};

const MIN_RELATED = 3;

const PX = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800&h=800&fit=crop`;

const CURATED = {
  headphones: [7772548, 8356854, 5269699, 2919003, 210927],
  airpods: [11599421, 17810093, 3945697, 30981655, 3921827],
  watch: [5081914, 31406903, 14691503, 11700618],
  speaker: [9842750, 128611, 4917455, 2651794],
  powerbank: [3921704, 16814787, 14706040, 10104285],
  clothing: [34366695, 11648228, 5524406],
  scarf: [34225148, 35158070, 35830300],
  sneakers: [1027130, 13450843, 29548615, 15229823],
  belt: [31959216, 4164506, 8539466],
  lamp: [6053887, 1612726, 2249958, 1552616],
  kitchen: [3847465, 3847481, 8903360, 18977904],
  bedding: [12553184, 7765000, 13245210, 11621057],
  candle: [9687370, 11776187, 5475164, 36563156],
  cosmetics: [20377674, 10825670, 29675492, 4841274],
  perfume: [15096784, 1666405, 13875783, 36389336],
  yoga: [6339731, 8539048, 6246682, 6752177],
  dumbbell: [7743320, 4753994, 3931367, 669580],
  bottle: [3737800, 3737799, 5038815, 11860562],
  extension: [6381070, 9242896, 3520692],
  csv: [6381070, 9242896, 3520692],
};

const STOP = new Set([
  'with', 'and', 'for', 'the', 'a', 'an', 'of', 'in', 'on', 'to', 'at', 'from', 'by', 'up',
  'premium', 'pro', 'plus', 'mini', 'max', 'ultra', 'new', 'gen', 'edition', 'smart', 'wireless',
  'bluetooth', 'rechargeable', 'portable', 'foldable', 'wearable', 'advanced', 'inch', 'inches',
  'series', 'version', 'model', 'deluxe', 'classic', 'original', 'official',
]);

const TYPE_KEYWORDS = [
  [/iphone/i, 'iphone'],
  [/airpods?/i, 'airpods'],
  [/\bbuds?\b|earbud|earpods?|earphone/i, 'airpods'],
  [/macbook/i, 'macbook'],
  [/ipad/i, 'ipad'],
  [/playstation|ps\s?5|ps4/i, 'playstation'],
  [/xbox/i, 'xbox'],
  [/(watch|smartwatch|wristwatch)/i, 'watch'],
  [/(headphone|headset)/i, 'headphones'],
  [/(speaker|soundbar|bluetooth\s?speaker)/i, 'speaker'],
  [/(television|smart\s?tv|\btv\b|qled|oled)/i, 'television'],
  [/(monitor|display|screen|desktop)/i, 'monitor'],
  [/(laptop|notebook|chromebook|ultrabook)/i, 'laptop'],
  [/(tablet|kindle)/i, 'tablet'],
  [/(smartphone|phone|mobile|android|pixel|galaxy)/i, 'smartphone'],
  [/(camera|dslr|mirrorless|camcorder|lens)/i, 'camera'],
  [/(power\s?bank|charger|powerbank)/i, 'powerbank'],
  [/(shoe|sneaker|boot|sandal|trainer|running|nike|air\s?max|jordan|adidas|puma|reebok|skechers)/i, 'sneakers'],
  [/(ring|necklace|jewelry|jewellery|earring|bracelet|pendant)/i, 'jewelry'],
  [/(perfume|parfum|fragrance|cologne|deodorant)/i, 'perfume'],
  [/(cream|serum|skincare|cosmetic|makeup|beauty)/i, 'cosmetics'],
  [/(sunglass|eyeglass|glasses|eyewear)/i, 'sunglasses'],
  [/(bag|backpack|handbag|wallet|purse|satchel)/i, 'handbag'],
  [/(scarf|muffler)/i, 'scarf'],
  [/(belt|buckle)/i, 'belt'],
  [/(candle|scented)/i, 'candle'],
  [/(dress|shirt|t-?shirt|jacket|jeans|trouser|hoodie|sweater|clothing|apparel)/i, 'clothing'],
  [/(lamp|lighting|ceiling\s?light|led\s?lamp|lantern)/i, 'lamp'],
  [/(chair|sofa|couch|recliner)/i, 'chair'],
  [/(desk|\btable\b|shelf|cabinet|wardrobe|dresser)/i, 'furniture'],
  [/(towel|bedsheet|linen|pillow|blanket|bedding)/i, 'bedding'],
  [/(kitchen|cookware|pan|utensil|blender|mixer|microwave|toaster|dinner)/i, 'kitchen'],
  [/(vacuum|cleaner|robot\s?vacuum|iron)/i, 'vacuum'],
  [/(bottle|flask|water\s?bottle|tumbler|mug)/i, 'bottle'],
  [/(yoga|mat|workout|gym)/i, 'yoga'],
  [/(dumbbell|barbell|\bweights?\b|fitness|sports)/i, 'dumbbell'],
  [/(toy|action\s?figure|lego|doll|puzzle)/i, 'toy'],
  [/(game|console|controller|gaming)/i, 'gaming'],
  [/(guitar|piano|musical|instrument)/i, 'guitar'],
  [/(bike|bicycle|cycle|scooter)/i, 'bicycle'],
  [/(drone|robot|gadget|smart\s?home)/i, 'technology'],
  [/(book|novel)/i, 'book'],
];

function keywordFor(name = '', category = '') {
  const text = `${name || ''} ${category || ''}`.toLowerCase();
  for (const [re, kw] of TYPE_KEYWORDS) {
    if (re.test(text)) return kw;
  }
  const words = `${name || ''} ${category || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));
  return words[0] || 'product';
}

function relatedUrl(name, category, i) {
  const ids = CURATED[keywordFor(name, category)];
  if (ids && ids.length) return PX(ids[(i - 1) % ids.length]);
  return `https://loremflickr.com/800/800/${encodeURIComponent(keywordFor(name, category))}?lock=${i}`;
}

function relatedFor(name, category, existing = []) {
  const cleaned = (existing || []).map((u) => String(u).trim()).filter(Boolean);
  const related = Array.from({ length: MIN_RELATED }, (_, i) => relatedUrl(name, category, i + 1));
  while (cleaned.length < MIN_RELATED) {
    cleaned.push(related[cleaned.length % related.length]);
  }
  return cleaned;
}

export function ProductForm({ productId }) {
  const router = useRouter();
  const { toast } = useStore();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(!!productId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api('/categories').then(setCategories).catch(() => {});
    if (productId) {
      api(`/admin/products/${productId}`, { token: localStorage.getItem('shopora_token') })
        .then((p) =>
          setForm({
            name: p.name || '', sku: p.sku || '', brand: p.brand || '', category: p.category || '',
            subcategory: p.subcategory || '', price: p.price ?? '', compareAtPrice: p.compareAtPrice ?? '',
            costPrice: p.costPrice ?? '', stock: p.stock ?? '0', lowStockThreshold: p.lowStockThreshold ?? '5',
            images: p.images?.length ? p.images : [''], tags: (p.tags || []).join(', '),
            shortDescription: p.shortDescription || '', description: p.description || '',
            isActive: p.isActive, isFeatured: p.isFeatured, seoTitle: p.seoTitle || '', seoDescription: p.seoDescription || '',
            variants: p.variants || [],
          }),
        )
        .catch((e) => toast(e.message, 'error'))
        .finally(() => setLoading(false));
    }
  }, [productId, toast]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const currentCat = categories.find((c) => c.name === form.category);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      price: Number(form.price) || 0,
      compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
      costPrice: form.costPrice ? Number(form.costPrice) : null,
      stock: parseInt(form.stock) || 0,
      lowStockThreshold: parseInt(form.lowStockThreshold) || 5,
      images: relatedFor(form.name, form.category, form.images),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      variants: form.variants || [],
      isActive: !!form.isActive,
      isFeatured: !!form.isFeatured,
    };
    try {
      if (productId) {
        await api(`/admin/products/${productId}`, { method: 'PUT', token: localStorage.getItem('shopora_token'), body: payload });
        toast('Product updated', 'success');
      } else {
        await api('/admin/products', { method: 'POST', token: localStorage.getItem('shopora_token'), body: payload });
        toast('Product created', 'success');
      }
      router.push('/admin/products');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (files, targetIndex) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    try {
      const token = localStorage.getItem('shopora_token');
      const urls = [];
      for (const file of list) {
        if (!file.type.startsWith('image/')) {
          toast(`${file.name} is not an image`, 'error');
          continue;
        }
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(`${API_URL}/admin/uploads`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Upload failed');
        urls.push(data.url);
      }
      if (urls.length) {
        const next = [...form.images];
        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < next.length) {
          next[targetIndex] = urls[0];
        } else {
          next.push(...urls);
        }
        setForm((f) => ({ ...f, images: relatedFor(f.name, f.category, next) }));
        toast(`Uploaded ${urls.length} image${urls.length > 1 ? 's' : ''}`, 'success');
      }
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const autoFillRelated = () => {
    setForm((f) => ({ ...f, images: relatedFor(f.name, f.category, f.images) }));
    toast('Related images added', 'success');
  };

  if (loading) {
    return <div className="flex justify-center py-32"><Spinner className="size-8 text-blue" /></div>;
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-base font-semibold">Basic info</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Input label="Product name *" required value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <Input label="SKU" value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          <Input label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          <Input label="Category" list="cat-list" value={form.category} onChange={(e) => { set('category', e.target.value); set('subcategory', ''); }} placeholder="Type or pick a category" />
          <datalist id="cat-list">
            {categories.map((c) => <option key={c._id} value={c.name} />)}
          </datalist>
          <Input label="Subcategory" list="sub-list" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} />
          <datalist id="sub-list">
            {(currentCat?.subcategories || []).map((s) => <option key={s.slug} value={s.name} />)}
          </datalist>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-base font-semibold">Pricing & stock</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Input label="Selling price *" type="number" step="0.01" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
          <Input label="Compare-at price" type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={(e) => set('compareAtPrice', e.target.value)} />
          <Input label="Cost price" type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} />
          <Input label="Stock quantity" type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          <Input label="Low-stock threshold" type="number" min="0" value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} />
        </div>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} className="size-4 accent-blue" />
            Active (visible in store)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="size-4 accent-blue" />
            Featured on home page
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Variants</h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => set('variants', [...(form.variants || []), { name: '', options: [''] }])}>
            <Plus size={13} /> Add variant
          </Button>
        </div>
        {(form.variants || []).length === 0 && (
          <p className="mt-4 text-sm text-muted">No variants. Add options like Size, Color, etc.</p>
        )}
        <div className="mt-4 space-y-4">
          {(form.variants || []).map((v, vi) => (
            <div key={vi} className="rounded-xl border border-hairline bg-background p-4">
              <div className="flex items-center gap-3">
                <Input label="Variant name" value={v.name} onChange={(e) => {
                  const next = [...form.variants];
                  next[vi] = { ...next[vi], name: e.target.value };
                  set('variants', next);
                }} placeholder="e.g. Size, Color" className="flex-1" />
                <button type="button" onClick={() => set('variants', form.variants.filter((_, i) => i !== vi))} className="mt-5 text-muted hover:text-danger"><Trash2 size={15} /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {v.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input value={opt} onChange={(e) => {
                      const next = [...form.variants];
                      next[vi] = { ...next[vi], options: next[vi].options.map((o, j) => j === oi ? e.target.value : o) };
                      set('variants', next);
                    }} className="w-28 rounded-lg border border-hairline bg-card px-2.5 py-1.5 text-sm" placeholder={`Option ${oi + 1}`} />
                    {v.options.length > 1 && (
                      <button type="button" onClick={() => {
                        const next = [...form.variants];
                        next[vi] = { ...next[vi], options: next[vi].options.filter((_, j) => j !== oi) };
                        set('variants', next);
                      }} className="text-muted hover:text-danger"><X size={12} /></button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" onClick={() => {
                  const next = [...form.variants];
                  next[vi] = { ...next[vi], options: [...next[vi].options, ''] };
                  set('variants', next);
                }}><Plus size={12} /></Button>
              </div>
            </div>
          ))}
        </div>
        {form.variants?.length > 0 && (
          <p className="mt-3 text-xs text-muted">Define variant names (e.g. "Color") and their options (e.g. "Red", "Blue"). Customers will select these when ordering.</p>
        )}
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-base font-semibold">Images</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {form.images.map((img, i) => (
            <div key={i} className="flex items-center gap-3">
              <Img src={img} alt="" className="size-14 shrink-0 object-cover" rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <Input
                  value={img}
                  onChange={(e) => set('images', form.images.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={`Image URL ${i + 1}`}
                />
                <label className="mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-blue hover:underline">
                  <Upload size={12} />
                  Upload from device
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      uploadFiles(e.target.files, i);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
              {form.images.length > 1 && (
                <button type="button" onClick={() => set('images', form.images.filter((_, j) => j !== i))} className="text-muted hover:text-danger">
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={autoFillRelated}>
            <Sparkles size={13} /> Auto-fill related images
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-hairline px-4 py-2 text-[13px] font-medium transition hover:border-foreground/40 disabled:opacity-50">
            {uploading ? <Spinner className="size-3.5" /> : <Upload size={13} />}
            {uploading ? 'Uploading…' : 'Upload images'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                uploadFiles(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          <Button type="button" variant="outline" size="sm" onClick={() => set('images', [...form.images, ''])}>
            <Plus size={14} /> Add by URL
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted">
          Uploading an image or saving auto-adds related gallery images so every product has {MIN_RELATED} photos.
        </p>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-base font-semibold">Description</h2>
        <div className="mt-5 space-y-4">
          <Input label="Short description" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
          <Textarea label="Full description" rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} />
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => set('tags', e.target.value)} />
        </div>
      </div>

      <div className="rounded-3xl border border-hairline bg-card p-6">
        <h2 className="text-base font-semibold">SEO</h2>
        <div className="mt-5 space-y-4">
          <Input label="SEO title" value={form.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} />
          <Textarea label="SEO description" rows={2} value={form.seoDescription} onChange={(e) => set('seoDescription', e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
        <Button type="submit" loading={saving}>{productId ? 'Save changes' : 'Create product'}</Button>
      </div>
    </form>
  );
}
