import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const targetPurchases = await prisma.purchase.findMany({
    where: {
      supplier: { name: { contains: 'premier' } },
      id: { gte: 47 } // id 47 is '10021'
    },
    include: {
      items: true
    }
  });

  const purchaseIds = targetPurchases.map(p => p.id);
  if (purchaseIds.length === 0) {
    console.log("No purchases found to delete!");
    return;
  }
  
  let productIds = new Set<number>();
  let batchIds = new Set<number>();
  let purchaseItemIds = new Set<number>();
  
  targetPurchases.forEach(p => {
    p.items.forEach(i => {
      productIds.add(i.productId);
      batchIds.add(i.batchId);
      purchaseItemIds.add(i.id);
    });
  });

  const pIdsArr = Array.from(productIds);
  const bIdsArr = Array.from(batchIds);
  const piIdsArr = Array.from(purchaseItemIds);

  // Find products that are safe to delete (only used in these purchases)
  const otherPurchaseItems = await prisma.purchaseItem.findMany({
    where: {
      productId: { in: pIdsArr },
      purchaseId: { notIn: purchaseIds }
    }
  });

  const productsUsedElsewhere = new Set(otherPurchaseItems.map(i => i.productId));
  const safeToDeleteProducts = pIdsArr.filter(id => !productsUsedElsewhere.has(id));

  // Find batches that are safe to delete (only used in these purchases)
  const otherPurchaseItemsForBatches = await prisma.purchaseItem.findMany({
    where: {
      batchId: { in: bIdsArr },
      purchaseId: { notIn: purchaseIds }
    }
  });
  const batchesUsedElsewhere = new Set(otherPurchaseItemsForBatches.map(i => i.batchId));
  const safeToDeleteBatches = bIdsArr.filter(id => !batchesUsedElsewhere.has(id));

  console.log(`Deleting ${piIdsArr.length} PurchaseItems...`);
  await prisma.purchaseItem.deleteMany({
    where: { id: { in: piIdsArr } }
  });

  console.log(`Deleting ${purchaseIds.length} Purchases...`);
  await prisma.purchase.deleteMany({
    where: { id: { in: purchaseIds } }
  });

  console.log(`Deleting ${safeToDeleteBatches.length} Batches...`);
  await prisma.batch.deleteMany({
    where: { id: { in: safeToDeleteBatches } }
  });

  console.log(`Deleting ${safeToDeleteProducts.length} Products...`);
  // Deleting product will cascade to ProductAlias, ProductSupplier, OCRItem, ExpectedDiscount
  for (const pid of safeToDeleteProducts) {
    try {
      await prisma.product.delete({ where: { id: pid } });
    } catch(err) {
      console.log(`Failed to delete product ${pid}:`, err);
    }
  }

  console.log("Cleanup completed successfully!");
}

main().catch(err => {
  console.error("Error during deletion:", err);
}).finally(async () => {
  await prisma.$disconnect();
});
