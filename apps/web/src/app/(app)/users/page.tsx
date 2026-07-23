'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, type Role, type User } from '@/lib/api';

const ROLES: Role[] = ['ADMIN', 'MANAGER', 'CASHIER'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('CASHIER');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    api.users
      .list()
      .then(setUsers)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, []);

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.users.create({ email: email.trim(), name: name.trim(), password, role });
      setEmail('');
      setName('');
      setPassword('');
      setRole('CASHIER');
      load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    setError(null);
    try {
      await api.users.update(u.id, { isActive: !u.isActive });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Admin
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Users</h1>
      </div>

      <form
        onSubmit={createUser}
        className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <label className="text-sm">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Password
          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create user'}
        </button>
      </form>

      {formError ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
        {loading ? (
          <p className="p-5 text-[var(--muted)]">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="p-5 text-[var(--muted)]">No users found.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-[var(--line)]">
                  <td className="px-5 py-3">{u.name}</td>
                  <td className="px-5 py-3">{u.email}</td>
                  <td className="px-5 py-3">{u.role}</td>
                  <td className="px-5 py-3">
                    {u.isActive !== false ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => void toggleActive(u)}
                      className="text-sm font-medium text-[var(--danger)]"
                    >
                      {u.isActive !== false ? 'Deactivate' : 'Activate'}
                    </button>
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
