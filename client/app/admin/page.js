'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  IndianRupee, ShoppingCart, Users, Package, TrendingUp, Boxes, AlertTriangle, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useStore } from '@/lib/store';
import { Spinner, Badge } from '@/components/ui';
import { StatCard, MiniBarChart, DonutChart } from '@/components/admin/Charts';
import { formatPrice, STATUS_COLORS, STATUS_LABELS } from '@/lib/format';

export default function AdminDashboard() {
  const { settings, toast } = useStore();
  const [data, setData] = useState(null);

  useEffect(() => {
    api('/admin/dashboard', { token: localStorage.getItem('shopora_token') })
      .then(setData)
      .catch((e) => toast(e.message, 'error'));
  }, [toast]);

  if (!data) {
    return <div className="flex justify-center py-32"><Spinner className="size-8 text-blue" /></div>;
  }

  const s = data.stats;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Total revenue" value={formatPrice(s.revenue, settings)} sub={`${s.orders} orders`} icon={IndianRupee} tone="green" />
        <StatCard label="Avg order value" value={formatPrice(s.avgOrderValue, settings)} icon={TrendingUp} tone="blue" />
        <StatCard label="Customers" value={s.customers} icon={Users} tone="violet" />
        <StatCard label="Products" value={s.products} icon={Package} tone="orange" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-hairline bg-card p-6">
          <h2 className="text-base font-semibold">Sales — last 30 days</h2>
          <div className="mt-4">
            <MiniBarChart data={data.salesTrend} />
          </div>
        </div>
        <div className="rounded-3xl border border-hairline bg-card p-6">
          <h2 className="text-base font-semibold">Revenue by category</h2>
          <div className="mt-4">
            <DonutChart data={data.categoryRevenue} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-hairline bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Top products</h2>
            <Link href="/admin/products" className="text-sm font-medium text-blue hover:underline">View all</Link>
          </div>
          {data.topProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No sales yet</p>
          ) : (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-5 text-sm font-semibold text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                      <div
                        className="h-full rounded-full bg-blue"
                        style={{ width: `${(p.revenue / (data.topProducts[0].revenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatPrice(p.revenue, settings)}</p>
                    <p className="text-xs text-muted">{p.qty} sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
              <Boxes size={16} className="text-blue" /> Inventory
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">Stock value</span><span className="font-medium">{formatPrice(s.inventoryValue, settings)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Low stock items</span>
                <Badge className={s.lowStockCount > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'}>
                  {s.lowStockCount}
                </Badge>
              </div>
              {s.lowStockCount > 0 && (
                <Link href="/admin/inventory?low=true" className="flex items-center gap-1.5 text-blue hover:underline">
                  Restock now <ArrowRight size={13} />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-hairline bg-card p-6">
            <h2 className="mb-4 text-base font-semibold">Orders by status</h2>
            <div className="space-y-2">
              {Object.entries(data.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between text-sm">
                  <Badge className={STATUS_COLORS[status] || STATUS_COLORS.pending}>{STATUS_LABELS[status] || status}</Badge>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {data.lowStock?.length > 0 && (
        <div className="rounded-3xl border border-amber-300/50 bg-amber-50 p-6 dark:bg-amber-500/10">
          <h2 className="flex items-center gap-2 text-base font-semibold text-amber-800 dark:text-amber-300">
            <AlertTriangle size={17} /> Low stock alerts
          </h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.lowStock.slice(0, 6).map((p) => (
              <Link key={p._id} href={`/admin/products/${p._id}/edit`} className="flex items-center justify-between rounded-2xl border border-amber-300/40 bg-card px-4 py-3 text-sm">
                <span className="line-clamp-1 font-medium">{p.name}</span>
                <span className="ml-3 shrink-0 font-semibold text-amber-700 dark:text-amber-300">{p.stock} left</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
