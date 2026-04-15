import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const transactions = await prisma.accountTransaction.findMany({
            include: {
                employee: true
            },
            orderBy: { date: 'desc' }
        });
        return NextResponse.json(transactions);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { type, category, amount, date, description, employeeId, status } = body;

        const transaction = await prisma.accountTransaction.create({
            data: {
                type,
                category: category || "General",
                amount: Number(amount) || 0,
                date: date ? new Date(date) : new Date(),
                description,
                employeeId: employeeId ? Number(employeeId) : null,
                status: status || "Completed"
            }
        });

        return NextResponse.json(transaction);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
