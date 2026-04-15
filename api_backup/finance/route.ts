import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const sales = await prisma.sale.findMany({
            orderBy: { date: 'desc' },
            take: 10
        });

        const purchases = await prisma.purchase.findMany({
            orderBy: { date: 'desc' },
            take: 10
        });

        const totalRevenue = await prisma.sale.aggregate({
            _sum: { total: true }
        });

        const totalExpenses = await prisma.purchase.aggregate({
            _sum: { total: true }
        });

        const transactions = [
            ...sales.map(s => ({
                id: `s-${s.id}`,
                type: 'income',
                description: `Invoice ${s.invoiceNo}`,
                amount: s.total,
                date: s.date.toISOString().split('T')[0]
            })),
            ...purchases.map(p => ({
                id: `p-${p.id}`,
                type: 'expense',
                description: `Purchase ${p.invoiceNo}`,
                amount: p.total,
                date: p.date.toISOString().split('T')[0]
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return NextResponse.json({
            totalRevenue: totalRevenue._sum.total || 0,
            totalExpenses: totalExpenses._sum.total || 0,
            netProfit: (totalRevenue._sum.total || 0) - (totalExpenses._sum.total || 0),
            recentTransactions: transactions.slice(0, 15)
        });
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch financial data" }, { status: 500 });
    }
}
