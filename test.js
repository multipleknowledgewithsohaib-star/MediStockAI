const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const branches = await prisma.branch.findMany();
    console.log(branches);
    process.exit(0);
}
main();
