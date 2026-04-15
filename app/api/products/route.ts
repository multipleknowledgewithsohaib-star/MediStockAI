import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ADMIN_ROLE, POS_ROLE } from "@/lib/auth/access";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createPricingSnapshot, normalizeDiscountActive, normalizeDiscountPercent } from "@/lib/server/productPricing";
import { readJsonBody } from "@/lib/server/requestJson";

export const dynamic = "force-dynamic";

const normalizeText = (value: unknown) => String(value ?? "").trim();

const normalizeItemCode = (value: unknown) => normalizeText(value).replace(/\s+/g, " ");

async function buildUniqueItemCode(requestedCode: string) {
    const baseCode = normalizeItemCode(requestedCode) || `PRD-${Date.now().toString().slice(-5)}`;
    let candidate = baseCode;
    let suffix = 1;

    while (await prisma.product.findUnique({ where: { item_code: candidate } })) {
        candidate = `${baseCode}-${suffix}`;
        suffix += 1;
    }

    return candidate;
}

export async function GET() {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE, POS_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const batchWhere = auth.user.role === POS_ROLE && auth.user.branchId
            ? { branchId: auth.user.branchId }
            : undefined;

        const products = await prisma.product.findMany({
            include: {
                aliases: true,
                pricingSnapshots: {
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                productSuppliers: {
                    include: {
                        supplier: true,
                    },
                },
                batches: {
                    where: batchWhere,
                    orderBy: { expiryDate: "asc" },
                    include: {
                        supplier: true,
                    },
                },
            },
            orderBy: { id: "desc" },
        });

        const normalizedProducts = products.map((product) => ({
            ...product,
            pricingSnapshotId: product.pricingSnapshots[0]?.id ?? null,
            stock: auth.user.role === POS_ROLE && auth.user.branchId
                ? product.batches.reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0)
                : product.stock,
        }));

        return NextResponse.json(normalizedProducts);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load products" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    let requestedItemCode = "";

    try {
        const body = await readJsonBody(req);
        const {
            name,
            brand,
            category,
            purchasePrice,
            salePrice,
            item_code,
            stock,
            stripsPerBox,
            tabletsPerStrip,
            unitsPerPack,
            discountPercent,
            isDiscountActive,
        } = body;

        const normalizedName = normalizeText(name);
        const normalizedBrand = normalizeText(brand);
        requestedItemCode = normalizeItemCode(item_code);

        if (!normalizedName) {
            return NextResponse.json({ error: "Product name is required" }, { status: 400 });
        }

        if (requestedItemCode) {
            const existingProduct = await prisma.product.findUnique({
                where: { item_code: requestedItemCode },
                include: {
                    pricingSnapshots: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
            });

            if (existingProduct) {
                return NextResponse.json({
                    ...existingProduct,
                    pricingSnapshotId: existingProduct.pricingSnapshots[0]?.id ?? null,
                    reusedExisting: true,
                });
            }
        }

        const finalItemCode = await buildUniqueItemCode(requestedItemCode);
        const normalizedDiscountPercent = normalizeDiscountPercent(discountPercent);
        const normalizedDiscountActive = normalizeDiscountActive(isDiscountActive, normalizedDiscountPercent);

        const product = await prisma.product.create({
            data: {
                name: normalizedName,
                brand: normalizedBrand || "Unknown Brand",
                category: normalizeText(category) || "Others",
                purchasePrice: Number(purchasePrice) || 0,
                salePrice: Number(salePrice) || 0,
                discountPercent: normalizedDiscountPercent,
                isDiscountActive: normalizedDiscountActive,
                item_code: finalItemCode,
                stock: Number(stock) || 0,
                stripsPerBox: Number(stripsPerBox) || 1,
                tabletsPerStrip: Number(tabletsPerStrip) || 1,
                unitsPerPack: Number(unitsPerPack) || (Number(stripsPerBox) > 0 && Number(tabletsPerStrip) > 0 ? Number(stripsPerBox) * Number(tabletsPerStrip) : 1),
            },
        });

        const pricingSnapshot = await createPricingSnapshot(product.id, {
            salePrice: product.salePrice,
            discountPercent: product.discountPercent,
            isDiscountActive: product.isDiscountActive,
        });

        return NextResponse.json({
            ...product,
            pricingSnapshotId: pricingSnapshot.id,
        });
    } catch (error: unknown) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            if (requestedItemCode) {
                const existingProduct = await prisma.product.findUnique({
                    where: { item_code: requestedItemCode },
                    include: {
                        pricingSnapshots: {
                            orderBy: { createdAt: "desc" },
                            take: 1,
                        },
                    },
                });

                if (existingProduct) {
                    return NextResponse.json({
                        ...existingProduct,
                        pricingSnapshotId: existingProduct.pricingSnapshots[0]?.id ?? null,
                        reusedExisting: true,
                    });
                }
            }
        }

        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to save product" }, { status: 500 });
    }
}
