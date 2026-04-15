import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/server/requestJson";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(suppliers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await readJsonBody(req);
        const { name, phone, email, address } = body;

        if (!name) {
            return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
        }

        const supplier = await prisma.supplier.create({
            data: {
                name,
                phone: phone || null,
                email: email || null,
                address: address || null
            }
        });

        return NextResponse.json(supplier);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
