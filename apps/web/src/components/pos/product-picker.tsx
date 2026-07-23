'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, type Category, type Product } from '@/lib/api';
import { money } from '@/lib/format';

export function ProductPicker({
  onAdd,
  onClose,
}: {
  onAdd: (product: Product) => void;
  onClose: () => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string, cat?: string) => {
    setLoading(true);
    try {
      const data = await api.products.list({
        search: q || undefined,
        categoryId: cat || undefined,
      });
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load(search.trim() || undefined, categoryId || undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [search, categoryId, load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Add products
            </h2>
            <p className="text-sm text-[var(--muted)]">
              Tap a product to add it to the bill
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--line)] px-3 py-2 text-sm font-medium hover:bg-white"
          >
            Close
          </button>
        </header>

        <div className="space-y-3 border-b border-[var(--line)] px-5 py-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && products[0]) {
                e.preventDefault();
                onAdd(products[0]);
              }
            }}
            placeholder="Search name, SKU or barcode…"
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--accent)] focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                categoryId === ''
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--line)] bg-white'
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  categoryId === c.id
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                    : 'border-[var(--line)] bg-white'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <p className="text-[var(--muted)]">Loading…</p>
          ) : products.length === 0 ? (
            <p className="text-[var(--muted)]">No products found.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={product.stock < 1}
                  onClick={() => onAdd(product)}
                  className="rounded-xl border border-[var(--line)] bg-white p-4 text-left transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <p className="font-medium leading-snug text-[var(--ink)]">
                    {product.name}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-[var(--accent)]">
                    {money(product.price)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
