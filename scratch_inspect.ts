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
  
  let productIds = new Set<number>();
  let batchIds = new Set<number>();
  
  targetPurchases.forEach(p => {
    p.items.forEach(i => {
      productIds.add(i.productId);
      batchIds.add(i.batchId);
    });
  });

  const pIdsArr = Array.from(productIds);
  const bIdsArr = Array.from(batchIds);

  console.log(`Found ${purchaseIds.length} purchases, containing ${pIdsArr.length} unique products and ${bIdsArr.length} batches.`);

  // Check if these products are used elsewhere
  const otherPurchaseItems = await prisma.purchaseItem.findMany({
    where: {
      productId: { in: pIdsArr },
      purchaseId: { notIn: purchaseIds }
    }
  });

  // Unique products used in OTHER purchases
  const productsUsedElsewhere = new Set(otherPurchaseItems.map(i => i.productId));
  
  const safeToDeleteProducts = pIdsArr.filter(id => !productsUsedElsewhere.has(id));
  
  console.log(`Out of ${pIdsArr.length} products, ${safeToDeleteProducts.length} are ONLY used in these premier purchases and are safe to delete.`);
}

main().finally(async () => {
  await prisma.$disconnect();
});
