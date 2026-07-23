'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type StoreSettings } from '@/lib/api';

type FormState = {
  storeName: string;
  address: string;
  phone: string;
  taxRate: string;
  currency: string;
  receiptFooter: string;
  lowStockThreshold: string;
};

export default function SettingsPage() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((s: StoreSettings) =>
        setForm({
          storeName: s.storeName,
          address: s.address ?? '',
          phone: s.phone ?? '',
          taxRate: String(s.taxRate),
          currency: s.currency,
          receiptFooter: s.receiptFooter ?? '',
          lowStockThreshold: String(s.lowStockThreshold),
        }),
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.settings.update({
        storeName: form.storeName.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        taxRate: Number(form.taxRate),
        currency: form.currency.trim(),
        receiptFooter: form.receiptFooter.trim() || null,
        lowStockThreshold: Number(form.lowStockThreshold),
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Configuration
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Store settings
        </h1>
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Loading settings…</p>
      ) : form ? (
        <form
          onSubmit={submit}
          className="max-w-2xl space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6"
        >
          <label className="block text-sm">
            Store name
            <input
              required
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Address
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            Phone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm">
              Tax rate (0-1)
              <input
                required
                type="number"
                step="0.0001"
                min={0}
                max={1}
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Currency
              <input
                required
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm">
              Low stock threshold
              <input
                required
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(e) =>
                  setForm({ ...form, lowStockThreshold: e.target.value })
                }
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm">
            Receipt footer
            <textarea
              value={form.receiptFooter}
              onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            />
          </label>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Settings saved.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      ) : (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error ?? 'Unable to load settings.'}
        </p>
      )}
    </div>
  );
}
