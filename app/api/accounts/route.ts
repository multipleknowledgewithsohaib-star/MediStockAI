import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        // Fetch all generic account transactions
        const transactions = await prisma.accountTransaction.findMany({
            orderBy: { date: 'desc' },
            take: 100 // Fetch recent 100 for ledger
        });

        // Calculate various financial metrics
        const sales = await prisma.sale.aggregate({
            _sum: { total: true }
        });
        const purchases = await prisma.purchase.aggregate({
            _sum: { total: true }
        });

        const manualTransactions = await prisma.accountTransaction.groupBy({
            by: ['type', 'status'],
            _sum: { amount: true }
        });

        // Initialize totals
        let totalSalesRevenue = sales._sum.total || 0;
        let totalPurchaseCost = purchases._sum.total || 0;
        
        // Detailed manual transactions breakdown
        let manualRevenue = 0;
        let manualExpense = 0;
        let salaryExpense = 0;

        let currentLiabilities = 0; // e.g. Pending expense transactions
        let pendingClearances = 0; // e.g. Pending revenue transactions

        manualTransactions.forEach(t => {
            const amount = t._sum.amount || 0;
            if (t.type === "Revenue") {
                if (t.status === "Completed") manualRevenue += amount;
                else pendingClearances += amount;
            } else if (t.type === "Expense") {
                if (t.status === "Completed") manualExpense += amount;
                else currentLiabilities += amount;
            } else if (t.type === "Salary") {
                if (t.status === "Completed") salaryExpense += amount;
                else currentLiabilities += amount;
            }
        });

        // Overall calculations
        const totalRevenue = totalSalesRevenue + manualRevenue;
        const totalExpenses = totalPurchaseCost + manualExpense + salaryExpense;
        const netGain = totalRevenue - totalExpenses;

        return NextResponse.json({
            success: true,
            stats: {
                totalRevenue,
                totalExpenses,
                netGain,
                totalBalance: netGain, // Proxy for total balance 
                currentLiabilities,
                pendingClearances,
                breakdown: {
                    totalSalesRevenue,
                    totalPurchaseCost,
                    manualRevenue,
                    manualExpense,
                    salaryExpense
                }
            },
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                category: t.category,
                amount: t.amount,
                date: t.date.toISOString().split('T')[0],
                status: t.status,
                description: t.description
            }))
        });

    } catch (error: any) {
        console.error("Account API Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, category, amount, date, status } = body;

        if (!type || !category || !amount) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const newTx = await prisma.accountTransaction.create({
            data: {
                type,
                category,
                amount: parseFloat(amount),
                date: date ? new Date(date) : new Date(),
                status: status || "Completed",
            }
        });

        return NextResponse.json({ success: true, transaction: newTx });
    } catch (error: any) {
        console.error("Account API POST Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
