'use client';

import { Fragment, useEffect, useState } from 'react';
import { api, type Order } from '@/lib/api';
import { money } from '@/lib/format';

const STATUSES = ['ALL', 'PAID', 'HELD', 'REFUNDED', 'CANCELLED'] as const;

function statusClasses(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-800';
    case 'HELD':
      return 'bg-amber-50 text-[var(--warn)]';
    case 'REFUNDED':
      return 'bg-red-50 text-red-700';
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
}

export default function OrdersPage() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('ALL');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.orders
      .list(status === 'ALL' ? undefined : { status })
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const refund = async (id: string) => {
    if (!confirm('Refund this order?')) return;
    setBusyId(id);
    setError(null);
    try {
      await api.orders.refund(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refund failed');
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (id: string) => {
    if (!confirm('Cancel this held order?')) return;
    setBusyId(id);
    setError(null);
    try {
      await api.orders.cancel(id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Sales
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Orders
        </h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              status === s
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--line)] bg-white text-[var(--ink)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">No orders found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Order #</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Cashier</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    onClick={() => toggle(o.id)}
                    className="cursor-pointer border-t border-[var(--line)] hover:bg-white/60"
                  >
                    <td className="px-5 py-3 font-medium">{o.orderNumber}</td>
                    <td className="px-5 py-3">
                      {new Date(o.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">{o.cashier?.name ?? '—'}</td>
                    <td className="px-5 py-3">{o.customer?.name ?? 'Walk-in'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${statusClasses(o.status)}`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">{money(o.total)}</td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-3">
                        {o.status === 'PAID' ? (
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void refund(o.id)}
                            className="text-sm font-medium text-[var(--danger)]"
                          >
                            Refund
                          </button>
                        ) : null}
                        {o.status === 'HELD' ? (
                          <button
                            type="button"
                            disabled={busyId === o.id}
                            onClick={() => void cancel(o.id)}
                            className="text-sm font-medium text-[var(--danger)]"
                          >
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {expandedId === o.id ? (
                    <tr className="border-t border-[var(--line)] bg-white/50">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Items
                            </p>
                            <table className="w-full text-sm">
                              <tbody>
                                {o.items.map((it) => (
                                  <tr key={it.id} className="border-t border-[var(--line)]">
                                    <td className="py-1.5">{it.productName}</td>
                                    <td className="py-1.5 text-[var(--muted)]">
                                      {it.quantity} × {money(it.unitPrice)}
                                    </td>
                                    <td className="py-1.5 text-right">
                                      {money(it.lineTotal)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                              Summary
                            </p>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Subtotal</span>
                              <span>{money(o.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Discount</span>
                              <span>-{money(o.discount)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[var(--muted)]">Tax</span>
                              <span>{money(o.tax)}</span>
                            </div>
                            <div className="flex justify-between font-semibold">
                              <span>Total</span>
                              <span>{money(o.total)}</span>
                            </div>
                            {o.payments.length ? (
                              <div className="pt-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                  Payments
                                </p>
                                {o.payments.map((p) => (
                                  <div key={p.id} className="flex justify-between text-sm">
                                    <span className="text-[var(--muted)]">{p.method}</span>
                                    <span>{money(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                            {o.notes ? (
                              <p className="pt-2 text-sm text-[var(--muted)]">
                                Notes: {o.notes}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
