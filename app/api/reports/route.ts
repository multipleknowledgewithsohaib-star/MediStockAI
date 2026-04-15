import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { REPORT_DATE_CUTOFF } from "@/lib/reportDates";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const startDate = new Date("2025-01-01");

        // Fetch all relevant Sales
        const allSales = await prisma.sale.findMany({
            where: { date: { gte: startDate, lte: REPORT_DATE_CUTOFF } },
            select: { date: true, total: true }
        });

        // Fetch all relevant Purchases
        const allPurchases = await prisma.purchase.findMany({
            where: { date: { gte: startDate, lte: REPORT_DATE_CUTOFF } },
            select: { date: true, total: true }
        });

        // Manual Aggregation by Month-Year
        const aggregator: Record<string, { month: string, year: number, sales: number, purchases: number }> = {};

        allSales.forEach(s => {
            const date = new Date(s.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!aggregator[key]) {
                aggregator[key] = { 
                    month: date.toLocaleString('default', { month: 'short' }), 
                    year: date.getFullYear(),
                    sales: 0, 
                    purchases: 0 
                };
            }
            aggregator[key].sales += s.total || 0;
        });

        allPurchases.forEach(p => {
            const date = new Date(p.date);
            const key = `${date.getFullYear()}-${date.getMonth()}`;
            if (!aggregator[key]) {
                aggregator[key] = { 
                    month: date.toLocaleString('default', { month: 'short' }), 
                    year: date.getFullYear(),
                    sales: 0, 
                    purchases: 0 
                };
            }
            aggregator[key].purchases += p.total || 0;
        });

        const monthlySalesArray = Object.values(aggregator).toSorted((a, b) => {
            const dateA = new Date(`${a.month} 1, ${a.year}`);
            const dateB = new Date(`${b.month} 1, ${b.year}`);
            return dateA.getTime() - dateB.getTime();
        });

        // Top Products
        const topProductsGroups = await prisma.saleItem.groupBy({
            where: {
                sale: { date: { gte: startDate, lte: REPORT_DATE_CUTOFF } }
            },
            by: ['productId'],
            _sum: { quantity: true, price: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const products = await prisma.product.findMany({
            where: { id: { in: topProductsGroups.map(p => p.productId) } }
        });

        return NextResponse.json({
            monthlySales: monthlySalesArray,
            topProducts: topProductsGroups.map(tp => ({
                name: products.find(p => p.id === tp.productId)?.name || "Unknown Product",
                sold: tp._sum.quantity || 0,
                revenue: tp._sum.price || 0
            }))
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch report data" }, { status: 500 });
    }
}
