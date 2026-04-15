import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/server/requestJson";

const prisma = new PrismaClient();

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const productId = searchParams.get('productId');

        if (!productId) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        const linkedSuppliers = await prisma.productSupplier.findMany({
            where: { productId: Number(productId) },
            include: {
                supplier: true
            }
        });

        return NextResponse.json(linkedSuppliers);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await readJsonBody(req);
        const { productId, supplierId, purchasePrice, discount } = body;

        if (!productId || !supplierId) {
            return NextResponse.json({ error: "Product ID and Supplier ID are required" }, { status: 400 });
        }

        const productSupplier = await prisma.productSupplier.upsert({
            where: {
                productId_supplierId: {
                    productId: Number(productId),
                    supplierId: Number(supplierId)
                }
            },
            update: {
                purchasePrice: Number(purchasePrice),
                discount: Number(discount) || 0
            },
            create: {
                productId: Number(productId),
                supplierId: Number(supplierId),
                purchasePrice: Number(purchasePrice),
                discount: Number(discount) || 0
            },
            include: {
                supplier: true,
                product: true
            }
        });

        return NextResponse.json(productSupplier);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
