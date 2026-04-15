import { NextResponse } from "next/server";
import { ADMIN_ROLE, POS_ROLE } from "@/lib/auth/access";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createPricingSnapshot, normalizeDiscountActive, normalizeDiscountPercent } from "@/lib/server/productPricing";
import { readJsonBody } from "@/lib/server/requestJson";

const parseProductId = (idParam: string) => {
    const id = parseInt(idParam, 10);
    return Number.isNaN(id) ? null : id;
};

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE, POS_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const { id: idParam } = await params;
        const id = parseProductId(idParam);

        if (id === null) {
            return NextResponse.json({ error: "Invalid Product ID" }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                aliases: true,
                pricingSnapshots: {
                    orderBy: { createdAt: "desc" },
                    take: 5,
                },
                productSuppliers: {
                    include: {
                        supplier: true,
                    },
                },
                batches: {
                    orderBy: { expiryDate: "asc" },
                    include: {
                        supplier: true,
                    },
                },
            },
        });

        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...product,
            pricingSnapshotId: product.pricingSnapshots[0]?.id ?? null,
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch product" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const { id: idParam } = await params;
        const id = parseProductId(idParam);

        if (id === null) {
            return NextResponse.json({ error: "Invalid Product ID" }, { status: 400 });
        }

        await prisma.product.delete({
            where: { id },
        });

        return NextResponse.json({ success: true, message: "Product deleted from database" });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete product" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const { id: idParam } = await params;
        const id = parseProductId(idParam);
        const body = await readJsonBody(req);

        if (id === null) {
            return NextResponse.json({ error: "Invalid Product ID" }, { status: 400 });
        }

        const existingProduct = await prisma.product.findUnique({
            where: { id },
            select: {
                id: true,
                salePrice: true,
                discountPercent: true,
                isDiscountActive: true,
            },
        });

        if (!existingProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const normalizedDiscountPercent = body.discountPercent !== undefined
            ? normalizeDiscountPercent(body.discountPercent)
            : existingProduct.discountPercent;
        const normalizedDiscountActive = body.isDiscountActive !== undefined
            ? normalizeDiscountActive(body.isDiscountActive, normalizedDiscountPercent)
            : existingProduct.isDiscountActive;

        const updatedProduct = await prisma.product.update({
            where: { id },
            data: {
                item_code: body.item_code !== undefined ? String(body.item_code).trim() : undefined,
                name: body.name !== undefined ? String(body.name).trim() : undefined,
                brand: body.brand !== undefined ? String(body.brand).trim() : undefined,
                category: body.category !== undefined ? String(body.category).trim() : undefined,
                stock: body.stock !== undefined ? Number(body.stock) : undefined,
                purchasePrice: body.purchasePrice !== undefined ? Number(body.purchasePrice) : undefined,
                salePrice: body.salePrice !== undefined ? Number(body.salePrice) : undefined,
                discountPercent: normalizedDiscountPercent,
                isDiscountActive: normalizedDiscountActive,
                stripsPerBox: body.stripsPerBox !== undefined ? Number(body.stripsPerBox) : undefined,
                tabletsPerStrip: body.tabletsPerStrip !== undefined ? Number(body.tabletsPerStrip) : undefined,
                unitsPerPack: body.unitsPerPack !== undefined
                    ? Number(body.unitsPerPack)
                    : (body.stripsPerBox !== undefined && body.tabletsPerStrip !== undefined
                        ? Number(body.stripsPerBox) * Number(body.tabletsPerStrip)
                        : undefined),
            },
        });

        const pricingChanged =
            body.salePrice !== undefined ||
            body.discountPercent !== undefined ||
            body.isDiscountActive !== undefined;

        let pricingSnapshotId: number | null = null;

        if (pricingChanged) {
            const snapshot = await createPricingSnapshot(updatedProduct.id, {
                salePrice: updatedProduct.salePrice,
                discountPercent: updatedProduct.discountPercent,
                isDiscountActive: updatedProduct.isDiscountActive,
            });
            pricingSnapshotId = snapshot.id;
        }

        return NextResponse.json({
            ...updatedProduct,
            pricingSnapshotId,
        });
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update product" }, { status: 500 });
    }
}
