'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type ServiceItem } from '@/lib/api';
import { money } from '@/lib/format';

type FormState = {
  name: string;
  unitPrice: string;
  unitLabel: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  name: '',
  unitPrice: '',
  unitLabel: 'page',
  isActive: true,
};

export default function ServicesPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.services
      .list(true)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (s: ServiceItem) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      unitPrice: String(s.unitPrice),
      unitLabel: s.unitLabel,
      isActive: s.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        unitPrice: Number(form.unitPrice),
        unitLabel: form.unitLabel.trim() || 'page',
        isActive: form.isActive,
      };
      if (editingId) await api.services.update(editingId, payload);
      else await api.services.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s: ServiceItem) => {
    if (!confirm(`Delete service "${s.name}"?`)) return;
    setError(null);
    try {
      await api.services.remove(s.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Bookshop
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Photocopy &amp; printout services
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            These appear as quick buttons on the POS. Set a per-unit price and
            bill any quantity with the on-screen keypad.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
        >
          Add service
        </button>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading services…</p>
        ) : items.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">
            No services yet. Add photocopy / printout / binding items.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Unit price</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{money(s.unitPrice)}</td>
                  <td className="px-5 py-3 text-[var(--muted)]">{s.unitLabel}</td>
                  <td className="px-5 py-3">
                    {s.isActive ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        Hidden
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="text-sm font-medium text-[var(--accent)]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(s)}
                        className="text-sm font-medium text-[var(--danger)]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={submit}
            className="w-full max-w-md space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-lg"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {editingId ? 'Edit service' : 'Add service'}
            </h2>

            <label className="block text-sm">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Photocopy B/W"
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Unit price (Rs)
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) =>
                    setForm({ ...form, unitPrice: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Unit label
                <input
                  value={form.unitLabel}
                  onChange={(e) =>
                    setForm({ ...form, unitLabel: e.target.value })
                  }
                  placeholder="page / sheet / book"
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              Show on POS
            </label>

            {formError ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-[var(--line)] px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
