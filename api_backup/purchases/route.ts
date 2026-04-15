import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const purchases = await prisma.purchase.findMany({
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true
                    }
                }
            },
            orderBy: {
                date: 'desc'
            }
        });
        return NextResponse.json(purchases);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch purchases" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { supplierId, invoiceNo, items, date } = body;

        const result = await prisma.$transaction(async (tx) => {
            // Create Purchase
            const purchase = await tx.purchase.create({
                data: {
                    invoiceNo,
                    supplierId: Number(supplierId),
                    date: new Date(date),
                    total: items.reduce((sum: number, i: any) => sum + (i.quantity * i.purchasePrice), 0),
                    items: {
                        create: items.map((item: any) => ({
                            productId: Number(item.productId),
                            batchId: 1, // Placeholder, would usually create or select a batch
                            quantity: Number(item.quantity),
                            price: Number(item.purchasePrice)
                        }))
                    }
                }
            });

            // Update Stock and create/update batches
            for (const item of items) {
                await tx.product.update({
                    where: { id: Number(item.productId) },
                    data: {
                        stock: {
                            increment: Number(item.quantity)
                        }
                    }
                });

                // Create a new batch for this purchase
                await tx.batch.create({
                    data: {
                        batchNo: item.batchNo,
                        expiryDate: new Date(item.expiryDate),
                        quantity: Number(item.quantity),
                        productId: Number(item.productId)
                    }
                });
            }

            // Update Supplier last order date
            await tx.supplier.update({
                where: { id: Number(supplierId) },
                data: {
                    lastOrder: new Date(date),
                    totalOrders: {
                        increment: 1
                    }
                }
            });

            return purchase;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Purchase Process Error:", error);
        return NextResponse.json({ error: "Failed to record purchase" }, { status: 500 });
    }
}
