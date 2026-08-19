'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Button, Badge, Spinner, Pagination, EmptyState } from '@/components/ui';
import { formatPrice, formatDateTime } from '@/lib/format';

export default function AdminCustomers() {
  const { settings, toast } = useStore();
  const [data, setData] = useState(null);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api(`/admin/customers?page=${page}&limit=20${q ? `&q=${encodeURIComponent(q)}` : ''}`, {
      token: localStorage.getItem('shopora_token'),
    })
      .then(setData)
      .catch((e) => toast(e.message, 'error'));
  }, [page, q, toast]);

  const view = async (c) => {
    setSelected(c);
    const d = await api(`/admin/customers/${c._id}`, { token: localStorage.getItem('shopora_token') }).catch(() => null);
    setDetail(d);
  };

  const toggle = async (c) => {
    try {
      const updated = await api(`/admin/customers/${c._id}`, {
        method: 'PATCH',
        token: localStorage.getItem('shopora_token'),
        body: { isActive: !c.isActive },
      });
      setData((d) => ({ ...d, items: d.items.map((u) => (u._id === c._id ? updated : u)) }));
      toast(updated.isActive ? 'Customer enabled' : 'Customer disabled', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Customers</h2>
        <div className="relative w-64">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Search customers…"
            className="w-full rounded-full border border-hairline bg-card py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue/40"
          />
        </div>
      </div>

      {!data ? (
        <div className="flex justify-center py-24"><Spinner className="size-8 text-blue" /></div>
      ) : data.items.length === 0 ? (
        <EmptyState title="No customers found" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-hairline bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Phone</th>
                  <th className="px-5 py-3.5 font-medium">Joined</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <tr key={c._id} className="border-b border-hairline/60 last:border-0 hover:bg-foreground/[0.02]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-blue/10 text-sm font-semibold text-blue">
                          {c.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted">{c.phone || '—'}</td>
                    <td className="px-5 py-3 text-muted">{formatDateTime(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      {c.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400">Disabled</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => view(c)}>View</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggle(c)}>
                          {c.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data && <Pagination page={page} pages={data.pagination.pages} onChange={setPage} />}

      {selected && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-hairline bg-card p-6 shadow-2xl anim-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-foreground/10">✕</button>
            </div>
            {detail && (
              <div className="space-y-5">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p className="text-muted">Email: <span className="font-medium text-foreground">{detail.user.email}</span></p>
                  <p className="text-muted">Phone: <span className="font-medium text-foreground">{detail.user.phone || '—'}</span></p>
                  <p className="text-muted">Joined: <span className="font-medium text-foreground">{formatDateTime(detail.user.createdAt)}</span></p>
                  <p className="text-muted">Last login: <span className="font-medium text-foreground">{detail.user.lastLoginAt ? formatDateTime(detail.user.lastLoginAt) : '—'}</span></p>
                </div>
                {detail.user.address?.city && (
                  <p className="text-sm text-muted">
                    Address: <span className="text-foreground">{detail.user.address.line1}, {detail.user.address.city}, {detail.user.address.state} {detail.user.address.zip}</span>
                  </p>
                )}
                <div>
                  <h3 className="mb-3 text-base font-semibold">Orders ({detail.orders.length})</h3>
                  <div className="space-y-2">
                    {detail.orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
                    {detail.orders.map((o) => (
                      <div key={o._id} className="flex items-center justify-between rounded-2xl bg-background px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium">{o.orderNumber}</p>
                          <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-foreground/10 text-foreground capitalize">{o.status}</Badge>
                          <span className="font-semibold">{formatPrice(o.totals?.grandTotal, settings)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
