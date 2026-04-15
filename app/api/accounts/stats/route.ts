import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const transactions = await prisma.accountTransaction.findMany();
        
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const monthlyTransactions = transactions.filter(t => new Date(t.date) >= firstDayOfMonth);

        const monthlyRevenue = monthlyTransactions
            .filter(t => t.type === 'Revenue')
            .reduce((sum, t) => sum + t.amount, 0);

        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'Expense' || t.type === 'Salary')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalBalance = transactions
            .reduce((sum, t) => {
                if (t.type === 'Revenue') return sum + t.amount;
                return sum - t.amount;
            }, 0);

        return NextResponse.json({
            monthlyRevenue,
            monthlyExpenses,
            totalBalance,
            netGain: monthlyRevenue - monthlyExpenses
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
