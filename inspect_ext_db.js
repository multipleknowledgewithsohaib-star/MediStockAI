const { PrismaClient } = require('@prisma/client');

async function checkExternalDb(dbPath) {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: `file:${dbPath}`,
            },
        },
    });

    try {
        const purchaseCount = await prisma.purchase.count();
        const firstPurchases = await prisma.purchase.findMany({
            take: 5,
            include: { supplier: true }
        });
        const productCount = await prisma.product.count();
        
        console.log(JSON.stringify({
            dbPath,
            purchaseCount,
            productCount,
            firstSuppliers: firstPurchases.map(p => p.supplier?.name || 'Unknown'),
            firstInvoices: firstPurchases.map(p => p.invoiceNo),
            firstDates: firstPurchases.map(p => p.date)
        }, null, 2));
    } catch (error) {
        console.error(`Error checking ${dbPath}:`, error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Check the promising ones
const target = process.argv[2];
if (target) {
    checkExternalDb(target);
} else {
    console.log("Please provide a db path");
}
