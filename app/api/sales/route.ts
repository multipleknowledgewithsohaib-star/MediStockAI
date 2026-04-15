import { NextResponse } from "next/server";
import { ADMIN_ROLE, POS_ROLE } from "@/lib/auth/access";
import { isAdminUser, requireAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateSaleLineAmounts } from "@/lib/server/productPricing";

export const dynamic = "force-dynamic";

const buildInvoiceNumber = () => `INV-${Date.now()}`;

const DISALLOWED_OVERRIDE_FIELDS = [
    "price",
    "pricePerUnit",
    "manualPrice",
    "discountPercent",
    "discountAmount",
    "discountAmountAtSaleTime",
    "discountPercentAtSaleTime",
    "netAmount",
    "rateAtSaleTime",
] as const;

const hasDiscountOverrideAttempt = (item: Record<string, unknown>) =>
    DISALLOWED_OVERRIDE_FIELDS.some((fieldName) => item[fieldName] !== undefined);

export async function GET() {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE, POS_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const where = auth.user.role === POS_ROLE
            ? { createdById: auth.user.id }
            : undefined;

        const sales = await prisma.sale.findMany({
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

        return NextResponse.json(sales);
    } catch {
        return NextResponse.json({ error: "Failed to fetch sales" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const auth = await requireAuthenticatedUser([ADMIN_ROLE, POS_ROLE]);
    if ("response" in auth) {
        return auth.response;
    }

    try {
        const body = await req.json();
        const { items, paidAmount, branchId, invoiceNo } = body as {
            items?: Array<Record<string, unknown>>;
            paidAmount?: number;
            branchId?: number | null;
            invoiceNo?: string;
        };

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "At least one sale item is required." }, { status: 400 });
        }

        if (items.some((item) => hasDiscountOverrideAttempt(item))) {
            return NextResponse.json({ error: "Discount override attempts are not allowed." }, { status: 403 });
        }

        const normalizedBranchId = isAdminUser(auth.user)
            ? (Number.isInteger(Number(branchId)) ? Number(branchId) : auth.user.branchId)
            : auth.user.branchId;

        const result = await prisma.$transaction(async (tx) => {
            const normalizedItems: Array<{
                productId: number;
                batchId: number;
                pricingSnapshotId: number | null;
                quantity: number;
                rateAtSaleTime: number;
                discountPercentAtSaleTime: number;
                discountAmountAtSaleTime: number;
                netAmount: number;
                price: number;
                isPiece: boolean;
            }> = [];

            for (const rawItem of items) {
                const productId = Number(rawItem.productId);
                const quantity = Number(rawItem.quantity);
                const requestedBatchId = Number.isInteger(Number(rawItem.batchId)) ? Number(rawItem.batchId) : null;
                const requestedPricingSnapshotId = Number.isInteger(Number(rawItem.pricingSnapshotId))
                    ? Number(rawItem.pricingSnapshotId)
                    : null;

                if (!Number.isInteger(productId) || !(quantity > 0)) {
                    throw new Error("Each sale item needs valid product and quantity values.");
                }

                const product = await tx.product.findUnique({
                    where: { id: productId },
                    select: {
                        id: true,
                        stock: true,
                        salePrice: true,
                        discountPercent: true,
                        isDiscountActive: true,
                        unitsPerPack: true,
                    },
                });

                if (!product) {
                    throw new Error("One or more selected products are invalid.");
                }

                if ((product.stock || 0) < quantity) {
                    throw new Error("Selected product does not have enough stock.");
                }

                let pricingSnapshot = requestedPricingSnapshotId
                    ? await tx.productPricingSnapshot.findFirst({
                        where: {
                            id: requestedPricingSnapshotId,
                            productId,
                        },
                    })
                    : null;

                if (!pricingSnapshot) {
                    pricingSnapshot = await tx.productPricingSnapshot.findFirst({
                        where: { productId },
                        orderBy: { createdAt: "desc" },
                    });
                }

                // The backend is the source of truth for POS pricing and discount.
                // Even if the client is tampered with, we always recalculate from the saved product snapshot.
                const pricingSource = pricingSnapshot
                    ? {
                        salePrice: pricingSnapshot.salePrice,
                        discountPercent: pricingSnapshot.discountPercent,
                        isDiscountActive: pricingSnapshot.isDiscountActive,
                        unitsPerPack: product.unitsPerPack,
                    }
                    : {
                        salePrice: product.salePrice,
                        discountPercent: product.discountPercent,
                        isDiscountActive: product.isDiscountActive,
                        unitsPerPack: product.unitsPerPack,
                    };

                const lineAmounts = calculateSaleLineAmounts(pricingSource, quantity);

                let resolvedBatchId = requestedBatchId;

                if (!resolvedBatchId) {
                    const fallbackBatchNo = `SYSTEM-${productId}`;
                    const existingFallbackBatch = await tx.batch.findFirst({
                        where: {
                            productId,
                            batchNo: fallbackBatchNo,
                        },
                        orderBy: { id: "asc" },
                        select: {
                            id: true,
                            quantity: true,
                        },
                    });

                    if (existingFallbackBatch) {
                        if ((existingFallbackBatch.quantity || 0) < quantity) {
                            throw new Error("Selected product does not have enough stock.");
                        }

                        resolvedBatchId = existingFallbackBatch.id;
                    } else {
                        const createdFallbackBatch = await tx.batch.create({
                            data: {
                                batchNo: fallbackBatchNo,
                                expiryDate: new Date("2099-12-31T00:00:00.000Z"),
                                quantity: product.stock,
                                productId,
                                branchId: normalizedBranchId ?? null,
                            },
                            select: { id: true },
                        });

                        resolvedBatchId = createdFallbackBatch.id;
                    }
                }

                const batch = await tx.batch.findUnique({
                    where: { id: resolvedBatchId },
                    select: {
                        id: true,
                        quantity: true,
                        productId: true,
                    },
                });

                if (!batch || batch.productId !== productId || !Number.isInteger(batch.id)) {
                    throw new Error("One or more selected batches are invalid.");
                }

                if ((batch.quantity || 0) < quantity) {
                    throw new Error("Selected batch does not have enough stock.");
                }

                normalizedItems.push({
                    productId,
                    batchId: batch.id,
                    pricingSnapshotId: pricingSnapshot?.id ?? null,
                    quantity,
                    rateAtSaleTime: lineAmounts.unitRate,
                    discountPercentAtSaleTime: lineAmounts.appliedDiscountPercent,
                    discountAmountAtSaleTime: lineAmounts.discountAmountAtSaleTime,
                    netAmount: lineAmounts.netAmount,
                    price: lineAmounts.unitRate,
                    isPiece: quantity % Math.max(1, product.unitsPerPack || 1) !== 0,
                });
            }

            const computedDiscount = normalizedItems.reduce((sum, item) => sum + item.discountAmountAtSaleTime, 0);
            const computedTotal = normalizedItems.reduce((sum, item) => sum + item.netAmount, 0);
            const safePaidAmount = Number(paidAmount) > 0 ? Number(paidAmount) : computedTotal;
            const safeInvoiceNo = typeof invoiceNo === "string" && invoiceNo.trim()
                ? invoiceNo.trim()
                : buildInvoiceNumber();

            const sale = await tx.sale.create({
                data: {
                    invoiceNo: safeInvoiceNo,
                    total: computedTotal,
                    tax: 0,
                    discount: computedDiscount,
                    paidAmount: safePaidAmount,
                    changeAmount: safePaidAmount > computedTotal ? safePaidAmount - computedTotal : 0,
                    branchId: normalizedBranchId ?? null,
                    createdById: auth.user.id,
                    items: {
                        create: normalizedItems,
                    },
                },
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
            });

            for (const item of normalizedItems) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        },
                    },
                });

                await tx.batch.update({
                    where: { id: item.batchId },
                    data: {
                        quantity: {
                            decrement: item.quantity,
                        },
                    },
                });
            }

            return sale;
        });

        return NextResponse.json(result);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to process sale" }, { status: 500 });
    }
}
