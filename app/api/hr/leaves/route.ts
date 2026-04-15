import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const employeeId = searchParams.get("employeeId");

        const whereClause: any = {};
        if (employeeId) {
            whereClause.employeeId = parseInt(employeeId);
        }

        const leaves = await prisma.leave.findMany({
            where: whereClause,
            include: {
                employee: {
                    include: { branch: true }
                }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json({ success: true, leaves });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { employeeId, fromDate, toDate, reason } = body;

        if (!employeeId || !fromDate || !toDate) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const leave = await prisma.leave.create({
            data: {
                employeeId: parseInt(employeeId),
                fromDate: new Date(fromDate),
                toDate: new Date(toDate),
                reason,
                status: "Pending"
            }
        });

        return NextResponse.json({ success: true, leave });
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

        const leave = await prisma.leave.update({
            where: { id: parseInt(id) },
            data: { status }
        });

        return NextResponse.json({ success: true, leave });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
