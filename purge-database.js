const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function purgeAllData() {
    console.log("🔥 Starting Full System Purge...");

    try {
        // Delete in order of dependencies (Children first)
        
        console.log(" - Cleaning Transactions & Payroll...");
        await prisma.accountTransaction.deleteMany({});
        await prisma.employee.deleteMany({});

        console.log(" - Cleaning Sales & Invoices...");
        await prisma.saleItem.deleteMany({});
        await prisma.sale.deleteMany({});

        console.log(" - Cleaning Purchases & OCR Records...");
        await prisma.purchaseItem.deleteMany({});
        await prisma.purchase.deleteMany({});
        await prisma.oCRItem.deleteMany({});
        await prisma.oCRInvoice.deleteMany({});

        console.log(" - Cleaning Inventory & Products...");
        await prisma.batch.deleteMany({});
        await prisma.productAlias.deleteMany({});
        await prisma.productSupplier.deleteMany({});
        await prisma.expectedDiscount.deleteMany({});
        await prisma.product.deleteMany({});

        console.log(" - Cleaning People & Alerts...");
        await prisma.supplier.deleteMany({});
        await prisma.alert.deleteMany({});
        await prisma.transfer.deleteMany({});
        await prisma.user.deleteMany({});

        // Optional: Keep the settings and first branch but reset them to default if needed
        // Or just wipe them if they said "Everything"
        console.log(" - Cleaning Core Configuration...");
        await prisma.settings.deleteMany({});
        await prisma.branch.deleteMany({});

        console.log("\n✨ DATABASE PURGE COMPLETE. The system is now empty.");

    } catch (error) {
        console.error("\n❌ PURGE FAILED:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

purgeAllData();
