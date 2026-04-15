const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Invoice Insertion ---');

  // 1. Create/Update Suppliers
  const suppliers = [
    { name: 'JF TRADERS', address: '98 AS Karachi Pakistan', phone: '03350368369' },
    { name: 'REHMAN TRADING', address: 'C-1 Federal B Area Block 11 Karachi', phone: '' }
  ];

  const supplierMap = {};
  for (const s of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: s.name } });
    if (existing) {
      supplierMap[s.name] = existing.id;
    } else {
      const created = await prisma.supplier.create({ data: s });
      supplierMap[s.name] = created.id;
    }
  }

  // 2. Define Invoice Data
  const invoices = [
    {
      supplierName: 'JF TRADERS',
      invoiceNo: '4146',
      date: new Date('2024-07-04'),
      total: 28048.00,
      items: [
        { name: 'VEC SIGN STRIP', qty: 4, rate: 1320.00 },
        { name: 'U-CHECK STRIP', qty: 2, rate: 1250.00 },
        { name: 'JAY-DETOX BRACES', qty: 30, rate: 55.00 },
        { name: 'LANCET ACCU-CHEK 200pcs', qty: 1, rate: 260.00 },
        { name: 'LANCET ACCU-CHEK 50pcs', qty: 6, rate: 80.00 },
        { name: 'LIFECARE 9X20', qty: 6, rate: 35.00 },
        { name: 'LIFECARE 9X25', qty: 6, rate: 38.00 },
        { name: 'PAPER TAPE 1', qty: 2, rate: 260.00 },
        { name: 'PECO PLASTER 1', qty: 12, rate: 40.00 },
        { name: 'FLEX BELT', qty: 3, rate: 380.00 },
        { name: 'SACRO LUMBAR ADV', qty: 6, rate: 350.00 },
        { name: 'E-CHECK 8008', qty: 1, rate: 3520.00 },
        { name: 'ACE MASK BLACK CHINA', qty: 12, rate: 120.00 },
        { name: 'FACE MASK CHINA', qty: 6, rate: 115.00 },
        { name: 'E-PWR WRIST WRAP', qty: 1, rate: 2850.00 },
        { name: 'E-PWR WRIST WRAP ADV', qty: 1, rate: 2500.00 }
      ]
    },
    {
      supplierName: 'REHMAN TRADING',
      invoiceNo: '120481',
      date: new Date('2025-12-05'),
      total: 732.00,
      items: [
        { name: 'Skin Bleach Cream (28gm)', qty: 2, rate: 366.00 }
      ]
    }
  ];

  // 3. Process Each Invoice
  for (const inv of invoices) {
    console.log(`Processing Invoice: ${inv.invoiceNo} from ${inv.supplierName}`);

    // Create Purchase
    const purchase = await prisma.purchase.create({
      data: {
        invoiceNo: inv.invoiceNo,
        date: inv.date,
        total: inv.total,
        supplierId: supplierMap[inv.supplierName]
      }
    });

    for (const item of inv.items) {
      // Find or Create Product
      let product = await prisma.product.findFirst({
        where: { name: { equals: item.name } }
      });

      if (!product) {
        product = await prisma.product.create({
          data: {
            name: item.name,
            brand: 'MediStock',
            category: 'Pharmacy',
            purchasePrice: item.rate,
            salePrice: item.rate * 1.25, // 25% markup
            item_code: `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
            stock: 0
          }
        });
      }

      // Create Batch
      const batch = await prisma.batch.create({
        data: {
          batchNo: `B-${inv.invoiceNo}-${Math.random().toString(16).substr(2, 4).toUpperCase()}`,
          expiryDate: new Date('2026-12-01'),
          quantity: item.qty,
          productId: product.id,
          supplierId: supplierMap[inv.supplierName],
          purchasePrice: item.rate
        }
      });

      // Create PurchaseItem
      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          productId: product.id,
          batchId: batch.id,
          quantity: item.qty,
          price: item.rate
        }
      });

      // Update Product Stock
      await prisma.product.update({
        where: { id: product.id },
        data: {
          stock: { increment: item.qty },
          purchasePrice: item.rate
        }
      });

      console.log(`  Added Item: ${item.name} (${item.qty})`);
    }
  }

  console.log('--- Invoice Insertion Complete ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
