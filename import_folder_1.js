const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();

const prisma = new PrismaClient();

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "1");
const STATE_FILE = path.join(ROOT, "folder_1_import_state.json");
const LOG_FILE = path.join(ROOT, "folder_1_import.log");
const OVERRIDES_FILE = path.join(ROOT, "folder_1_manual_overrides.json");
const OCR_ENDPOINT = process.env.FOLDER_IMPORT_OCR_URL || "http://localhost:3000/api/ocr/invoice";
const DEFAULT_DELAY_MS = Number(process.env.FOLDER_IMPORT_DELAY_MS || 2000);
const RETRY_DELAY_MS = Number(process.env.FOLDER_IMPORT_RETRY_DELAY_MS || 15000);
const MAX_ATTEMPTS = Number(process.env.FOLDER_IMPORT_MAX_ATTEMPTS || 3);
const ITEM_OVERRIDES = loadItemOverrides();

const args = process.argv.slice(2);
const limitIndex = args.indexOf("--limit");
const LIMIT = limitIndex >= 0 ? Number(args[limitIndex + 1] || 0) || Infinity : Infinity;
const onlyFailed = args.includes("--only-failed");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadItemOverrides() {
    if (!fs.existsSync(OVERRIDES_FILE)) {
        return {};
    }

    try {
        const parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        console.warn(`Could not parse item overrides file: ${error.message}`);
        return {};
    }
}

function getItemOverride(sourceFile, itemIndex) {
    const fileOverrides = ITEM_OVERRIDES[sourceFile];
    if (!fileOverrides || typeof fileOverrides !== "object") {
        return null;
    }

    const override = fileOverrides[String(itemIndex)];
    return override && typeof override === "object" ? override : null;
}

function getInvoiceOverride(sourceFile) {
    const fileOverrides = ITEM_OVERRIDES[sourceFile];
    if (!fileOverrides || typeof fileOverrides !== "object") {
        return null;
    }

    const override = fileOverrides._invoice || fileOverrides.invoice;
    return override && typeof override === "object" ? override : null;
}

function now() {
    return new Date().toISOString();
}

function log(message) {
    const line = `[${now()}] ${message}`;
    console.log(line);
    fs.appendFileSync(LOG_FILE, `${line}\n`);
}

function loadState() {
    if (!fs.existsSync(STATE_FILE)) {
        return {
            version: 1,
            startedAt: now(),
            files: {},
            invoices: {},
            summary: {
                processedFiles: 0,
                failedFiles: 0,
                importedInvoices: 0,
                createdProducts: 0,
                matchedProducts: 0,
            },
        };
    }

    try {
        return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch (error) {
        throw new Error(`Could not parse state file: ${error.message}`);
    }
}

function saveState(state) {
    state.updatedAt = now();
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function extractSequence(fileName) {
    const match = fileName.match(/_(\d+)\.[a-z]+$/i);
    return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function sortFiles(files) {
    return [...files].sort((left, right) => {
        const sequenceDiff = extractSequence(left) - extractSequence(right);
        return sequenceDiff !== 0 ? sequenceDiff : left.localeCompare(right);
    });
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

    const parts = raw.split(/[\/.\-]/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 3) {
        let [first, second, third] = parts;
        if (third.length === 2) {
            third = `20${third}`;
        }

        if (first.length === 4) {
            return `${first}-${second.padStart(2, "0")}-${third.padStart(2, "0")}`;
        }

        const dayFirst = Number(first) > 12;
        const day = dayFirst ? first : second;
        const month = dayFirst ? second : first;
        return `${third}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
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

function buildImageDataUrl(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const mimeType = extension === ".png" ? "image/png" : "image/jpeg";
    const buffer = fs.readFileSync(filePath);
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function ensureArray(value) {
    return Array.isArray(value) ? value : [];
}

function calculateNetAmount(item) {
    const qty = normalizeNumber(item.qty);
    const bonus = normalizeNumber(item.bonus);
    const rate = normalizeNumber(item.rate);
    const discountPercent = normalizeNumber(item.discountPercent);
    const gstPercent = normalizeNumber(item.gstPercent);
    const furtherTaxPercent = normalizeNumber(item.furtherTaxPercent);
    const nonAtlTaxPercent = normalizeNumber(item.nonAtlTaxPercent);
    const advanceTaxPercent = normalizeNumber(item.advanceTaxPercent);

    const gross = qty * rate;
    const discounted = gross - (gross * discountPercent) / 100;
    const gstAmount = (discounted * gstPercent) / 100;
    const furtherTaxAmount = (discounted * furtherTaxPercent) / 100;
    const invoiceAmount = discounted + gstAmount + furtherTaxAmount;
    const advTaxAmount = (invoiceAmount * advanceTaxPercent) / 100;
    const nonAtlAmount = (invoiceAmount * nonAtlTaxPercent) / 100;

    const explicitNet = normalizeNumber(item.net ?? item.netAmount, NaN);
    if (Number.isFinite(explicitNet) && explicitNet > 0) {
        return explicitNet;
    }

    const totalQty = qty + bonus;
    if (totalQty <= 0) {
        return invoiceAmount + advTaxAmount + nonAtlAmount;
    }

    return invoiceAmount + advTaxAmount + nonAtlAmount;
}

function explicitQtyLooksTrustworthy(qty, rate, netAmount, toleranceRatio = 0.15) {
    if (!(qty > 0) || !(rate > 0) || !(netAmount > 0) || qty > 200) {
        return false;
    }

    const expected = qty * rate;
    const tolerance = Math.max(3, expected * toleranceRatio, netAmount * toleranceRatio);
    return Math.abs(netAmount - expected) <= tolerance;
}

function normalizeItem(rawItem, sourceFile, itemIndex) {
    const override = getItemOverride(sourceFile, itemIndex);
    const itemCode = cleanItemCode(override?.itemCode || rawItem.itemCode || rawItem.item_code);
    const name = cleanText(override?.name || override?.forceProductName || rawItem.name, "");
    let qty = Math.max(0, Math.round(normalizeNumber(override?.qty ?? rawItem.qty)));
    let bonus = Math.max(0, Math.round(normalizeNumber(override?.bonus ?? rawItem.bonus)));
    const rate = normalizeNumber(override?.rate ?? rawItem.rate);
    const netAmount = normalizeNumber(override?.netAmount, NaN);
    const lineNet = Number.isFinite(netAmount) && netAmount > 0 ? netAmount : calculateNetAmount(rawItem);
    const batchInfo = splitBatchAndExpiry(override?.batch || rawItem.batch, override?.expiry || rawItem.expiry);
    let remarks = "";

    if (override) {
        remarks = "Manual invoice override";
    }

    // When OCR cannot read the unit rate, invoice scans often confuse amount columns with quantity.
    if (rate <= 0 && lineNet > 0) {
        qty = 0;
        bonus = 0;
        remarks = cleanText(`${remarks} Amount-only OCR import`, "Amount-only OCR import");
    }

    if (qty > 0 && rate > 0 && !explicitQtyLooksTrustworthy(qty, rate, lineNet)) {
        qty = 0;
        remarks = cleanText(`${remarks} Ignored suspicious OCR qty`, "Ignored suspicious OCR qty");
    }

    if (qty <= 0 && rate > 0 && lineNet > 0) {
        const inferredQty = inferQuantityFromNetAndRate(lineNet, rate, 0.15);
        if (inferredQty) {
            qty = inferredQty;
            remarks = cleanText(`${remarks} Qty inferred from TP and line total`, "Qty inferred from TP and line total");
        }
    }

    const totalQty = qty + bonus;

    return {
        sourceFile,
        itemCode,
        name,
        batch: batchInfo.batch,
        qty,
        bonus,
        rate,
        discountPercent: normalizeNumber(rawItem.discountPercent),
        gstPercent: normalizeNumber(rawItem.gstPercent),
        furtherTaxPercent: normalizeNumber(rawItem.furtherTaxPercent),
        nonAtlTaxPercent: normalizeNumber(rawItem.nonAtlTaxPercent),
        advanceTaxPercent: normalizeNumber(rawItem.advanceTaxPercent),
        netAmount: lineNet,
        expiry: batchInfo.expiry || "2026-12-01",
        mfgDate: override?.mfgDate ? normalizeDate(override.mfgDate) : rawItem.mfgDate ? normalizeDate(rawItem.mfgDate) : null,
        effectiveCost: totalQty > 0 ? Number((lineNet / totalQty).toFixed(4)) : rate,
        remarks,
    };
}

function inferQuantityFromNetAndRate(netAmount, rate, toleranceRatio = 0.03) {
    if (!(netAmount > 0) || !(rate > 0)) {
        return null;
    }

    const rawQty = netAmount / rate;
    const roundedQty = Math.round(rawQty);
    if (roundedQty <= 0 || roundedQty > 500) {
        return null;
    }

    const tolerance = Math.max(1.5, rate * toleranceRatio, netAmount * toleranceRatio);
    return Math.abs(netAmount - (roundedQty * rate)) <= tolerance ? roundedQty : null;
}

function repairItemUsingProductHistory(item, product) {
    const repaired = { ...item };
    const trustedRate = normalizeNumber(product?.purchasePrice, 0);
    const lineNet = normalizeNumber(repaired.netAmount, 0);
    let remarks = cleanText(repaired.remarks || "");

    if (repaired.qty > 0 && repaired.rate > 0 && !explicitQtyLooksTrustworthy(repaired.qty, repaired.rate, lineNet)) {
        repaired.qty = 0;
        remarks = cleanText(`${remarks} Rejected suspicious OCR qty`, "Rejected suspicious OCR qty");
    }

    if (repaired.qty <= 0 && repaired.rate > 0 && lineNet > 0) {
        const inferredQty = inferQuantityFromNetAndRate(lineNet, repaired.rate, 0.15);
        if (inferredQty) {
            repaired.qty = inferredQty;
            remarks = cleanText(`${remarks} Qty repaired from OCR TP and line total`, "Qty repaired from OCR TP and line total");
        }
    }

    if (repaired.qty <= 0 && lineNet > 0 && trustedRate > 0) {
        const inferredQty = inferQuantityFromNetAndRate(lineNet, trustedRate, 0.12);
        if (inferredQty) {
            repaired.qty = inferredQty;
            repaired.rate = trustedRate;
            remarks = cleanText(`${remarks} TP/Qty repaired from product price history`, "TP/Qty repaired from product price history");
        }
    }

    if (repaired.qty > 0 && repaired.rate <= 0 && lineNet > 0) {
        const inferredRate = Number((lineNet / repaired.qty).toFixed(2));
        if (Number.isFinite(inferredRate) && inferredRate > 0) {
            repaired.rate = inferredRate;
            remarks = cleanText(`${remarks} TP repaired from line total`, "TP repaired from line total");
        }
    }

    if (repaired.qty > 0 && repaired.rate > 0 && lineNet > 0) {
        const inferredQty = inferQuantityFromNetAndRate(lineNet, repaired.rate, 0.15);
        if (inferredQty && inferredQty !== repaired.qty) {
            repaired.qty = inferredQty;
            remarks = cleanText(`${remarks} Qty aligned with TP and line total`, "Qty aligned with TP and line total");
        }
    }

    const totalQty = Math.max(0, repaired.qty + repaired.bonus);
    repaired.effectiveCost = totalQty > 0 ? Number((lineNet / totalQty).toFixed(4)) : repaired.rate;
    repaired.remarks = remarks;

    return repaired;
}

function shouldKeepItem(item, supplierName) {
    const normalizedName = keyText(item.name);
    const normalizedSupplier = keyText(supplierName);
    const looksLikeHeader = [
        "invoice",
        "description",
        "batch",
        "expiry",
        "amount",
        "netamount",
        "grossamount",
        "discount",
        "subtotal",
        "remarks",
    ].includes(normalizedName);

    const looksLikeCompany = /(private|pvt|limited|ltd|pharmaceutical|pharma|sales)/i.test(item.name);
    const emptyFinancials = item.netAmount <= 0 && item.rate <= 0 && item.qty <= 0 && item.bonus <= 0;

    if (!normalizedName) return false;
    if (looksLikeHeader) return false;
    if (normalizedSupplier && normalizedName === normalizedSupplier) return false;
    if (looksLikeCompany && emptyFinancials) return false;
    if (emptyFinancials && item.batch === "B-NEW") return false;
    return true;
}

function normalizeInvoice(rawInvoice, sourceFile, index) {
    const invoiceOverride = getInvoiceOverride(sourceFile);
    const invoiceNo = cleanText(invoiceOverride?.invoiceNo || rawInvoice.invoiceNo, `OCR-${path.parse(sourceFile).name}-${index + 1}`);
    const supplierName = cleanText(invoiceOverride?.supplierName || rawInvoice.supplierName, "Unknown Supplier");
    const invoiceDate = normalizeDate(invoiceOverride?.date || rawInvoice.date);
    const items = ensureArray(rawInvoice.items)
        .map((item, itemIndex) => normalizeItem(item, sourceFile, itemIndex))
        .filter((item) => shouldKeepItem(item, supplierName));

    const explicitTotal = normalizeNumber(rawInvoice.total);
    const calculatedTotal = items.reduce((sum, item) => sum + item.netAmount, 0);

    return {
        sourceFile,
        supplierName,
        invoiceNo,
        date: invoiceDate,
        total: explicitTotal > 0 ? explicitTotal : calculatedTotal,
        items,
        invoiceKey: [keyText(supplierName) || "unknown", keyText(invoiceNo) || keyText(sourceFile), invoiceDate].join("::"),
    };
}

function getRetryableError(message) {
    const normalized = String(message || "").toLowerCase();
    return normalized.includes("429") ||
        normalized.includes("quota") ||
        normalized.includes("rate limit") ||
        normalized.includes("temporarily busy") ||
        normalized.includes("503");
}

function buildProductCache(products) {
    return products.map((product) => ({
        id: product.id,
        name: product.name,
        item_code: product.item_code,
        aliases: ensureArray(product.aliases).map((alias) => alias.alias),
    }));
}

function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 100;
    if (str1.length < 2 || str2.length < 2) return 0;

    const getBigrams = (input) => {
        const bigrams = new Set();
        for (let index = 0; index < input.length - 1; index += 1) {
            bigrams.add(input.substring(index, index + 2));
        }
        return bigrams;
    };

    const left = getBigrams(str1);
    const right = getBigrams(str2);

    let intersection = 0;
    for (const part of left) {
        if (right.has(part)) {
            intersection += 1;
        }
    }

    return Math.round((2 * intersection * 100) / (left.size + right.size));
}

function extractLeadToken(value) {
    const match = String(value || "").toUpperCase().match(/[A-Z0-9]+/);
    return match ? match[0] : "";
}

function fuzzyMatchProduct(inputName, products) {
    if (!inputName || !products.length) return null;

    const cleanInput = keyText(inputName);
    const inputLeadToken = extractLeadToken(inputName);
    let highestScore = 0;
    let bestMatch = null;

    const testValue = (value, product, type) => {
        if (!value) return;
        const cleanValue = keyText(value);
        const candidateLeadToken = extractLeadToken(value);
        let score = calculateSimilarity(cleanInput, cleanValue);

        if (cleanInput.length > 2 && cleanValue.length > 2) {
            if (cleanValue.includes(cleanInput) || cleanInput.includes(cleanValue)) {
                const overlap = Math.min(cleanInput.length, cleanValue.length) / Math.max(cleanInput.length, cleanValue.length);
                score = Math.max(score, overlap > 0.4 ? 85 : 0);
            }
        }

        const exactLeadTokenMatch = inputLeadToken && candidateLeadToken && inputLeadToken === candidateLeadToken;
        if (!exactLeadTokenMatch && score < 85) {
            return;
        }

        if (score > highestScore) {
            highestScore = score;
            bestMatch = {
                productId: product.id,
                score,
                matchedOn: value,
                type,
            };
        }
    };

    for (const product of products) {
        testValue(product.name, product, "name");
        for (const alias of ensureArray(product.aliases)) {
            testValue(alias, product, "alias");
        }
    }

    return highestScore >= 75 ? bestMatch : null;
}

function getUniqueItemCode(name) {
    const prefix = keyText(name).slice(0, 5).toUpperCase() || "PRD";
    return `IMP-${prefix}-${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(-3).toUpperCase()}`;
}

async function fetchOcrInvoices(filePath) {
    const payload = {
        image: buildImageDataUrl(filePath),
    };

    const response = await fetch(OCR_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
        const parts = [body.error, body.details, body.help].filter(Boolean);
        throw new Error(parts.join(" | ") || `OCR request failed with status ${response.status}`);
    }

    const rawInvoices = ensureArray(body?.data?.invoices).length
        ? body.data.invoices
        : body?.data?.items
            ? [body.data]
            : [];

    return rawInvoices;
}

async function extractFile(fileName, state) {
    const fileEntry = state.files[fileName];
    if (!onlyFailed && fileEntry?.status === "processed") {
        return fileEntry.extractedInvoices || [];
    }

    const filePath = path.join(SOURCE_DIR, fileName);
    let attempts = fileEntry?.attempts || 0;

    while (attempts < MAX_ATTEMPTS) {
        attempts += 1;
        try {
            log(`OCR ${fileName} (attempt ${attempts})`);
            const rawInvoices = await fetchOcrInvoices(filePath);
            const extractedInvoices = rawInvoices.map((invoice, index) => normalizeInvoice(invoice, fileName, index));

            if (!extractedInvoices.length) {
                throw new Error("No invoice data detected in OCR response");
            }

            state.files[fileName] = {
                status: "processed",
                attempts,
                processedAt: now(),
                extractedInvoices,
            };
            state.summary.processedFiles = Object.values(state.files).filter((entry) => entry.status === "processed").length;
            saveState(state);
            return extractedInvoices;
        } catch (error) {
            const message = error.message || String(error);
            state.files[fileName] = {
                status: "failed",
                attempts,
                lastTriedAt: now(),
                error: message,
            };
            state.summary.failedFiles = Object.values(state.files).filter((entry) => entry.status === "failed").length;
            saveState(state);

            if (attempts < MAX_ATTEMPTS && getRetryableError(message)) {
                log(`Retrying ${fileName} after OCR error: ${message}`);
                await sleep(RETRY_DELAY_MS);
                continue;
            }

            throw error;
        }
    }

    return [];
}

async function loadCaches() {
    const [products, suppliers] = await Promise.all([
        prisma.product.findMany({
            include: {
                aliases: true,
            },
        }),
        prisma.supplier.findMany(),
    ]);

    return {
        products,
        matchableProducts: buildProductCache(products),
        suppliers,
    };
}

function findSupplierByName(name, suppliers) {
    const normalized = keyText(name);
    return suppliers.find((supplier) => keyText(supplier.name) === normalized) ||
        suppliers.find((supplier) => keyText(supplier.name).includes(normalized) || normalized.includes(keyText(supplier.name))) ||
        null;
}

async function ensureSupplier(name, invoiceDate, caches) {
    let supplier = findSupplierByName(name, caches.suppliers);
    if (supplier) {
        return supplier;
    }

    supplier = await prisma.supplier.create({
        data: {
            name,
            phone: "",
            email: "",
            address: "",
            lastOrder: dateForDb(invoiceDate),
        },
    });

    caches.suppliers.push(supplier);
    return supplier;
}

function findProductInCache(productId, caches) {
    return caches.products.find((product) => product.id === productId) || null;
}

function findProductByExactName(name, caches) {
    const normalized = keyText(name);
    return caches.products.find((product) => keyText(product.name) === normalized) || null;
}

function findProductByItemCode(itemCode, caches) {
    const normalized = cleanItemCode(itemCode);
    if (!normalized) {
        return null;
    }

    return caches.products.find((product) => cleanItemCode(product.item_code) === normalized) || null;
}

async function syncPreferredItemCode(product, preferredItemCode, caches) {
    if (!shouldReplaceProductCode(product?.item_code, preferredItemCode)) {
        return product;
    }

    const updated = await prisma.product.update({
        where: { id: product.id },
        data: { item_code: cleanItemCode(preferredItemCode) },
        include: { aliases: true },
    });

    const cacheIndex = caches.products.findIndex((entry) => entry.id === updated.id);
    if (cacheIndex >= 0) {
        caches.products[cacheIndex] = updated;
    }

    const matchable = caches.matchableProducts.find((entry) => entry.id === updated.id);
    if (matchable) {
        matchable.item_code = updated.item_code;
    }

    return updated;
}

async function createAliasIfNeeded(product, rawName, caches) {
    const normalizedRaw = keyText(rawName);
    if (!normalizedRaw || keyText(product.name) === normalizedRaw) {
        return;
    }

    const aliases = ensureArray(product.aliases).map((alias) => alias.alias);
    if (aliases.some((alias) => keyText(alias) === normalizedRaw)) {
        return;
    }

    try {
        const alias = await prisma.productAlias.create({
            data: {
                alias: rawName,
                productId: product.id,
            },
        });
        product.aliases = [...ensureArray(product.aliases), alias];
        const matchable = caches.matchableProducts.find((item) => item.id === product.id);
        if (matchable) {
            matchable.aliases = [...ensureArray(matchable.aliases), alias.alias];
        }
    } catch (error) {
        if (!String(error.message || "").includes("Unique constraint")) {
            throw error;
        }
    }
}

async function ensureProduct(item, caches, state) {
    let product = null;
    let match = null;

    product = findProductByItemCode(item.itemCode, caches) || findProductByExactName(item.name, caches);
    if (!product) {
        match = fuzzyMatchProduct(item.name, caches.matchableProducts);
    }

    if (match) {
        product = findProductInCache(match.productId, caches);
    }

    if (!product) {
        product = await prisma.product.create({
            data: {
                item_code: cleanItemCode(item.itemCode) || getUniqueItemCode(item.name),
                name: item.name,
                brand: "Imported",
                category: "Medicine",
                purchasePrice: item.rate,
                salePrice: Number((item.rate * 1.15).toFixed(2)),
                stock: 0,
                unitsPerPack: 1,
            },
            include: {
                aliases: true,
            },
        });
        caches.products.push(product);
        caches.matchableProducts.push({
            id: product.id,
            name: product.name,
            item_code: product.item_code,
            aliases: [],
        });
        state.summary.createdProducts += 1;
        return { product, matched: false };
    }

    product = await syncPreferredItemCode(product, item.itemCode, caches);
    state.summary.matchedProducts += 1;
    const exactLeadTokenMatch = extractLeadToken(item.name) === extractLeadToken(product.name);
    if (match && match.score >= 95 && exactLeadTokenMatch) {
        await createAliasIfNeeded(product, item.name, caches);
    }
    return { product, matched: true };
}

async function upsertProductSupplier(productId, supplierId, price, discountPercent) {
    await prisma.productSupplier.upsert({
        where: {
            productId_supplierId: {
                productId,
                supplierId,
            },
        },
        update: {
            purchasePrice: price,
            discount: discountPercent,
        },
        create: {
            productId,
            supplierId,
            purchasePrice: price,
            discount: discountPercent,
        },
    });
}

function buildGroupFromState(state, invoiceKey) {
    const grouped = {
        invoiceKey,
        supplierName: "",
        invoiceNo: "",
        date: "",
        total: 0,
        files: [],
        items: [],
    };

    for (const [fileName, entry] of Object.entries(state.files)) {
        if (entry.status !== "processed") continue;
        for (const invoice of ensureArray(entry.extractedInvoices)) {
            if (invoice.invoiceKey !== invoiceKey) continue;
            grouped.supplierName = grouped.supplierName || invoice.supplierName;
            grouped.invoiceNo = grouped.invoiceNo || invoice.invoiceNo;
            grouped.date = grouped.date || invoice.date;
            grouped.total = Math.max(grouped.total, normalizeNumber(invoice.total));
            grouped.files.push(fileName);
            grouped.items.push(...invoice.items.map((item) => ({ ...item, sourceFile: fileName })));
        }
    }

    grouped.files = [...new Set(grouped.files)].sort((left, right) => extractSequence(left) - extractSequence(right));
    const itemTotal = grouped.items.reduce((sum, item) => sum + normalizeNumber(item.netAmount), 0);
    if (grouped.total <= 0) {
        grouped.total = itemTotal;
    } else {
        grouped.total = Math.max(grouped.total, itemTotal);
    }

    return grouped;
}

async function getUniqueInvoiceNo(preferredInvoiceNo, existingStored) {
    if (existingStored) {
        return existingStored;
    }

    const base = cleanText(preferredInvoiceNo, `OCR-${Date.now()}`);
    let candidate = base;
    let counter = 1;

    while (await prisma.purchase.findUnique({ where: { invoiceNo: candidate } })) {
        counter += 1;
        candidate = `${base}-${counter}`;
    }

    return candidate;
}

async function importItemsForPurchase(purchaseId, items, supplierId, caches, state) {
    for (const item of items) {
        const { product } = await ensureProduct(item, caches, state);
        const correctedItem = repairItemUsingProductHistory(item, product);
        const totalQty = Math.max(0, correctedItem.qty + correctedItem.bonus);

        const batch = await prisma.batch.create({
            data: {
                batchNo: cleanText(correctedItem.batch, "B-NEW"),
                manufacturingDate: correctedItem.mfgDate ? dateForDb(correctedItem.mfgDate, correctedItem.mfgDate) : null,
                expiryDate: dateForDb(correctedItem.expiry, "2026-12-01"),
                quantity: totalQty,
                productId: product.id,
                branchId: null,
                supplierId,
                purchasePrice: correctedItem.rate,
            },
        });

        await prisma.purchaseItem.create({
            data: {
                purchaseId,
                productId: product.id,
                batchId: batch.id,
                quantity: correctedItem.qty,
                bonusQty: correctedItem.bonus,
                price: correctedItem.rate > 0 ? correctedItem.rate : correctedItem.netAmount,
                discountPercent: correctedItem.discountPercent,
                gstPercent: correctedItem.gstPercent,
                furtherTaxPercent: correctedItem.furtherTaxPercent,
                nonAtlTaxPercent: correctedItem.nonAtlTaxPercent,
                advTaxPercent: correctedItem.advanceTaxPercent,
                netAmount: correctedItem.netAmount,
                effectiveCost: correctedItem.effectiveCost > 0 ? correctedItem.effectiveCost : correctedItem.netAmount,
                batchNo: batch.batchNo,
                expiryDate: correctedItem.expiry,
                remarks: correctedItem.remarks || null,
            },
        });

        await prisma.product.update({
            where: { id: product.id },
            data: {
                stock: { increment: totalQty },
                purchasePrice: correctedItem.rate > 0 ? correctedItem.rate : undefined,
            },
        });

        await upsertProductSupplier(product.id, supplierId, correctedItem.rate, correctedItem.discountPercent);
    }
}

async function syncInvoiceGroup(invoiceKey, state, caches) {
    const group = buildGroupFromState(state, invoiceKey);
    if (!group.items.length) {
        return;
    }

    const invoiceState = state.invoices[invoiceKey] || { importedFiles: [] };
    const newFiles = group.files.filter((file) => !ensureArray(invoiceState.importedFiles).includes(file));

    if (!newFiles.length) {
        return;
    }

    const supplier = await ensureSupplier(group.supplierName, group.date, caches);
    const invoiceNoStored = await getUniqueInvoiceNo(group.invoiceNo, invoiceState.invoiceNoStored);

    let purchaseId = invoiceState.purchaseId || null;
    if (!purchaseId) {
        const purchase = await prisma.purchase.create({
            data: {
                invoiceNo: invoiceNoStored,
                date: dateForDb(group.date),
                total: group.total,
                supplierId: supplier.id,
                branchId: null,
            },
        });
        purchaseId = purchase.id;
        state.summary.importedInvoices += 1;
    } else {
        await prisma.purchase.update({
            where: { id: purchaseId },
            data: {
                total: group.total,
                supplierId: supplier.id,
                date: dateForDb(group.date),
            },
        });
    }

    const itemsToImport = group.items.filter((item) => newFiles.includes(item.sourceFile));
    await importItemsForPurchase(purchaseId, itemsToImport, supplier.id, caches, state);

    await prisma.supplier.update({
        where: { id: supplier.id },
        data: {
            totalOrders: { increment: invoiceState.purchaseId ? 0 : 1 },
            lastOrder: dateForDb(group.date),
        },
    });

    state.invoices[invoiceKey] = {
        purchaseId,
        invoiceNoStored,
        supplierId: supplier.id,
        importedFiles: group.files,
        lastSyncedAt: now(),
        total: group.total,
        itemCount: group.items.length,
    };
    saveState(state);
}

async function processPendingFiles(state, caches) {
    const files = sortFiles(
        fs.readdirSync(SOURCE_DIR).filter((file) => /\.(jpe?g|png)$/i.test(file))
    );

    const candidates = onlyFailed
        ? files.filter((file) => state.files[file]?.status === "failed")
        : files.filter((file) => state.files[file]?.status !== "processed");

    let processedInRun = 0;

    for (const fileName of candidates) {
        if (processedInRun >= LIMIT) {
            break;
        }

        try {
            const extractedInvoices = await extractFile(fileName, state);
            for (const invoice of extractedInvoices) {
                await syncInvoiceGroup(invoice.invoiceKey, state, caches);
            }
            processedInRun += 1;
            if (processedInRun < LIMIT) {
                await sleep(DEFAULT_DELAY_MS);
            }
        } catch (error) {
            log(`FAILED ${fileName}: ${error.message}`);
            if (getRetryableError(error.message)) {
                state.pausedReason = error.message;
                saveState(state);
                break;
            }
        }
    }
}

async function printSummary(state) {
    const [productCount, purchaseCount] = await Promise.all([
        prisma.product.count(),
        prisma.purchase.count(),
    ]);

    log(`Summary: processedFiles=${state.summary.processedFiles}, failedFiles=${state.summary.failedFiles}, importedInvoices=${state.summary.importedInvoices}, createdProducts=${state.summary.createdProducts}, matchedProducts=${state.summary.matchedProducts}`);
    log(`Database now has ${productCount} products and ${purchaseCount} purchases.`);
}

async function main() {
    if (!fs.existsSync(SOURCE_DIR)) {
        throw new Error(`Source directory not found: ${SOURCE_DIR}`);
    }

    const state = loadState();
    if (state.pausedReason) {
        log(`Resuming folder 1 import after previous pause: ${state.pausedReason}`);
        delete state.pausedReason;
    }
    saveState(state);

    const caches = await loadCaches();
    log(`Starting folder 1 import using ${OCR_ENDPOINT}`);
    await processPendingFiles(state, caches);
    await printSummary(state);
}

main()
    .catch((error) => {
        log(`IMPORT ERROR: ${error.message || error}`);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
