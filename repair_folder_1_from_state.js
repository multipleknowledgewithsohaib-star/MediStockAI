const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const prisma = new PrismaClient();
const ROOT = process.cwd();
const STATE_FILE = path.join(ROOT, "folder_1_import_state.json");
const OVERRIDES_FILE = path.join(ROOT, "folder_1_manual_overrides.json");

function loadJson(filePath, fallback) {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
        throw new Error(`Could not parse ${path.basename(filePath)}: ${error.message}`);
    }
}

const state = loadJson(STATE_FILE, null);
const overrides = loadJson(OVERRIDES_FILE, {});

if (!state) {
    throw new Error("folder_1_import_state.json was not found.");
}

function cleanText(value, fallback = "") {
    const normalized = String(value || fallback).replace(/\s+/g, " ").trim();
    return normalized || fallback;
}

function keyText(value) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanItemCode(value) {
    return cleanText(value).replace(/[^A-Za-z0-9-]/g, "");
}

function shouldReplaceProductCode(currentCode, preferredCode) {
    const current = cleanItemCode(currentCode);
    const preferred = cleanItemCode(preferredCode);

    if (!preferred) {
        return false;
    }

    if (!current) {
        return true;
    }

    if (current === preferred) {
        return false;
    }

    return /^AUTO-/i.test(current) || /^IMP-/i.test(current);
}

function normalizeDate(value) {
    if (!value) return new Date().toISOString().slice(0, 10);
    const raw = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
}

function splitBatchAndExpiry(rawBatch, rawExpiry) {
    const batchValue = cleanText(rawBatch, "B-NEW");
    const explicitExpiry = rawExpiry ? normalizeDate(rawExpiry) : "";
    const combinedMatch = batchValue.match(/^(.*?)(?:\s*\/\s*|\s+)(\d{1,2})\s*-\s*(\d{2,4})$/);

    if (!combinedMatch) {
        return {
            batch: batchValue,
            expiry: explicitExpiry,
        };
    }

    const batchCode = cleanText(combinedMatch[1]).replace(/[/-]+$/, "").trim() || batchValue;
    const month = Number(combinedMatch[2]);
    let year = Number(combinedMatch[3]);
    if (year < 100) {
        year += 2000;
    }

    const batchExpiry = month >= 1 && month <= 12 && year >= 2000
        ? `${year}-${String(month).padStart(2, "0")}-01`
        : "";

    return {
        batch: batchCode,
        expiry: explicitExpiry || batchExpiry,
    };
}

function dateForDb(value, fallback = "2026-12-01") {
    const normalized = normalizeDate(value || fallback);
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed;
}

function getUniqueItemCode(name) {
    const prefix = keyText(name).slice(0, 5).toUpperCase() || "PRD";
    return `IMP-${prefix}-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(-3).toUpperCase()}`;
}

function getItemOverride(sourceFile, itemIndex) {
    const fileOverrides = overrides[sourceFile];
    if (!fileOverrides || typeof fileOverrides !== "object") {
        return null;
    }

    const override = fileOverrides[String(itemIndex)];
    return override && typeof override === "object" ? override : null;
}

function getInvoiceOverride(sourceFile) {
    const fileOverrides = overrides[sourceFile];
    if (!fileOverrides || typeof fileOverrides !== "object") {
        return null;
    }

    const override = fileOverrides._invoice || fileOverrides.invoice;
    return override && typeof override === "object" ? override : null;
}

function exactNameMatch(left, right) {
    return keyText(left) === keyText(right);
}

function invoiceNoMatchesStored(rawInvoiceNo, storedInvoiceNo) {
    const raw = cleanText(rawInvoiceNo);
    const stored = cleanText(storedInvoiceNo);

    if (!raw || !stored) {
        return false;
    }

    if (raw === stored) {
        return true;
    }

    return stored.startsWith(`${raw}-`) && /^\d+$/.test(stored.slice(raw.length + 1));
}

function explicitQtyLooksTrustworthy(qty, rate, netAmount, toleranceRatio = 0.15) {
    if (!(qty > 0) || !(rate > 0) || !(netAmount > 0) || qty > 200) {
        return false;
    }

    const expected = qty * rate;
    const tolerance = Math.max(3, expected * toleranceRatio, netAmount * toleranceRatio);
    return Math.abs(netAmount - expected) <= tolerance;
}

function inferQuantityFromNetAndRate(netAmount, rate, toleranceRatio = 0.15) {
    if (!(netAmount > 0) || !(rate > 0)) {
        return null;
    }

    const rawQty = netAmount / rate;
    const roundedQty = Math.round(rawQty);
    if (roundedQty <= 0 || roundedQty > 200) {
        return null;
    }

    const tolerance = Math.max(3, rate * toleranceRatio, netAmount * toleranceRatio);
    return Math.abs(netAmount - (roundedQty * rate)) <= tolerance ? roundedQty : null;
}

function currentQtyNeedsRepair(qty, rate, netAmount) {
    if (qty <= 0 || qty > 200) {
        return true;
    }

    return !explicitQtyLooksTrustworthy(qty, rate, netAmount, 0.25);
}

function normalizeRawStateItem(item, sourceFile, itemIndex) {
    const override = getItemOverride(sourceFile, itemIndex);
    const batchInfo = splitBatchAndExpiry(override?.batch || item.batch, override?.expiry || item.expiry);
    return {
        sourceFile,
        rawIndex: itemIndex,
        manual: Boolean(override),
        itemCode: cleanItemCode(override?.itemCode || item.itemCode || item.item_code),
        forceProductName: cleanText(override?.forceProductName || "", ""),
        name: cleanText(override?.name || override?.forceProductName || item.name, ""),
        qty: Math.max(0, Math.round(normalizeNumber(override?.qty ?? item.qty))),
        bonus: Math.max(0, Math.round(normalizeNumber(override?.bonus ?? item.bonus))),
        rate: normalizeNumber(override?.rate ?? item.rate),
        netAmount: normalizeNumber(override?.netAmount ?? item.netAmount),
        batch: batchInfo.batch,
        expiry: batchInfo.expiry || "2026-12-01",
    };
}

function buildRawGroup(invoiceState) {
    const items = [];
    let declaredTotal = 0;
    const invoiceMeta = {
        date: "",
        invoiceNo: "",
        supplyId: "",
    };

    for (const fileName of invoiceState.importedFiles || []) {
        const entry = state.files?.[fileName];
        if (!entry) {
            continue;
        }

        const invoiceOverride = getInvoiceOverride(fileName);
        if (invoiceOverride) {
            invoiceMeta.date = invoiceMeta.date || normalizeDate(invoiceOverride.date);
            invoiceMeta.invoiceNo = invoiceMeta.invoiceNo || cleanText(invoiceOverride.invoiceNo);
            invoiceMeta.supplyId = invoiceMeta.supplyId || cleanText(invoiceOverride.supplyId);
        }

        for (const invoice of entry.extractedInvoices || []) {
            if (!invoiceNoMatchesStored(invoice.invoiceNo, invoiceState.invoiceNoStored)) {
                continue;
            }

            declaredTotal = Math.max(declaredTotal, normalizeNumber(invoice.total));
            for (let itemIndex = 0; itemIndex < (invoice.items || []).length; itemIndex += 1) {
                items.push(normalizeRawStateItem(invoice.items[itemIndex], fileName, itemIndex));
            }
        }
    }

    return {
        items,
        declaredTotal,
        overrideDate: invoiceMeta.date,
        overrideInvoiceNo: invoiceMeta.invoiceNo,
        overrideSupplyId: invoiceMeta.supplyId,
    };
}

async function ensureProductByExactName(name, purchasePrice, preferredItemCode = "") {
    const existing = await prisma.product.findFirst({
        where: {
            name,
        },
    });

    if (existing) {
        if (shouldReplaceProductCode(existing.item_code, preferredItemCode)) {
            const updated = await prisma.product.update({
                where: { id: existing.id },
                data: { item_code: cleanItemCode(preferredItemCode) },
            });

            return {
                product: updated,
                created: false,
            };
        }

        return {
            product: existing,
            created: false,
        };
    }

    const product = await prisma.product.create({
        data: {
            item_code: cleanItemCode(preferredItemCode) || getUniqueItemCode(name),
            name,
            brand: "Imported",
            category: "Medicine",
            purchasePrice: purchasePrice > 0 ? purchasePrice : 0,
            salePrice: purchasePrice > 0 ? Number((purchasePrice * 1.15).toFixed(2)) : 0,
            stock: 0,
            unitsPerPack: 1,
        },
    });

    return {
        product,
        created: true,
    };
}

async function refreshProduct(productId) {
    const batches = await prisma.batch.findMany({
        where: { productId },
        select: { quantity: true },
    });
    const stock = batches.reduce((sum, batch) => sum + Math.max(0, batch.quantity || 0), 0);

    const pricedItems = await prisma.purchaseItem.findMany({
        where: {
            productId,
            price: { gt: 0 },
        },
        include: {
            purchase: {
                select: {
                    createdAt: true,
                },
            },
        },
    });

    pricedItems.sort((left, right) => {
        const createdDiff = new Date(right.purchase.createdAt).getTime() - new Date(left.purchase.createdAt).getTime();
        return createdDiff !== 0 ? createdDiff : right.id - left.id;
    });

    const latestPrice = pricedItems[0]?.price || 0;
    const update = { stock };

    if (latestPrice > 0) {
        update.purchasePrice = latestPrice;
        update.salePrice = Number((latestPrice * 1.15).toFixed(2));
    }

    await prisma.product.update({
        where: { id: productId },
        data: update,
    });
}

async function refreshProductSupplier(productId, supplierId, price) {
    if (!(productId > 0) || !(supplierId > 0) || !(price > 0)) {
        return;
    }

    await prisma.productSupplier.upsert({
        where: {
            productId_supplierId: {
                productId,
                supplierId,
            },
        },
        update: {
            purchasePrice: price,
        },
        create: {
            productId,
            supplierId,
            purchasePrice: price,
        },
    });
}

async function main() {
    const existingPurchases = await prisma.purchase.findMany({
        select: { id: true },
    });
    const existingPurchaseIds = new Set(existingPurchases.map((purchase) => purchase.id));

    const touchedProductIds = new Set();
    const touchedSupplierProducts = new Map();
    const summary = {
        purchasesScanned: 0,
        itemsUpdated: 0,
        purchasesRetotaled: 0,
        productsRefreshed: 0,
        createdProducts: 0,
        skippedPurchases: 0,
        samples: [],
    };

    for (const invoiceState of Object.values(state.invoices || {})) {
        if (!invoiceState.purchaseId || !existingPurchaseIds.has(invoiceState.purchaseId)) {
            continue;
        }

        const purchase = await prisma.purchase.findUnique({
            where: { id: invoiceState.purchaseId },
            include: {
                supplier: true,
                items: {
                    include: {
                        product: true,
                        batch: true,
                    },
                    orderBy: {
                        id: "asc",
                    },
                },
            },
        });

        if (!purchase) {
            continue;
        }

        const rawGroup = buildRawGroup(invoiceState);
        if (!rawGroup.items.length || rawGroup.items.length !== purchase.items.length) {
            summary.skippedPurchases += 1;
            continue;
        }

        summary.purchasesScanned += 1;
        let usedManualOverride = false;

        for (let index = 0; index < purchase.items.length; index += 1) {
            const dbItem = purchase.items[index];
            const rawItem = rawGroup.items[index];
            const trustedRaw = rawItem.manual || (rawItem.rate > 0 && exactNameMatch(rawItem.name, dbItem.product.name));

            if (!trustedRaw) {
                continue;
            }

            let targetProductId = dbItem.productId;
            let targetProductName = dbItem.product.name;

            if (rawItem.forceProductName || rawItem.itemCode) {
                const targetName = rawItem.forceProductName || rawItem.name;
                const forcedProduct = await ensureProductByExactName(targetName, rawItem.rate, rawItem.itemCode);
                if (forcedProduct.created) {
                    summary.createdProducts += 1;
                }
                targetProductId = forcedProduct.product.id;
                targetProductName = forcedProduct.product.name;
                touchedProductIds.add(forcedProduct.product.id);
                usedManualOverride = true;
            }

            const newPrice = rawItem.rate > 0 ? rawItem.rate : dbItem.price;
            const newNetAmount = rawItem.netAmount > 0 ? rawItem.netAmount : dbItem.netAmount;
            let newQty = dbItem.quantity;
            let newBonusQty = dbItem.bonusQty;

            if (rawItem.manual) {
                newQty = rawItem.qty;
                newBonusQty = rawItem.bonus;
                usedManualOverride = true;
            } else if (currentQtyNeedsRepair(dbItem.quantity, dbItem.price, dbItem.netAmount)) {
                if (explicitQtyLooksTrustworthy(rawItem.qty, newPrice, newNetAmount)) {
                    newQty = rawItem.qty;
                } else {
                    const inferredQty = inferQuantityFromNetAndRate(newNetAmount, newPrice);
                    if (inferredQty) {
                        newQty = inferredQty;
                    }
                }

                if (rawItem.bonus >= 0 && rawItem.bonus <= 50) {
                    newBonusQty = rawItem.bonus;
                }
            }

            const totalQty = Math.max(0, newQty + newBonusQty);
            const newEffectiveCost = totalQty > 0 ? Number((newNetAmount / totalQty).toFixed(4)) : newPrice;
            const currentPurchaseExpiry = dbItem.expiryDate ? normalizeDate(dbItem.expiryDate) : "";
            const currentBatchExpiry = dbItem.batch?.expiryDate ? normalizeDate(dbItem.batch.expiryDate) : "";

            const needsUpdate =
                targetProductId !== dbItem.productId ||
                newQty !== dbItem.quantity ||
                newBonusQty !== dbItem.bonusQty ||
                Math.abs(newPrice - dbItem.price) > 0.01 ||
                Math.abs(newNetAmount - dbItem.netAmount) > 0.01 ||
                Math.abs(newEffectiveCost - dbItem.effectiveCost) > 0.01 ||
                (rawItem.batch && rawItem.batch !== dbItem.batchNo) ||
                (rawItem.batch && rawItem.batch !== dbItem.batch.batchNo) ||
                (rawItem.expiry && rawItem.expiry !== currentPurchaseExpiry) ||
                (rawItem.expiry && rawItem.expiry !== currentBatchExpiry) ||
                totalQty !== dbItem.batch.quantity ||
                Math.abs((dbItem.batch.purchasePrice || 0) - newPrice) > 0.01;

            if (!needsUpdate) {
                continue;
            }

            await prisma.batch.update({
                where: { id: dbItem.batchId },
                data: {
                    productId: targetProductId,
                    batchNo: rawItem.batch || dbItem.batch.batchNo,
                    quantity: totalQty,
                    purchasePrice: newPrice,
                    expiryDate: dateForDb(rawItem.expiry, rawItem.expiry),
                },
            });

            await prisma.purchaseItem.update({
                where: { id: dbItem.id },
                data: {
                    productId: targetProductId,
                    quantity: newQty,
                    bonusQty: newBonusQty,
                    price: newPrice,
                    netAmount: newNetAmount,
                    effectiveCost: newEffectiveCost,
                    remarks: rawItem.manual ? "Manual invoice override applied" : dbItem.remarks,
                    batchNo: rawItem.batch || dbItem.batchNo,
                    expiryDate: rawItem.expiry || dbItem.expiryDate,
                },
            });

            summary.itemsUpdated += 1;
            touchedProductIds.add(dbItem.productId);
            touchedProductIds.add(targetProductId);
            touchedSupplierProducts.set(`${purchase.supplierId}:${targetProductId}`, {
                supplierId: purchase.supplierId,
                productId: targetProductId,
                price: newPrice,
            });

            if (summary.samples.length < 25) {
                summary.samples.push({
                    purchaseId: purchase.id,
                    invoiceNo: purchase.invoiceNo,
                    fromProduct: dbItem.product.name,
                    toProduct: targetProductName,
                    rawName: rawItem.name,
                    quantity: `${dbItem.quantity} -> ${newQty}`,
                    unitPrice: `${dbItem.price} -> ${newPrice}`,
                    netAmount: `${dbItem.netAmount} -> ${newNetAmount}`,
                });
            }
        }

        if (usedManualOverride && rawGroup.declaredTotal > 0 && Math.abs(rawGroup.declaredTotal - purchase.total) > 0.01) {
            await prisma.purchase.update({
                where: { id: purchase.id },
                data: {
                    total: rawGroup.declaredTotal,
                },
            });
            summary.purchasesRetotaled += 1;
        }

        if (rawGroup.overrideDate && rawGroup.overrideDate !== purchase.date.toISOString().slice(0, 10)) {
            await prisma.purchase.update({
                where: { id: purchase.id },
                data: {
                    date: dateForDb(rawGroup.overrideDate, rawGroup.overrideDate),
                },
            });
        }
    }

    for (const touched of touchedSupplierProducts.values()) {
        await refreshProductSupplier(touched.productId, touched.supplierId, touched.price);
    }

    for (const productId of touchedProductIds) {
        await refreshProduct(productId);
        summary.productsRefreshed += 1;
    }

    console.log(JSON.stringify(summary, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
