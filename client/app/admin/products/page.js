'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Img } from '@/components/primitives';
import { Button, Badge, Spinner, Pagination, EmptyState } from '@/components/ui';
import { formatPrice } from '@/lib/format';

export default function AdminProducts() {
  const { settings, toast } = useStore();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api(`/admin/products?page=${page}&limit=20${q ? `&q=${encodeURIComponent(q)}` : ''}`, {
      token: localStorage.getItem('shopora_token'),
    })
      .then(setData)
      .catch((e) => toast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [page, q, toast]);

  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${product._id}`, { method: 'DELETE', token: localStorage.getItem('shopora_token') });
      toast('Product deleted', 'success');
      setData((d) => ({ ...d, items: d.items.filter((p) => p._id !== product._id) }));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Products</h2>
        <Button onClick={() => router.push('/admin/products/new')}>
          <Plus size={15} /> Add product
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Search products…"
          className="w-full rounded-full border border-hairline bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No products"
          subtitle="Add your first product to start selling."
          action={<Button onClick={() => router.push('/admin/products/new')}>Add product</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5 font-medium">Product</th>
                  <th className="px-5 py-3.5 font-medium">Category</th>
                  <th className="px-5 py-3.5 font-medium">Price</th>
                  <th className="px-5 py-3.5 font-medium">Stock</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => {
                  const low = (p.stock ?? 0) <= (p.lowStockThreshold ?? 5);
                  return (
                    <tr key={p._id} className="border-b border-hairline/60 last:border-0 hover:bg-foreground/[0.02]">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Img src={p.images?.[0]} alt="" className="size-11 object-cover" rounded="rounded-xl" />
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-medium">{p.name}</p>
                            <p className="text-xs text-muted">{p.sku || p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted">{p.category || '—'}</td>
                      <td className="px-5 py-3 font-medium">{formatPrice(p.price, settings)}</td>
                      <td className="px-5 py-3">
                        {p.stock === 0 ? (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300">Out</Badge>
                        ) : low ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{p.stock} low</Badge>
                        ) : (
                          <span className="font-medium">{p.stock}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {p.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400">Hidden</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/products/${p._id}/edit`} className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-blue/10 hover:text-blue">
                            <Pencil size={14} />
                          </Link>
                          <button onClick={() => remove(p)} className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && <Pagination page={page} pages={data.pagination.pages} onChange={setPage} />}
    </div>
  );
}
