ALTER TABLE "Product" ADD COLUMN "discountPercent" REAL NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "isDiscountActive" BOOLEAN NOT NULL DEFAULT 0;

ALTER TABLE "SaleItem" ADD COLUMN "pricingSnapshotId" INTEGER;
ALTER TABLE "SaleItem" ADD COLUMN "rateAtSaleTime" REAL NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "discountPercentAtSaleTime" REAL NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "discountAmountAtSaleTime" REAL NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN "netAmount" REAL NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "ProductPricingSnapshot" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "productId" INTEGER NOT NULL,
    "salePrice" REAL NOT NULL,
    "discountPercent" REAL NOT NULL DEFAULT 0,
    "isDiscountActive" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductPricingSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductPricingSnapshot_productId_idx" ON "ProductPricingSnapshot"("productId");
CREATE INDEX IF NOT EXISTS "SaleItem_pricingSnapshotId_idx" ON "SaleItem"("pricingSnapshotId");

INSERT INTO "ProductPricingSnapshot" ("productId", "salePrice", "discountPercent", "isDiscountActive")
SELECT "id", "salePrice", "discountPercent", "isDiscountActive"
FROM "Product"
WHERE NOT EXISTS (
    SELECT 1
    FROM "ProductPricingSnapshot"
    WHERE "ProductPricingSnapshot"."productId" = "Product"."id"
);

UPDATE "SaleItem"
SET
    "rateAtSaleTime" = COALESCE(NULLIF("rateAtSaleTime", 0), "price"),
    "discountPercentAtSaleTime" = COALESCE("discountPercentAtSaleTime", 0),
    "discountAmountAtSaleTime" = COALESCE("discountAmountAtSaleTime", 0),
    "netAmount" = COALESCE(NULLIF("netAmount", 0), "price" * "quantity");
