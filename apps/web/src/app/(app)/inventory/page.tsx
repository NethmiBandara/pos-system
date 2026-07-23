'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type Product } from '@/lib/api';

type Adjustment = {
  id: string;
  delta: number;
  reason: string;
  note?: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  user?: { name: string } | null;
};

const REASONS = ['RECEIVE', 'ADJUSTMENT', 'DAMAGE', 'RETURN'] as const;

export default function InventoryPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('RECEIVE');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.inventory.lowStock(),
      api.inventory.adjustments(),
      api.products.list(),
    ])
      .then(([low, adj, prods]) => {
        setLowStock(low);
        setAdjustments(adj);
        setProducts(prods);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId || !delta) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.inventory.adjust({
        productId,
        delta: Number(delta),
        reason,
        note: note.trim() || undefined,
      });
      setProductId('');
      setDelta('');
      setNote('');
      setReason('RECEIVE');
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Adjustment failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Stock
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Inventory
        </h1>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <h2 className="text-lg font-semibold">Low stock</h2>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
          ) : lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">All stocked up.</p>
          ) : (
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-[var(--muted)]">
                <tr>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Stock</th>
                  <th className="pb-2 font-medium">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--line)]">
                    <td className="py-2">{p.sku}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 font-semibold text-[var(--warn)]">{p.stock}</td>
                    <td className="py-2">{p.lowStockAt ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5"
        >
          <h2 className="text-lg font-semibold">Adjust stock</h2>
          <label className="block text-sm">
            Product
            <select
              required
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            >
              <option value="">Select product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} · {p.name} (stock {p.stock})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Delta (+/-)
              <input
                required
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="e.g. 10 or -3"
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm">
            Note
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>

          {formError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Apply adjustment'}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
        <h2 className="text-lg font-semibold">Recent adjustments</h2>
        {loading ? (
          <p className="mt-3 text-sm text-[var(--muted)]">Loading…</p>
        ) : adjustments.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">No adjustments yet.</p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium">Delta</th>
                <th className="pb-2 font-medium">Reason</th>
                <th className="pb-2 font-medium">Note</th>
                <th className="pb-2 font-medium">By</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((a) => (
                <tr key={a.id} className="border-t border-[var(--line)]">
                  <td className="py-2">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="py-2">
                    {a.product.sku} · {a.product.name}
                  </td>
                  <td
                    className={`py-2 font-semibold ${
                      a.delta >= 0 ? 'text-[var(--ok)]' : 'text-[var(--danger)]'
                    }`}
                  >
                    {a.delta >= 0 ? `+${a.delta}` : a.delta}
                  </td>
                  <td className="py-2">{a.reason}</td>
                  <td className="py-2 text-[var(--muted)]">{a.note ?? '—'}</td>
                  <td className="py-2">{a.user?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
