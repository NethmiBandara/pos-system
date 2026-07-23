'use client';

import { money } from '@/lib/format';

/** Consistent totals block for POS screen + success/print bill. */
export function BillTotalsSummary({
  total,
  discount,
  totalAfterDiscount,
  size = 'md',
}: {
  total: number;
  discount: number;
  totalAfterDiscount: number;
  size?: 'md' | 'lg';
}) {
  const label = size === 'lg' ? 'text-sm' : 'text-sm';
  const value = size === 'lg' ? 'text-base' : 'text-sm';
  const final = size === 'lg' ? 'text-3xl font-semibold' : 'text-lg font-semibold';

  return (
    <div className="space-y-2">
      <div className={`flex justify-between ${label} text-[var(--muted)]`}>
        <span>Total</span>
        <span className={`tabular-nums ${value}`}>{money(total)}</span>
      </div>
      <div
        className={`flex justify-between ${label} ${
          discount > 0
            ? 'font-medium text-[var(--accent-2)]'
            : 'text-[var(--muted)]'
        }`}
      >
        <span>Discount</span>
        <span className={`tabular-nums ${value}`}>
          {discount > 0 ? `− ${money(discount)}` : money(0)}
        </span>
      </div>
      <div className="flex items-baseline justify-between border-t border-[var(--line)] pt-2">
        <span className={`${label} text-[var(--muted)]`}>
          Total after discount
        </span>
        <span className={`tabular-nums ${final}`}>
          {money(totalAfterDiscount)}
        </span>
      </div>
    </div>
  );
}
