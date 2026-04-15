import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const alerts = await prisma.alert.findMany({
            orderBy: {
                createdAt: 'desc'
            }
        });
        return NextResponse.json(alerts);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const { id, resolved } = await req.json();
        const alert = await prisma.alert.update({
            where: { id: Number(id) },
            data: { resolved: Boolean(resolved) }
        });
        return NextResponse.json(alert);
    } catch (error) {
        return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
    }
}
