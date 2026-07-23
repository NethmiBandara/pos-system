-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "unitLabel" TEXT NOT NULL DEFAULT 'page',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL NOT NULL,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "notes" TEXT,
    "cashierId" TEXT,
    "customerId" TEXT,
    "isCredit" BOOLEAN NOT NULL DEFAULT false,
    "creditSettledAt" DATETIME,
    "creditSettleMethod" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("cashierId", "createdAt", "customerId", "discount", "id", "notes", "orderNumber", "status", "subtotal", "tax", "total", "updatedAt") SELECT "cashierId", "createdAt", "customerId", "discount", "id", "notes", "orderNumber", "status", "subtotal", "tax", "total", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "Order_cashierId_idx" ON "Order"("cashierId");
CREATE INDEX "Order_isCredit_idx" ON "Order"("isCredit");
CREATE TABLE "new_StoreSetting" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "storeName" TEXT NOT NULL DEFAULT 'POS Store',
    "address" TEXT,
    "phone" TEXT,
    "taxRate" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "receiptFooter" TEXT DEFAULT 'Thank you for your purchase!',
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StoreSetting" ("address", "currency", "id", "lowStockThreshold", "phone", "receiptFooter", "storeName", "taxRate", "updatedAt") SELECT "address", "currency", "id", "lowStockThreshold", "phone", "receiptFooter", "storeName", "taxRate", "updatedAt" FROM "StoreSetting";
DROP TABLE "StoreSetting";
ALTER TABLE "new_StoreSetting" RENAME TO "StoreSetting";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ServiceItem_isActive_idx" ON "ServiceItem"("isActive");
