import { useState, useEffect, useCallback } from 'react';
import { parseResponseJson } from './json';
import { storage } from './storage';
import {
    mockSales,
    mockProducts,
    mockSuppliers,
    mockBranches,
    mockPurchases,
    mockAlerts
} from '@/lib/mockData';
import { calculateDashboardStats, calculateFinanceSummary } from './financialCalculations';

const PLACEHOLDER_PRODUCT_NAMES = new Set([
    "unnamed product",
    "unknown product",
    "unknown medicine",
    "new product",
]);

const normalizeProductText = (value: any) => {
    if (typeof value === 'string') return value.trim();
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const toFiniteNumber = (value: any, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const hasExplicitNumberValue = (value: any) => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    return Number.isFinite(Number(value));
};

export const isPlaceholderProductRecord = (product: any) => {
    const name = normalizeProductText(product?.name).toLowerCase();
    if (!name) return true;
    return PLACEHOLDER_PRODUCT_NAMES.has(name);
};

const normalizeProductRecord = (product: any, allBatches: any[] = []) => {
    const productBatches = allBatches.filter((batch: any) => String(batch.productId) === String(product?.id));
    const resolvedBatches = productBatches.length > 0
        ? productBatches
        : (Array.isArray(product?.batches) ? product.batches : []);
    const batchStock = resolvedBatches.reduce((sum: number, batch: any) => sum + (Number(batch?.quantity) || 0), 0);
    const numericStock = toFiniteNumber(product?.stock, 0);
    const resolvedStock = resolvedBatches.length > 0
        ? batchStock
        : numericStock;

    return {
        ...product,
        item_code: normalizeProductText(product?.item_code),
        name: normalizeProductText(product?.name),
        brand: normalizeProductText(product?.brand),
        category: normalizeProductText(product?.category) || 'Others',
        purchasePrice: toFiniteNumber(product?.purchasePrice, 0),
        salePrice: toFiniteNumber(product?.salePrice, 0),
        discountPercent: toFiniteNumber(product?.discountPercent, 0),
        isDiscountActive: Boolean(product?.isDiscountActive),
        pricingSnapshotId: product?.pricingSnapshotId !== undefined && product?.pricingSnapshotId !== null
            ? Number(product.pricingSnapshotId)
            : (Array.isArray(product?.pricingSnapshots) && product.pricingSnapshots[0]?.id
                ? Number(product.pricingSnapshots[0].id)
                : undefined),
        unitsPerPack: Math.max(1, toFiniteNumber(product?.unitsPerPack, 1)),
        stripsPerBox: Math.max(0, toFiniteNumber(product?.stripsPerBox, 0)),
        tabletsPerStrip: Math.max(0, toFiniteNumber(product?.tabletsPerStrip, 0)),
        defaultDiscount: toFiniteNumber(product?.defaultDiscount, 0),
        batches: resolvedBatches,
        stock: resolvedStock,
        createdAt: typeof product?.createdAt === 'string' ? product.createdAt : undefined,
        updatedAt: typeof product?.updatedAt === 'string' ? product.updatedAt : undefined,
    };
};

const sanitizeProductSnapshot = (product: any) => ({
    ...product,
    item_code: normalizeProductText(product?.item_code),
    name: normalizeProductText(product?.name),
    brand: normalizeProductText(product?.brand),
    category: normalizeProductText(product?.category) || 'Others',
    purchasePrice: toFiniteNumber(product?.purchasePrice, 0),
    salePrice: toFiniteNumber(product?.salePrice, 0),
    discountPercent: toFiniteNumber(product?.discountPercent, 0),
    isDiscountActive: Boolean(product?.isDiscountActive),
    pricingSnapshotId: product?.pricingSnapshotId !== undefined && product?.pricingSnapshotId !== null
        ? Number(product.pricingSnapshotId)
        : undefined,
    stock: toFiniteNumber(product?.stock, 0),
    unitsPerPack: Math.max(1, toFiniteNumber(product?.unitsPerPack, 1)),
    stripsPerBox: Math.max(0, toFiniteNumber(product?.stripsPerBox, 0)),
    tabletsPerStrip: Math.max(0, toFiniteNumber(product?.tabletsPerStrip, 0)),
    defaultDiscount: toFiniteNumber(product?.defaultDiscount, 0),
    batches: Array.isArray(product?.batches) ? product.batches : undefined,
    createdAt: typeof product?.createdAt === 'string' ? product.createdAt : undefined,
    updatedAt: typeof product?.updatedAt === 'string' ? product.updatedAt : undefined,
});

const mergeProductSnapshots = (baseProduct: any, localProduct: any) => ({
    ...baseProduct,
    ...(() => {
        const localName = normalizeProductText(localProduct?.name);
        if (!localName || PLACEHOLDER_PRODUCT_NAMES.has(localName.toLowerCase())) {
            return {};
        }
        return { name: localName };
    })(),
    ...(normalizeProductText(localProduct?.item_code) ? { item_code: normalizeProductText(localProduct.item_code) } : {}),
    ...(normalizeProductText(localProduct?.brand) ? { brand: normalizeProductText(localProduct.brand) } : {}),
    ...(normalizeProductText(localProduct?.category) ? { category: normalizeProductText(localProduct.category) } : {}),
    ...(hasExplicitNumberValue(localProduct?.purchasePrice) ? { purchasePrice: Number(localProduct.purchasePrice) } : {}),
    ...(hasExplicitNumberValue(localProduct?.salePrice) ? { salePrice: Number(localProduct.salePrice) } : {}),
    ...(hasExplicitNumberValue(localProduct?.discountPercent) ? { discountPercent: Number(localProduct.discountPercent) } : {}),
    ...(localProduct?.isDiscountActive !== undefined ? { isDiscountActive: Boolean(localProduct.isDiscountActive) } : {}),
    ...(hasExplicitNumberValue(localProduct?.pricingSnapshotId) ? { pricingSnapshotId: Number(localProduct.pricingSnapshotId) } : {}),
    ...(hasExplicitNumberValue(localProduct?.stock) ? { stock: Number(localProduct.stock) } : {}),
    ...(() => {
        const unitsPerPack = Number(localProduct?.unitsPerPack);
        return hasExplicitNumberValue(localProduct?.unitsPerPack) && unitsPerPack > 0 ? { unitsPerPack } : {};
    })(),
    ...(() => {
        const stripsPerBox = Number(localProduct?.stripsPerBox);
        return hasExplicitNumberValue(localProduct?.stripsPerBox) && stripsPerBox > 0 ? { stripsPerBox } : {};
    })(),
    ...(() => {
        const tabletsPerStrip = Number(localProduct?.tabletsPerStrip);
        return hasExplicitNumberValue(localProduct?.tabletsPerStrip) && tabletsPerStrip > 0 ? { tabletsPerStrip } : {};
    })(),
    ...(() => {
        const defaultDiscount = Number(localProduct?.defaultDiscount);
        return hasExplicitNumberValue(localProduct?.defaultDiscount) && defaultDiscount >= 0 ? { defaultDiscount } : {};
    })(),
    ...(Array.isArray(localProduct?.batches) && localProduct.batches.length > 0 ? { batches: localProduct.batches } : {}),
    id: baseProduct.id,
});

const isSameProductRecord = (left: any, right: any) => {
    const leftCode = typeof left?.item_code === "string" ? left.item_code.trim().toLowerCase() : "";
    const rightCode = typeof right?.item_code === "string" ? right.item_code.trim().toLowerCase() : "";
    if (leftCode && rightCode && leftCode === rightCode) {
        return true;
    }

    const leftName = typeof left?.name === "string" ? left.name.trim().toLowerCase() : "";
    const rightName = typeof right?.name === "string" ? right.name.trim().toLowerCase() : "";
    return Boolean(leftName && rightName && leftName === rightName);
};

export function useData<T>(url: string) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        let key = '';
        let defaultData: any = [];
        const activeBranch = storage.get('activeBranch', null);
        const branchId = activeBranch?.id;

        // Try REAL API first for modern modules
        if (url.startsWith("/api/")) {
            try {
                const res = await fetch(url);
                if (res.ok) {
                    const jsonData = await parseResponseJson<any>(res, null);
                    if (jsonData === null) {
                        throw new Error(`Empty JSON response from ${url}`);
                    }
                    
                    // Post-processing for products (stock/batches)
                    if (url === "/api/products" || url === "/api/products/aliases") {
                        if (url === "/api/products") {
                            const allBatches = storage.get('batches', []);
                            const localProducts = storage.get('products', []);
                            
                            // Merge logic: Prioritize DB products, but keep unique local ones
                            const dbProducts = Array.isArray(jsonData) ? jsonData : [];
                            const mergedProducts = [...dbProducts];
                            
                            localProducts.forEach((lp: any) => {
                                const matchIndex = mergedProducts.findIndex(dp => isSameProductRecord(dp, lp));
                                if (matchIndex >= 0) {
                                    mergedProducts[matchIndex] = mergeProductSnapshots(mergedProducts[matchIndex], lp);
                                } else if (!isPlaceholderProductRecord(lp)) {
                                    mergedProducts.push(sanitizeProductSnapshot(lp));
                                }
                            });

                            const processed = mergedProducts.map((p: any) =>
                                normalizeProductRecord(p, allBatches)
                            );

                            // FINAL SORT: Latest first
                            processed.sort((a, b) => {
                                const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                                const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                                if (dateB !== dateA) return dateB - dateA;
                                // Fallback to ID comparison
                                return String(b.id).localeCompare(String(a.id));
                            });

                            try {
                                storage.setSilently('products', processed);
                            } catch (cacheError) {
                                console.warn("Product cache sync failed:", cacheError);
                            }
                            setData(processed as any);
                        } else {
                            setData(jsonData);
                        }
                    } else if (url === "/api/suppliers") {
                        // MERGE LOGIC for Suppliers: Combine DB with LocalStorage
                        const dbSuppliers = jsonData;
                        const localSuppliers = storage.get('suppliers', []);
                        const mergedSuppliers = [...dbSuppliers];

                        localSuppliers.forEach((ls: any) => {
                            const exists = mergedSuppliers.find(ds => 
                                ds.name?.toLowerCase() === ls.name?.toLowerCase()
                            );
                            if (!exists) {
                                mergedSuppliers.push(ls);
                            }
                        });
                        setData(mergedSuppliers as any);
                    } else if (url === "/api/sales" || url === "/api/invoices") {
                        setData(jsonData);
                    } else if (url === "/api/purchases") {
                        const dbPurchases = jsonData;
                        const localPurchases = storage.get('purchases', []);
                        const mergedPurchases = [...dbPurchases];

                        localPurchases.forEach((localPurchase: any) => {
                            const localInvoiceNo = localPurchase?.invoiceNo?.toLowerCase?.();
                            const matchIndex = mergedPurchases.findIndex((dbPurchase: any) =>
                                (dbPurchase?.invoiceNo?.toLowerCase?.() && localInvoiceNo && dbPurchase.invoiceNo.toLowerCase() === localInvoiceNo) ||
                                (dbPurchase?.id && localPurchase?.id && String(dbPurchase.id) === String(localPurchase.id))
                            );

                            if (matchIndex >= 0) {
                                const matchedPurchase = mergedPurchases[matchIndex];
                                mergedPurchases[matchIndex] = {
                                    ...matchedPurchase,
                                    ...localPurchase,
                                    id: matchedPurchase.id,
                                };
                            } else {
                                mergedPurchases.push(localPurchase);
                            }
                        });

                        setData(mergedPurchases as any);
                    } else if (url === "/api/finance" || url === "/api/reports") {
                        setData(calculateFinanceSummary(branchId === 'all' ? null : branchId) as any);
                    } else {
                        // Generic handler for all other API routes
                        setData(jsonData);
                    }
                    setLoading(false);
                    return;
                }

                if (res.status === 401 || res.status === 403) {
                    const payload = await parseResponseJson<any>(res, null);
                    setError(payload?.error || "You do not have access to this data.");
                    setData(null);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.warn(`API fetch failed for ${url}, falling back to storage:`, err);
            }
        }


        // LEGACY STORAGE LOGIC
        if (url.includes('products')) {
            key = 'products';
            defaultData = mockProducts;
        } else if (url.includes('sales')) {
            key = 'sales';
            defaultData = mockSales;
        } else if (url.includes('suppliers')) {
            key = 'suppliers';
            defaultData = mockSuppliers;
        } else if (url.includes('finance') || url.includes('reports')) {
            key = 'finance';
            defaultData = calculateFinanceSummary(branchId === 'all' ? null : branchId);
        } else if (url.includes('purchases')) {
            key = 'purchases';
            defaultData = mockPurchases;
        } else if (url.includes('alerts')) {
            key = 'alerts';
            defaultData = mockAlerts;
        } else if (url.includes('branches')) {
            key = 'branches';
            defaultData = mockBranches;
        } else if (url.includes('dashboard')) {
            key = 'dashboard';
            defaultData = calculateDashboardStats(branchId === 'all' ? null : branchId);
        } else if (url.includes('invoices')) {
            key = 'sales';
            defaultData = mockSales;
        } else if (url.includes('batches')) {
            key = 'batches';
            defaultData = [];
        }

        let storedData = key ? storage.get(key, defaultData) : defaultData;

        // Post-processing for filtering if needed
        const isGlobal = branchId === 'all';

        if (key === 'products') {
            const allBatches = storage.get('batches', []);
            storedData = (storedData as any[])
                .filter((product: any) => !isPlaceholderProductRecord(product))
                .map(p => {
                const normalizedProduct = normalizeProductRecord(p, allBatches);
                const productBatches = normalizedProduct.batches;
                
                // If a specific branch is selected, further filter for that branch
                const activeBatches = (branchId && !isGlobal) 
                    ? productBatches.filter((b: any) => b.branchId == branchId)
                    : productBatches;

                const batchStock = activeBatches.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
                
                return {
                    ...normalizedProduct,
                    batches: activeBatches,
                    stock: batchStock
                };
            });

            // If a specific branch is selected, only show products that HAVE batches in that branch
            if (branchId && !isGlobal) {
                storedData = (storedData as any[]).filter(p => p.batches.length > 0);
            }
        } else if (branchId && !isGlobal && key === 'sales') {
            storedData = (storedData as any[]).filter(s => s.branchId == branchId);
        } else if (branchId && !isGlobal && key === 'batches') {
            storedData = (storedData as any[]).filter(b => b.branchId == branchId);
        }

        setData(storedData);
        setLoading(false);
    }, [url]);


    useEffect(() => {
        fetchData();

        // Listen for storage changes to sync data across components
        window.addEventListener('jailwatch_storage_change', fetchData);
        return () => window.removeEventListener('jailwatch_storage_change', fetchData);
    }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
}
