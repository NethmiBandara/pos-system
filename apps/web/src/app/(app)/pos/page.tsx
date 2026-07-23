'use client';

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  api,
  type Customer,
  type Order,
  type OrderItemInput,
  type Product,
} from '@/lib/api';
import { money } from '@/lib/format';
import type { QuickService } from '@/lib/pos-services';
import { ServiceKeypad } from '@/components/pos/service-keypad';
import { CustomItemModal } from '@/components/pos/custom-item-modal';
import { ProductPicker } from '@/components/pos/product-picker';
import { BillSuccessModal } from '@/components/pos/bill-success-modal';
import { AddCustomerModal } from '@/components/pos/add-customer-modal';
import { BillTotalsSummary } from '@/components/pos/bill-totals-summary';
import { useAuth } from '@/lib/auth';
import type { StoreSettings } from '@/lib/api';

type LineKind = 'PRODUCT' | 'SERVICE' | 'CUSTOM';

type CartLine = {
  key: string;
  productId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  stock?: number;
  kind: LineKind;
};

type PaymentMethod = 'CASH' | 'CARD' | 'CREDIT' | 'ACCOUNT_TRANSFER' | 'CHEQUE';

const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card' },
  { id: 'CREDIT', label: 'Credit' },
  { id: 'ACCOUNT_TRANSFER', label: 'Transfer' },
  { id: 'CHEQUE', label: 'Cheque' },
];

let keyCounter = 0;
const nextKey = () => `line-${Date.now()}-${keyCounter++}`;

function roundMoney(n: number) {
  return Number((Number.isFinite(n) ? n : 0).toFixed(2));
}

export default function PosPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staff, setStaff] = useState<
    Array<{ id: string; name: string; role: string; email: string }>
  >([]);
  const [customerId, setCustomerId] = useState('');
  const [cashierId, setCashierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');

  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [discountMode, setDiscountMode] = useState<'Rs' | '%'>('Rs');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [heldNotice, setHeldNotice] = useState<string | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  const [scanValue, setScanValue] = useState('');
  const [scanBusy, setScanBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);

  const [services, setServices] = useState<QuickService[]>([]);
  const [keypadService, setKeypadService] = useState<QuickService | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [showProducts, setShowProducts] = useState(false);

  useEffect(() => {
    api.customers.list().then(setCustomers).catch(() => undefined);
    api.users.staff().then(setStaff).catch(() => undefined);
    api.settings
      .get()
      .then((s) => {
        setSettings(s);
      })
      .catch(() => undefined);
    api.services
      .list()
      .then((items) =>
        setServices(
          items.map((s) => ({
            id: s.id,
            name: s.name,
            unitPrice: s.unitPrice,
            unitLabel: s.unitLabel,
          })),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (user?.id && !cashierId) setCashierId(user.id);
  }, [user, cashierId]);

  const focusScan = useCallback(() => {
    scanRef.current?.focus();
  }, []);

  const flashNotice = useCallback((msg: string) => {
    setNotice(msg);
    setError(null);
    window.setTimeout(() => setNotice((n) => (n === msg ? null : n)), 2000);
  }, []);

  const addProduct = useCallback(
    (product: Product) => {
      setLastOrder(null);
      setCart((prev) => {
        const existing = prev.find((l) => l.productId === product.id);
        if (existing) {
          if (existing.quantity >= product.stock) {
            flashNotice(`No more stock for ${product.name}`);
            return prev;
          }
          return prev.map((l) =>
            l.productId === product.id
              ? { ...l, quantity: l.quantity + 1 }
              : l,
          );
        }
        if (product.stock < 1) {
          flashNotice(`${product.name} is out of stock`);
          return prev;
        }
        return [
          ...prev,
          {
            key: nextKey(),
            productId: product.id,
            name: product.name,
            unitPrice: product.price,
            quantity: 1,
            stock: product.stock,
            kind: 'PRODUCT',
          },
        ];
      });
    },
    [flashNotice],
  );

  const addServiceLine = useCallback((service: QuickService, quantity: number) => {
    setLastOrder(null);
    setCart((prev) => [
      ...prev,
      {
        key: nextKey(),
        name: `${service.name} (${quantity} ${service.unitLabel}${
          quantity > 1 ? 's' : ''
        })`,
        unitPrice: service.unitPrice,
        quantity,
        kind: 'SERVICE',
      },
    ]);
  }, []);

  const addCustomLine = useCallback(
    (item: { name: string; unitPrice: number; quantity: number }) => {
      setLastOrder(null);
      setCart((prev) => [
        ...prev,
        {
          key: nextKey(),
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          kind: 'CUSTOM',
        },
      ]);
    },
    [],
  );

  const updateQty = (key: string, quantity: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.key === key
            ? {
                ...l,
                quantity:
                  l.stock !== undefined
                    ? Math.max(0, Math.min(quantity, l.stock))
                    : Math.max(0, quantity),
              }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const removeLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const clearDiscount = () => {
    setDiscountInput('');
    flashNotice('Discount cleared');
  };

  const clearCart = () => {
    setCart([]);
    setDiscountInput('');
    setLastOrder(null);
    setShowSuccess(false);
    setHeldNotice(null);
    setError(null);
    focusScan();
  };

  const onScanSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;
    setScanBusy(true);
    setError(null);
    try {
      const results = await api.products.list({ search: code });
      const exact =
        results.find((p) => p.barcode === code || p.sku === code) ??
        (results.length === 1 ? results[0] : undefined);
      if (!exact) {
        setError(`No product for "${code}"`);
      } else {
        addProduct(exact);
        flashNotice(`Added ${exact.name}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanValue('');
      setScanBusy(false);
      focusScan();
    }
  };

  const totals = useMemo(() => {
    const total = roundMoney(
      cart.reduce((s, l) => s + l.unitPrice * l.quantity, 0),
    );
    const raw = Math.max(0, Number(discountInput) || 0);
    let discount = 0;
    if (discountMode === '%') {
      const pct = Math.min(100, raw);
      discount = roundMoney((total * pct) / 100);
    } else {
      discount = roundMoney(Math.min(raw, total));
    }
    const totalAfterDiscount = roundMoney(Math.max(0, total - discount));
    const units = cart.reduce((s, l) => s + l.quantity, 0);
    return { total, discount, totalAfterDiscount, units };
  }, [cart, discountInput, discountMode]);

  const buildItems = (): OrderItemInput[] =>
    cart.map((l) =>
      l.productId
        ? { productId: l.productId, quantity: l.quantity }
        : { name: l.name, unitPrice: l.unitPrice, quantity: l.quantity },
    );

  const charge = async () => {
    if (!cart.length) return;
    if (paymentMethod === 'CREDIT' && !customerId) {
      setError('Select a customer for credit sales.');
      return;
    }
    if (!cashierId) {
      setError('Select a billing person.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const order = await api.orders.create({
        items: buildItems(),
        paymentMethod,
        discount: totals.discount,
        taxRate: 0,
        customerId: customerId || undefined,
        cashierId,
      });
      setLastOrder(order);
      setShowSuccess(true);
      setHeldNotice(null);
      setCart([]);
      setDiscountInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  const hold = async () => {
    if (!cart.length) return;
    setBusy(true);
    setError(null);
    try {
      const order = await api.orders.hold({
        items: buildItems(),
        discount: totals.discount,
        taxRate: 0,
        customerId: customerId || undefined,
        cashierId: cashierId || undefined,
      });
      setHeldNotice(
        `Held ${order.orderNumber} · ${money(order.total)}`,
      );
      setLastOrder(null);
      setShowSuccess(false);
      setCart([]);
      setDiscountInput('');
      focusScan();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hold failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-3">
      {/* Compact action bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3">
        <form onSubmit={onScanSubmit} className="flex min-w-[220px] flex-1 gap-2">
          <input
            ref={scanRef}
            autoFocus
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
            placeholder="Scan barcode…"
            className="w-full rounded-lg border border-[var(--accent)] bg-white px-4 py-2.5 text-base outline-none ring-[var(--accent)] focus:ring-2"
          />
          <button
            type="submit"
            disabled={scanBusy}
            className="rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>

        <button
          type="button"
          onClick={() => setShowProducts(true)}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:border-[var(--accent)]"
        >
          Products
        </button>
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="rounded-lg border border-[var(--line)] bg-white px-4 py-2.5 text-sm font-semibold hover:border-[var(--accent)]"
        >
          Custom
        </button>

        <div className="hidden h-8 w-px bg-[var(--line)] sm:block" />

        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setKeypadService(s)}
            className="rounded-lg border border-[var(--accent-2)]/30 bg-[var(--accent-2)]/10 px-3 py-2.5 text-sm font-medium hover:border-[var(--accent-2)]"
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Bill + checkout */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
        {/* Spacious bill lines */}
        <section className="flex min-h-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
            <h1 className="font-[family-name:var(--font-display)] text-2xl">
              Bill
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {cart.length === 0
                ? 'Empty'
                : `${cart.length} line${cart.length === 1 ? '' : 's'} · ${totals.units} units`}
            </p>
          </header>

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center">
                <p className="text-[var(--muted)]">
                  Scan a barcode, open Products, or tap a service.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {cart.map((line) => {
                  const lineTotal = line.unitPrice * line.quantity;
                  return (
                    <li
                      key={line.key}
                      className="flex items-center gap-3 rounded-xl bg-white px-4 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-medium leading-snug">
                          {line.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {money(line.unitPrice)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] text-xl"
                          onClick={() => updateQty(line.key, line.quantity - 1)}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          value={line.quantity}
                          onChange={(e) =>
                            updateQty(line.key, Number(e.target.value))
                          }
                          onFocus={(e) => e.target.select()}
                          className="h-11 w-16 rounded-lg border border-[var(--line)] text-center text-lg font-semibold"
                        />
                        <button
                          type="button"
                          className="flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] text-xl"
                          onClick={() => updateQty(line.key, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>

                      <p className="w-28 text-right text-lg font-semibold tabular-nums">
                        {money(lineTotal)}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--danger)] hover:bg-red-50"
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {cart.length > 0 ? (
            <div className="border-t border-[var(--line)] bg-white/60 px-6 py-4">
              <BillTotalsSummary
                total={totals.total}
                discount={totals.discount}
                totalAfterDiscount={totals.totalAfterDiscount}
              />
            </div>
          ) : null}

          {(error || notice || heldNotice) && (
            <div className="space-y-2 border-t border-[var(--line)] px-6 py-3">
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {notice}
                </p>
              ) : null}
              {heldNotice ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {heldNotice}
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Slim checkout panel */}
        <aside className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--cart)]">
          <div className="flex-1 space-y-5 p-5">
            <label className="block text-sm text-[var(--muted)]">
              Customer
              <select
                value={customerId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowAddCustomer(true);
                    return;
                  }
                  setCustomerId(e.target.value);
                }}
                className={`mt-1 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-[var(--ink)] ${
                  paymentMethod === 'CREDIT' && !customerId
                    ? 'border-[var(--danger)]'
                    : 'border-[var(--line)]'
                }`}
              >
                <option value="">No customer</option>
                <option value="__new__">+ Add new customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm text-[var(--muted)]">
              Billing person
              <select
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)]"
              >
                <option value="">Select employee…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2 border-t border-[var(--line)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                Discount
              </p>
              <div className="flex gap-2">
                <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setDiscountMode('Rs')}
                    className={`px-3 py-2 text-sm font-medium ${
                      discountMode === 'Rs'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-white'
                    }`}
                  >
                    Rs
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountMode('%')}
                    className={`px-3 py-2 text-sm font-medium ${
                      discountMode === '%'
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-white'
                    }`}
                  >
                    %
                  </button>
                </div>
                <input
                  type="number"
                  min={0}
                  max={discountMode === '%' ? 100 : undefined}
                  step="0.01"
                  value={discountInput}
                  onChange={(e) => {
                    setDiscountInput(e.target.value);
                    setError(null);
                  }}
                  placeholder={discountMode === '%' ? '10' : '100'}
                  className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={clearDiscount}
                  disabled={!discountInput}
                  className="rounded-lg border border-[var(--line)] px-3 py-2 text-sm disabled:opacity-40"
                >
                  Clear
                </button>
              </div>
              {discountMode === '%' && Number(discountInput) > 0 ? (
                <p className="text-xs text-[var(--muted)]">
                  {Math.min(100, Number(discountInput) || 0)}% of{' '}
                  {money(totals.total)} = {money(totals.discount)}
                </p>
              ) : null}
            </div>

            <div className="border-t border-[var(--line)] pt-4">
              <BillTotalsSummary
                total={totals.total}
                discount={totals.discount}
                totalAfterDiscount={totals.totalAfterDiscount}
                size="lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`rounded-lg border px-2 py-2.5 text-sm font-medium ${
                    paymentMethod === method.id
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--line)] bg-white'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--line)] p-5">
            <button
              type="button"
              disabled={!cart.length || busy}
              onClick={() => void charge()}
              className="w-full rounded-xl bg-[var(--accent)] py-4 text-base font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Confirming…' : 'Confirm bill'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={clearCart}
                className="rounded-lg border border-[var(--line)] py-2.5 text-sm font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!cart.length || busy}
                onClick={() => void hold()}
                className="rounded-lg border border-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent)] disabled:opacity-50"
              >
                Hold
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showProducts ? (
        <ProductPicker
          onAdd={(product) => {
            addProduct(product);
            flashNotice(`Added ${product.name}`);
          }}
          onClose={() => {
            setShowProducts(false);
            focusScan();
          }}
        />
      ) : null}

      {keypadService ? (
        <ServiceKeypad
          service={keypadService}
          onAdd={(quantity) => {
            addServiceLine(keypadService, quantity);
            setKeypadService(null);
            focusScan();
          }}
          onClose={() => setKeypadService(null)}
        />
      ) : null}

      {showCustom ? (
        <CustomItemModal
          onAdd={(item) => {
            addCustomLine(item);
            setShowCustom(false);
            focusScan();
          }}
          onClose={() => setShowCustom(false)}
        />
      ) : null}

      {showSuccess && lastOrder ? (
        <BillSuccessModal
          order={lastOrder}
          settings={settings}
          onClose={() => {
            setShowSuccess(false);
            setLastOrder(null);
            focusScan();
          }}
        />
      ) : null}

      {showAddCustomer ? (
        <AddCustomerModal
          onCreated={(c) => {
            setCustomers((prev) =>
              [...prev, c].sort((a, b) => a.name.localeCompare(b.name)),
            );
            setCustomerId(c.id);
            setShowAddCustomer(false);
          }}
          onClose={() => setShowAddCustomer(false)}
        />
      ) : null}
    </div>
  );
}
