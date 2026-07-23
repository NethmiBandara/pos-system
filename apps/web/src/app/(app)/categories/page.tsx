'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type Category } from '@/lib/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api.categories
      .list()
      .then(setCategories)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  const addCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await api.categories.create({ name: newName.trim() });
      setNewName('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add category');
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.categories.update(id, { name: editName.trim() });
      cancelEdit();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to rename category');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    setError(null);
    try {
      await api.categories.remove(c.id);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Catalog
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Categories
        </h1>
      </div>

      <form
        onSubmit={addCategory}
        className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name…"
          className="w-full max-w-xs rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none ring-[var(--accent)] focus:ring-2"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {adding ? 'Adding…' : 'Add category'}
        </button>
      </form>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading categories…</p>
        ) : categories.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">No categories yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Products</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3">
                    {editingId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full max-w-xs rounded-md border border-[var(--line)] bg-white px-3 py-1.5"
                        autoFocus
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-5 py-3">{c._count?.products ?? 0}</td>
                  <td className="px-5 py-3">
                    {editingId === c.id ? (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void saveEdit(c.id)}
                          className="text-sm font-medium text-[var(--accent)]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-sm font-medium text-[var(--muted)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="text-sm font-medium text-[var(--accent)]"
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(c)}
                          className="text-sm font-medium text-[var(--danger)]"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
