import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting system reset...')

    // Order matters due to foreign key constraints
    await prisma.purchaseItem.deleteMany({})
    await prisma.saleItem.deleteMany({})
    await prisma.purchase.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.batch.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.supplier.deleteMany({})
    await prisma.alert.deleteMany({})

    console.log('System reset complete. All data wiped.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
