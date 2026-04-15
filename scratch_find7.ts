import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allPurchases = await prisma.purchase.findMany({
    where: { supplier: { name: { contains: 'premier' } } },
    select: { id: true, invoiceNo: true }
  });
  console.log("Premier purchases in C drive:", allPurchases);

  const somePurchases = await prisma.purchase.findMany({
    where: { invoiceNo: { contains: "1002" } },
    select: { id: true, invoiceNo: true, supplier: { select: { name: true } } }
  });
  console.log("Purchases containing 1002 in C drive:", somePurchases);
}

main().finally(async () => {
    await prisma.$disconnect();
});
