const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("--- Checking Databases ---");
    const supplierCount = await prisma.supplier.count();
    const premierSupplier = await prisma.supplier.findFirst({
        where: { name: { contains: 'Premier' } }
    });
    const purchaseCount = await prisma.purchase.count();
    
    console.log({
        supplierCount,
        premierSupplier: premierSupplier ? { id: premierSupplier.id, name: premierSupplier.name } : 'Not Found',
        purchaseCount
    });

    const branches = await prisma.branch.findMany();
    console.log("Branches:", branches.map(b => ({ id: b.id, name: b.name })));
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
