"use client";

const isQuotaExceededError = (error: unknown) =>
    error instanceof DOMException &&
    (
        error.name === "QuotaExceededError" ||
        error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        error.code === 22 ||
        error.code === 1014
    );

const buildProductStorageKey = (product: any, index: number) => {
    const idPart = product?.id !== undefined && product?.id !== null ? String(product.id) : "";
    const itemCodePart = typeof product?.item_code === "string" ? product.item_code.trim().toLowerCase() : "";
    const namePart = typeof product?.name === "string" ? product.name.trim().toLowerCase() : "";
    return idPart || itemCodePart || namePart || `product-${index}`;
};

const toStringValue = (value: any) => {
    if (typeof value === "string") return value;
    if (value === undefined || value === null) return "";
    return String(value);
};

const toNumberValue = (value: any) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const getRecentTimestamp = (record: any) => {
    const candidates = [record?.createdAt, record?.purchaseDate, record?.date];

    for (const candidate of candidates) {
        if (typeof candidate !== "string" || !candidate.trim()) continue;
        const parsed = Date.parse(candidate);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }

    const numericId = Number(record?.id);
    return Number.isFinite(numericId) && numericId > 0 ? numericId : null;
};

const orderByRecency = (records: any[]) => {
    return records
        .map((record, index) => ({
            record,
            index,
            timestamp: getRecentTimestamp(record)
        }))
        .sort((left, right) => {
            if (left.timestamp !== null && right.timestamp !== null && left.timestamp !== right.timestamp) {
                return right.timestamp - left.timestamp;
            }

            if (left.timestamp !== null && right.timestamp === null) return -1;
            if (left.timestamp === null && right.timestamp !== null) return 1;

            return left.index - right.index;
        })
        .map(({ record }) => record);
};

const compactProductsForStorage = (products: any[]) => {
    const compacted: any[] = [];
    const seen = new Set<string>();

    products.forEach((product, index) => {
        const key = buildProductStorageKey(product, index);
        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        compacted.push({
            id: product?.id,
            item_code: typeof product?.item_code === "string" ? product.item_code : "",
            name: typeof product?.name === "string" ? product.name : "",
            brand: typeof product?.brand === "string" ? product.brand : "",
            category: typeof product?.category === "string" ? product.category : "",
            purchasePrice: Number(product?.purchasePrice) || 0,
            salePrice: Number(product?.salePrice) || 0,
            discountPercent: Number(product?.discountPercent) || 0,
            isDiscountActive: Boolean(product?.isDiscountActive),
            pricingSnapshotId: product?.pricingSnapshotId !== undefined && product?.pricingSnapshotId !== null
                ? Number(product.pricingSnapshotId)
                : undefined,
            stock: Number(product?.stock) || 0,
            unitsPerPack: Number(product?.unitsPerPack) || 1,
            stripsPerBox: Number(product?.stripsPerBox) || 0,
            tabletsPerStrip: Number(product?.tabletsPerStrip) || 0,
            defaultDiscount: Number(product?.defaultDiscount) || 0,
            createdAt: typeof product?.createdAt === "string" ? product.createdAt : undefined,
            updatedAt: typeof product?.updatedAt === "string" ? product.updatedAt : undefined
        });
    });

    return compacted;
};

const compactPurchasesForStorage = (purchases: any[]) => {
    return purchases.map((purchase: any, index: number) => {
        const compactedItems = Array.isArray(purchase?.items)
            ? purchase.items.map((item: any, itemIndex: number) => ({
                  id: item?.id ?? `${purchase?.id ?? index}-${itemIndex}`,
                  productId: toStringValue(item?.productId),
                  itemCode: toStringValue(item?.itemCode),
                  name: toStringValue(item?.name),
                  packing: toStringValue(item?.packing),
                  batchNo: toStringValue(item?.batchNo),
                  mfgDate: toStringValue(item?.mfgDate),
                  expiryDate: toStringValue(item?.expiryDate),
                  purchQty: toNumberValue(item?.purchQty ?? item?.quantity),
                  quantity: toNumberValue(item?.quantity ?? item?.purchQty),
                  bonusQty: toNumberValue(item?.bonusQty),
                  totalQty: toNumberValue(
                      item?.totalQty ??
                      toNumberValue(item?.quantity ?? item?.purchQty) + toNumberValue(item?.bonusQty)
                  ),
                  purchasePrice: toNumberValue(item?.purchasePrice),
                  discountPercent: toNumberValue(item?.discountPercent),
                  furtherTaxAmount: toNumberValue(item?.furtherTaxAmount),
                  netAmount: toNumberValue(item?.netAmount)
              }))
            : [];

        return {
            id: purchase?.id,
            invoiceNo: toStringValue(purchase?.invoiceNo),
            date: toStringValue(purchase?.date),
            createdAt: toStringValue(purchase?.createdAt) || undefined,
            supplier: {
                id: toStringValue(purchase?.supplier?.id ?? purchase?.supplierId),
                name: toStringValue(purchase?.supplier?.name)
            },
            supplierId: toStringValue(purchase?.supplierId) || undefined,
            branchId: purchase?.branchId ?? undefined,
            total: toNumberValue(purchase?.total),
            items: compactedItems
        };
    });
};

const compactBatchesForStorage = (batches: any[]) => {
    return batches.map((batch: any, index: number) => ({
        id: batch?.id ?? `batch-${index}`,
        productId: toStringValue(batch?.productId),
        batchNo: toStringValue(batch?.batchNo),
        packing: toStringValue(batch?.packing),
        mfgDate: toStringValue(batch?.mfgDate),
        manufacturingDate: toStringValue(batch?.manufacturingDate),
        expiryDate: toStringValue(batch?.expiryDate),
        quantity: toNumberValue(batch?.quantity),
        mrp: batch?.mrp !== undefined && batch?.mrp !== null && batch?.mrp !== "" ? toNumberValue(batch.mrp) : undefined,
        rate: batch?.rate !== undefined && batch?.rate !== null && batch?.rate !== "" ? toNumberValue(batch.rate) : toNumberValue(batch?.purchasePrice),
        purchasePrice: batch?.purchasePrice !== undefined && batch?.purchasePrice !== null && batch?.purchasePrice !== "" ? toNumberValue(batch.purchasePrice) : toNumberValue(batch?.rate),
        discountPercent: toNumberValue(batch?.discountPercent),
        purchaseDate: toStringValue(batch?.purchaseDate) || undefined,
        createdAt: toStringValue(batch?.createdAt) || undefined,
        purchaseId: toStringValue(batch?.purchaseId) || undefined,
        supplierId: toStringValue(batch?.supplierId) || undefined,
        supplier: batch?.supplier
            ? {
                  id: toStringValue(batch?.supplier?.id ?? batch?.supplierId),
                  name: toStringValue(batch?.supplier?.name)
              }
            : undefined,
        branchId: batch?.branchId ?? undefined
    }));
};

const getFallbackSizes = (length: number) => {
    return [length, 500, 250, 100, 50, 25, 10, 5, 1].filter((size, index, list) => size > 0 && list.indexOf(size) === index);
};

const compactStorageValue = (key: string, value: any) => {
    if (!Array.isArray(value)) {
        return value;
    }

    if (key === "products") {
        return compactProductsForStorage(value);
    }

    if (key === "purchases") {
        return compactPurchasesForStorage(value);
    }

    if (key === "batches") {
        return compactBatchesForStorage(value);
    }

    return value;
};

export const storage = {
    get: (key: string, defaultValue: any = []) => {
        if (typeof window === 'undefined') return defaultValue;
        const storageKey = `jailwatch_clean_${key}`;
        const stored = localStorage.getItem(storageKey);
        if (!stored) return defaultValue;
        try {
            const normalized = stored.trim();
            if (!normalized || normalized === "undefined") {
                localStorage.removeItem(storageKey);
                return defaultValue;
            }

            return JSON.parse(normalized);
        } catch (e) {
            console.error(`Error parsing localStorage key: ${storageKey}`, e);
            localStorage.removeItem(storageKey);
            return defaultValue;
        }
    },
    set: (key: string, value: any) => {
        if (typeof window === 'undefined') return;
        const storageKey = `jailwatch_clean_${key}`;
        const notifyChange = () => window.dispatchEvent(new Event('jailwatch_storage_change'));

        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
            notifyChange();
            return;
        } catch (error) {
            if (!isQuotaExceededError(error)) {
                throw error;
            }
        }

        const compactedValue = compactStorageValue(key, value);
        if (Array.isArray(compactedValue)) {
            try {
                localStorage.setItem(storageKey, JSON.stringify(compactedValue));
                console.warn(`Storage quota reached for ${storageKey}. Saved compacted ${key} snapshot.`);
                notifyChange();
                return;
            } catch (error) {
                if (!isQuotaExceededError(error)) {
                    throw error;
                }
            }

            const orderedValue = orderByRecency(compactedValue);
            for (const size of getFallbackSizes(orderedValue.length)) {
                try {
                    localStorage.setItem(storageKey, JSON.stringify(orderedValue.slice(0, size)));
                    console.warn(`Storage quota reached for ${storageKey}. Saved compacted ${key} snapshot (${size} items).`);
                    notifyChange();
                    return;
                } catch (retryError) {
                    if (!isQuotaExceededError(retryError)) {
                        throw retryError;
                    }
                }
            }
        }

        throw new Error(`Storage quota exceeded while saving ${storageKey}.`);
    },
    setSilently: (key: string, value: any) => {
        if (typeof window === 'undefined') return;
        const storageKey = `jailwatch_clean_${key}`;
        const compactedValue = compactStorageValue(key, value);
        localStorage.setItem(storageKey, JSON.stringify(compactedValue));
    }
};
