'use client';

import { useEffect, useState } from 'react';
import {
  api,
  type CreditBill,
  type CreditOutstanding,
  type CreditPaymentMethod,
} from '@/lib/api';
import { money } from '@/lib/format';

const SETTLE_METHODS: { id: CreditPaymentMethod; label: string }[] = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
  { id: 'ACCOUNT_TRANSFER', label: 'Transfer' },
  { id: 'CHEQUE', label: 'Cheque' },
];

export default function CreditPage() {
  const [data, setData] = useState<CreditOutstanding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settleFor, setSettleFor] = useState<CreditBill | null>(null);
  const [method, setMethod] = useState<CreditPaymentMethod>('CASH');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.credit
      .outstanding()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const settle = async () => {
    if (!settleFor) return;
    setBusy(true);
    setError(null);
    try {
      await api.credit.settle(settleFor.id, method);
      setSettleFor(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to settle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Accounts receivable
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Credit payments
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Bills sold on credit. Record a payment to settle a balance — it is then
          removed from this list.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--muted)]">Total outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--danger)]">
            {money(data?.totalOutstanding ?? 0)}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm text-[var(--muted)]">Open credit bills</p>
          <p className="mt-2 text-2xl font-semibold">{data?.count ?? 0}</p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading credit bills…</p>
        ) : !data || data.items.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">No outstanding credit. 🎉</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Bill #</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Amount due</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((o) => (
                <tr key={o.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-5 py-3">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">{o.customer?.name ?? '—'}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">
                    {o.customer?.phone ?? '—'}
                  </td>
                  <td className="px-5 py-3 font-semibold">{money(o.total)}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSettleFor(o);
                        setMethod('CASH');
                      }}
                      className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Record payment
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {settleFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-lg">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl">
                Settle {settleFor.orderNumber}
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {settleFor.customer?.name ?? 'Customer'} owes{' '}
                <span className="font-semibold text-[var(--ink)]">
                  {money(settleFor.total)}
                </span>
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Paid by
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SETTLE_METHODS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`rounded-md border px-2 py-2 text-sm font-medium ${
                      method === m.id
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--line)] bg-white text-[var(--ink)]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettleFor(null)}
                className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void settle()}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Mark as paid'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
