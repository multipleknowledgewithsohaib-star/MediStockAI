import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const sales = await prisma.sale.findMany({
            include: {
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
        return NextResponse.json(sales);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { items, total, tax, discount, paidAmount, changeAmount } = body;

        // Use transaction to ensure data consistency
        const result = await prisma.$transaction(async (tx) => {
            // Create Sale record
            const sale = await tx.sale.create({
                data: {
                    invoiceNo: "INV-" + Date.now(),
                    total: Number(total),
                    tax: Number(tax),
                    discount: Number(discount || 0),
                    paidAmount: Number(paidAmount || 0),
                    changeAmount: Number(changeAmount || 0),
                    items: {
                        create: items.map((item: any) => ({
                            productId: item.productId,
                            batchId: item.batchId || 1,
                            quantity: item.quantity, // this should be total units
                            price: item.price,
                            isPiece: item.isPiece || false
                        }))
                    }
                }
            });

            // Update Stock for each product
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity
                        }
                    }
                });

                // Also decrement from batch if possible
                if (item.batchId) {
                    await tx.batch.update({
                        where: { id: item.batchId },
                        data: {
                            quantity: {
                                decrement: item.quantity
                            }
                        }
                    });
                }
            }

            return sale;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Sale Process Error:", error);
        return NextResponse.json({ error: "Failed to process sale" }, { status: 500 });
    }
}
