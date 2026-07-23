'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { money } from '@/lib/format';

type SalesReport = {
  totalSales: number;
  orderCount: number;
  byDay: Array<{ date: string; total: number; count: number }>;
  byPayment: Array<{ method: string; total: number }>;
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [from, setFrom] = useState(daysAgoStr(7));
  const [to, setTo] = useState(todayStr());
  const [data, setData] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.salesReport(from || undefined, to || undefined)
      .then((raw) => {
        const r = raw as SalesReport & {
          byPaymentMethod?: SalesReport['byPayment'];
        };
        setData({
          totalSales: r.totalSales ?? 0,
          orderCount: r.orderCount ?? 0,
          byDay: (r.byDay ?? []).map((d) => ({
            date: d.date,
            total: d.total,
            count: d.count ?? 0,
          })),
          byPayment: r.byPayment ?? r.byPaymentMethod ?? [],
        });
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Analytics
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Sales report
        </h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
        <label className="text-sm">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 block rounded-md border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 block rounded-md border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Run report
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-[var(--muted)]">Loading report…</p>
      ) : data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="text-sm text-[var(--muted)]">Total sales</p>
              <p className="mt-2 text-2xl font-semibold">{money(data.totalSales)}</p>
            </div>
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="text-sm text-[var(--muted)]">Order count</p>
              <p className="mt-2 text-2xl font-semibold">{data.orderCount}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-lg font-semibold">By day</h2>
              {(data.byDay ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No sales in range.</p>
              ) : (
                <table className="mt-4 w-full text-left text-sm">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Orders</th>
                      <th className="pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byDay ?? []).map((d) => (
                      <tr key={d.date} className="border-t border-[var(--line)]">
                        <td className="py-2">{d.date}</td>
                        <td className="py-2">{d.count}</td>
                        <td className="py-2">{money(d.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="text-lg font-semibold">By payment method</h2>
              {(data.byPayment ?? []).length === 0 ? (
                <p className="mt-3 text-sm text-[var(--muted)]">No payments in range.</p>
              ) : (
                <table className="mt-4 w-full text-left text-sm">
                  <thead className="text-[var(--muted)]">
                    <tr>
                      <th className="pb-2 font-medium">Method</th>
                      <th className="pb-2 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.byPayment ?? []).map((p) => (
                      <tr key={p.method} className="border-t border-[var(--line)]">
                        <td className="py-2">{p.method}</td>
                        <td className="py-2">{money(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
