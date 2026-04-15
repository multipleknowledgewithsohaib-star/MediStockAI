import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);
        const body = await req.json();
        const { name, phone, email, address } = body;

        if (!name) {
            return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
        }

        const supplier = await prisma.supplier.update({
            where: { id },
            data: {
                name,
                phone: phone || null,
                email: email || null,
                address: address || null
            }
        });

        return NextResponse.json(supplier);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);

        // 1. Remove ProductSupplier join records
        await prisma.productSupplier.deleteMany({ where: { supplierId: id } });

        // 2. Nullify Batch.supplierId references (field is optional)
        await prisma.batch.updateMany({
            where: { supplierId: id },
            data: { supplierId: null }
        });

        // 3. Find all purchases tied to this supplier
        const linkedPurchases = await prisma.purchase.findMany({
            where: { supplierId: id },
            select: { id: true }
        });
        const purchaseIds = linkedPurchases.map(p => p.id);

        // 4. Delete PurchaseItems for those purchases
        if (purchaseIds.length > 0) {
            await prisma.purchaseItem.deleteMany({
                where: { purchaseId: { in: purchaseIds } }
            });

            // 5. Delete the Purchases themselves
            await prisma.purchase.deleteMany({ where: { supplierId: id } });
        }

        // 6. Finally delete the supplier
        await prisma.supplier.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
