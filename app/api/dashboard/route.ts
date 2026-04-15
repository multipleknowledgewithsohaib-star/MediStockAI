import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { REPORT_DATE_CUTOFF } from "../../../lib/reportDates";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const startDate = new Date("2025-01-01");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Today's Sales
        const daySales = await prisma.sale.findMany({
            where: {
                date: {
                    gte: today,
                    lte: REPORT_DATE_CUTOFF,
                },
            },
        });

        const todaySalesAmount = daySales.reduce((sum, s) => sum + s.total, 0);

        // Total Revenue (From 2025)
        const allSales = await prisma.sale.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: REPORT_DATE_CUTOFF
                }
            }
        });
        const totalRevenue = allSales.reduce((sum, s) => sum + s.total, 0);

        // Low Stock Count
        const lowStockItems = await prisma.product.count({
            where: {
                stock: {
                    lt: 20,
                },
            },
        });

        // Expiring Soon (Count 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        const expiringSoonCount = await prisma.batch.count({
            where: {
                expiryDate: {
                    lte: thirtyDaysFromNow,
                    gte: new Date(),
                },
            },
        });

        // Recent Sales
        const recentSales = await prisma.saleItem.findMany({
            take: 5,
            where: {
                sale: {
                    date: {
                        gte: startDate,
                        lte: REPORT_DATE_CUTOFF
                    }
                }
            },
            orderBy: {
                sale: {
                    date: 'desc'
                }
            },
            include: {
                product: true,
                sale: true,
            }
        });

        // Expiry Alerts
        const expiryAlerts = await prisma.batch.findMany({
            where: {
                expiryDate: {
                    lte: thirtyDaysFromNow,
                }
            },
            include: {
                product: true
            },
            take: 5
        });

        // Top Selling (From 2025)
        const topSelling = await prisma.saleItem.groupBy({
            where: {
                sale: {
                    date: {
                        gte: startDate,
                        lte: REPORT_DATE_CUTOFF
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
            take: 4
        });

        const topSellingProducts = await Promise.all(topSelling.map(async (item) => {
            const product = await prisma.product.findUnique({ where: { id: item.productId } });
            return {
                name: product?.name,
                sold: item._sum.quantity,
                revenue: item._sum.price,
                stock: product?.stock
            };
        }));

        return NextResponse.json({
            stats: {
                todaySales: todaySalesAmount,
                totalRevenue: totalRevenue,
                lowStock: lowStockItems,
                expiringSoon: expiringSoonCount
            },
            recentSales: recentSales.map(item => ({
                id: item.id,
                medicine: item.product.name,
                quantity: item.quantity,
                amount: item.price * item.quantity,
                time: item.sale.date
            })),
            expiryAlerts: expiryAlerts.map(b => {
                const diff = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return {
                    id: b.id,
                    medicine: b.product.name,
                    batch: b.batchNo,
                    days: diff,
                    quantity: b.quantity,
                    type: diff < 15 ? "critical" : diff < 30 ? "warning" : "info"
                };
            }),
            topSellingProducts
        });
    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
    }
}
