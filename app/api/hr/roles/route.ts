import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
    try {
        const roles = await prisma.role.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json({ success: true, roles });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, permissions } = body;

        if (!name || !permissions) {
            return NextResponse.json({ success: false, message: "Name and Permissions are required" }, { status: 400 });
        }

        const role = await prisma.role.create({
            data: {
                name,
                permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions)
            }
        });

        return NextResponse.json({ success: true, role });
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
