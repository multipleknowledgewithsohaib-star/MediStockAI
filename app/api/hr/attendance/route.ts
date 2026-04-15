import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dateStr = searchParams.get("date");
        const branchId = searchParams.get("branchId");

        const whereClause: any = {};
        
        if (dateStr) {
            const dateObj = new Date(dateStr);
            const nextDay = new Date(dateObj);
            nextDay.setDate(dateObj.getDate() + 1);
            whereClause.date = {
                gte: dateObj,
                lt: nextDay
            };
        }
        
        if (branchId) {
            whereClause.branchId = parseInt(branchId);
        }

        const attendance = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                employee: true,
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json({ success: true, attendance });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { employeeId, branchId, action } = body; // action = "checkIn" or "checkOut"

        if (!employeeId || !action) {
            return NextResponse.json({ success: false, message: "Employee ID and Action are required" }, { status: 400 });
        }

        const now = new Date();
        const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Find existing attendance for today
        let record = await prisma.attendance.findFirst({
            where: {
                employeeId: parseInt(employeeId),
                date: {
                    gte: todayAtMidnight
                }
            }
        });

        if (action === "checkIn") {
            if (record && record.checkIn) {
                return NextResponse.json({ success: false, message: "Already checked in today" }, { status: 400 });
            }

            // Logic for "Late" (e.g. after 9:15 AM)
            const hours = now.getHours();
            const minutes = now.getMinutes();
            let status = "Present";
            
            if (hours > 9 || (hours === 9 && minutes > 15)) {
                status = "Late";
            }

            if (!record) {
                record = await prisma.attendance.create({
                    data: {
                        employeeId: parseInt(employeeId),
                        branchId: branchId ? parseInt(branchId) : null,
                        date: todayAtMidnight,
                        checkIn: now,
                        status
                    }
                });
            } else {
                record = await prisma.attendance.update({
                    where: { id: record.id },
                    data: { checkIn: now, status }
                });
            }
        } else if (action === "checkOut") {
            if (!record) {
                 return NextResponse.json({ success: false, message: "Must check in first" }, { status: 400 });
            }
            record = await prisma.attendance.update({
                where: { id: record.id },
                data: { checkOut: now }
            });
        }

        return NextResponse.json({ success: true, record });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
