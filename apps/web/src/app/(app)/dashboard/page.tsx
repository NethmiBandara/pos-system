'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type Dashboard } from '@/lib/api';
import { money } from '@/lib/format';

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'));
  }, []);

  if (error) return <p className="text-red-700">{error}</p>;
  if (!data) return <p className="text-[var(--muted)]">Loading dashboard…</p>;

  const cards = [
    { label: "Today's sales", value: money(data.todaySales) },
    { label: "Today's orders", value: String(data.todayOrders) },
    { label: 'Products', value: String(data.productCount) },
    { label: 'Low stock', value: String(data.lowStockCount) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Overview
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Dashboard
          </h1>
        </div>
        <Link
          href="/pos"
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Open POS
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
          >
            <p className="text-sm text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 text-2xl font-semibold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Top products today</h2>
        {data.topProducts.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No sales yet today.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Qty</th>
                <th className="pb-2 font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((p) => (
                <tr key={p.name} className="border-t border-[var(--line)]">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2">{p.qty}</td>
                  <td className="py-2">{money(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
