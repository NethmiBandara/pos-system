import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Remove the old generic mini-mart catalog (grocery etc.) — this is a bookshop.
async function removeLegacyCatalog() {
  const legacy = ['Beverages', 'Snacks', 'Grocery', 'Household'];
  const cats = await prisma.category.findMany({
    where: { name: { in: legacy } },
  });
  for (const cat of cats) {
    const products = await prisma.product.findMany({
      where: { categoryId: cat.id },
    });
    for (const p of products) {
      const refs = await prisma.orderItem.count({ where: { productId: p.id } });
      if (refs === 0) {
        await prisma.inventoryAdjustment.deleteMany({
          where: { productId: p.id },
        });
        await prisma.product.delete({ where: { id: p.id } });
      } else {
        // Keep for order history but hide from catalog/billing.
        await prisma.product.update({
          where: { id: p.id },
          data: { isActive: false, categoryId: null },
        });
      }
    }
    const remaining = await prisma.product.count({
      where: { categoryId: cat.id },
    });
    if (remaining === 0) {
      await prisma.category.delete({ where: { id: cat.id } });
    }
  }
}

async function main() {
  await removeLegacyCatalog();

  const passwordHash = await bcrypt.hash('password', 10);

  await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: { currency: 'LKR' },
    create: {
      id: 'default',
      storeName: 'City Book House',
      address: 'No. 42, Main Street, Colombo',
      phone: '+94 11 234 5678',
      taxRate: 0,
      currency: 'LKR',
      receiptFooter: 'Thank you for shopping with us!',
      lowStockThreshold: 5,
    },
  });

  for (const [email, name, role] of [
    ['admin@pos.local', 'Admin User', 'ADMIN'],
    ['manager@pos.local', 'Store Manager', 'MANAGER'],
    ['cashier@pos.local', 'Demo Cashier', 'CASHIER'],
  ] as const) {
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: { email, name, passwordHash, role },
    });
  }

  const books = await prisma.category.upsert({
    where: { name: 'Books' },
    update: {},
    create: { name: 'Books' },
  });
  const stationery = await prisma.category.upsert({
    where: { name: 'Stationery' },
    update: {},
    create: { name: 'Stationery' },
  });
  const artCraft = await prisma.category.upsert({
    where: { name: 'Art & Craft' },
    update: {},
    create: { name: 'Art & Craft' },
  });
  const magazines = await prisma.category.upsert({
    where: { name: 'Magazines' },
    update: {},
    create: { name: 'Magazines' },
  });

  // Prices in Sri Lankan Rupees (LKR)
  const products = [
    { sku: 'BK-001', barcode: '9780099590088', name: 'Sapiens - Y.N. Harari', price: 3500, cost: 2400, stock: 25, categoryId: books.id },
    { sku: 'BK-002', barcode: '9780061122415', name: 'The Alchemist', price: 1800, cost: 1200, stock: 30, categoryId: books.id },
    { sku: 'BK-003', barcode: '9789551762345', name: 'Madol Doova (Sinhala)', price: 950, cost: 600, stock: 40, categoryId: books.id },
    { sku: 'BK-004', barcode: '9780545010221', name: 'Harry Potter (Boxset)', price: 12500, cost: 9000, stock: 8, lowStockAt: 3, categoryId: books.id },
    { sku: 'ST-001', barcode: '4800001000015', name: 'Atlas Blue Pen', price: 60, cost: 35, stock: 300, categoryId: stationery.id },
    { sku: 'ST-002', barcode: '4800001000022', name: 'CR A4 Book 200pg', price: 450, cost: 300, stock: 120, categoryId: stationery.id },
    { sku: 'ST-003', barcode: '4800001000039', name: 'Pencil HB', price: 40, cost: 20, stock: 250, categoryId: stationery.id },
    { sku: 'ST-004', barcode: '4800001000046', name: 'Eraser (soft)', price: 30, cost: 12, stock: 200, categoryId: stationery.id },
    { sku: 'ST-005', barcode: '4800001000053', name: 'Stapler No.10', price: 350, cost: 210, stock: 4, lowStockAt: 5, categoryId: stationery.id },
    { sku: 'AC-001', barcode: '4800002000014', name: 'Color Pencils (12)', price: 650, cost: 420, stock: 45, categoryId: artCraft.id },
    { sku: 'AC-002', barcode: '4800002000021', name: 'Sketch Book A4', price: 550, cost: 350, stock: 35, categoryId: artCraft.id },
    { sku: 'MG-001', barcode: '4800003000013', name: 'Sarasaviya Weekly', price: 120, cost: 90, stock: 60, categoryId: magazines.id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        barcode: p.barcode,
        categoryId: p.categoryId,
        lowStockAt: p.lowStockAt ?? 5,
        isActive: true,
      },
      create: p,
    });
  }

  // Photocopy / printout / binding services (billed without barcode)
  const services = [
    { name: 'Photocopy B/W', unitPrice: 5, unitLabel: 'page', sortOrder: 1 },
    { name: 'Photocopy Color', unitPrice: 25, unitLabel: 'page', sortOrder: 2 },
    { name: 'Printout B/W', unitPrice: 10, unitLabel: 'page', sortOrder: 3 },
    { name: 'Printout Color', unitPrice: 50, unitLabel: 'page', sortOrder: 4 },
    { name: 'Spiral Binding', unitPrice: 150, unitLabel: 'book', sortOrder: 5 },
    { name: 'Lamination A4', unitPrice: 80, unitLabel: 'sheet', sortOrder: 6 },
  ];
  const existingServices = await prisma.serviceItem.count();
  if (existingServices === 0) {
    for (const s of services) {
      await prisma.serviceItem.create({ data: s });
    }
  }

  await prisma.customer.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Perera',
      email: 'jane@example.com',
      phone: '+94 77 123 4567',
      notes: 'Regular credit customer',
    },
  });

  console.log('Seed complete (bookshop, LKR)');
  console.log('Logins (password: password): admin@ / manager@ / cashier@pos.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
