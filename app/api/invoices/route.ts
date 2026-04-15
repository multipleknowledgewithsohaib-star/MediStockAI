import { NextResponse } from "next/server";
import { ADMIN_ROLE, POS_ROLE } from "@/lib/auth/access";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE, POS_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const where = auth.user.role === POS_ROLE
            ? { createdById: auth.user.id }
            : undefined;

        const invoices = await prisma.sale.findMany({
            where,
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                        batch: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
        });

        return NextResponse.json(invoices);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}
