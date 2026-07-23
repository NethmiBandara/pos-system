'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';

const links = [
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/pos', label: 'POS Terminal', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/orders', label: 'Orders', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/credit', label: 'Credit', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/products', label: 'Products', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/services', label: 'Copy / Print', roles: ['ADMIN', 'MANAGER'] },
  { href: '/categories', label: 'Categories', roles: ['ADMIN', 'MANAGER'] },
  { href: '/customers', label: 'Customers', roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
  { href: '/inventory', label: 'Inventory', roles: ['ADMIN', 'MANAGER'] },
  { href: '/reports', label: 'Reports', roles: ['ADMIN', 'MANAGER'] },
  { href: '/users', label: 'Users', roles: ['ADMIN'] },
  { href: '/settings', label: 'Settings', roles: ['ADMIN', 'MANAGER'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = user?.role ?? 'CASHIER';

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-[var(--sidebar)] text-[var(--sidebar-text)]">
        <div className="border-b border-white/10 px-5 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Point of Sale
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-white">
            POS Desk
          </h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {links
            .filter((l) => l.roles.includes(role))
            .map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`block rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? 'bg-[var(--accent)] text-white'
                      : 'hover:bg-white/10'
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-sm font-medium text-white">{user?.name}</p>
          <p className="text-xs text-white/50">
            {user?.role} · {user?.email}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-md border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
