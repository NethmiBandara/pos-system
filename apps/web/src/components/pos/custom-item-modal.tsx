'use client';

import { FormEvent, useState } from 'react';

export function CustomItemModal({
  onAdd,
  onClose,
}: {
  onAdd: (item: { name: string; unitPrice: number; quantity: number }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const unitPrice = Number(price);
    const quantity = Math.max(1, Math.floor(Number(qty) || 1));
    if (!name.trim() || !(unitPrice >= 0)) return;
    onAdd({ name: name.trim(), unitPrice, quantity });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-display)] text-2xl">
            Custom item
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-[var(--muted)] hover:bg-black/5"
          >
            ✕
          </button>
        </div>

        <label className="mt-4 block text-sm">
          Description
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Used textbook, special order"
            className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
            required
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Unit price
            <input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-right"
              required
            />
          </label>
          <label className="block text-sm">
            Quantity
            <input
              type="number"
              min={1}
              step="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-right"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-5 w-full rounded-md bg-[var(--accent)] py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Add to cart
        </button>
      </form>
    </div>
  );
}
