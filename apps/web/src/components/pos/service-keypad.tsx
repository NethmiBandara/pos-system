'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuickService } from '@/lib/pos-services';
import { money } from '@/lib/format';

export function ServiceKeypad({
  service,
  onAdd,
  onClose,
}: {
  service: QuickService;
  onAdd: (quantity: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState('');
  const qty = Number(value) || 0;

  const push = useCallback((digit: string) => {
    setValue((v) => {
      const next = (v + digit).replace(/^0+(?=\d)/, '');
      return next.slice(0, 5);
    });
  }, []);

  const backspace = useCallback(() => setValue((v) => v.slice(0, -1)), []);
  const bump = useCallback((n: number) => setValue((v) => String((Number(v) || 0) + n)), []);

  const confirm = useCallback(() => {
    if (qty > 0) onAdd(qty);
  }, [qty, onAdd]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [push, backspace, confirm, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-[family-name:var(--font-display)] text-2xl">
              {service.name}
            </h3>
            <p className="text-sm text-[var(--muted)]">
              {money(service.unitPrice)} / {service.unitLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white px-4 py-4 text-right">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            {service.unitLabel}s
          </p>
          <p className="text-4xl font-semibold tabular-nums">{value || '0'}</p>
          <p className="mt-1 text-sm font-medium text-[var(--accent)]">
            = {money(qty * service.unitPrice)}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[10, 25, 50].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => bump(n)}
              className="rounded-md border border-[var(--line)] bg-white py-2 text-sm font-medium hover:border-[var(--accent)]"
            >
              +{n}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => push(d)}
              className="rounded-md border border-[var(--line)] bg-white py-4 text-xl font-semibold hover:border-[var(--accent)]"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={backspace}
            className="rounded-md border border-[var(--line)] bg-white py-4 text-xl font-semibold hover:border-[var(--accent)]"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => push('0')}
            className="rounded-md border border-[var(--line)] bg-white py-4 text-xl font-semibold hover:border-[var(--accent)]"
          >
            0
          </button>
          <button
            type="button"
            onClick={() => setValue('')}
            className="rounded-md border border-[var(--line)] bg-white py-4 text-sm font-semibold hover:border-[var(--accent)]"
          >
            C
          </button>
        </div>

        <button
          type="button"
          onClick={confirm}
          disabled={qty <= 0}
          className="mt-3 w-full rounded-md bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add {qty > 0 ? `${qty} ${service.unitLabel}${qty > 1 ? 's' : ''}` : ''} ·{' '}
          {money(qty * service.unitPrice)}
        </button>
      </div>
    </div>
  );
}
