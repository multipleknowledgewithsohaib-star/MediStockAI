import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(suppliers);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supplier = await prisma.supplier.create({
            data: {
                name: body.name,
                phone: body.phone,
                email: body.email,
                address: body.address
            }
        });
        return NextResponse.json(supplier);
    } catch (error) {
        return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
    }
}
