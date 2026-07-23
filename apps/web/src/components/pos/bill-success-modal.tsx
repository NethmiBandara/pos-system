'use client';

import { useEffect, useRef } from 'react';
import { type Order, type StoreSettings } from '@/lib/api';
import { money } from '@/lib/format';
import { BillTotalsSummary } from '@/components/pos/bill-totals-summary';

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  CREDIT: 'Credit',
  ACCOUNT_TRANSFER: 'Account transfer',
  CHEQUE: 'Cheque',
};

export function BillSuccessModal({
  order,
  settings,
  onClose,
}: {
  order: Order;
  settings: StoreSettings | null;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const isCredit =
    order.isCredit || order.payments.some((p) => p.method === 'CREDIT');
  const method =
    order.payments[0]?.method ?? (order.isCredit ? 'CREDIT' : undefined);
  const payable = order.total;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const printBill = () => {
    const node = printRef.current;
    if (!node) return;
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><title>Bill ${order.orderNumber}</title>
<style>
  body { font-family: ui-monospace, Consolas, monospace; font-size: 13px; color: #111; margin: 16px; }
  h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
  .muted { color: #555; text-align: center; font-size: 12px; }
  .line { border-top: 1px dashed #999; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 4px 0; vertical-align: top; }
  .right { text-align: right; }
  .total { font-size: 15px; font-weight: 700; }
  @media print { body { margin: 0; } }
</style></head><body>${node.innerHTML}
<script>window.onload=function(){window.print();window.onafterprint=function(){window.close();}}<\/script>
</body></html>`);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--ok)]">
            {isCredit ? 'Bill confirmed' : 'Payment successful'}
          </p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl">
            {money(payable)}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {order.orderNumber}
            {method ? ` · ${METHOD_LABEL[method] ?? method}` : ''}
          </p>
        </div>

        <div className="mt-5 max-h-56 overflow-auto rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between gap-3 py-1.5">
              <span className="min-w-0 truncate">
                {it.productName} × {it.quantity}
              </span>
              <span className="shrink-0 tabular-nums">{money(it.lineTotal)}</span>
            </div>
          ))}
          <div className="mt-3 border-t border-[var(--line)] pt-3">
            <BillTotalsSummary
              total={order.subtotal}
              discount={order.discount}
              totalAfterDiscount={payable}
            />
          </div>
        </div>

        <div className="hidden" aria-hidden>
          <div ref={printRef}>
            <h1>{settings?.storeName ?? 'Bookshop'}</h1>
            {settings?.address ? (
              <p className="muted">{settings.address}</p>
            ) : null}
            {settings?.phone ? (
              <p className="muted">{settings.phone}</p>
            ) : null}
            <div className="line" />
            <p className="muted">Bill {order.orderNumber}</p>
            <p className="muted">
              {new Date(order.createdAt).toLocaleString()}
            </p>
            {order.customer ? (
              <p className="muted">Customer: {order.customer.name}</p>
            ) : null}
            {order.cashier ? (
              <p className="muted">Billed by: {order.cashier.name}</p>
            ) : null}
            <div className="line" />
            <table>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      {it.productName}
                      <br />
                      <span style={{ color: '#555' }}>
                        {it.quantity} × {money(it.unitPrice)}
                      </span>
                    </td>
                    <td className="right">{money(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="line" />
            <table>
              <tbody>
                <tr>
                  <td>Total</td>
                  <td className="right">{money(order.subtotal)}</td>
                </tr>
                <tr>
                  <td>Discount</td>
                  <td className="right">
                    {order.discount > 0
                      ? `-${money(order.discount)}`
                      : money(0)}
                  </td>
                </tr>
                <tr className="total">
                  <td>Total after discount</td>
                  <td className="right">{money(payable)}</td>
                </tr>
                {method ? (
                  <tr>
                    <td>Payment</td>
                    <td className="right">
                      {METHOD_LABEL[method] ?? method}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {settings?.receiptFooter ? (
              <>
                <div className="line" />
                <p className="muted">{settings.receiptFooter}</p>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={printBill}
            className="rounded-xl border border-[var(--accent)] py-3 text-sm font-semibold text-[var(--accent)]"
          >
            Print bill
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white"
          >
            New bill
          </button>
        </div>
      </div>
    </div>
  );
}
