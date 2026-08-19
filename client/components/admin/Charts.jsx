'use client';

export function MiniBarChart({ data, height = 120 }) {
  if (!data?.length) return <p className="py-8 text-center text-sm text-muted">No data yet</p>;
  const max = Math.max(...data.map((d) => d.sales), 1);
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.sales / max) * 100);
          return (
            <div key={i} className="group relative flex-1">
              <div
                className="w-full rounded-t-md bg-blue/70 transition-all hover:bg-blue"
                style={{ height: `${h}%` }}
                title={`${d.date}: ${d.sales}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

export function DonutChart({ data }) {
  if (!data || Object.keys(data).length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No data yet</p>;
  }
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1;
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const colors = ['#0071e3', '#34c759', '#ff9f0a', '#ff375f', '#af52de', '#86868b', '#5e5ce6'];
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
          {entries.map(([k, v], i) => {
            const pct = v / total;
            const offset = 100 - acc * 100;
            acc += pct;
            return (
              <circle
                key={k}
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke={colors[i % colors.length]}
                strokeWidth="3.5"
                strokeDasharray={`${pct * 100} ${100 - pct * 100}`}
                strokeDashoffset={offset}
              />
            );
          })}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">₹{Math.round(total)}</span>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {entries.slice(0, 6).map(([k, v], i) => (
          <li key={k} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted">{k}</span>
            <span className="font-medium">₹{Math.round(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'blue' }) {
  const tones = {
    blue: 'bg-blue/10 text-blue',
    green: 'bg-emerald-500/10 text-emerald-500',
    orange: 'bg-amber-500/10 text-amber-500',
    red: 'bg-red-500/10 text-red-500',
    violet: 'bg-violet-500/10 text-violet-500',
  };
  return (
    <div className="rounded-3xl border border-hairline bg-card p-5">
      <div className={`flex size-10 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={18} />
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-sm text-muted">{label}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}
