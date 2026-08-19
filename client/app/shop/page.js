'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Spinner, Button, Pagination, EmptyState } from '@/components/ui';
import { ProductGridSkeleton } from '@/components/Skeletons';
import { formatPrice } from '@/lib/format';

const SORT_OPTIONS = [
  { id: 'featured', label: 'Featured' },
  { id: 'newest', label: 'Newest' },
  { id: 'popular', label: 'Best selling' },
  { id: 'price-asc', label: 'Price: Low to High' },
  { id: 'price-desc', label: 'Price: High to Low' },
  { id: 'rating', label: 'Top rated' },
];

function ShopInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { settings } = useStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const subcategory = params.get('subcategory') || '';
  const brand = params.get('brand') || '';
  const sort = params.get('sort') || 'featured';
  const page = parseInt(params.get('page')) || 1;
  const minPrice = params.get('minPrice') || '';
  const maxPrice = params.get('maxPrice') || '';
  const inStock = params.get('inStock') === 'true';
  const rating = params.get('rating') || '';

  const [searchInput, setSearchInput] = useState(q);

  const buildQuery = useCallback(() => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (category) sp.set('category', category);
    if (subcategory) sp.set('subcategory', subcategory);
    if (brand) sp.set('brand', brand);
    if (sort && sort !== 'featured') sp.set('sort', sort);
    if (page > 1) sp.set('page', page);
    if (minPrice) sp.set('minPrice', minPrice);
    if (maxPrice) sp.set('maxPrice', maxPrice);
    if (inStock) sp.set('inStock', 'true');
    if (rating) sp.set('rating', rating);
    const s = sp.toString();
    return s ? `?${s}` : '';
  }, [q, category, subcategory, brand, sort, page, minPrice, maxPrice, inStock, rating]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api(`/products${buildQuery()}`), api('/categories')])
      .then(([p, c]) => {
        if (!active) return;
        setData(p);
        setCats(c);
      })
      .catch(() => active && setData({ items: [], pagination: { page: 1, pages: 0, total: 0 }, facets: {} }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [buildQuery]);

  const setParam = (key, value) => {
    const sp = new URLSearchParams(buildQuery());
    if (value) sp.set(key, value);
    else sp.delete(key);
    sp.delete('page');
    router.push(`/shop?${sp.toString()}`);
  };

  const clearAll = () => router.push('/shop');
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {q ? `Results for "${q}"` : category || 'Shop'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.pagination.total} product${data.pagination.total === 1 ? '' : 's'}` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <Button variant="outline" className="min-h-[44px] lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal size={15} /> Filters
          </Button>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam('q', searchInput.trim());
        }}
        className="mb-6 flex flex-col gap-2 sm:flex-row lg:hidden"
      >
        <div className="relative flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full border border-hairline bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel
            data={data}
            cats={cats}
            values={{ category, subcategory, brand, minPrice, maxPrice, inStock, rating }}
            onChange={setParam}
            onClear={clearAll}
          />
        </aside>

        <div className="flex-1">
          {loading ? (
            <ProductGridSkeleton />
          ) : data.items.length === 0 ? (
            <EmptyState
              title="No products found"
              subtitle="Try adjusting your filters or search terms."
              action={<Button onClick={clearAll}>Clear filters</Button>}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
                {data.items.map((p, i) => (
                  <ProductCard key={p._id} product={p} index={i} />
                ))}
              </div>
              <Pagination page={page} pages={data.pagination.pages} onChange={(p) => setParam('page', String(p))} />
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm anim-fade-in" onClick={() => setShowFilters(false)} />
          <aside className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-background p-5 anim-fade-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted hover:bg-foreground/10"
              >
                <X size={18} />
              </button>
            </div>
            <FilterPanel
              data={data}
              cats={cats}
              values={{ category, subcategory, brand, minPrice, maxPrice, inStock, rating }}
              onChange={(k, v) => {
                setParam(k, v);
                setShowFilters(false);
              }}
              onClear={() => {
                clearAll();
                setShowFilters(false);
              }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

function FilterPanel({ data, cats, values, onChange, onClear }) {
  const { settings } = useStore();
  const activeCount = Object.values(values).filter(Boolean).length;
  const hasActive = activeCount > 0;
  const currentCat = cats.find((c) => c.name === values.category);

  return (
    <div className="space-y-6">
      {hasActive && (
        <button onClick={onClear} className="min-h-[44px] text-sm font-medium text-blue hover:underline">
          Clear all filters ({activeCount})
        </button>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Categories</h3>
        <div className="space-y-1">
          {cats.map((c) => (
            <button
              key={c._id}
              onClick={() => onChange('category', values.category === c.name ? '' : c.name)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm min-h-[44px] transition ${
                values.category === c.name
                  ? 'bg-blue/10 font-medium text-blue'
                  : 'text-muted hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {values.category && currentCat?.subcategories?.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">Subcategories</h3>
          <div className="space-y-1">
            {currentCat.subcategories.map((s) => (
              <button
                key={s.slug}
                onClick={() => onChange('subcategory', values.subcategory === s.name ? '' : s.name)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm min-h-[44px] transition ${
                  values.subcategory === s.name
                    ? 'bg-blue/10 font-medium text-blue'
                    : 'text-muted hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold">Brand</h3>
        <div className="space-y-1">
          {(data?.facets?.brands || []).map((b) => (
            <button
              key={b}
              onClick={() => onChange('brand', values.brand === b ? '' : b)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm min-h-[44px] transition ${
                values.brand === b
                  ? 'bg-blue/10 font-medium text-blue'
                  : 'text-muted hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder={`${data?.facets?.minPrice ?? 0}`}
            value={values.minPrice}
            onChange={(e) => onChange('minPrice', e.target.value)}
            className="w-full rounded-xl border border-hairline bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
          <span className="text-muted">–</span>
          <input
            type="number"
            placeholder={`${data?.facets?.maxPrice ?? ''}`}
            value={values.maxPrice}
            onChange={(e) => onChange('maxPrice', e.target.value)}
            className="w-full rounded-xl border border-hairline bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={values.inStock}
          onChange={(e) => onChange('inStock', e.target.checked ? 'true' : '')}
          className="size-4 accent-blue"
        />
        In stock only
      </label>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Rating</h3>
        <div className="space-y-1">
          {[4, 3, 2].map((r) => (
            <button
              key={r}
              onClick={() => onChange('rating', values.rating === String(r) ? '' : String(r))}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm min-h-[44px] transition ${
                values.rating === String(r)
                  ? 'bg-blue/10 font-medium text-blue'
                  : 'text-muted hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {r}+ stars
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Spinner className="size-8 text-blue" /></div>}>
      <ShopInner />
    </Suspense>
  );
}
