import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingBag, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { dashboardApi } from '@/api/dashboard';
import { formatMoney } from '@/lib/format';
import { Spinner } from '@/components/ui/Spinner';
import { Badge, orderStatusBadge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-semibold text-[var(--color-text)] mt-1">{value}</p>
          {sub && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{sub}</p>}
        </div>
        <div className="text-[var(--color-primary)] opacity-60">{icon}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
    refetchInterval: 60_000,
  });

  if (isLoading) return <div className="flex justify-center pt-20"><Spinner /></div>;
  if (error || !data) return <p className="text-[var(--color-danger)] text-sm">Failed to load dashboard.</p>;

  const chartData = data.sales_series.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    orders: d.order_count,
    revenue: d.revenue_paise / 100,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <KpiCard
          icon={<TrendingUp size={24} />}
          label="Revenue (30d)"
          value={formatMoney(data.kpis.revenue_last_30_days_paise)}
        />
        <KpiCard
          icon={<ShoppingBag size={24} />}
          label="Orders today"
          value={String(data.kpis.orders_today)}
          sub={`${data.kpis.orders_total} total`}
        />
        <KpiCard
          icon={<Clock size={24} />}
          label="Pending"
          value={String(data.kpis.pending_orders)}
          sub={`${data.kpis.processing_orders} processing`}
        />
      </div>

      {/* Sales chart */}
      {chartData.length > 0 && (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5 mb-6">
          <h2 className="text-sm font-semibold mb-4">Daily Orders — last 30 days</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--color-border)' }}
                formatter={(v) => [Number(v ?? 0), 'Orders']}
              />
              <Bar dataKey="orders" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low stock */}
        {data.low_stock.length > 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--color-warning)]" />
              <h2 className="text-sm font-semibold">Low Stock</h2>
            </div>
            <div className="flex flex-col gap-2">
              {data.low_stock.map((p) => (
                <div key={p.id} className="flex items-center gap-3 text-sm">
                  {p.primary_image_url && (
                    <img src={p.primary_image_url} alt={p.name} className="h-8 w-8 rounded object-cover shrink-0" />
                  )}
                  <span className="flex-1 truncate text-[var(--color-text)]">{p.name}</span>
                  <span className="text-[var(--color-warning)] font-medium whitespace-nowrap">{p.stock_metres}m left</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent orders */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
          <h2 className="text-sm font-semibold mb-3">Recent Orders</h2>
          {data.recent_orders.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No orders yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(data.recent_orders as import('@/api/types').Order[]).map((o) => (
                <Link
                  key={o.id}
                  to={`/orders/${o.id}`}
                  className="flex items-center gap-3 text-sm hover:bg-[var(--color-surface-raised)] -mx-2 px-2 py-1.5 rounded"
                >
                  <span className="font-mono text-xs text-[var(--color-text-muted)] w-20 shrink-0">#{o.order_number}</span>
                  <span className="flex-1 truncate">{o.customer_email}</span>
                  <Badge variant={orderStatusBadge(o.status)}>{o.status}</Badge>
                  <span className="font-medium shrink-0">{formatMoney(o.total_paise)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
