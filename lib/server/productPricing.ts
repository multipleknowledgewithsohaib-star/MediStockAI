import { prisma } from "@/lib/prisma";

type ProductPricingInput = {
    salePrice: number;
    discountPercent: number;
    isDiscountActive: boolean;
    unitsPerPack: number;
};

export function normalizeDiscountPercent(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return Math.min(100, Math.max(0, parsed));
}

export function normalizeDiscountActive(value: unknown, discountPercent: number) {
    if (typeof value === "boolean") {
        return value && discountPercent > 0;
    }

    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        return ["true", "1", "on", "yes"].includes(normalized) && discountPercent > 0;
    }

    return discountPercent > 0;
}

export async function createPricingSnapshot(productId: number, pricing: Pick<ProductPricingInput, "salePrice" | "discountPercent" | "isDiscountActive">) {
    return prisma.productPricingSnapshot.create({
        data: {
            productId,
            salePrice: pricing.salePrice,
            discountPercent: pricing.discountPercent,
            isDiscountActive: pricing.isDiscountActive,
        },
    });
}

export function calculateUnitPricing(pricing: ProductPricingInput) {
    const unitsPerPack = Math.max(1, Number(pricing.unitsPerPack) || 1);
    const unitRate = Number(pricing.salePrice) / unitsPerPack;
    const appliedDiscountPercent = pricing.isDiscountActive ? normalizeDiscountPercent(pricing.discountPercent) : 0;
    const unitDiscountAmount = (unitRate * appliedDiscountPercent) / 100;
    const unitNetRate = unitRate - unitDiscountAmount;

    return {
        unitRate,
        appliedDiscountPercent,
        unitDiscountAmount,
        unitNetRate,
    };
}

export function calculateSaleLineAmounts(pricing: ProductPricingInput, quantity: number) {
    const safeQuantity = Math.max(0, Number(quantity) || 0);
    const unitPricing = calculateUnitPricing(pricing);
    const discountAmountAtSaleTime = unitPricing.unitDiscountAmount * safeQuantity;
    const netAmount = unitPricing.unitNetRate * safeQuantity;

    return {
        ...unitPricing,
        discountAmountAtSaleTime,
        netAmount,
    };
}
