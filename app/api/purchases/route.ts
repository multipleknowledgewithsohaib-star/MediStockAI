import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const purchases = await prisma.purchase.findMany({
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true,
                        batch: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return NextResponse.json(purchases);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch purchases" }, { status: 500 });
    }
}
