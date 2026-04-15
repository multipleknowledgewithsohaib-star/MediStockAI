import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const startDate = new Date("2025-01-01");

        // Aggregate Sales
        const monthlySales = await prisma.sale.groupBy({
            where: {
                date: {
                    gte: startDate
                }
            },
            by: ['date'],
            _sum: {
                total: true
            }
        });

        // Aggregate Purchases (Expenses)
        const monthlyPurchases = await prisma.purchase.groupBy({
            where: {
                date: {
                    gte: startDate
                }
            },
            by: ['date'],
            _sum: {
                total: true
            }
        });

        const topProducts = await prisma.saleItem.groupBy({
            where: {
                sale: {
                    date: {
                        gte: startDate
                    }
                }
            },
            by: ['productId'],
            _sum: {
                quantity: true,
                price: true
            },
            orderBy: {
                _sum: {
                    quantity: 'desc'
                }
            },
            take: 5
        });

        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: topProducts.map(p => p.productId)
                }
            }
        });

        return NextResponse.json({
            monthlySales: monthlySales.map(m => {
                const monthStr = m.date.toLocaleString('default', { month: 'short' });
                const purchases = monthlyPurchases.find(p =>
                    p.date.toLocaleString('default', { month: 'short' }) === monthStr
                )?._sum?.total || 0;

                return {
                    month: monthStr,
                    sales: m._sum.total || 0,
                    purchases: purchases
                };
            }),
            topProducts: topProducts.map(tp => ({
                name: products.find(p => p.id === tp.productId)?.name,
                sold: tp._sum.quantity,
                revenue: tp._sum.price
            }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
    }
}
