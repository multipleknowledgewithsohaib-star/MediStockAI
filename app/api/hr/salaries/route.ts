import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month"); // e.g., '2024-03'

        const whereClause: any = {};
        if (month) {
            whereClause.month = month;
        }

        const salaries = await prisma.salary.findMany({
            where: whereClause,
            include: {
                employee: {
                    include: { branch: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ success: true, salaries });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { employeeId, month, bonus = 0, deduction = 0, status = "Unpaid" } = body;

        if (!employeeId || !month) {
            return NextResponse.json({ success: false, message: "Employee ID and Month are required" }, { status: 400 });
        }

        // Get employee basic salary
        const emp = await prisma.employee.findUnique({
            where: { id: parseInt(employeeId) }
        });

        if (!emp) {
            return NextResponse.json({ success: false, message: "Employee not found" }, { status: 404 });
        }

        // Check if salary already exists for this month
        let salaryRecord = await prisma.salary.findFirst({
            where: { employeeId: parseInt(employeeId), month }
        });

        const basicSalary = emp.baseSalary || 0;
        const netSalary = basicSalary + parseFloat(bonus) - parseFloat(deduction);

        if (salaryRecord) {
            salaryRecord = await prisma.salary.update({
                where: { id: salaryRecord.id },
                data: {
                    bonus: parseFloat(bonus),
                    deduction: parseFloat(deduction),
                    netSalary,
                    status
                }
            });
        } else {
            salaryRecord = await prisma.salary.create({
                data: {
                    employeeId: parseInt(employeeId),
                    month,
                    basicSalary,
                    bonus: parseFloat(bonus),
                    deduction: parseFloat(deduction),
                    netSalary,
                    status
                }
            });
        }

        // If status is paid, we might also want to generate an AccountTransaction for expense
        if (status === "Paid") {
            // Note: Simplistic approach, real-world requires checking if transaction was already generated
            await prisma.accountTransaction.create({
                data: {
                    type: "Salary",
                    category: `Salary - ${emp.name} - ${month}`,
                    amount: netSalary,
                    employeeId: emp.id,
                    status: "Completed",
                }
            });
        }

        return NextResponse.json({ success: true, salary: salaryRecord });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
