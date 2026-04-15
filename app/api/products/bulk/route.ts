import { NextResponse } from "next/server";
import { ADMIN_ROLE } from "@/lib/auth/access";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(req: Request) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const body = await req.json();
        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No product IDs provided for deletion" }, { status: 400 });
        }

        // Handle string vs int IDs depending on how they are stored vs passed. Prisma standard assumes int for IDs.
        // If they are strings that represent numbers, let's map them to numbers, or strings if they are uuids. 
        // Based on previous code, they might be string or number, let's look at schema later if needed. Usually, Product ID is an Int type in Prisma or string uuid.
        // Wait, I should make sure it matches the type Prisma expects. In MediStock usually it's Int or String. Let's assume Prisma handles it or parse if string.

        // Standard bulk delete using Prisma's in operator
        const deletedProducts = await prisma.product.deleteMany({
            where: {
                id: {
                    in: ids.map(id => typeof id === 'string' && !isNaN(Number(id)) ? Number(id) : id)
                }
            }
        });

        return NextResponse.json({ message: "Products deleted successfully", count: deletedProducts.count });
    } catch (error: any) {
        console.error("Bulk delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
