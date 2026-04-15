import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const branchId = searchParams.get("branchId");

        const whereClause: any = {};
        if (branchId) {
            whereClause.branchId = parseInt(branchId);
        }

        const employees = await prisma.employee.findMany({
            where: whereClause,
            include: {
                branch: true,
                role: true,
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ success: true, employees });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, email, cnic, designation, roleId, branchId, baseSalary } = body;

        if (!name) {
            return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
        }

        const employee = await prisma.employee.create({
            data: {
                name,
                phone,
                email,
                cnic,
                designation,
                roleId: roleId ? parseInt(roleId) : null,
                branchId: branchId ? parseInt(branchId) : null,
                baseSalary: baseSalary ? parseFloat(baseSalary) : 0,
            }
        });

        return NextResponse.json({ success: true, employee });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ success: false, message: "ID and Status are required" }, { status: 400 });
        }

        const employee = await prisma.employee.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        return NextResponse.json({ success: true, employee });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
