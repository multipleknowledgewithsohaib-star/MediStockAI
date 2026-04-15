import { NextResponse } from "next/server";
import { ADMIN_ROLE } from "@/lib/auth/access";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const { id: idParam } = await params;
        const id = Number(idParam);

        if (!Number.isInteger(id)) {
            return NextResponse.json({ error: "Invalid invoice ID." }, { status: 400 });
        }

        const sale = await prisma.sale.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });

        if (!sale) {
            return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            for (const item of sale.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            increment: item.quantity,
                        },
                    },
                });

                await tx.batch.update({
                    where: { id: item.batchId },
                    data: {
                        quantity: {
                            increment: item.quantity,
                        },
                    },
                });
            }

            await tx.saleItem.deleteMany({
                where: { saleId: id },
            });

            await tx.sale.delete({
                where: { id },
            });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete invoice" }, { status: 500 });
    }
}
