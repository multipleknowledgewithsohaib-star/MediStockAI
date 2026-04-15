import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const employees = await prisma.employee.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(employees);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, role, email, phone, baseSalary, status } = body;

        const employee = await prisma.employee.create({
            data: {
                name,
                role: role || "Staff",
                email,
                phone,
                baseSalary: Number(baseSalary) || 0,
                status: status || "Active",
                joinDate: new Date()
            }
        });

        return NextResponse.json(employee);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
