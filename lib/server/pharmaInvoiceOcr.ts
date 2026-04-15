import fs from "fs";
import path from "path";

type AnyRecord = Record<string, any>;

const MONTH_INDEX: Record<string, number> = {
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    aug: 8,
    sep: 9,
    oct: 10,
    nov: 11,
    dec: 12,
};

function cleanText(value: unknown, fallback = "") {
    const normalized = String(value ?? fallback).replace(/\s+/g, " ").trim();
    return normalized || fallback;
}

function pickFirstText(...values: unknown[]) {
    for (const value of values) {
        const cleaned = cleanText(value);
        if (cleaned) {
            return cleaned;
        }
    }

    return "";
}

function normalizeNumber(value: unknown, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number(String(value).replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInteger(value: unknown, fallback = 0) {
    return Math.max(0, Math.round(normalizeNumber(value, fallback)));
}

function pickFirstNumber(...values: unknown[]) {
    for (const value of values) {
        if (value === null || value === undefined || value === "") {
            continue;
        }

        const parsed = Number(String(value).replace(/,/g, "").trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
}

function formatIsoDate(year: number, month: number, day: number) {
    const safeMonth = String(month).padStart(2, "0");
    const safeDay = String(day).padStart(2, "0");
    return `${year}-${safeMonth}-${safeDay}`;
}

function normalizeYear(rawYear: string | number) {
    const parsed = Number(rawYear);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    if (parsed < 100) {
        return parsed >= 70 ? 1900 + parsed : 2000 + parsed;
    }

    return parsed;
}

function parseMonthToken(rawMonth: string) {
    const trimmed = cleanText(rawMonth).toLowerCase();
    if (!trimmed) {
        return null;
    }

    if (/^\d{1,2}$/.test(trimmed)) {
        const numericMonth = Number(trimmed);
        return numericMonth >= 1 && numericMonth <= 12 ? numericMonth : null;
    }

    return MONTH_INDEX[trimmed.slice(0, 3)] || null;
}

function extractSupplyYear(supplyId: unknown) {
    const match = cleanText(supplyId).match(/\b(20\d{2})\b/);
    return match ? Number(match[1]) : null;
}

function extractPrimaryDateText(rawDate: unknown) {
    const cleaned = cleanText(rawDate);
    if (!cleaned) {
        return "";
    }

    const primaryMatch = cleaned.match(
        /^(\d{4}-\d{2}-\d{2}|\d{1,2}\s*[-/]\s*\d{2,4}|\d{1,4}\s*[-/. ]\s*\d{1,2}\s*[-/. ]\s*\d{1,4}|\d{1,2}\s*[-/. ]\s*[A-Za-z]{3,9}\s*[-/. ]\s*\d{2,4}|[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i
    );

    return primaryMatch ? primaryMatch[1].trim() : cleaned;
}

function normalizeDocumentDate(rawDate: unknown, supplyId?: unknown) {
    const cleaned = extractPrimaryDateText(rawDate);
    if (!cleaned) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const [yearText, monthText, dayText] = cleaned.split("-");
        let year = Number(yearText);
        const supplyYear = extractSupplyYear(supplyId);
        if (supplyYear && Math.abs(year - supplyYear) >= 2) {
            year = supplyYear;
        }
        return formatIsoDate(year, Number(monthText), Number(dayText));
    }

    const alphaMonthMatch = cleaned.match(/^(\d{1,2})\s*[-/. ]\s*([A-Za-z]{3,9})\s*[-/. ]\s*(\d{2,4})$/i);
    if (alphaMonthMatch) {
        const day = Number(alphaMonthMatch[1]);
        const month = parseMonthToken(alphaMonthMatch[2]);
        let year = normalizeYear(alphaMonthMatch[3]);
        const supplyYear = extractSupplyYear(supplyId);
        if (supplyYear && year && Math.abs(year - supplyYear) >= 2) {
            year = supplyYear;
        }

        if (month && year) {
            return formatIsoDate(year, month, day || 1);
        }
    }

    const numericMatch = cleaned.match(/^(\d{1,4})\s*[-/. ]\s*(\d{1,2})\s*[-/. ]\s*(\d{1,4})$/);
    if (numericMatch) {
        const first = numericMatch[1];
        const second = numericMatch[2];
        const third = numericMatch[3];

        if (first.length === 4) {
            return formatIsoDate(Number(first), Number(second), Number(third));
        }

        let day = Number(first);
        let month = Number(second);
        let year = normalizeYear(third);
        const supplyYear = extractSupplyYear(supplyId);

        if (day <= 12 && month > 12) {
            const swap = day;
            day = month;
            month = swap;
        }

        if (supplyYear && year && Math.abs(year - supplyYear) >= 2) {
            year = supplyYear;
        }

        if (month >= 1 && month <= 12 && year) {
            return formatIsoDate(year, month, day || 1);
        }
    }

    return "";
}

function normalizeMonthYearDate(rawDate: unknown) {
    const cleaned = extractPrimaryDateText(rawDate);
    if (!cleaned) {
        return "";
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        return cleaned;
    }

    const monthYearWithNoiseMatch = cleaned.match(/^(\d{1,2})\s*[-/]\s*(\d{2})(?:\s*[-/]\s*(\d{2,4}))?$/);
    if (monthYearWithNoiseMatch) {
        const month = Number(monthYearWithNoiseMatch[1]);
        const year = normalizeYear(monthYearWithNoiseMatch[2]);
        if (month >= 1 && month <= 12 && year) {
            return formatIsoDate(year, month, 1);
        }
    }

    const alphaMonthYearMatch = cleaned.match(/^([A-Za-z]{3,9})\s*[-/]\s*(\d{2,4})$/i);
    if (alphaMonthYearMatch) {
        const month = parseMonthToken(alphaMonthYearMatch[1]);
        const year = normalizeYear(alphaMonthYearMatch[2]);
        if (month && year) {
            return formatIsoDate(year, month, 1);
        }
    }

    const dayAlphaMonthYearMatch = cleaned.match(/^(\d{1,2})\s*([A-Za-z]{1,3})\s*[-/]\s*(\d{2,4})$/i);
    if (dayAlphaMonthYearMatch) {
        const day = Number(dayAlphaMonthYearMatch[1]);
        const month = parseMonthToken(dayAlphaMonthYearMatch[2]);
        const year = normalizeYear(dayAlphaMonthYearMatch[3]);
        if (month && year) {
            return formatIsoDate(year, month, day || 1);
        }
    }

    const monthYearMatch = cleaned.match(/^(\d{1,2})\s*[-/]\s*(\d{2,4})$/);
    if (monthYearMatch) {
        const month = Number(monthYearMatch[1]);
        const year = normalizeYear(monthYearMatch[2]);
        if (month >= 1 && month <= 12 && year) {
            return formatIsoDate(year, month, 1);
        }
    }

    return normalizeDocumentDate(cleaned);
}

function extractItemCodeAndName(rawName: unknown, rawItemCode: unknown) {
    let name = cleanText(rawName);
    let itemCode = cleanText(rawItemCode);

    if (!name && !itemCode) {
        return { itemCode: "", name: "" };
    }

    name = name.replace(/^[*•+\-]+\s*/, "").trim();

    if (!itemCode) {
        const inlineCodeMatch = name.match(/^(\d{4,7})\s*[•*+\-]?\s*(.+)$/);
        if (inlineCodeMatch) {
            itemCode = inlineCodeMatch[1];
            name = inlineCodeMatch[2];
        }
    }

    name = name.replace(/^[*•+\-]+\s*/, "").trim();

    return {
        itemCode,
        name,
    };
}

const SECTION_HEADER_KEYWORDS = [
    "LABORATORIES",
    "PHARMACEUTICALS",
    "PHARMA",
    "PHARMACEUTICAL",
    "NUTRITION",
    "DISTRIBUTOR",
    "DISTRIBUTORS",
    "LIMITED",
    "LTD",
    "PRIVATE",
    "PVT",
    "INDUSTRIES",
    "ENTERPRISES",
    "HEALTHCARE",
    "CHEMICALS",
    "COMPANY",
    "CORPORATION",
    "TRADING",
    "SERVICES",
    "PRODUCTS",
    "SCIENCES",
    "SCIENCE",
];

const PRODUCT_SIGNAL_PATTERN = /\b\d+(?:\.\d+)?\s*(?:MG|MCG|G|ML|IU|TAB|TABS|TABLET|TABLETS|CAP|CAPSULE|CAPSULES|SYRUP|SUSP|SUSPENSION|DROP|DROPS|INJ|INJECTION|CREAM|GEL|LOTION|OINT|OINTMENT|SOLUTION|VIAL|AMP|AMPUL|PASTE|SPRAY|POWDER|SACHET|STRIP|PACK|PCS|NOS|BOTTLE)\b/i;

function hasAnyKeyword(text: string, keywords: string[]) {
    return keywords.some((keyword) => text.includes(keyword));
}

function hasMeaningfulInvoiceRowSignals(rawItem: AnyRecord) {
    const qty = normalizeNumber(rawItem.qty);
    const bonus = normalizeNumber(rawItem.bonus);
    const rate = normalizeNumber(rawItem.rate);
    const amount = normalizeNumber(
        pickFirstNumber(
            rawItem.amount,
            rawItem.tpValue,
            rawItem.tpvalue,
            rawItem.tpValueAmount,
            rawItem.tpAmount,
            rawItem.tp_value
        ),
        0
    );
    const netAmount = normalizeNumber(pickFirstNumber(rawItem.net, rawItem.netAmount, rawItem.net_amount), 0);

    return qty > 0 || bonus > 0 || rate > 0 || amount > 0 || netAmount > 0;
}

function extractExpiryFromRowText(rawText: unknown) {
    const text = cleanText(rawText);
    if (!text) {
        return "";
    }

    const upper = text.toUpperCase();
    if (/(INVOICE|CUSTOMER|TOTAL|ORDER|PAYMENT|DELIVERY|PAGE|SUB TOTAL|GRAND TOTAL|SALES TAX)/.test(upper)) {
        return "";
    }

    const explicitLabelMatch = text.match(/(?:EXP(?:IRY)?|USE BEFORE)[:.\s-]*([A-Za-z0-9\/\-.\s]{2,24})/i);
    const candidate = explicitLabelMatch ? extractPrimaryDateText(explicitLabelMatch[1]) : extractPrimaryDateText(text);
    const normalized = normalizeMonthYearDate(candidate);
    return normalized || "";
}

function looksLikeSectionHeaderItem(rawItem: AnyRecord, resolvedName: string) {
    const normalizedName = cleanText(resolvedName).toUpperCase().replace(/\s+/g, " ").trim();
    if (!normalizedName) {
        return false;
    }

    const headingShape =
        /\([A-Z0-9]{1,4}\)$/.test(normalizedName) ||
        /^[A-Z0-9&.'()/-]+(?:\s+[A-Z0-9&.'()/-]+){1,5}$/.test(normalizedName);

    const sectionLike =
        hasAnyKeyword(normalizedName, SECTION_HEADER_KEYWORDS) ||
        (headingShape && !PRODUCT_SIGNAL_PATTERN.test(normalizedName) && !/\b\d+(?:\.\d+)?\b/.test(normalizedName));

    return sectionLike && !hasMeaningfulInvoiceRowSignals(rawItem) && headingShape;
}

function splitBatchAndExpiry(rawBatch: unknown, rawExpiry: unknown) {
    let batch = cleanText(rawBatch, "B-NEW");
    const explicitExpiry = normalizeMonthYearDate(rawExpiry);
    const combinedMatch = batch.match(/^(.*?)(?:\s*\/\s*|\s+)(\d{1,2}\s*[-/]\s*\d{2,4}(?:\s*[-/]\s*\d{2,4})?)$/);

    if (!combinedMatch) {
        return {
            batch,
            expiry: explicitExpiry,
        };
    }

    const batchPart = cleanText(combinedMatch[1]).replace(/[/-]+$/, "").trim();
    const batchExpiry = normalizeMonthYearDate(combinedMatch[2]);

    const preferredExpiry =
        batchExpiry && explicitExpiry && batchExpiry.slice(0, 7) !== explicitExpiry.slice(0, 7)
            ? batchExpiry
            : explicitExpiry || batchExpiry;

    return {
        batch: batchPart || batch,
        expiry: preferredExpiry,
    };
}

function matchesLineFinancials(qty: number, rate: number, netAmount: number) {
    if (!(qty > 0) || !(rate > 0) || !(netAmount > 0)) {
        return false;
    }

    const expected = qty * rate;
    const tolerance = Math.max(2.5, rate * 0.06, netAmount * 0.03);
    return Math.abs(expected - netAmount) <= tolerance;
}

function inferQuantityFromRateAndNet(rate: number, netAmount: number) {
    if (!(rate > 0) || !(netAmount > 0)) {
        return null;
    }

    const inferred = Math.round(netAmount / rate);
    if (inferred <= 0 || inferred > 60) {
        return null;
    }

    return matchesLineFinancials(inferred, rate, netAmount) ? inferred : null;
}

function matchesLineValue(qty: number, rate: number, lineValue: number) {
    if (!(qty > 0) || !(rate > 0) || !(lineValue > 0)) {
        return false;
    }

    const expected = qty * rate;
    const tolerance = Math.max(1.5, rate * 0.03, lineValue * 0.02);
    return Math.abs(expected - lineValue) <= tolerance;
}

function inferQuantityFromRateAndLineValue(rate: number, lineValue: number) {
    if (!(rate > 0) || !(lineValue > 0)) {
        return null;
    }

    const inferred = Math.round(lineValue / rate);
    if (inferred <= 0 || inferred > 60) {
        return null;
    }

    return matchesLineValue(inferred, rate, lineValue) ? inferred : null;
}

function isUdlSupplier(supplierName: string) {
    return /(?:^|\s)udl(?:\s|$)/i.test(cleanText(supplierName));
}

function normalizeLineNumbers(rawItem: AnyRecord, supplierName = "") {
    const supplierLooksUdl = isUdlSupplier(supplierName);
    let qty = normalizeInteger(rawItem.qty);
    const bonus = normalizeInteger(rawItem.bonus);
    let rate = normalizeNumber(rawItem.rate);
    const rowAmount = normalizeNumber(
        pickFirstNumber(
            rawItem.amount,
            rawItem.tpValue,
            rawItem.tpvalue,
            rawItem.tpValueAmount,
            rawItem.tpAmount,
            rawItem.tp_value
        ),
        0
    );
    let netAmount = normalizeNumber(pickFirstNumber(rawItem.net, rawItem.netAmount, rawItem.net_amount), 0);

    if (!(netAmount > 0) && rowAmount > 0 && !supplierLooksUdl) {
        netAmount = rowAmount;
    }

    const qtyLooksLikeMoney =
        qty > 60 ||
        (netAmount > 0 && qty === Math.round(netAmount) && netAmount > 25) ||
        (rate > 0 && qty === Math.round(rate) && rate > 25) ||
        (rowAmount > 0 && qty === Math.round(rowAmount) && rowAmount > 25);

    if (qtyLooksLikeMoney) {
        qty = 0;
    }

    if ((qty <= 0 || qtyLooksLikeMoney) && supplierLooksUdl && rate > 0 && rowAmount > 0) {
        const inferredQtyFromValue = inferQuantityFromRateAndLineValue(rate, rowAmount);
        if (inferredQtyFromValue) {
            qty = inferredQtyFromValue;
        }
    }

    if ((qty <= 0 || qtyLooksLikeMoney || !matchesLineFinancials(qty, rate, netAmount)) && rate > 0 && netAmount > 0) {
        const inferredQty = inferQuantityFromRateAndNet(rate, netAmount);
        if (inferredQty) {
            qty = inferredQty;
        }
    }

    if ((qty <= 0 || qtyLooksLikeMoney) && supplierLooksUdl && rate > 0 && rowAmount > 0) {
        const inferredQtyFromValue = inferQuantityFromRateAndLineValue(rate, rowAmount);
        if (inferredQtyFromValue) {
            qty = inferredQtyFromValue;
        }
    }

    if (rate <= 0 && qty > 0 && rowAmount > 0 && supplierLooksUdl) {
        rate = Number((rowAmount / qty).toFixed(2));
    }

    if (rate <= 0 && qty > 0 && netAmount > 0) {
        rate = Number((netAmount / qty).toFixed(2));
    }

    if (!(netAmount > 0) && qty > 0 && rate > 0 && !supplierLooksUdl) {
        netAmount = Number((qty * rate).toFixed(2));
    }

    return {
        qty,
        bonus,
        rate,
        netAmount,
        rowAmount,
    };
}

function snapPercent(value: number) {
    return snapToKnownPercent(value, [0.5, 0.61, 1, 1.5, 2, 2.5, 5, 10, 17, 18, 22], 0.2);
}

function snapToKnownPercent(value: number, knownRates: number[], tolerance = 0.2) {
    if (!(value > 0)) {
        return 0;
    }

    const nearest = knownRates.reduce((best, current) =>
        Math.abs(current - value) < Math.abs(best - value) ? current : best
    );

    if (Math.abs(nearest - value) <= tolerance) {
        return nearest;
    }

    return Number(value.toFixed(2));
}

function chooseClosestKnownPercent(amount: number, bases: number[], knownRates: number[], tolerance = 0.2) {
    if (!(amount > 0)) {
        return 0;
    }

    let bestPercent = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const base of bases) {
        if (!(base > 0)) {
            continue;
        }

        const rawPercent = (amount / base) * 100;
        const nearest = knownRates.reduce((best, current) =>
            Math.abs(current - rawPercent) < Math.abs(best - rawPercent) ? current : best
        );
        const snapped = snapToKnownPercent(rawPercent, knownRates, tolerance);
        const distance = Math.abs(nearest - rawPercent);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestPercent = snapped;
        }
    }

    return bestPercent || Number(amount.toFixed(2));
}

function findClosestPercentMatch(amount: number, bases: number[], knownRates: number[]) {
    const bestMatch = {
        percent: 0,
        rawPercent: 0,
        distance: Number.POSITIVE_INFINITY,
        base: 0,
    };

    if (!(amount > 0)) {
        return bestMatch;
    }

    for (const base of bases) {
        if (!(base > 0)) {
            continue;
        }

        const rawPercent = (amount / base) * 100;
        const nearest = knownRates.reduce((best, current) =>
            Math.abs(current - rawPercent) < Math.abs(best - rawPercent) ? current : best
        );
        const distance = Math.abs(nearest - rawPercent);

        if (distance < bestMatch.distance) {
            bestMatch.percent = nearest;
            bestMatch.rawPercent = rawPercent;
            bestMatch.distance = distance;
            bestMatch.base = base;
        }
    }

    return bestMatch;
}

function pushUniquePercent(target: number[], value: number, tolerance = 0.05) {
    if (!(value >= 0)) {
        return;
    }

    if (target.some((existing) => Math.abs(existing - value) <= tolerance)) {
        return;
    }

    target.push(value);
}

function inferUdlSplitTaxFromNet(
    taxableAmount: number,
    furtherTaxPercent: number,
    netAmount: number,
    preferredGstPercent: number,
    preferredAdvanceTaxPercent: number
) {
    if (!(taxableAmount > 0) || !(netAmount > taxableAmount)) {
        return null;
    }

    const salesOptions: number[] = [];
    const advanceOptions: number[] = [];

    if (preferredGstPercent > 0) {
        pushUniquePercent(salesOptions, snapToKnownPercent(preferredGstPercent, [17, 18, 22], 0.75));
    }

    [22, 18, 17].forEach((value) => pushUniquePercent(salesOptions, value));

    if (preferredAdvanceTaxPercent > 0) {
        pushUniquePercent(advanceOptions, snapToKnownPercent(preferredAdvanceTaxPercent, [0.5, 0.61, 1, 2], 0.2));
    }

    [0.5, 0.61, 1, 2, 0].forEach((value) => pushUniquePercent(advanceOptions, value));

    const furtherTaxAmount = roundMoney((taxableAmount * furtherTaxPercent) / 100);
    let bestCandidate: AnyRecord | null = null;

    for (const salesPercent of salesOptions) {
        const salesTaxAmount = roundMoney((taxableAmount * salesPercent) / 100);
        const invoiceAmount = roundMoney(taxableAmount + salesTaxAmount + furtherTaxAmount);

        for (const advancePercent of advanceOptions) {
            const advanceTaxAmount = roundMoney((invoiceAmount * advancePercent) / 100);
            const candidateNetAmount = roundMoney(invoiceAmount + advanceTaxAmount);
            const netDifference = Math.abs(candidateNetAmount - netAmount);

            if (!bestCandidate || netDifference < bestCandidate.netDifference) {
                bestCandidate = {
                    gstPercent: salesPercent,
                    salesTaxAmount,
                    advanceTaxPercent: advancePercent,
                    advanceTaxAmount,
                    invoiceAmount,
                    netAmount: candidateNetAmount,
                    netDifference,
                };
            }
        }
    }

    return bestCandidate;
}

function roundMoney(value: number) {
    return Number(value.toFixed(2));
}

function normalizeUdlPrintedAmount(value: number) {
    if (!(value > 0)) {
        return 0;
    }

    const rounded = Math.round(value);
    return Math.abs(rounded - value) <= 0.5 ? rounded : roundMoney(value);
}

function moneyDistance(value: number, target: number) {
    return Math.abs(roundMoney(value) - roundMoney(target));
}

function moneyTolerance(target: number, minimum = 1.25, ratio = 0.03) {
    return Math.max(minimum, Math.abs(target) * ratio);
}

function isMoneyClose(value: number, target: number, minimum = 1.25, ratio = 0.03) {
    if (!(value > 0) || !(target > 0)) {
        return false;
    }

    return moneyDistance(value, target) <= moneyTolerance(target, minimum, ratio);
}

function pickClosestMoneyValue(target: number, candidates: number[]) {
    let best = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        if (!(candidate > 0)) {
            continue;
        }

        const distance = moneyDistance(candidate, target);
        if (distance < bestDistance) {
            best = roundMoney(candidate);
            bestDistance = distance;
        }
    }

    return best;
}

function inferTaxPercents(rawItem: AnyRecord, qty: number, rate: number, netAmount: number, rowAmount: number, supplierName: string) {
    let discountPercent = normalizeNumber(rawItem.discountPercent, 0);
    let gstPercent = normalizeNumber(
        pickFirstNumber(rawItem.gstPercent, rawItem.taxPercent, rawItem.salesTaxPercent),
        0
    );
    const furtherTaxPercent = normalizeNumber(rawItem.furtherTaxPercent, 0);
    let nonAtlTaxPercent = normalizeNumber(rawItem.nonAtlTaxPercent, 0);
    let advanceTaxPercent = normalizeNumber(
        pickFirstNumber(rawItem.advanceTaxPercent, rawItem.advTaxPercent),
        0
    );
    const rawDiscountAmount = normalizeNumber(
        pickFirstNumber(
            rawItem.discountAmount,
            rawItem.invDiscountAmount,
            rawItem.discountInvAmount,
            rawItem.discountInv,
            rawItem.invDiscount
        ),
        0
    );
    const rawProductDiscountAmount = normalizeNumber(
        pickFirstNumber(
            rawItem.productDiscountAmount,
            rawItem.prodDiscountAmount,
            rawItem.discountProdAmount,
            rawItem.prodDiscount
        ),
        0
    );

    let rawSalesTaxAmount = normalizeNumber(
        pickFirstNumber(rawItem.salesTaxAmount, rawItem.sTaxAmount, rawItem.sTax),
        0
    );
    let rawAdvanceTaxAmount = normalizeNumber(
        pickFirstNumber(
            rawItem.advanceTaxAmount,
            rawItem.advTaxAmount,
            rawItem.aTaxAmount,
            rawItem.aTax,
            rawItem.aiTaxAmount,
            rawItem.aiTax
        ),
        0
    );

    const grossAmount =
        qty > 0 && rate > 0
            ? roundMoney(qty * rate)
            : rowAmount > 0
                ? rowAmount
                : 0;

    const supplierLooksUdl = isUdlSupplier(supplierName);
    const udlHighTaxHint =
        supplierLooksUdl &&
        (
            gstPercent >= 15 ||
            (advanceTaxPercent > 0.3 && advanceTaxPercent <= 2) ||
            (rawSalesTaxAmount > 0 && grossAmount > 0 && ((rawSalesTaxAmount / grossAmount) * 100 >= 15)) ||
            (netAmount > 0 && grossAmount > 0 && ((netAmount - grossAmount) / grossAmount) * 100 >= 15)
        );

    if (supplierLooksUdl) {
        if (discountPercent > 2.5 && grossAmount > 0 && discountPercent < grossAmount * 0.15) {
            discountPercent = snapToKnownPercent((discountPercent / grossAmount) * 100, [1.5, 2, 2.5, 5], 0.35);
        }

        if (discountPercent <= 0 && rawDiscountAmount > 0 && grossAmount > 0) {
            discountPercent = snapToKnownPercent((rawDiscountAmount / grossAmount) * 100, [1.5, 2, 2.5, 5], 0.35);
        }

        if (discountPercent <= 0 && udlHighTaxHint) {
            discountPercent = 1.5;
        }
    }

    const discountAmount =
        grossAmount > 0
            ? roundMoney(rawDiscountAmount > 0 ? rawDiscountAmount : (grossAmount * discountPercent) / 100)
            : 0;
    const productDiscountAmount = rawProductDiscountAmount > 0 ? roundMoney(rawProductDiscountAmount) : 0;
    const taxableAmount =
        grossAmount > 0
            ? roundMoney(Math.max(grossAmount - discountAmount - productDiscountAmount, 0))
            : 0;

    const impliedTotalTaxPercent =
        taxableAmount > 0 && netAmount > taxableAmount
            ? ((netAmount - taxableAmount) / taxableAmount) * 100
            : 0;

    if (supplierLooksUdl && udlHighTaxHint) {
        const netDerivedTaxBreakdown = inferUdlSplitTaxFromNet(
            taxableAmount,
            furtherTaxPercent,
            netAmount,
            gstPercent,
            advanceTaxPercent
        );
        const advanceBases = [
            netAmount,
            grossAmount,
            taxableAmount,
            taxableAmount > 0 ? taxableAmount * 1.22 : 0,
        ];
        const salesAmountSalesMatch = findClosestPercentMatch(rawSalesTaxAmount, [taxableAmount], [17, 18, 22]);
        const salesAmountAdvanceMatch = findClosestPercentMatch(rawSalesTaxAmount, advanceBases, [0.5, 0.61, 1, 2]);
        const advanceAmountSalesMatch = findClosestPercentMatch(rawAdvanceTaxAmount, [taxableAmount], [17, 18, 22]);
        const advanceAmountAdvanceMatch = findClosestPercentMatch(rawAdvanceTaxAmount, advanceBases, [0.5, 0.61, 1, 2]);

        const salesColumnLooksLikeAdvance =
            rawSalesTaxAmount > 0 &&
            salesAmountAdvanceMatch.distance + 0.35 < salesAmountSalesMatch.distance;
        const advanceColumnLooksLikeSales =
            rawAdvanceTaxAmount > 0 &&
            advanceAmountSalesMatch.distance + 0.75 < advanceAmountAdvanceMatch.distance;
        const explicitNetAmountFromRaw =
            rawSalesTaxAmount > 0 || rawAdvanceTaxAmount > 0
                ? roundMoney(
                    taxableAmount +
                    rawSalesTaxAmount +
                    roundMoney((taxableAmount * furtherTaxPercent) / 100) +
                    rawAdvanceTaxAmount
                )
                : 0;
        const explicitNetDifference =
            explicitNetAmountFromRaw > 0 && netAmount > 0
                ? Math.abs(explicitNetAmountFromRaw - netAmount)
                : Number.POSITIVE_INFINITY;
        const shouldUseNetDerivedBreakdown =
            !!netDerivedTaxBreakdown &&
            (
                explicitNetDifference > netDerivedTaxBreakdown.netDifference + 2 ||
                (salesColumnLooksLikeAdvance && rawAdvanceTaxAmount <= 0) ||
                (advanceColumnLooksLikeSales && rawSalesTaxAmount <= 0) ||
                ((salesColumnLooksLikeAdvance || advanceColumnLooksLikeSales) && netDerivedTaxBreakdown.netDifference <= 2)
            );

        if (shouldUseNetDerivedBreakdown && netDerivedTaxBreakdown) {
            gstPercent = netDerivedTaxBreakdown.gstPercent;
            advanceTaxPercent = netDerivedTaxBreakdown.advanceTaxPercent;
            rawSalesTaxAmount = normalizeUdlPrintedAmount(netDerivedTaxBreakdown.salesTaxAmount);
            rawAdvanceTaxAmount = normalizeUdlPrintedAmount(netDerivedTaxBreakdown.advanceTaxAmount);
        }

        if (!shouldUseNetDerivedBreakdown && salesColumnLooksLikeAdvance && advanceColumnLooksLikeSales) {
            const swapAmount = rawSalesTaxAmount;
            rawSalesTaxAmount = rawAdvanceTaxAmount;
            rawAdvanceTaxAmount = swapAmount;
        } else if (!shouldUseNetDerivedBreakdown && salesColumnLooksLikeAdvance && rawAdvanceTaxAmount <= 0) {
            rawAdvanceTaxAmount = rawSalesTaxAmount;
            rawSalesTaxAmount = 0;
        } else if (!shouldUseNetDerivedBreakdown && advanceColumnLooksLikeSales && rawSalesTaxAmount <= 0) {
            rawSalesTaxAmount = rawAdvanceTaxAmount;
            rawAdvanceTaxAmount = 0;
        }

        if ((gstPercent <= 0 || gstPercent < 10 || gstPercent > 30) && rawSalesTaxAmount > 0 && taxableAmount > 0) {
            const explicitSalesMatch = findClosestPercentMatch(rawSalesTaxAmount, [taxableAmount], [17, 18, 22]);
            gstPercent = explicitSalesMatch.distance <= 1.25 ? explicitSalesMatch.percent : 22;
        } else if (gstPercent > 0) {
            gstPercent = snapToKnownPercent(gstPercent, [17, 18, 22], 0.75);
        } else if (taxableAmount > 0 && netAmount > taxableAmount) {
            const inferredSalesTaxAmount = roundMoney(
                Math.max(netAmount - taxableAmount - rawAdvanceTaxAmount - roundMoney((taxableAmount * furtherTaxPercent) / 100), 0)
            );
            const inferredSalesMatch = findClosestPercentMatch(inferredSalesTaxAmount, [taxableAmount], [17, 18, 22]);
            gstPercent = inferredSalesMatch.distance <= 1.25 ? inferredSalesMatch.percent : 22;
        } else {
            gstPercent = 22;
        }

        const computedSalesTaxAmount = taxableAmount > 0 ? roundMoney((taxableAmount * gstPercent) / 100) : 0;
        const salesTaxAmount =
            rawSalesTaxAmount > 0 && isMoneyClose(rawSalesTaxAmount, computedSalesTaxAmount, 2.5, 0.03)
                ? roundMoney(rawSalesTaxAmount)
                : rawAdvanceTaxAmount > 0 && isMoneyClose(rawAdvanceTaxAmount, computedSalesTaxAmount, 2.5, 0.03)
                    ? roundMoney(rawAdvanceTaxAmount)
                    : computedSalesTaxAmount;
        const invoiceAmountBeforeAdvance = taxableAmount > 0 ? roundMoney(taxableAmount + salesTaxAmount + (taxableAmount * furtherTaxPercent) / 100) : 0;
        const nonAtlTaxBeforeAdvance = invoiceAmountBeforeAdvance > 0 ? roundMoney((invoiceAmountBeforeAdvance * nonAtlTaxPercent) / 100) : 0;
        const inferredAdvanceTaxAmount =
            invoiceAmountBeforeAdvance > 0 && netAmount > invoiceAmountBeforeAdvance
                ? roundMoney(Math.max(netAmount - invoiceAmountBeforeAdvance - nonAtlTaxBeforeAdvance, 0))
                : 0;
        const inferredAdvanceMatch = findClosestPercentMatch(
            inferredAdvanceTaxAmount,
            [invoiceAmountBeforeAdvance, netAmount],
            [0.5, 0.61, 1, 2]
        );
        const shouldPreferInferredAdvance =
            inferredAdvanceMatch.distance <= 0.35 &&
            (
                salesColumnLooksLikeAdvance ||
                rawAdvanceTaxAmount <= 0 ||
                advanceTaxPercent <= 0 ||
                advanceTaxPercent > 5
            );

        if (shouldPreferInferredAdvance) {
            advanceTaxPercent = inferredAdvanceMatch.percent;
        }

        if (!shouldPreferInferredAdvance && (advanceTaxPercent <= 0 || advanceTaxPercent > 5) && rawAdvanceTaxAmount > 0) {
            const explicitAdvanceMatch = findClosestPercentMatch(
                rawAdvanceTaxAmount,
                [invoiceAmountBeforeAdvance, netAmount, taxableAmount, grossAmount],
                [0.5, 0.61, 1, 2]
            );
            advanceTaxPercent = explicitAdvanceMatch.distance <= 0.35
                ? explicitAdvanceMatch.percent
                : chooseClosestKnownPercent(
                    rawAdvanceTaxAmount,
                    [invoiceAmountBeforeAdvance, netAmount, taxableAmount, grossAmount],
                    [0.5, 0.61, 1, 2],
                    0.2
                );
        } else if ((advanceTaxPercent <= 0 || advanceTaxPercent > 5) && inferredAdvanceTaxAmount > 0) {
            if (inferredAdvanceMatch.distance <= 0.35) {
                advanceTaxPercent = inferredAdvanceMatch.percent;
            }
        } else if (advanceTaxPercent > 0) {
            advanceTaxPercent = snapToKnownPercent(advanceTaxPercent, [0.5, 0.61, 1, 2], 0.2);
        }
    } else if (supplierLooksUdl && impliedTotalTaxPercent > 0 && impliedTotalTaxPercent <= 5) {
        const impliedPercent = snapPercent(impliedTotalTaxPercent);
        const advanceBases = [
            netAmount,
            grossAmount,
            taxableAmount,
            taxableAmount > 0 ? taxableAmount * 1.22 : 0,
        ];
        const salesColumnSalesMatch = findClosestPercentMatch(rawSalesTaxAmount, [taxableAmount], [17, 18, 22]);
        const salesColumnAdvanceMatch = findClosestPercentMatch(rawSalesTaxAmount, advanceBases, [0.5, 0.61, 1, 2]);
        const salesColumnIsAdvanceOnly =
            rawSalesTaxAmount > 0 &&
            rawAdvanceTaxAmount <= 0 &&
            salesColumnAdvanceMatch.distance <= 0.35 &&
            salesColumnAdvanceMatch.distance + 0.5 < salesColumnSalesMatch.distance;

        if (salesColumnIsAdvanceOnly) {
            rawAdvanceTaxAmount = rawSalesTaxAmount;
            rawSalesTaxAmount = 0;

            if (advanceTaxPercent <= 0 || advanceTaxPercent > 5) {
                advanceTaxPercent = salesColumnAdvanceMatch.percent || impliedPercent;
            }

            if (gstPercent > 0 && gstPercent <= 5) {
                gstPercent = 0;
            }
        }

        const currentTotalPercent = gstPercent + furtherTaxPercent + nonAtlTaxPercent + advanceTaxPercent;
        const usingAmountStyleColumns =
            rawSalesTaxAmount > 0 ||
            rawAdvanceTaxAmount > 0 ||
            (currentTotalPercent > 0 && impliedPercent < currentTotalPercent * 0.7);

        if (usingAmountStyleColumns || currentTotalPercent <= 0) {
            const explicitAmountTotal = rawSalesTaxAmount + rawAdvanceTaxAmount;

            if (explicitAmountTotal > 0) {
                gstPercent = rawSalesTaxAmount > 0 ? snapPercent(impliedPercent * (rawSalesTaxAmount / explicitAmountTotal)) : 0;
                advanceTaxPercent = rawAdvanceTaxAmount > 0 ? snapPercent(impliedPercent * (rawAdvanceTaxAmount / explicitAmountTotal)) : 0;
            } else {
                const onlyMinorTaxPresent =
                    gstPercent <= 5 &&
                    advanceTaxPercent <= 0 &&
                    furtherTaxPercent <= 0 &&
                    nonAtlTaxPercent <= 0;

                if (onlyMinorTaxPresent) {
                    gstPercent = 0;
                    advanceTaxPercent = impliedPercent;
                } else if (currentTotalPercent <= 0) {
                    advanceTaxPercent = impliedPercent;
                }
            }
        }

        if (advanceTaxPercent <= 0 && gstPercent > 0 && gstPercent <= 5 && rawSalesTaxAmount <= 0) {
            advanceTaxPercent = snapPercent(gstPercent);
            gstPercent = 0;
        }

        if (nonAtlTaxPercent > 0 && nonAtlTaxPercent < 1 && advanceTaxPercent <= 0) {
            advanceTaxPercent = snapPercent(nonAtlTaxPercent);
            nonAtlTaxPercent = 0;
        }
    }

    const computedSalesTaxAmount = taxableAmount > 0 ? roundMoney((taxableAmount * gstPercent) / 100) : 0;
    let salesTaxAmount =
        rawSalesTaxAmount > 0
            ? roundMoney(rawSalesTaxAmount)
            : computedSalesTaxAmount;
    let usedRawSalesForSales = rawSalesTaxAmount > 0 && salesTaxAmount === roundMoney(rawSalesTaxAmount);
    let usedRawAdvanceForSales = false;

    if (supplierLooksUdl && udlHighTaxHint && computedSalesTaxAmount > 0) {
        const rawSalesCandidate = rawSalesTaxAmount > 0 ? roundMoney(rawSalesTaxAmount) : 0;
        const rawAdvanceCandidate = rawAdvanceTaxAmount > 0 ? roundMoney(rawAdvanceTaxAmount) : 0;

        if (rawSalesCandidate > 0 && isMoneyClose(rawSalesCandidate, computedSalesTaxAmount, 2.5, 0.03)) {
            salesTaxAmount = rawSalesCandidate;
            usedRawSalesForSales = true;
        } else if (rawAdvanceCandidate > 0 && isMoneyClose(rawAdvanceCandidate, computedSalesTaxAmount, 2.5, 0.03)) {
            salesTaxAmount = rawAdvanceCandidate;
            usedRawSalesForSales = false;
            usedRawAdvanceForSales = true;
        } else {
            salesTaxAmount = computedSalesTaxAmount;
            usedRawSalesForSales = false;
        }

        salesTaxAmount = normalizeUdlPrintedAmount(salesTaxAmount);
    }

    const furtherTaxAmount = taxableAmount > 0 ? roundMoney((taxableAmount * furtherTaxPercent) / 100) : 0;
    const invoiceAmount = taxableAmount > 0 ? roundMoney(taxableAmount + salesTaxAmount + furtherTaxAmount) : 0;
    const nonAtlTaxAmount = invoiceAmount > 0 ? roundMoney((invoiceAmount * nonAtlTaxPercent) / 100) : 0;
    const computedAdvanceTaxAmount =
        invoiceAmount > 0
            ? roundMoney((invoiceAmount * advanceTaxPercent) / 100)
            : 0;
    const residualAdvanceTaxAmount =
        netAmount > 0 && invoiceAmount > 0
            ? roundMoney(Math.max(netAmount - invoiceAmount - nonAtlTaxAmount, 0))
            : 0;
    let advanceTaxAmount =
        rawAdvanceTaxAmount > 0
            ? roundMoney(rawAdvanceTaxAmount)
            : computedAdvanceTaxAmount;

    if (supplierLooksUdl && udlHighTaxHint) {
        const rawAdvanceCandidates: number[] = [];

        if (rawSalesTaxAmount > 0 && !usedRawSalesForSales) {
            rawAdvanceCandidates.push(roundMoney(rawSalesTaxAmount));
        }

        if (rawAdvanceTaxAmount > 0 && !usedRawAdvanceForSales) {
            rawAdvanceCandidates.push(roundMoney(rawAdvanceTaxAmount));
        }

        const advanceTarget = computedAdvanceTaxAmount > 0 ? computedAdvanceTaxAmount : residualAdvanceTaxAmount;
        const closestRawAdvance = advanceTarget > 0 ? pickClosestMoneyValue(advanceTarget, rawAdvanceCandidates) : 0;

        if (closestRawAdvance > 0 && isMoneyClose(closestRawAdvance, advanceTarget, 1.5, 0.08)) {
            advanceTaxAmount = closestRawAdvance;
        } else if (advanceTarget > 0) {
            advanceTaxAmount = advanceTarget;
        } else if (residualAdvanceTaxAmount > 0) {
            advanceTaxAmount = residualAdvanceTaxAmount;
        }

        advanceTaxAmount = normalizeUdlPrintedAmount(advanceTaxAmount);
    }

    const resolvedNetAmount =
        netAmount > 0
            ? roundMoney(netAmount)
            : invoiceAmount > 0
                ? roundMoney(invoiceAmount + advanceTaxAmount + nonAtlTaxAmount)
                : 0;

    return {
        discountPercent,
        gstPercent,
        furtherTaxPercent,
        nonAtlTaxPercent,
        advanceTaxPercent,
        discountAmount,
        productDiscountAmount,
        salesTaxAmount,
        advanceTaxAmount,
        grossAmount,
        invoiceAmount,
        netAmount: resolvedNetAmount,
        profile: supplierLooksUdl && udlHighTaxHint ? "udl_split_discount" : supplierLooksUdl ? "udl" : "",
    };
}

function normalizeInvoiceItem(rawItem: AnyRecord, supplierName = "") {
    const rawName = pickFirstText(rawItem.name, rawItem.productName, rawItem.description, rawItem.medicineName);
    const rawItemCode = pickFirstText(rawItem.itemCode, rawItem.item_code, rawItem.code, rawItem.productCode);
    const rawPacking = pickFirstText(rawItem.packing, rawItem.pack, rawItem.packSize, rawItem.packingSize);
    const rawBatch = pickFirstText(rawItem.batch, rawItem.batchNo, rawItem.batch_number);
    const rawText = pickFirstText(rawItem.text, rawItem.rawText, rawItem.lineText, rawItem.rowText, rawItem.fullText);
    const rawExpiry = pickFirstText(rawItem.expiry, rawItem.expiryDate, rawItem.expDate, extractExpiryFromRowText(rawText));
    const rawMfgDate = pickFirstText(rawItem.mfgDate, rawItem.mfg, rawItem.manufacturingDate);
    const rawFurtherTaxAmount = normalizeNumber(
        pickFirstNumber(rawItem.furtherTaxAmount, rawItem.frtTaxAmount, rawItem.furtherTax, rawItem.furtherTaxAmt),
        0
    );
    const { itemCode, name } = extractItemCodeAndName(rawName, rawItemCode);
    const { batch, expiry } = splitBatchAndExpiry(rawBatch, rawExpiry);
    const { qty, bonus, rate, netAmount, rowAmount } = normalizeLineNumbers(rawItem, supplierName);
    const taxFields = inferTaxPercents(rawItem, qty, rate, netAmount, rowAmount, supplierName);
    const resolvedAmount = rowAmount > 0 ? rowAmount : taxFields.grossAmount;

    return {
        ...rawItem,
        itemCode,
        name,
        packing: rawPacking,
        batch,
        qty,
        bonus,
        rate,
        amount: resolvedAmount,
        tpValue: resolvedAmount,
        discountAmount: taxFields.discountAmount,
        productDiscountAmount: taxFields.productDiscountAmount,
        salesTaxAmount: taxFields.salesTaxAmount,
        furtherTaxAmount: rawFurtherTaxAmount,
        advanceTaxAmount: taxFields.advanceTaxAmount,
        discountPercent: taxFields.discountPercent,
        gstPercent: taxFields.gstPercent,
        furtherTaxPercent: taxFields.furtherTaxPercent,
        nonAtlTaxPercent: taxFields.nonAtlTaxPercent,
        advanceTaxPercent: taxFields.advanceTaxPercent,
        invoiceProfile: taxFields.profile,
        net: taxFields.netAmount,
        netAmount: taxFields.netAmount,
        expiry,
        mfgDate: normalizeDocumentDate(rawMfgDate),
    };
}

function normalizeKey(value: unknown) {
    return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeBatchKey(value: unknown) {
    return cleanText(value, "B-NEW").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function batchKeysRoughlyMatch(left: unknown, right: unknown) {
    const leftKey = normalizeBatchKey(left);
    const rightKey = normalizeBatchKey(right);

    if (!leftKey || !rightKey || leftKey === "bnew" || rightKey === "bnew") {
        return false;
    }

    return (
        leftKey === rightKey ||
        leftKey.startsWith(rightKey) ||
        rightKey.startsWith(leftKey) ||
        (leftKey.length >= 5 && rightKey.length >= 5 && leftKey.slice(0, 5) === rightKey.slice(0, 5))
    );
}

function looksLikeSuspiciousBonusArtifact(item: AnyRecord, invoiceTotal: number) {
    if (!(item.qty > 0) || !(invoiceTotal > 0)) {
        return false;
    }

    const roundedInvoiceTotal = Math.round(invoiceTotal);
    const roundedNet = Math.round(normalizeNumber(item.netAmount));
    const roundedRate = Math.round(normalizeNumber(item.rate));

    return (
        roundedNet === roundedInvoiceTotal ||
        roundedRate === roundedInvoiceTotal ||
        normalizeNumber(item.netAmount) >= invoiceTotal * 0.75 ||
        normalizeNumber(item.rate) >= invoiceTotal * 0.75
    );
}

function canTreatAsBonusOnlyRow(item: AnyRecord, invoiceTotal: number) {
    const noMeaningfulFinancials =
        normalizeNumber(item.rate) <= 0 &&
        normalizeNumber(item.netAmount) <= 0 &&
        normalizeNumber(item.discountPercent) <= 0 &&
        normalizeNumber(item.gstPercent) <= 0 &&
        normalizeNumber(item.advanceTaxPercent) <= 0;

    return item.bonus > 0 || noMeaningfulFinancials || looksLikeSuspiciousBonusArtifact(item, invoiceTotal);
}

function mergeBonusSectionItems(items: AnyRecord[], invoiceTotal: number) {
    const merged: AnyRecord[] = [];

    for (const currentItem of items) {
        const item = { ...currentItem };
        const itemNameKey = normalizeKey(item.name);
        let mergedIntoExisting = false;

        if (itemNameKey && (item.qty > 0 || item.bonus > 0)) {
            for (let index = merged.length - 1; index >= 0; index -= 1) {
                const candidate = merged[index];
                if (normalizeKey(candidate.name) !== itemNameKey) {
                    continue;
                }

                const sameBatch =
                    batchKeysRoughlyMatch(candidate.batch, item.batch) ||
                    candidate.batch === "B-NEW" ||
                    item.batch === "B-NEW";

                if (!sameBatch || !canTreatAsBonusOnlyRow(item, invoiceTotal)) {
                    continue;
                }

                candidate.bonus = normalizeInteger(candidate.bonus) + Math.max(normalizeInteger(item.bonus), normalizeInteger(item.qty), 1);
                if ((!candidate.batch || candidate.batch === "B-NEW") && item.batch) {
                    candidate.batch = item.batch;
                }
                if ((!candidate.expiry || candidate.expiry === "") && item.expiry) {
                    candidate.expiry = item.expiry;
                }

                mergedIntoExisting = true;
                break;
            }
        }

        if (mergedIntoExisting) {
            continue;
        }

        const keepAsSeparateBonusRow =
            itemNameKey &&
            canTreatAsBonusOnlyRow(item, invoiceTotal) &&
            normalizeInteger(item.bonus) <= 0 &&
            normalizeInteger(item.qty) > 0 &&
            normalizeNumber(item.rate) <= 0 &&
            normalizeNumber(item.netAmount) <= 0;

        if (keepAsSeparateBonusRow) {
            item.bonus = normalizeInteger(item.qty);
            item.qty = 0;
        }

        const isDroppedDuplicate =
            normalizeInteger(item.qty) <= 0 &&
            normalizeInteger(item.bonus) <= 0 &&
            normalizeNumber(item.rate) <= 0 &&
            normalizeNumber(item.netAmount) <= 0 &&
            looksLikeSuspiciousBonusArtifact(currentItem, invoiceTotal);

        if (!isDroppedDuplicate) {
            merged.push(item);
        }
    }

    return merged;
}

function normalizeInvoice(rawInvoice: AnyRecord) {
    const supplierName = pickFirstText(rawInvoice.supplierName, rawInvoice.supplier, rawInvoice.vendorName, rawInvoice.companyName);
    const initialItems = Array.isArray(rawInvoice.items) ? rawInvoice.items.map((item) => normalizeInvoiceItem(item, supplierName)) : [];
    const invoiceNo = pickFirstText(rawInvoice.invoiceNo, rawInvoice.invoice_number, rawInvoice.invNo, rawInvoice.inv_no);
    const supplyId = pickFirstText(rawInvoice.supplyId, rawInvoice.supply_id, rawInvoice.shipmentId, rawInvoice.shipment_id);
    const documentDate = pickFirstText(rawInvoice.date, rawInvoice.invoiceDate, rawInvoice.invDate, rawInvoice.shipmentDate);
    const total = normalizeNumber(rawInvoice.total, 0) || initialItems.reduce((sum, item) => sum + normalizeNumber(item.net ?? item.netAmount, 0), 0);
    const items = mergeBonusSectionItems(
        initialItems.filter((item) => !looksLikeSectionHeaderItem(item, item.name) && hasMeaningfulInvoiceRowSignals(item)),
        total
    );

    return {
        ...rawInvoice,
        supplierName,
        invoiceNo,
        supplyId,
        date: normalizeDocumentDate(documentDate, supplyId),
        total,
        items,
    };
}

type NormalizeOcrOptions = {
    sourceFile?: string;
};

let manualOverridesCache: AnyRecord | null = null;

function loadManualOverrides() {
    if (manualOverridesCache) {
        return manualOverridesCache;
    }

    try {
        const overridesPath = path.join(process.cwd(), "folder_1_manual_overrides.json");
        const parsed = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
        manualOverridesCache = parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        manualOverridesCache = {};
    }

    return manualOverridesCache;
}

function applyManualOverridesToRawInvoices(rawInvoices: AnyRecord[], sourceFile?: string) {
    const normalizedSource = cleanText(sourceFile);
    if (!normalizedSource || !rawInvoices.length) {
        return rawInvoices;
    }

    const fileOverrides = loadManualOverrides()?.[path.basename(normalizedSource)];
    if (!fileOverrides || typeof fileOverrides !== "object") {
        return rawInvoices;
    }

    const invoiceOverride = fileOverrides._invoice || fileOverrides.invoice;

    return rawInvoices.map((rawInvoice, invoiceIndex) => {
        const invoiceWithOverride =
            invoiceIndex === 0 && invoiceOverride && typeof invoiceOverride === "object"
                ? { ...rawInvoice, ...invoiceOverride }
                : rawInvoice;

        const items = Array.isArray(invoiceWithOverride.items)
            ? invoiceWithOverride.items.map((rawItem: AnyRecord, itemIndex: number) => {
                const itemOverride = fileOverrides[String(itemIndex)];
                if (!itemOverride || typeof itemOverride !== "object") {
                    return rawItem;
                }

                const mergedItem = {
                    ...rawItem,
                    ...itemOverride,
                };

                if (itemOverride.forceProductName) {
                    mergedItem.name = itemOverride.forceProductName;
                }

                if (itemOverride.netAmount !== undefined && itemOverride.net === undefined) {
                    mergedItem.net = itemOverride.netAmount;
                }

                return mergedItem;
            })
            : [];

        return {
            ...invoiceWithOverride,
            items,
        };
    });
}

export function normalizePharmaInvoiceOcrData(payload: AnyRecord, options: NormalizeOcrOptions = {}) {
    const rawInvoices = Array.isArray(payload?.invoices)
        ? payload.invoices
        : Array.isArray(payload?.items)
            ? [payload]
            : [];
    const adjustedRawInvoices = applyManualOverridesToRawInvoices(rawInvoices, options.sourceFile);

    return {
        ...payload,
        invoices: adjustedRawInvoices.map(normalizeInvoice),
    };
}
