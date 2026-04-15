import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam, 10);

        if (Number.isNaN(id)) {
            return NextResponse.json({ error: "Invalid purchase ID" }, { status: 400 });
        }

        const purchase = await prisma.purchase.findUnique({
            where: { id },
            include: {
                items: {
                    select: {
                        batchId: true,
                        productId: true,
                    },
                },
            },
        });

        if (!purchase) {
            return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
        }

        const batchIds = [...new Set(purchase.items.map((item) => item.batchId))];
        const productIds = [...new Set(purchase.items.map((item) => item.productId))];

        if (batchIds.length > 0) {
            const linkedSales = await prisma.saleItem.count({
                where: {
                    batchId: { in: batchIds },
                },
            });

            if (linkedSales > 0) {
                return NextResponse.json(
                    { error: "This purchase cannot be deleted because some of its batches were already sold." },
                    { status: 409 }
                );
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.purchaseItem.deleteMany({
                where: { purchaseId: id },
            });

            if (batchIds.length > 0) {
                await tx.batch.deleteMany({
                    where: {
                        id: { in: batchIds },
                    },
                });
            }

            await tx.purchase.delete({
                where: { id },
            });

            for (const productId of productIds) {
                const remainingStock = await tx.batch.aggregate({
                    where: { productId },
                    _sum: { quantity: true },
                });

                await tx.product.update({
                    where: { id: productId },
                    data: {
                        stock: remainingStock._sum.quantity || 0,
                    },
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete purchase" }, { status: 500 });
    }
}
