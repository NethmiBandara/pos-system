'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type Category, type Product } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { money } from '@/lib/format';

type FormState = {
  sku: string;
  barcode: string;
  name: string;
  price: string;
  cost: string;
  stock: string;
  lowStockAt: string;
  categoryId: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  sku: '',
  barcode: '',
  name: '',
  price: '',
  cost: '',
  stock: '',
  lowStockAt: '',
  categoryId: '',
  isActive: true,
};

export default function ProductsPage() {
  const { user } = useAuth();
  const canEdit = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
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
    api.products
      .list({ search: search.trim() || undefined, includeInactive })
      .then(setProducts)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, includeInactive]);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => undefined);
  }, []);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id?: string | null) => (id ? map.get(id) ?? '—' : '—');
  }, [categories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      sku: p.sku,
      barcode: p.barcode ?? '',
      name: p.name,
      price: String(p.price),
      cost: p.cost != null ? String(p.cost) : '',
      stock: String(p.stock),
      lowStockAt: p.lowStockAt != null ? String(p.lowStockAt) : '',
      categoryId: p.categoryId ?? '',
      isActive: p.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload: Partial<Product> = {
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        name: form.name.trim(),
        price: Number(form.price),
        cost: form.cost ? Number(form.cost) : null,
        stock: Number(form.stock),
        lowStockAt: form.lowStockAt ? Number(form.lowStockAt) : undefined,
        categoryId: form.categoryId || null,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.products.update(editingId, payload);
      } else {
        await api.products.create(payload);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Product) => {
    if (!confirm(`Delete product "${p.name}"?`)) return;
    setError(null);
    try {
      await api.products.remove(p.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
            Catalog
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">
            Products
          </h1>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Add product
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU or name…"
          className="w-full max-w-xs rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show inactive
        </label>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">No products found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">SKU</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Price</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium">Stock</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {canEdit ? <th className="px-5 py-3 font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3">{p.sku}</td>
                  <td className="px-5 py-3">{p.name}</td>
                  <td className="px-5 py-3">
                    {p.categoryName ?? categoryName(p.categoryId)}
                  </td>
                  <td className="px-5 py-3">{money(p.price)}</td>
                  <td className="px-5 py-3">{p.cost != null ? money(p.cost) : '—'}</td>
                  <td className="px-5 py-3">
                    <span
                      className={
                        p.lowStockAt != null && p.stock <= p.lowStockAt
                          ? 'font-semibold text-[var(--warn)]'
                          : ''
                      }
                    >
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {p.isActive ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  {canEdit ? (
                    <td className="px-5 py-3">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="text-sm font-medium text-[var(--accent)]"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(p)}
                          className="text-sm font-medium text-[var(--danger)]"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  ) : null}
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
            className="w-full max-w-lg space-y-4 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-lg"
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              {editingId ? 'Edit product' : 'Add product'}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                SKU
                <input
                  required
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Barcode
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
            </div>

            <label className="block text-sm">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">
                Price
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Cost
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Stock
                <input
                  required
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                Low stock at
                <input
                  type="number"
                  min={0}
                  value={form.lowStockAt}
                  onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                />
              </label>
              <label className="text-sm">
                Category
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
                >
                  <option value="">None</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Active
            </label>

            {formError ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeModal}
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
