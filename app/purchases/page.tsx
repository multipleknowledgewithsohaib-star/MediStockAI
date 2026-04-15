"use client";

import { useState } from "react";
import {
    Edit,
    History,
    FileText,
    Plus,
    X,
    Search,
    Upload,
    ChevronDown,
    Save,
    Pill,
    Loader2,
    CheckCircle2,
    ScanLine,
    Calendar,
    Package,
    ArrowRight,
    AlertCircle,
    Trash2,
    Sparkles
} from "lucide-react";
import { useData } from "@/lib/hooks";
import ExpiryScanner from "@/components/expiry/ExpiryScanner";
import { storage } from "@/lib/storage";
import Script from "next/script";
import { useRef, useCallback, useEffect } from "react";
import { compressImage } from "@/lib/imageUtils";
import { purchaseService } from "@/lib/services/purchase.service";

const LEGACY_PURCHASE_PREFIXES = ["INV-1755580", "INV-1775580"];

const getSimilarity = (s1: string, s2: string) => {
    if (!s1 || !s2) return 0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;

    const bigrams = (str: string) => {
        const result = [];
        for (let i = 0; i < str.length - 1; i++) result.push(str.slice(i, i + 2));
        return result;
    };

    const s1Bigrams = bigrams(s1.toLowerCase());
    const s2Bigrams = bigrams(s2.toLowerCase());

    let intersection = 0;
    s1Bigrams.forEach(bg1 => {
        if (s2Bigrams.includes(bg1)) intersection++;
    });

    return (2.0 * intersection) / (s1Bigrams.length + s2Bigrams.length);
};

const normalizeMatchKey = (value: any) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const parseNumericValue = (...values: any[]) => {
    for (const value of values) {
        if (value === null || value === undefined || value === "") {
            continue;
        }

        const parsed = Number(String(value).replace(/,/g, "").trim());
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return 0;
};

const roundCurrency = (value: number) => Number((Number.isFinite(value) ? value : 0).toFixed(2));

const moneyDistance = (value: number, target: number) => Math.abs(roundCurrency(value) - roundCurrency(target));

const moneyTolerance = (target: number, minimum = 1.25, ratio = 0.03) => Math.max(minimum, Math.abs(target) * ratio);

const isMoneyClose = (value: number, target: number, minimum = 1.25, ratio = 0.03) => {
    if (!(value > 0) || !(target > 0)) {
        return false;
    }

    return moneyDistance(value, target) <= moneyTolerance(target, minimum, ratio);
};

const findClosestPercentMatch = (amount: number, bases: number[], knownRates: number[]) => {
    const bestMatch = {
        percent: 0,
        distance: Number.POSITIVE_INFINITY
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
            bestMatch.distance = distance;
        }
    }

    return bestMatch;
};

const pushUniquePercent = (target: number[], value: number, tolerance = 0.05) => {
    if (!(value >= 0)) {
        return;
    }

    if (target.some((existing) => Math.abs(existing - value) <= tolerance)) {
        return;
    }

    target.push(value);
};

const inferClosestLineTaxScenario = ({
    taxableAmount,
    detectedNetAmount,
    nonAtlTaxPercent,
    preferredGstPercent,
    preferredFurtherTaxPercent,
    preferredAdvTaxPercent,
    looksLikeUdlProfile,
    rawSalesTaxAmount,
    rawAdvanceTaxAmount
}: {
    taxableAmount: number;
    detectedNetAmount: number;
    nonAtlTaxPercent: number;
    preferredGstPercent: number;
    preferredFurtherTaxPercent: number;
    preferredAdvTaxPercent: number;
    looksLikeUdlProfile: boolean;
    rawSalesTaxAmount: number;
    rawAdvanceTaxAmount: number;
}) => {
    if (!(taxableAmount > 0) || !(detectedNetAmount > 0)) {
        return null;
    }

    const netGrowthPercent =
        detectedNetAmount > taxableAmount
            ? ((detectedNetAmount - taxableAmount) / taxableAmount) * 100
            : 0;

    const salesCandidates: number[] = [];
    const furtherCandidates: number[] = [];
    const advanceCandidates: number[] = [];

    pushUniquePercent(salesCandidates, 0);
    pushUniquePercent(salesCandidates, preferredGstPercent);

    if (
        rawSalesTaxAmount > 0 ||
        preferredGstPercent >= 10 ||
        netGrowthPercent >= 10 ||
        looksLikeUdlProfile
    ) {
        [17, 18, 22].forEach((value) => pushUniquePercent(salesCandidates, value));
    }

    pushUniquePercent(furtherCandidates, preferredFurtherTaxPercent);
    pushUniquePercent(furtherCandidates, 0);

    if (
        preferredFurtherTaxPercent > 0 ||
        ((preferredGstPercent >= 10 || netGrowthPercent >= 20) && !looksLikeUdlProfile)
    ) {
        [3, 4].forEach((value) => pushUniquePercent(furtherCandidates, value));
    }

    pushUniquePercent(advanceCandidates, 0);
    pushUniquePercent(advanceCandidates, preferredAdvTaxPercent);

    if (
        rawAdvanceTaxAmount > 0 ||
        preferredAdvTaxPercent > 0 ||
        netGrowthPercent > 0.2 ||
        looksLikeUdlProfile
    ) {
        [0.5, 0.61, 1, 2].forEach((value) => pushUniquePercent(advanceCandidates, value));
    }

    let bestScenario: {
        gstPercent: number;
        furtherTaxPercent: number;
        advTaxPercent: number;
        gstAmount: number;
        advTaxAmount: number;
        difference: number;
        score: number;
    } | null = null;

    for (const salesPercent of salesCandidates) {
        const expectedSalesTaxAmount = taxableAmount > 0 ? roundCurrency((taxableAmount * salesPercent) / 100) : 0;
        const salesTaxAmount =
            rawSalesTaxAmount > 0 && isMoneyClose(rawSalesTaxAmount, expectedSalesTaxAmount, 2.5, 0.03)
                ? roundCurrency(rawSalesTaxAmount)
                : expectedSalesTaxAmount;

        for (const furtherTaxPercent of furtherCandidates) {
            const furtherTaxAmount = taxableAmount > 0 ? roundCurrency((taxableAmount * furtherTaxPercent) / 100) : 0;
            const invoiceAmount = roundCurrency(taxableAmount + salesTaxAmount + furtherTaxAmount);
            const nonAtlTaxAmount = invoiceAmount > 0 ? roundCurrency((invoiceAmount * nonAtlTaxPercent) / 100) : 0;

            for (const advTaxPercent of advanceCandidates) {
                const expectedAdvanceTaxAmount = invoiceAmount > 0 ? roundCurrency((invoiceAmount * advTaxPercent) / 100) : 0;
                const advanceTaxAmount =
                    rawAdvanceTaxAmount > 0 && isMoneyClose(rawAdvanceTaxAmount, expectedAdvanceTaxAmount, 1.5, 0.08)
                        ? roundCurrency(rawAdvanceTaxAmount)
                        : expectedAdvanceTaxAmount;
                const totalAmount = roundCurrency(invoiceAmount + advanceTaxAmount + nonAtlTaxAmount);
                const difference = Math.abs(totalAmount - detectedNetAmount);

                let score = difference;

                if (salesPercent > 0 && preferredGstPercent <= 0 && rawSalesTaxAmount <= 0 && netGrowthPercent < 10) {
                    score += 0.75;
                }

                if (furtherTaxPercent > 0 && preferredFurtherTaxPercent <= 0 && netGrowthPercent < 18) {
                    score += 0.5;
                }

                if (advTaxPercent > 0 && preferredAdvTaxPercent <= 0 && rawAdvanceTaxAmount <= 0 && netGrowthPercent < 0.25) {
                    score += 0.5;
                }

                if (
                    !bestScenario ||
                    score < bestScenario.score ||
                    (Math.abs(score - bestScenario.score) <= 0.01 && difference < bestScenario.difference)
                ) {
                    bestScenario = {
                        gstPercent: salesPercent,
                        furtherTaxPercent,
                        advTaxPercent,
                        gstAmount: salesTaxAmount,
                        advTaxAmount: advanceTaxAmount,
                        difference,
                        score
                    };
                }
            }
        }
    }

    return bestScenario;
};

const resolveDisplayedTaxAmounts = ({
    item,
    grossAmount,
    taxableAmount,
    detectedNetAmount,
    gstPercent,
    furtherTaxPercent,
    nonAtlTaxPercent,
    advTaxPercent,
    detectedSalesTaxAmount,
    detectedAdvanceTaxAmount
}: {
    item: any;
    grossAmount: number;
    taxableAmount: number;
    detectedNetAmount: number;
    gstPercent: number;
    furtherTaxPercent: number;
    nonAtlTaxPercent: number;
    advTaxPercent: number;
    detectedSalesTaxAmount: number;
    detectedAdvanceTaxAmount: number;
}) => {
    let resolvedGstPercent = gstPercent;
    let resolvedAdvTaxPercent = advTaxPercent;
    let rawSalesTaxAmount = detectedSalesTaxAmount;
    let rawAdvanceTaxAmount = detectedAdvanceTaxAmount;
    const invoiceProfile = String(item?.invoiceProfile || item?.detected?.invoiceProfile || "").toLowerCase();
    const looksLikeUdlProfile = invoiceProfile.startsWith("udl");

    const advanceBases = [
        detectedNetAmount,
        grossAmount,
        taxableAmount,
        taxableAmount > 0 ? taxableAmount * 1.22 : 0
    ];
    const salesAsSalesMatch = findClosestPercentMatch(rawSalesTaxAmount, [taxableAmount], [17, 18, 22]);
    const salesAsAdvanceMatch = findClosestPercentMatch(rawSalesTaxAmount, advanceBases, [0.5, 0.61, 1, 2]);
    const shouldMoveSalesIntoAdvance =
        rawSalesTaxAmount > 0 &&
        rawAdvanceTaxAmount <= 0 &&
        (
            (looksLikeUdlProfile && salesAsAdvanceMatch.distance <= 0.35 && salesAsAdvanceMatch.distance + 0.5 < salesAsSalesMatch.distance) ||
            (resolvedGstPercent > 0 && resolvedGstPercent <= 5 && resolvedAdvTaxPercent <= 0 && salesAsAdvanceMatch.distance <= 0.35)
        );

    if (shouldMoveSalesIntoAdvance) {
        rawAdvanceTaxAmount = rawSalesTaxAmount;
        rawSalesTaxAmount = 0;

        if (resolvedAdvTaxPercent <= 0) {
            resolvedAdvTaxPercent = salesAsAdvanceMatch.percent;
        }

        if (resolvedGstPercent > 0 && resolvedGstPercent <= 5) {
            resolvedGstPercent = 0;
        }
    }

    let resolvedFurtherTaxPercent = furtherTaxPercent;
    let computedGstAmount = taxableAmount > 0 ? roundCurrency((taxableAmount * resolvedGstPercent) / 100) : 0;
    let gstAmount =
        rawSalesTaxAmount > 0 && (computedGstAmount <= 0 || isMoneyClose(rawSalesTaxAmount, computedGstAmount, 2.5, 0.03))
            ? roundCurrency(rawSalesTaxAmount)
            : computedGstAmount;

    let furtherTaxAmount = roundCurrency((taxableAmount * resolvedFurtherTaxPercent) / 100);
    let invoiceAmountBeforeAdvance = roundCurrency(taxableAmount + gstAmount + furtherTaxAmount);
    let computedAdvanceTaxAmount =
        invoiceAmountBeforeAdvance > 0
            ? roundCurrency((invoiceAmountBeforeAdvance * resolvedAdvTaxPercent) / 100)
            : 0;
    const nonAtlTaxAmount = invoiceAmountBeforeAdvance > 0 ? roundCurrency((invoiceAmountBeforeAdvance * nonAtlTaxPercent) / 100) : 0;
    const residualAdvanceTaxAmount =
        detectedNetAmount > 0 && invoiceAmountBeforeAdvance > 0
            ? roundCurrency(Math.max(detectedNetAmount - invoiceAmountBeforeAdvance - nonAtlTaxAmount, 0))
            : 0;

    let advTaxAmount =
        rawAdvanceTaxAmount > 0 && (computedAdvanceTaxAmount <= 0 || isMoneyClose(rawAdvanceTaxAmount, computedAdvanceTaxAmount, 1.5, 0.08))
            ? roundCurrency(rawAdvanceTaxAmount)
            : computedAdvanceTaxAmount > 0
                ? computedAdvanceTaxAmount
                : residualAdvanceTaxAmount;

    if (rawSalesTaxAmount > 0 && gstAmount !== roundCurrency(rawSalesTaxAmount)) {
        const advanceTarget = computedAdvanceTaxAmount > 0 ? computedAdvanceTaxAmount : residualAdvanceTaxAmount;
        if (advanceTarget > 0 && isMoneyClose(rawSalesTaxAmount, advanceTarget, 1.5, 0.08)) {
            advTaxAmount = roundCurrency(rawSalesTaxAmount);
        }
    }

    const currentTotal = roundCurrency(invoiceAmountBeforeAdvance + advTaxAmount + nonAtlTaxAmount);
    const currentDifference =
        detectedNetAmount > 0
            ? Math.abs(currentTotal - detectedNetAmount)
            : Number.POSITIVE_INFINITY;
    const inferredScenario = inferClosestLineTaxScenario({
        taxableAmount,
        detectedNetAmount,
        nonAtlTaxPercent,
        preferredGstPercent: resolvedGstPercent,
        preferredFurtherTaxPercent: resolvedFurtherTaxPercent,
        preferredAdvTaxPercent: resolvedAdvTaxPercent,
        looksLikeUdlProfile,
        rawSalesTaxAmount,
        rawAdvanceTaxAmount
    });

    if (
        inferredScenario &&
        detectedNetAmount > 0 &&
        (
            inferredScenario.difference + 0.75 < currentDifference ||
            currentDifference > 2.5
        )
    ) {
        resolvedGstPercent = inferredScenario.gstPercent;
        resolvedFurtherTaxPercent = inferredScenario.furtherTaxPercent;
        resolvedAdvTaxPercent = inferredScenario.advTaxPercent;
        gstAmount = inferredScenario.gstAmount;
        furtherTaxAmount = roundCurrency((taxableAmount * resolvedFurtherTaxPercent) / 100);
        invoiceAmountBeforeAdvance = roundCurrency(taxableAmount + gstAmount + furtherTaxAmount);
        computedAdvanceTaxAmount = invoiceAmountBeforeAdvance > 0 ? roundCurrency((invoiceAmountBeforeAdvance * resolvedAdvTaxPercent) / 100) : 0;
        advTaxAmount =
            rawAdvanceTaxAmount > 0 && (computedAdvanceTaxAmount <= 0 || isMoneyClose(rawAdvanceTaxAmount, computedAdvanceTaxAmount, 1.5, 0.08))
                ? roundCurrency(rawAdvanceTaxAmount)
                : inferredScenario.advTaxAmount;
    }

    return {
        gstPercent: resolvedGstPercent,
        furtherTaxPercent: resolvedFurtherTaxPercent,
        advTaxPercent: resolvedAdvTaxPercent,
        gstAmount,
        advTaxAmount
    };
};

const computePurchaseLineAmounts = (item: any) => {
    const qty = parseNumericValue(item.quantity, item.qty);
    const bonus = parseNumericValue(item.bonusQty, item.bonus);
    const price = parseNumericValue(item.purchasePrice, item.rate);
    const detectedTpValue = parseNumericValue(item.tpValue, item.amount);
    const detectedDiscountAmount = parseNumericValue(item.discountInvAmount, item.discountAmount);
    const detectedProductDiscountAmount = parseNumericValue(item.productDiscountAmount);
    const detectedSalesTaxAmount = parseNumericValue(item.salesTaxAmount, item.gstAmount);
    const detectedFurtherTaxAmount = parseNumericValue(item.furtherTaxAmount, item.furtherTax, item.frtTaxAmount);
    const detectedAdvanceTaxAmount = parseNumericValue(item.advanceTaxAmount, item.advTaxAmount);
    const detectedNetAmount = parseNumericValue(item.netAmount, item.net);
    const discountPercent = parseNumericValue(item.discountPercent);
    const gstPercent = parseNumericValue(item.gstPercent, item.taxPercent);
    const furtherTaxPercent = parseNumericValue(item.furtherTaxPercent);
    const nonAtlTaxPercent = parseNumericValue(item.nonAtlTaxPercent);
    const advTaxPercent = parseNumericValue(item.advTaxPercent, item.advanceTaxPercent);
    const totalQty = qty + bonus;

    const grossAmount = roundCurrency(detectedTpValue > 0 ? detectedTpValue : qty * price);
    const discountAmount = roundCurrency(detectedDiscountAmount > 0 ? detectedDiscountAmount : (grossAmount * discountPercent) / 100);
    const productDiscountAmount = roundCurrency(detectedProductDiscountAmount);
    const taxableAmount = roundCurrency(grossAmount - discountAmount - productDiscountAmount);
    const resolvedTaxAmounts = resolveDisplayedTaxAmounts({
        item,
        grossAmount,
        taxableAmount,
        detectedNetAmount,
        gstPercent,
        furtherTaxPercent,
        nonAtlTaxPercent,
        advTaxPercent,
        detectedSalesTaxAmount,
        detectedAdvanceTaxAmount
    });
    const gstAmount = resolvedTaxAmounts.gstAmount;
    const resolvedFurtherTaxPercent = resolvedTaxAmounts.furtherTaxPercent;
    const furtherTaxAmount = detectedFurtherTaxAmount > 0
        ? roundCurrency(detectedFurtherTaxAmount)
        : roundCurrency((taxableAmount * resolvedFurtherTaxPercent) / 100);
    const invoiceAmount = roundCurrency(taxableAmount + gstAmount + furtherTaxAmount);
    const advTaxAmount = resolvedTaxAmounts.advTaxAmount;
    const nonAtlTaxAmount = roundCurrency((invoiceAmount * nonAtlTaxPercent) / 100);
    const computedNetAmount = roundCurrency(invoiceAmount + advTaxAmount + nonAtlTaxAmount);
    const netAmount =
        detectedNetAmount > 0 && Math.abs(detectedNetAmount - computedNetAmount) <= 1
            ? roundCurrency(detectedNetAmount)
            : computedNetAmount;
    const effectiveCost = totalQty > 0 ? roundCurrency(netAmount / totalQty) : 0;

    return {
        qty,
        bonus,
        price,
        totalQty,
        discountPercent,
        gstPercent: resolvedTaxAmounts.gstPercent,
        furtherTaxPercent: resolvedFurtherTaxPercent,
        nonAtlTaxPercent,
        advTaxPercent: resolvedTaxAmounts.advTaxPercent,
        grossAmount,
        tpValue: grossAmount,
        mrpValue: "",
        discountAmount,
        discountInvAmount: discountAmount,
        productDiscountAmount,
        taxableAmount,
        gstAmount,
        salesTaxAmount: gstAmount,
        furtherTaxAmount,
        invoiceAmount,
        advTaxAmount,
        advanceTaxAmount: advTaxAmount,
        nonAtlTaxAmount,
        netAmount,
        effectiveCost
    };
};

export default function PurchasesPage() {
    const [showForm, setShowForm] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [currentScanIdx, setCurrentScanIdx] = useState<number | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [isAiSupplierMatched, setIsAiSupplierMatched] = useState(false);
    const [isAiInvMatched, setIsAiInvMatched] = useState(false);
    const [isAiDateMatched, setIsAiDateMatched] = useState(false);
    const [loadingText, setLoadingText] = useState("Analyzing Invoice...");
    const [loadingSubText, setLoadingSubText] = useState("Extracting medicines, quantities, and prices");
    const [isScanningCarton, setIsScanningCarton] = useState(false);
    const [detectedSupplierName, setDetectedSupplierName] = useState<string | null>(null);
    const [detectedInvoiceNo, setDetectedInvoiceNo] = useState<string | null>(null);
    const [detectedDate, setDetectedDate] = useState<string | null>(null);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [resolveSearch, setResolveSearch] = useState("");
    const [editingPurchase, setEditingPurchase] = useState<any | null>(null);


    const { data: suppliers, refetch: refetchSuppliers } = useData<any[]>("/api/suppliers");
    const { data: products, refetch: refetchProducts } = useData<any[]>("/api/products");
    const { data: aliases, refetch: refetchAliases } = useData<any[]>("/api/products/aliases");
    const { data: purchaseHistory, refetch: refetchHistory } = useData<any[]>("/api/purchases");
    const getPurchaseSortTime = (purchase: any) => {
        if (purchase?.createdAt) {
            const createdAt = new Date(purchase.createdAt).getTime();
            if (!Number.isNaN(createdAt)) return createdAt;
        }

        if (purchase?.invoiceNo?.startsWith?.("INV-") && purchase?.id) {
            const numericId = Number(purchase.id);
            if (!Number.isNaN(numericId) && numericId > 0) return numericId;
        }

        if (purchase?.date) {
            const dateValue = new Date(purchase.date).getTime();
            if (!Number.isNaN(dateValue)) return dateValue;
        }

        const fallbackId = Number(purchase?.id);
        return Number.isNaN(fallbackId) ? 0 : fallbackId;
    };

    const sortedPurchaseHistory = [...(purchaseHistory || [])].sort((left: any, right: any) => {
        const leftIsManualOcr = left?.invoiceNo?.startsWith?.("INV-") ? 1 : 0;
        const rightIsManualOcr = right?.invoiceNo?.startsWith?.("INV-") ? 1 : 0;
        if (rightIsManualOcr !== leftIsManualOcr) {
            return rightIsManualOcr - leftIsManualOcr;
        }

        const leftCreated = getPurchaseSortTime(left);
        const rightCreated = getPurchaseSortTime(right);
        if (rightCreated !== leftCreated) {
            return rightCreated - leftCreated;
        }

        return String(right?.invoiceNo || "").localeCompare(String(left?.invoiceNo || ""));
    });


    const handleDeletePurchase = async (id: string | number) => {
        if (!confirm("Are you sure you want to delete this purchase record?")) {
            return;
        }

        try {
            const purchaseId = String(id);
            const isDbPurchase = /^\d+$/.test(purchaseId);

            if (isDbPurchase) {
                const response = await fetch(`/api/purchases/${purchaseId}`, {
                    method: "DELETE",
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => null);
                    throw new Error(errorData?.error || "Failed to delete purchase record.");
                }
            }

            const currentPurchases = storage.get('purchases', []);
            storage.set('purchases', currentPurchases.filter((p: any) => String(p.id) !== purchaseId));

            const currentBatches = storage.get('batches', []);
            storage.set('batches', currentBatches.filter((batch: any) => String(batch.purchaseId) !== purchaseId));

            refetchHistory();
            refetchProducts();
            alert("Purchase record deleted.");
        } catch (error: any) {
            alert(error?.message || "Failed to delete purchase record.");
        }
    };

    const handleEditSupplier = (purchaseId: string | number, newSupplierId: string) => {
        const selectedSupplier = suppliers?.find(s => String(s.id) === String(newSupplierId));
        if (!selectedSupplier) return;

        // 1. Update Purchases Storage
        const currentPurchases = storage.get('purchases', []);
        const updatedPurchases = currentPurchases.map((p: any) => {
            if (String(p.id) === String(purchaseId)) {
                return {
                    ...p,
                    supplier: {
                        id: String(newSupplierId),
                        name: selectedSupplier.name
                    }
                };
            }
            return p;
        });
        storage.set('purchases', updatedPurchases);

        // 2. Update Batches Storage (Critical for data consistency)
        const currentBatches = storage.get('batches', []);
        const updatedBatches = currentBatches.map((b: any) => {
            if (String(b.purchaseId) === String(purchaseId)) {
                return {
                    ...b,
                    supplierId: String(newSupplierId),
                    supplier: {
                        id: String(newSupplierId),
                        name: selectedSupplier.name
                    }
                };
            }
            return b;
        });
        storage.set('batches', updatedBatches);

        setEditingPurchase(null);
        refetchHistory();
        refetchProducts(); // Batches affect product details
        alert("Supplier updated successfully for this purchase and all its items.");
    };

    const [formItems, setFormItems] = useState<any[]>([]);
    const [invoiceNo, setInvoiceNo] = useState("");
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [shipmentDate, setShipmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [discountWarnings, setDiscountWarnings] = useState<Record<number, any>>({});

    useEffect(() => {
        // Form items monitoring (Debug removed for production)
    }, [formItems]);

    useEffect(() => {
        const localPurchases = storage.get('purchases', []);
        const purchasesToRemove = localPurchases.filter((purchase: any) =>
            LEGACY_PURCHASE_PREFIXES.some(prefix => String(purchase?.invoiceNo || "").startsWith(prefix))
        );

        if (purchasesToRemove.length === 0) {
            return;
        }

        const removedIds = purchasesToRemove.map((purchase: any) => String(purchase.id));
        const filteredPurchases = localPurchases.filter((purchase: any) => !removedIds.includes(String(purchase.id)));
        const currentBatches = storage.get('batches', []);
        const filteredBatches = currentBatches.filter((batch: any) => !removedIds.includes(String(batch.purchaseId)));

        storage.set('purchases', filteredPurchases);
        storage.set('batches', filteredBatches);
    }, []);

    useEffect(() => {
        if (selectedSupplierId && formItems.length > 0) {
            const newWarnings: Record<number, any> = {};
            formItems.forEach((item, idx) => {
                if (item.productId) {
                    const check = purchaseService.checkDiscountWarning(
                        item.productId,
                        selectedSupplierId,
                        parseFloat(item.discountPercent) || 0
                    );
                    if (check.isWarning) {
                        newWarnings[idx] = check;
                    }
                }
            });
            setDiscountWarnings(newWarnings);
        } else {
            setDiscountWarnings({});
        }
    }, [formItems, selectedSupplierId]);

    const preprocessImage = async (imageSrc: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(imageSrc);
                const scale = Math.min(1.5, 2000 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png', 1.0));
                if (isScanningCarton) {
                    setLoadingText("Scanning Carton...");
                    setLoadingSubText("Detecting Expiry, MFG, and Batch Details");
                } else {
                    setLoadingText("Analyzing Invoice...");
                    setLoadingSubText("Extracting medicines, quantities, and prices");
                }
                setAiLoading(true);

            };
            img.onerror = () => {
                console.error("Image load failed");
                resolve(imageSrc);
            };
            img.src = imageSrc;
        });
    };

    const normalizeDateForInput = (raw: any) => {
        const value = String(raw || "").trim().replace(/\s+/g, " ");
        if (!value) return "";

        const primaryMatch = value.match(
            /^(\d{4}-\d{2}-\d{2}|\d{1,2}\s*[-/]\s*\d{2,4}|\d{1,4}\s*[-/. ]\s*\d{1,2}\s*[-/. ]\s*\d{1,4}|\d{1,2}\s*[-/. ]\s*[A-Za-z]{3,9}\s*[-/. ]\s*\d{2,4}|[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i
        );
        const normalizedValue = primaryMatch ? primaryMatch[1].trim() : value;

        if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
            return normalizedValue;
        }

        const monthMap: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12"
        };

        const alphaMonthMatch = normalizedValue.match(/^(\d{1,2})\s*[-/. ]\s*([A-Za-z]{3,9})\s*[-/. ]\s*(\d{2,4})$/i);
        if (alphaMonthMatch) {
            const day = alphaMonthMatch[1].padStart(2, "0");
            const month = monthMap[alphaMonthMatch[2].slice(0, 3).toLowerCase()];
            const rawYear = alphaMonthMatch[3];
            const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
            return month ? `${year}-${month}-${day}` : "";
        }

        const monthYearMatch = normalizedValue.match(/^(\d{1,2})\s*[-/]\s*(\d{2,4})$/);
        if (monthYearMatch) {
            const month = monthYearMatch[1].padStart(2, "0");
            const rawYear = monthYearMatch[2];
            const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
            return `${year}-${month}-01`;
        }

        const numericMatch = normalizedValue.match(/^(\d{1,4})\s*[-/. ]\s*(\d{1,2})\s*[-/. ]\s*(\d{1,4})$/);
        if (numericMatch) {
            let first = numericMatch[1];
            let second = numericMatch[2];
            let third = numericMatch[3];

            if (first.length === 4) {
                return `${first}-${second.padStart(2, "0")}-${third.padStart(2, "0")}`;
            }

            if (third.length === 2) {
                third = `20${third}`;
            }

            const firstNum = parseInt(first, 10);
            const secondNum = parseInt(second, 10);
            if (firstNum <= 12 && secondNum > 12) {
                const swap = first;
                first = second;
                second = swap;
            }

            return `${third}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`;
        }

        return "";
    };

    const normalizeExpiryDateForInput = (raw: any) => {
        const value = String(raw || "").trim().replace(/\s+/g, " ");
        if (!value) return "";

        if (/^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}\/\d{2}\/\d{2}$/.test(value)) {
            return value.replace(/\//g, "-");
        }

        const primaryMatch = value.match(
            /^(\d{1,2}\s*[-/]\s*\d{2}(?:\s*[-/]\s*\d{2,4})?|\d{1,2}\s*[-/. ]\s*[A-Za-z]{3,9}\s*[-/. ]\s*\d{2,4}|[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i
        );
        const normalizedValue = primaryMatch ? primaryMatch[1].trim() : value;

        const monthMap: Record<string, string> = {
            jan: "01",
            feb: "02",
            mar: "03",
            apr: "04",
            may: "05",
            jun: "06",
            jul: "07",
            aug: "08",
            sep: "09",
            oct: "10",
            nov: "11",
            dec: "12"
        };

        const monthYearNoiseMatch = normalizedValue.match(/^(\d{1,2})\s*[-/]\s*(\d{2})(?:\s*[-/]\s*(\d{2,4}))?$/);
        if (monthYearNoiseMatch) {
            const month = monthYearNoiseMatch[1].padStart(2, "0");
            const rawYear = monthYearNoiseMatch[2];
            const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
            return `${year}-${month}-01`;
        }

        const alphaMonthYearMatch = normalizedValue.match(/^([A-Za-z]{3,9})\s*[-/]\s*(\d{2,4})$/i);
        if (alphaMonthYearMatch) {
            const month = monthMap[alphaMonthYearMatch[1].slice(0, 3).toLowerCase()];
            const rawYear = alphaMonthYearMatch[2];
            const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
            return month ? `${year}-${month}-01` : "";
        }

        const monthYearMatch = normalizedValue.match(/^(\d{1,2})\s*[-/]\s*(\d{2,4})$/);
        if (monthYearMatch) {
            const month = monthYearMatch[1].padStart(2, "0");
            const rawYear = monthYearMatch[2];
            const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
            return `${year}-${month}-01`;
        }

        return "";
    };

    const normalizePurchaseDateForInput = (raw: any) => {
        return normalizeDateForInput(raw);
    };

    const processAIInvoice = async (imageData: string, fileName?: string) => {
        setAiLoading(true);
        try {
            setLoadingText("🚀 Professional OCR Processing...");
            setLoadingSubText("Using advanced Gemini AI for maximum accuracy");

            const response = await fetch('/api/ocr/process-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData, fileName })
            });

            if (!response.ok) {
                const error = await response.json();
                const messageParts = [error.error || 'OCR failed', error.details, error.help].filter(Boolean);
                throw new Error(messageParts.join(' | '));
            }

            const result = await response.json();
            const data = result.data;
            const normalizedShipmentDate = normalizePurchaseDateForInput(data.date);

            if (data && data.items && data.items.length > 0) {
                const formatted = data.items.map((item: any) => {
                    const rawNameKey = normalizeMatchKey(item.name);
                    const matchedNameKey = normalizeMatchKey(item.matchedProductName);
                    const reliableMatch = Boolean(item.matchedProductId) && (
                        item.matchType === "Item Code" ||
                        (rawNameKey && matchedNameKey && rawNameKey === matchedNameKey) ||
                        (item.matchType === "Alias" && Number(item.matchScore || 0) >= 97)
                    );
                    const qtyVal = parseFloat(item.qty) || 0;
                    const bonusVal = parseFloat(item.bonus) || 0;
                    const rateVal = parseFloat(item.rate) || 0;
                    const discPctVal = parseFloat(item.discountPercent) || 0;
                    const taxPctVal = parseFloat(item.gstPercent) || parseFloat(item.taxPercent) || 0;
                    const furtherTaxPctVal = parseFloat(item.furtherTaxPercent) || 0;
                    const nonAtlTaxPctVal = parseFloat(item.nonAtlTaxPercent) || 0;
                    const advTaxPctVal = parseFloat(item.advanceTaxPercent) || 0;
                    const isATLVal = item.isATL !== undefined ? item.isATL : true;
                    const amounts = computePurchaseLineAmounts({
                        quantity: qtyVal,
                        bonusQty: bonusVal,
                        purchasePrice: rateVal,
                        tpValue: item.tpValue,
                        amount: item.amount,
                        discountInvAmount: item.discountInvAmount,
                        discountAmount: item.discountAmount,
                        productDiscountAmount: item.productDiscountAmount,
                        salesTaxAmount: item.salesTaxAmount,
                        furtherTaxAmount: item.furtherTaxAmount,
                        gstAmount: item.gstAmount,
                        advanceTaxAmount: item.advanceTaxAmount,
                        advTaxAmount: item.advTaxAmount,
                        discountPercent: discPctVal,
                        taxPercent: taxPctVal,
                        gstPercent: taxPctVal,
                        furtherTaxPercent: furtherTaxPctVal,
                        nonAtlTaxPercent: nonAtlTaxPctVal,
                        advTaxPercent: advTaxPctVal,
                        advanceTaxPercent: advTaxPctVal
                    });
                    const detectedNetVal = parseNumericValue(item.net, item.netAmount);
                    const netVal = detectedNetVal > 0 ? detectedNetVal : amounts.netAmount;
                    const detectedExpiryDate = normalizeExpiryDateForInput(item.expiry || item.expiryDate || item.expDate);
                    const detectedMfgDate = normalizeDateForInput(item.mfgDate);
                    const detectedPacking = String(item.packing || item.pack || item.packSize || "");
                    const detectedTpValue = parseNumericValue(item.tpValue, item.amount, amounts.tpValue);
                    const detectedDiscountInvAmount = parseNumericValue(item.discountInvAmount, item.discountAmount, amounts.discountInvAmount);
                    const detectedProductDiscountAmount = parseNumericValue(item.productDiscountAmount, amounts.productDiscountAmount);
                    const detectedSalesTaxAmount = roundCurrency(amounts.salesTaxAmount);
                    const detectedFurtherTaxAmount = roundCurrency(amounts.furtherTaxAmount);
                    const detectedAdvanceTaxAmount = roundCurrency(amounts.advanceTaxAmount);

                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        productId: reliableMatch ? String(item.matchedProductId) : "",
                        itemCode: item.itemCode || item.matchedItemCode || "",
                        name: item.name || item.matchedProductName,
                        invoiceProfile: item.invoiceProfile || "",
                        matchingStatus: reliableMatch ? "matched" : "unmatched",
                        tempScannedName: item.name,
                        packing: detectedPacking,
                        batchNo: item.batch || "B-NEW",
                        mfgDate: detectedMfgDate,
                        expiryDate: detectedExpiryDate,
                        quantity: qtyVal,
                        bonusQty: bonusVal,
                        totalQty: amounts.totalQty,
                        purchasePrice: rateVal,
                        tpValue: detectedTpValue,
                        mrpValue: "",
                        discountInvAmount: detectedDiscountInvAmount,
                        productDiscountAmount: detectedProductDiscountAmount,
                        salesTaxAmount: detectedSalesTaxAmount,
                        furtherTaxAmount: detectedFurtherTaxAmount,
                        advanceTaxAmount: detectedAdvanceTaxAmount,
                        discountPercent: discPctVal,
                        taxPercent: amounts.gstPercent,
                        gstPercent: amounts.gstPercent,
                        furtherTaxPercent: amounts.furtherTaxPercent,
                        nonAtlTaxPercent: nonAtlTaxPctVal,
                        advTaxPercent: amounts.advTaxPercent,
                        isATL: isATLVal,
                        netAmount: netVal,
                        effectiveCost: amounts.totalQty > 0 ? (netVal / amounts.totalQty) : rateVal,
                        alert: item.alert,
                        isAiSuggested: true,
                        brand: reliableMatch ? (item.matchedBrand || item.brand) : item.brand,
                        category: reliableMatch ? (item.matchedCategory || item.category) : item.category,
                        detected: {
                            itemCode: item.itemCode || "",
                            name: item.name || "",
                            packing: detectedPacking,
                            batchNo: item.batch || "",
                            mfgDate: detectedMfgDate,
                            expiryDate: detectedExpiryDate,
                            qty: qtyVal,
                            bonus: bonusVal,
                            rate: rateVal,
                            tpValue: detectedTpValue,
                            discountInvAmount: detectedDiscountInvAmount,
                            productDiscountAmount: detectedProductDiscountAmount,
                            salesTaxAmount: detectedSalesTaxAmount,
                            furtherTaxAmount: detectedFurtherTaxAmount,
                            advanceTaxAmount: detectedAdvanceTaxAmount,
                            invoiceProfile: item.invoiceProfile || "",
                            net: netVal,
                            netAmount: netVal,
                            discountPercent: discPctVal,
                            gstPercent: amounts.gstPercent,
                            taxPercent: amounts.gstPercent,
                            furtherTaxPercent: amounts.furtherTaxPercent,
                            nonAtlTaxPercent: nonAtlTaxPctVal,
                            advanceTaxPercent: amounts.advTaxPercent
                        }
                    };
                });

                setDetectedSupplierName(data.supplierName || null);
                setIsAiSupplierMatched(Boolean(data.supplierId));
                setDetectedInvoiceNo(data.invoiceNo || null);
                setIsAiInvMatched(Boolean(data.invoiceNo));
                setDetectedDate(normalizedShipmentDate || data.date || null);
                setIsAiDateMatched(Boolean(normalizedShipmentDate || data.date));
                if (data.supplierId) setSelectedSupplierId(String(data.supplierId));
                setFormItems(formatted);
                if (data.invoiceNo) setInvoiceNo(data.invoiceNo);
                if (normalizedShipmentDate) setShipmentDate(normalizedShipmentDate);

                const invoiceCountMsg = data.invoicesCount ? ` from ${data.invoicesCount} invoices` : "";
                alert(`✅ SUCCESS: AI extracted ${formatted.length} items${invoiceCountMsg}. All pages processed!`);
            } else {
                throw new Error("Gemini could not find any items in the invoice.");
            }

        } catch (error: any) {
            console.error('OCR Grid Error:', error);
            alert(`Vision Error: ${error.message}`);
        } finally {
            setAiLoading(false);
        }
    };

    const handleResolveMatch = async (productId: string | number, isNew: boolean = false) => {
        if (resolvingIndex === null) return;
        const item = formItems[resolvingIndex];
        let createdProduct: any = null;

        try {
            if (isNew) {
                // Create new product first
                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: item.name,
                        brand: item.brand,
                        category: item.category,
                        purchasePrice: item.purchasePrice,
                        salePrice: parseFloat((item.purchasePrice * 1.2).toFixed(2)), // 20% default markup
                        item_code: item.itemCode || `AUTO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                    })
                });
                createdProduct = await response.json();

                if (!response.ok) {
                    throw new Error(createdProduct?.error || "Failed to create product.");
                }

                productId = createdProduct.id;
                await refetchProducts();
            } else {

                // Create Alias for existing product
                await fetch('/api/products/aliases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alias: item.tempScannedName,
                        productId: productId
                    })
                });
                await refetchAliases();
            }

            const newItems = [...formItems];
            const resolvedProduct = createdProduct || products?.find(p => String(p.id) === String(productId));
            newItems[resolvingIndex] = {
                ...newItems[resolvingIndex],
                productId: String(productId),
                matchingStatus: "matched",
                // Update product info if linking to existing
                name: item.name,
                itemCode: item.itemCode || resolvedProduct?.item_code || ""
            };

            setFormItems(newItems);
            setIsResolveModalOpen(false);
            setResolvingIndex(null);
            setResolveSearch("");
        } catch (error: any) {
            alert(`Error resolving product: ${error.message}`);
        }
    };



    const handleSavePurchase = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // STEP 1: AUTO-RESOLVE UNMATCHED PRODUCTS 🚀
        const unmatchedItems = formItems.filter(item => item.matchingStatus === "unmatched");
        let finalFormItems = formItems;

        if (unmatchedItems.length > 0) {
            setAiLoading(true);
            setLoadingText("Auto-Creating Products...");
            setLoadingSubText(`Generating ${unmatchedItems.length} new product records`);

            try {
                const resolvedItems = await Promise.all(formItems.map(async (item: any) => {
                    if (item.matchingStatus !== "unmatched") {
                        return item;
                    }

                    const response = await fetch('/api/products', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: item.name,
                            brand: item.brand,
                            category: item.category,
                            purchasePrice: item.purchasePrice,
                            salePrice: parseFloat((item.purchasePrice * 1.25).toFixed(2)),
                            item_code: item.itemCode || `AUTO-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
                        })
                    });
                    const newProduct = await response.json();

                    if (!response.ok) {
                        throw new Error(newProduct?.error || `Failed to create product for ${item.name}.`);
                    }

                    return {
                        ...item,
                        productId: String(newProduct.id),
                        matchingStatus: "matched",
                        itemCode: newProduct.item_code || item.itemCode
                    };
                }));

                await refetchProducts();
                setFormItems(resolvedItems);
                finalFormItems = resolvedItems;
            } catch (error: any) {
                alert(`Auto-Resolve failed: ${error.message}`);
                return;
            } finally {
                setAiLoading(false);
            }
        }


        // STEP 2: HARD BACKEND VALIDATION & PROTECTION 🛡️
        try {
            finalFormItems.forEach((item: any, idx: number) => {
                const qty = parseFloat(item.quantity) || 0;
                const bonus = parseFloat(item.bonusQty) || 0;

                const totalQty = qty + bonus;

                if (totalQty <= 0) {
                    throw new Error(`Row ${idx + 1} (${item.name}) has validation error: Total Quantity is 0.\n\nPlease enter a valid Purchase Qty or Bonus.`);
                }
            });
        } catch (error: any) {
            alert(`⚠️ VALIDATION FAILED\n\n${error.message}`);
            return;
        }

        setIsSubmitting(true);

        try {
            let currentSupplierId = selectedSupplierId;
            let selectedSupplier = suppliers?.find(s => String(s.id) === String(selectedSupplierId));

        // AUTO-CREATE NEW SUPPLIER IF DETECTED
        if (!currentSupplierId && detectedSupplierName && detectedSupplierName.trim()) {
            const newSupplier = {
                id: Date.now().toString(),
                name: detectedSupplierName,
                phone: "OCR-EXTRACTED",
                email: "auto@supplier.com",
                address: "Extracted from Image",
                totalOrders: 1,
                lastOrder: new Date().toISOString(),
                status: 'Active'
            };
            const currentSuppliers = storage.get('suppliers', []);
            storage.set('suppliers', [...currentSuppliers, newSupplier]);
            currentSupplierId = newSupplier.id;
            selectedSupplier = newSupplier;
            console.log('🚀 Automatically created and assigned new supplier:', detectedSupplierName);
        }

        const persistedPurchaseItems = finalFormItems.map((item, index) => {
            const amounts = computePurchaseLineAmounts(item);

            return {
                id: item.id || `${Date.now()}-${index}`,
                productId: String(item.productId || ""),
                itemCode: item.itemCode || "",
                name: item.name || "",
                packing: item.packing || "",
                batchNo: item.batchNo || "",
                mfgDate: item.mfgDate || "",
                expiryDate: item.expiryDate || "",
                remarks: item.remarks || "",
                purchQty: amounts.qty,
                quantity: amounts.qty,
                bonusQty: amounts.bonus,
                totalQty: amounts.totalQty,
                purchasePrice: amounts.price,
                tpValue: amounts.tpValue,
                discountPercent: amounts.discountPercent,
                discountAmount: amounts.discountAmount,
                discountInvAmount: amounts.discountInvAmount,
                productDiscountAmount: amounts.productDiscountAmount,
                gstPercent: amounts.gstPercent,
                gstAmount: amounts.gstAmount,
                salesTaxAmount: amounts.salesTaxAmount,
                furtherTaxAmount: amounts.furtherTaxAmount,
                taxPercent: amounts.gstPercent,
                taxAmount: amounts.gstAmount,
                furtherTaxPercent: amounts.furtherTaxPercent,
                nonAtlTaxPercent: amounts.nonAtlTaxPercent,
                nonAtlTaxAmount: amounts.nonAtlTaxAmount,
                advTaxPercent: amounts.advTaxPercent,
                advTaxAmount: amounts.advTaxAmount,
                advanceTaxAmount: amounts.advanceTaxAmount,
                isATL: item.isATL ?? true,
                netAmount: amounts.netAmount,
                effectiveCost: amounts.effectiveCost
            };
        });

        const newPurchase = {
            id: Date.now().toString(),
            invoiceNo,
            date: normalizePurchaseDateForInput(shipmentDate) || shipmentDate,
            createdAt: new Date().toISOString(),
            supplier: {
                id: currentSupplierId || "",
                name: selectedSupplier?.name || "Unknown Supplier"
            },
            items: persistedPurchaseItems,
            total: persistedPurchaseItems.reduce((sum, item) => sum + item.netAmount, 0)
        };

        // STEP 3: RECORD PRODUCT-SUPPLIER LINKS & SAVE
            const dbSupplierId = /^\d+$/.test(String(currentSupplierId || "")) ? String(currentSupplierId) : "";
            const dbProductIds = Array.from(
                new Set(
                    persistedPurchaseItems
                        .map(item => String(item.productId || ""))
                        .filter(productId => /^\d+$/.test(productId))
                )
            );

            if (dbSupplierId) {
                await Promise.all(
                    persistedPurchaseItems
                        .filter(item => /^\d+$/.test(String(item.productId || "")))
                        .map(async item => {
                            const response = await fetch('/api/products/suppliers', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    productId: item.productId,
                                    supplierId: dbSupplierId,
                                    purchasePrice: item.purchasePrice,
                                    discount: item.discountPercent
                                })
                            });

                            if (!response.ok) {
                                throw new Error(`Failed to link supplier for ${item.name || item.itemCode || 'product'}.`);
                            }
                        })
                );
            }

            await new Promise((resolve) => setTimeout(resolve, 800));
            const currentPurchases = storage.get('purchases', []);
            storage.set('purchases', [newPurchase, ...currentPurchases]);

            const currentBatches = storage.get('batches', []);
            const newBatches = [...currentBatches];

            newPurchase.items.forEach(item => {
                newBatches.push({
                    id: `${Date.now()}${Math.random().toString(36).substr(2, 5)}`,
                    productId: item.productId,
                    packing: item.packing || "",
                    batchNo: item.batchNo,
                    mfgDate: item.mfgDate,
                    expiryDate: item.expiryDate,
                    supplierId: currentSupplierId || null,
                    supplier: {
                        id: currentSupplierId || "",
                        name: selectedSupplier?.name || newPurchase.supplier.name || "Unknown Supplier"
                    },
                    purchQty: item.purchQty,
                    bonusQty: item.bonusQty,
                    quantity: item.totalQty,
                    rate: Number(item.purchasePrice) || 0,
                    purchasePrice: Number(item.purchasePrice) || 0,
                    discountPercent: item.discountPercent,
                    discountAmount: item.discountAmount,
                    gstPercent: item.gstPercent,
                    gstAmount: item.gstAmount,
                    salesTaxAmount: item.salesTaxAmount,
                    taxPercent: item.taxPercent,
                    taxAmount: item.taxAmount,
                    furtherTaxPercent: item.furtherTaxPercent,
                    furtherTaxAmount: item.furtherTaxAmount,
                    nonAtlTaxPercent: item.nonAtlTaxPercent,
                    nonAtlTaxAmount: item.nonAtlTaxAmount,
                    advTaxPercent: item.advTaxPercent,
                    advTaxAmount: item.advTaxAmount,
                    advanceTaxAmount: item.advanceTaxAmount,
                    netAmount: item.netAmount,
                    effectiveUnitCost: item.effectiveCost,
                    purchaseId: newPurchase.id,
                    createdAt: new Date().toISOString()
                });
            });
            storage.set('batches', newBatches);

            // 3. Update Sync to Database (CRITICAL: Fixes the 0 Stock Issue)
            const syncToDatabase = async () => {
                for (const productId of dbProductIds) {
                    const purchasedItems = persistedPurchaseItems.filter(item => String(item.productId) === productId);

                    if (purchasedItems.length === 0) {
                        continue;
                    }

                    const addedTotal = purchasedItems.reduce(
                        (sum, item) => sum + (Number(item.purchQty) || 0) + (Number(item.bonusQty) || 0),
                        0
                    );

                    const lastItem = purchasedItems[purchasedItems.length - 1];
                    const lastPurchasePrice = Number(lastItem.purchasePrice) || 0;

                    const currentProduct = products?.find((p: any) => String(p.id) === String(productId));
                    const currentStock = Number(currentProduct?.stock) || 0;
                    const newTotalStock = currentStock + addedTotal;

                    try {
                        const response = await fetch(`/api/products/${productId}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                stock: newTotalStock,
                                purchasePrice: lastPurchasePrice,
                                salePrice: lastPurchasePrice // Set Box Price to match Invoice Rate as requested
                            })
                        });
                        console.log(`✅ Synced Product ${productId} to DB: New Stock ${newTotalStock}, Price ${lastPurchasePrice}`);
                    } catch (err) {
                        console.error(`❌ Failed to sync Product ${productId}:`, err);
                    }
                }
            };

            await syncToDatabase();

            if (currentSupplierId) {
                const currentSuppliers = storage.get('suppliers', []);
                const updatedSuppliers = currentSuppliers.map((supplier: any) => {
                    if (String(supplier.id) !== String(currentSupplierId)) {
                        return supplier;
                    }

                    return {
                        ...supplier,
                        totalOrders: (Number(supplier.totalOrders) || 0) + 1,
                        lastOrder: new Date().toISOString()
                    };
                });
                storage.set('suppliers', updatedSuppliers);
            }

            await Promise.allSettled([
                Promise.resolve(refetchHistory?.()),
                Promise.resolve(refetchProducts?.()),
                Promise.resolve(refetchSuppliers?.())
            ]);

            setShowForm(false);
            setFormItems([]);
            alert("Stock recorded successfully. Products and batch ledger have been updated.");
        } catch (error: any) {
            console.error('Save Error:', error);
            alert(`Error saving purchase: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addItem = () => {
        setFormItems([...formItems, {
            productId: "",
            itemCode: "",
            batchNo: "",
            mfgDate: "",
            expiryDate: "",
            quantity: 0,
            bonusQty: 0,
            purchasePrice: 0,
            tpValue: 0,
            mrpValue: "",
            discountInvAmount: 0,
            productDiscountAmount: 0,
            salesTaxAmount: 0,
            advanceTaxAmount: 0,
            discountPercent: 0,
            gstPercent: 0,
            taxPercent: 0,
            furtherTaxPercent: 0,
            nonAtlTaxPercent: 0,
            advTaxPercent: 0,
            isATL: true,
            remarks: ""
        }]);
    };

    const removeItem = (idx: number) => {
        setFormItems(formItems.filter((_, i) => i !== idx));
    };

    const handleScanComplete = (data: any) => {
        if (!data || currentScanIdx === null) return;

        // If data is array (from ExpiryScanner), use it directly
        if (Array.isArray(data) && data.length > 0) {
            const scanned = data[0]; // Take first item (since we scan one row at a time)

            const n = [...formItems];
            if (scanned.batchNo && scanned.batchNo !== "BATCH-SCAN-PENDING") n[currentScanIdx].batchNo = scanned.batchNo;
            if (scanned.expiryDate) n[currentScanIdx].expiryDate = scanned.expiryDate;
            if (scanned.mfgDate) n[currentScanIdx].mfgDate = scanned.mfgDate;
            if (scanned.mrp) n[currentScanIdx].purchasePrice = scanned.mrp; // Map MRP to purchase price as a starting point

            setFormItems(n);
            setShowScanner(false);
            if (scanned.expiryDate) alert(`✨ AI Detected Expiry: ${scanned.expiryDate}`);
            setCurrentScanIdx(null);
            return;
        }

        // Fallback for legacy raw image data (if ever used)
        setIsScanningCarton(true);
        setAiLoading(true);
        // ... (Legacy logic preserved just in case, or removed if redundant)
        // Since ExpiryScanner now returns objects, we can likely skip the OCR here 
        // OR warn that legacy mode is deprecated.

        console.warn("Received raw data in handleScanComplete, expected ScannedItem[]");
        setAiLoading(false);
        setShowScanner(false);
    };


    const formatDetectedDate = (raw: string) => {
        const parts = raw.split(/[\/\-\.]/);

        // Ensure parts are 2-digits or 4-digits
        const cleanParts = parts.map(p => p.trim().padStart(2, '0'));

        if (cleanParts.length === 2) {
            // MM/YY or MM/YYYY
            const month = cleanParts[0];
            const year = cleanParts[1].length === 2 ? `20${cleanParts[1]}` : cleanParts[1];
            return `${year}-${month}-01`;
        } else if (cleanParts.length === 3) {
            // DD/MM/YY or DD/MM/YYYY or MM/DD/YYYY
            let day = cleanParts[0];
            let month = cleanParts[1];
            let year = cleanParts[2].length === 2 ? `20${cleanParts[2]}` : cleanParts[2];

            // Heuristic for PKR/International: Try to identify if part[1] is definitely a month
            const p0 = parseInt(day);
            const p1 = parseInt(month);

            if (p0 > 12 && p1 <= 12) {
                // Definitely DD-MM-YYYY
            } else if (p1 > 12 && p0 <= 12) {
                // Likely MM-DD-YYYY
                const tmp = day;
                day = month;
                month = tmp;
            }

            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        return "";
    };

    return (
        <>
            <div className="flex flex-col gap-8 animate-fade-in-up">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">MediStock Procurement</h1>
                        <p className="text-gray-500 mt-1 font-medium">Record new inventory shipments and track purchase history.</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowForm(true);
                            if (formItems.length === 0) addItem();
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Purchase Record
                    </button>
                </div>

                {/* Purchase History */}
                <div className="card-premium rounded-3xl overflow-hidden border-0 shadow-2xl shadow-purple-100/50">
                    <div className="p-6 bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white">
                            <History className="h-5 w-5" />
                            <h3 className="text-lg font-bold uppercase tracking-tight">Recent Purchases</h3>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                            <input
                                type="text"
                                placeholder="Search invoices..."
                                className="w-full bg-white/10 border border-white/20 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/50 focus:bg-white/20 transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Invoice #</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Supplier</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Value</th>
                                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedPurchaseHistory.map((p: any) => (
                                    <tr key={p.id} className="hover:bg-purple-50/30 transition-colors group">
                                        <td className="py-4 px-6 font-black text-gray-900">{p.invoiceNo}</td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs uppercase">
                                                    {p.supplier.name.charAt(0)}
                                                </div>
                                                <span className="font-semibold text-gray-700">{p.supplier.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500 font-medium">{new Date(p.date).toLocaleDateString()}</td>
                                        <td className="py-4 px-6">
                                            <span className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-black">
                                                {p.items.length} MEDICINES
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 font-black text-purple-600">PKR {p.total.toLocaleString()}</td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingPurchase(p)}
                                                    className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-blue-600 transition-all"
                                                    title="Edit Supplier"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button className="p-2 hover:bg-white rounded-xl shadow-sm border border-gray-100 text-gray-400 hover:text-purple-600 transition-all">
                                                    <ArrowRight className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePurchase(p.id)}
                                                    className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {sortedPurchaseHistory.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 opacity-20">
                                                <Package className="h-16 w-16" />
                                                <p className="font-black uppercase tracking-widest">No Procurement Records</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <PurchaseModal
                showForm={showForm}
                setShowForm={setShowForm}
                handleSavePurchase={handleSavePurchase}
                suppliers={suppliers}
                products={products}
                formItems={formItems}
                setFormItems={setFormItems}
                addItem={addItem}
                removeItem={removeItem}
                isSubmitting={isSubmitting}
                onScanItem={(idx: number) => {
                    setCurrentScanIdx(idx);
                    setShowScanner(true);
                }}
                aiLoading={aiLoading}
                processAIInvoice={processAIInvoice}
                invoiceNo={invoiceNo}
                setInvoiceNo={setInvoiceNo}
                shipmentDate={shipmentDate}
                setShipmentDate={setShipmentDate}
                selectedSupplierId={selectedSupplierId}
                setSelectedSupplierId={setSelectedSupplierId}
                isAiSupplierMatched={isAiSupplierMatched}
                isAiInvMatched={isAiInvMatched}
                isAiDateMatched={isAiDateMatched}
                loadingText={loadingText}
                loadingSubText={loadingSubText}
                detectedSupplierName={detectedSupplierName}
                detectedInvoiceNo={detectedInvoiceNo}
                detectedDate={detectedDate}
                discountWarnings={discountWarnings}
                isResolveModalOpen={isResolveModalOpen}
                setIsResolveModalOpen={setIsResolveModalOpen}
                resolvingIndex={resolvingIndex}
                setResolvingIndex={setResolvingIndex}
                resolveSearch={resolveSearch}
                setResolveSearch={setResolveSearch}
                handleResolveMatch={handleResolveMatch}
            />


            {showScanner && (
                <ExpiryScanner
                    onClose={() => setShowScanner(false)}
                    onScanComplete={handleScanComplete}
                />
            )}

            {editingPurchase && (
                <EditSupplierModal
                    purchase={editingPurchase}
                    suppliers={suppliers}
                    onClose={() => setEditingPurchase(null)}
                    onSave={(newSupplierId: string) => handleEditSupplier(editingPurchase.id, newSupplierId)}
                />
            )}
        </>
    );
}

function EditSupplierModal({ purchase, suppliers, onClose, onSave }: any) {
    const [selectedId, setSelectedId] = useState(purchase.supplier?.id || "");

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md p-8 animate-fade-in-up shadow-2xl border border-white/20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Edit Supplier</h2>
                        <p className="text-gray-500 font-medium text-xs">Update supplier for Invoice: {purchase.invoiceNo}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                            <Package className="h-3 w-3" /> Select New Supplier
                        </label>
                        <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="w-full h-14 bg-gray-50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                        >
                            <option value="">Choose Supplier</option>
                            {suppliers?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => onSave(selectedId)}
                        disabled={!selectedId}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save className="h-4 w-4" />
                        Update Supplier
                    </button>
                </div>
            </div>
        </div>
    );
}

function PurchaseModal({
    showForm,
    setShowForm,
    handleSavePurchase,
    suppliers,
    products,
    formItems,
    setFormItems,
    addItem,
    removeItem,
    isSubmitting,
    onScanItem,
    aiLoading,
    processAIInvoice,
    invoiceNo,
    setInvoiceNo,
    shipmentDate,
    setShipmentDate,
    selectedSupplierId,
    setSelectedSupplierId,
    isAiSupplierMatched,
    isAiInvMatched,
    isAiDateMatched,
    loadingText,
    loadingSubText,
    detectedSupplierName,
    detectedInvoiceNo,
    detectedDate,
    discountWarnings,
    isResolveModalOpen,
    setIsResolveModalOpen,
    resolvingIndex,
    setResolvingIndex,
    resolveSearch,
    setResolveSearch,
    handleResolveMatch
}: any) {

    const fileRef = useRef<HTMLInputElement>(null);

    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        const item = e.clipboardData?.items[0];
        if ((item?.type.startsWith('image/') || item?.type === 'application/pdf') && showForm) {
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const originalBase64 = event.target?.result as string;
                    if (file.type === 'application/pdf') {
                        processAIInvoice(originalBase64, file.name);
                    } else {
                        try {
                            const compressedBase64 = await compressImage(originalBase64);
                            processAIInvoice(compressedBase64, file.name);
                        } catch (err) {
                            console.error("Compression failed, using original:", err);
                            processAIInvoice(originalBase64, file.name);
                        }
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }, [showForm, processAIInvoice]);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    return (
        <>
            <Script
                src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
                strategy="lazyOnload"
            />
            {showForm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-fade-in-up shadow-2xl relative border border-white/20">
                        {aiLoading && (
                            <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                                <Loader2 className="h-12 w-12 text-purple-600 animate-spin mb-4" />
                                <p className="text-lg font-black text-gray-800 uppercase animate-pulse">{loadingText}</p>
                                <p className="text-xs font-bold text-gray-400 mt-2">{loadingSubText}</p>
                            </div>
                        )}
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-xl z-10 transition-all">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">New Stock Receipt</h2>
                                <p className="text-gray-500 font-medium text-sm">Enter shipment details from invoice.</p>
                            </div>
                            <button onClick={() => setShowForm(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePurchase} className="p-8">
                            {/* AI Drop Zone */}
                            <div className="mb-10">
                                <div
                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-purple-500', 'bg-purple-50'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50'); }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove('border-purple-500', 'bg-purple-50');
                                        const file = e.dataTransfer.files[0];
                                        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
                                            const reader = new FileReader();
                                            reader.onload = async (event) => {
                                                const originalBase64 = event.target?.result as string;
                                                if (file.type === 'application/pdf') {
                                                    processAIInvoice(originalBase64, file.name);
                                                } else {
                                                    try {
                                                        const compressedBase64 = await compressImage(originalBase64);
                                                        processAIInvoice(compressedBase64, file.name);
                                                    } catch (err) {
                                                        processAIInvoice(originalBase64, file.name);
                                                    }
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    onClick={() => fileRef.current?.click()}
                                    className="group cursor-pointer border-4 border-dashed border-gray-100 rounded-[2.5rem] p-10 flex flex-col items-center justify-center gap-4 hover:border-blue-400 hover:bg-blue-50 transition-all"
                                >
                                    <input type="file" ref={fileRef} className="hidden" accept="image/*,application/pdf" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = async (event) => {
                                                const originalBase64 = event.target?.result as string;
                                                if (file.type === 'application/pdf') {
                                                    processAIInvoice(originalBase64, file.name);
                                                } else {
                                                    try {
                                                        const compressedBase64 = await compressImage(originalBase64);
                                                        processAIInvoice(compressedBase64, file.name);
                                                    } catch (err) {
                                                        processAIInvoice(originalBase64, file.name);
                                                    }
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                    <div className="p-5 bg-white rounded-3xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload className="h-8 w-8 text-blue-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-black text-gray-900 uppercase text-xs tracking-widest">Drop Invoice Image/PDF or Paste (Ctrl+V)</p>
                                        <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase">AI will automatically extract products, GST, and amounts</p>
                                    </div>
                                </div>

                                {/* Header: Supplier & Metadata (Screenshot Match) */}
                                <div className="grid md:grid-cols-3 gap-6 mb-10 mt-10">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                                <Package className="h-3 w-3" /> Supplier Entity
                                            </label>
                                            {isAiSupplierMatched ? (
                                                <span className="text-[8px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full animate-pulse uppercase">✨ AI Matched</span>
                                            ) : detectedSupplierName ? (
                                                <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse uppercase">✨ New Supplier: {detectedSupplierName}</span>
                                            ) : null}
                                        </div>
                                        <select
                                            value={selectedSupplierId}
                                            onChange={(e) => setSelectedSupplierId(e.target.value)}
                                            className="w-full h-14 bg-gray-50/50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                        >
                                            <option value="">Choose Supplier</option>
                                            {suppliers?.map((s: any) => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
                                        </select>

                                        {detectedSupplierName && !selectedSupplierId && (
                                            <div className="mt-2 p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2 animate-bounce-subtle">
                                                <span className="text-[10px] font-black text-purple-600 uppercase">Detected:</span>
                                                <span className="text-sm font-bold text-gray-900">{detectedSupplierName}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                                <FileText className="h-3 w-3" /> Invoice Reference
                                            </label>
                                            {isAiInvMatched && (
                                                <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse uppercase">✨ AI Read</span>
                                            )}
                                        </div>
                                        <input
                                            value={invoiceNo}
                                            onChange={(e) => setInvoiceNo(e.target.value)}
                                            placeholder="e.g. INV-2024-001"
                                            className="w-full h-14 bg-gray-50/50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                            required
                                        />
                                        {detectedInvoiceNo && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                                                <span className="text-[8px] font-black text-blue-600 uppercase">Detected:</span>
                                                <span className="text-xs font-bold text-gray-700">{detectedInvoiceNo}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
                                                <Calendar className="h-3 w-3" /> Shipment Date
                                            </label>
                                            {isAiDateMatched && (
                                                <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse uppercase">✨ AI Read</span>
                                            )}
                                        </div>
                                        <input
                                            type="date"
                                            value={shipmentDate}
                                            onChange={(e) => setShipmentDate(e.target.value)}
                                            className="w-full h-14 bg-gray-50/50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                            required
                                        />
                                        {detectedDate && (
                                            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2">
                                                <span className="text-[8px] font-black text-blue-600 uppercase">Detected:</span>
                                                <span className="text-xs font-bold text-gray-700">{detectedDate}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 mb-10">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Line Items</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Items: {formItems.length}</span>
                                </div>

                                <div className="space-y-4">
                                    {formItems.map((item: any, idx: number) => {
                                        const amounts = computePurchaseLineAmounts(item);
                                        const qty = amounts.qty;
                                        const bonus = amounts.bonus;
                                        const price = amounts.price;
                                        const totalQty = amounts.totalQty;
                                        const discountPercent = amounts.discountPercent;
                                        const gstPercent = amounts.gstPercent;
                                        const furtherTaxPercent = amounts.furtherTaxPercent;
                                        const nonAtlTaxPercent = amounts.nonAtlTaxPercent;
                                        const grossAmount = amounts.grossAmount;
                                        const discountAmount = amounts.discountAmount;
                                        const gstAmount = amounts.gstAmount;
                                        const invoiceAmount = amounts.invoiceAmount;
                                        const advTaxPercent = amounts.advTaxPercent;
                                        const advTaxAmount = amounts.advTaxAmount;
                                        const nonAtlTaxAmount = amounts.nonAtlTaxAmount;
                                        const netAmount = amounts.netAmount;
                                        const effectiveCost = amounts.effectiveCost.toFixed(2);

                                        // Discount Warning Logic
                                        const discountWarning = discountWarnings[idx];


                                        // Confidence-based styling
                                        const confidence = item.confidence || 100;
                                        const needsReview = item.needsReview || confidence < 70;

                                        let confidenceBorderColor = 'border-green-200';
                                        let confidenceBgColor = 'bg-green-50/30';
                                        let confidenceTextColor = 'text-green-600';
                                        let confidenceIcon = '✅';

                                        if (confidence < 50) {
                                            confidenceBorderColor = 'border-red-300';
                                            confidenceBgColor = 'bg-red-50/50';
                                            confidenceTextColor = 'text-red-600';
                                            confidenceIcon = '⚠️';
                                        } else if (confidence < 70) {
                                            confidenceBorderColor = 'border-yellow-300';
                                            confidenceBgColor = 'bg-yellow-50/50';
                                            confidenceTextColor = 'text-yellow-600';
                                            confidenceIcon = '⚡';
                                        }

                                        const cardBaseClass = `bg-gray-50/50 p-6 rounded-[2.5rem] border-2 animate-fade-in group hover:shadow-xl hover:shadow-purple-500/5 transition-all`;
                                        const warningClass = (discountWarning && !item.isWarningDismissed) ? 'border-orange-400 bg-orange-50/30 ring-4 ring-orange-500/5' : item.isAiSuggested ? confidenceBorderColor : 'border-gray-100';

                                        return (
                                            <div key={idx} className={`${cardBaseClass} ${warningClass} ${item.isAiSuggested && needsReview ? confidenceBgColor : ''}`}>
                                                {/* Alerts */}
                                                {(item.alert) && (
                                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-pulse">
                                                        <AlertCircle className="h-5 w-5 text-red-500" />
                                                        <p className="text-xs font-bold text-red-700">{item.alert}</p>
                                                    </div>
                                                )}

                                                {/* Confidence Badge */}
                                                {item.isAiSuggested && (
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse uppercase">✨ AI Suggested</span>
                                                            <span className={`text-[8px] font-black ${confidenceTextColor} ${confidenceBgColor} px-2 py-0.5 rounded-full uppercase`}>
                                                                {confidenceIcon} {confidence}% Confidence
                                                            </span>
                                                            {item.extractionMethod && (
                                                                <span className="text-[8px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase">
                                                                    {item.extractionMethod}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {needsReview && (
                                                            <span className="text-[8px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase animate-pulse">
                                                                👁️ Please Review
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Row 1: Primary Logistics */}
                                                <div className="grid md:grid-cols-12 gap-4 items-end mb-6">
                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Code</label>
                                                        <input
                                                            value={item.itemCode || ""}
                                                            onChange={(e) => {
                                                                const newItems = [...formItems];
                                                                newItems[idx].itemCode = e.target.value;

                                                                // Auto-select product if item code matches
                                                                const matchedProd = products?.find((p: any) => p.item_code === e.target.value);
                                                                if (matchedProd) {
                                                                    newItems[idx].productId = matchedProd.id;
                                                                    newItems[idx].name = matchedProd.name;
                                                                }

                                                                setFormItems(newItems);
                                                            }}
                                                            placeholder="e.g. ITEM001"
                                                            className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                                                        />
                                                        {item.detected?.itemCode && (
                                                            <div className="mt-1 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-2">
                                                                <span className="text-[7px] font-black text-gray-400 uppercase">Detected:</span>
                                                                <span className="text-[10px] font-bold text-gray-600">{item.detected.itemCode}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-3 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicine Name</label>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                value={item.name || ""}
                                                                list={`products-list-${idx}`}
                                                                onChange={(e) => {
                                                                    const newItems = [...formItems];
                                                                    const val = e.target.value;
                                                                    newItems[idx].name = val;

                                                                    // Try to match product by name exactly
                                                                    const matchedProd = products?.find((p: any) => p.name === val);
                                                                    if (matchedProd) {
                                                                        newItems[idx].productId = matchedProd.id;
                                                                        newItems[idx].itemCode = matchedProd.item_code;
                                                                        newItems[idx].matchingStatus = "matched";
                                                                    } else {
                                                                        newItems[idx].productId = ""; // New product
                                                                        newItems[idx].matchingStatus = "unmatched";
                                                                        newItems[idx].tempScannedName = val; // Store for resolution modal
                                                                    }
                                                                    setFormItems(newItems);

                                                                }}
                                                                placeholder="Type or Select Medicine"
                                                                className={`w-full h-12 border-2 ${item.matchingStatus === "unmatched" ? 'border-blue-200 bg-blue-50/30' : !item.productId && !item.name ? 'border-red-300 bg-red-50 animate-pulse' : needsReview ? confidenceBorderColor + ' ' + confidenceBgColor : 'border-gray-200 bg-white'} rounded-xl px-4 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 transition-all outline-none`}
                                                            />
                                                            {item.matchingStatus === "matched" && (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                                    <Sparkles className="h-3.5 w-3.5 text-purple-600 animate-pulse" />
                                                                    <span className="text-[8px] font-black text-purple-600 uppercase tracking-tighter">Matched</span>
                                                                </div>
                                                            )}
                                                            {item.matchingStatus === "unmatched" && item.name && (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                                                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-ping" />
                                                                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">Auto-Creating</span>
                                                                </div>
                                                            )}

                                                            <datalist id={`products-list-${idx}`}>
                                                                {/* AI Suggestions first */}
                                                                {(!item.productId && item.tempScannedName) &&
                                                                    products?.filter((p: any) => p.name)
                                                                        .map((p: any) => ({ ...p, score: getSimilarity(p.name, item.tempScannedName) }))
                                                                        .filter((p: any) => p.score > 0.3)
                                                                        .sort((a: any, b: any) => b.score - a.score)
                                                                        .slice(0, 3)
                                                                        .map((p: any) => (
                                                                            <option key={`ai-${p.id}`} value={p.name}>⚡ Suggestion: {p.name}</option>
                                                                        ))
                                                                }
                                                                {/* All Products */}
                                                                {products?.map((p: any) => (
                                                                    <option key={p.id} value={p.name}>
                                                                        {p.name} ({p.item_code})
                                                                    </option>
                                                                ))}
                                                            </datalist>
                                                        </div>
                                                        {item.detected?.name && (
                                                            <div className="mt-1 px-2 py-1 bg-purple-50 rounded-lg flex items-center gap-2">
                                                                <span className="text-[7px] font-black text-purple-600 uppercase">Detected:</span>
                                                                <span className="text-[10px] font-bold text-gray-600 truncate">{item.detected.name}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-3 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Batch Number</label>
                                                        <div className="relative">
                                                            <input
                                                                value={item.batchNo || ""}
                                                                onChange={(e) => { const n = [...formItems]; n[idx].batchNo = e.target.value; setFormItems(n); }}
                                                                onBlur={(e) => {
                                                                    const batchNo = e.target.value.trim();
                                                                    if (!batchNo) return;
                                                                    const allBatches = storage.get('batches', []);
                                                                    const existingBatch = allBatches.find((b: any) => b.batchNo === batchNo);
                                                                    if (existingBatch) {
                                                                        const n = [...formItems];
                                                                        n[idx].mfgDate = existingBatch.mfgDate || "";
                                                                        n[idx].expiryDate = existingBatch.expiryDate || "";
                                                                        setFormItems(n);
                                                                    }
                                                                }}
                                                                placeholder="Batch"
                                                                className={`w-full h-12 bg-white border ${item.batchNo && !item.expiryDate ? 'border-orange-300 ring-4 ring-orange-500/5' : 'border-gray-200'} rounded-xl px-4 text-xs font-bold pr-10 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none`}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => onScanItem(idx)}
                                                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 ${item.batchNo && !item.expiryDate ? 'bg-orange-50 text-orange-600 animate-pulse' : 'hover:bg-purple-50 text-purple-600'} rounded-lg transition-all`}
                                                                title={item.batchNo && !item.expiryDate ? "Expiry Missing: Click to Scan Carton" : "Scan Batch/Expiry"}
                                                            >
                                                                <ScanLine className="h-4 w-4" />
                                                            </button>
                                                            {item.batchNo && !item.expiryDate && (
                                                                <div className="absolute -top-7 left-0 flex items-center gap-1 text-[8px] font-black text-orange-600 uppercase animate-bounce">
                                                                    <AlertCircle className="h-2.5 w-2.5" /> Expiry Missing - Scan Carton
                                                                </div>
                                                            )}
                                                        </div>
                                                        {item.detected?.batchNo && (
                                                            <div className="mt-1 px-2 py-1 bg-gray-50 rounded-lg flex items-center gap-2">
                                                                <span className="text-[7px] font-black text-gray-400 uppercase">Detected:</span>
                                                                <span className="text-[10px] font-bold text-gray-600">{item.detected.batchNo}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">MFG Date</label>
                                                        <input type="date" value={item.mfgDate || ""} onChange={(e) => { const n = [...formItems]; n[idx].mfgDate = e.target.value; setFormItems(n); }} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry Date</label>
                                                        <input type="date" value={item.expiryDate || ""} onChange={(e) => { const n = [...formItems]; n[idx].expiryDate = e.target.value; setFormItems(n); }} className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-xs font-bold focus:ring-4 focus:ring-purple-500/10 transition-all outline-none" />
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2 text-right">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Action</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="h-12 px-6 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-black text-xs uppercase"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Row 2: Financials & Bonus */}
                                                <div className="grid md:grid-cols-12 gap-4 items-center pt-6 border-t border-gray-100">
                                                    <div className="md:col-span-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-blue-500 uppercase">Purch Qty</label>
                                                            {item.isAiSuggested && <span className="text-[8px] text-purple-600 font-bold">✨</span>}
                                                        </div>
                                                        <input
                                                            type="number"
                                                            value={item.quantity ?? 0}
                                                            onChange={(e) => { const n = [...formItems]; n[idx].quantity = e.target.value; setFormItems(n); }}
                                                            className={`w-full h-11 bg-blue-50/50 border ${!item.quantity || item.quantity == 0 ? 'border-red-400 ring-2 ring-red-200 animate-pulse' : 'border-blue-100'} rounded-xl px-4 text-xs font-black text-blue-700 focus:bg-white transition-all outline-none`}
                                                        />
                                                        {(!item.quantity || item.quantity == 0) && <div className="text-[8px] font-black text-red-500 uppercase tracking-tighter">⚠️ Req</div>}
                                                        {item.detected?.qty !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-blue-500 text-center uppercase tracking-tighter">AI: {item.detected.qty}</div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-green-500 uppercase">Bonus</label>
                                                        <input type="number" value={item.bonusQty ?? 0} onChange={(e) => { const n = [...formItems]; n[idx].bonusQty = e.target.value; setFormItems(n); }} className="w-full h-11 bg-green-50/50 border border-green-100 rounded-xl px-4 text-xs font-black text-green-700 focus:bg-white transition-all outline-none" />
                                                        {item.detected?.bonus !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-green-500 text-center uppercase tracking-tighter">AI: {item.detected.bonus}</div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">Total Qty</label>
                                                        <div className="h-11 flex items-center px-4 bg-gray-100 rounded-xl text-xs font-black text-gray-600">{totalQty}</div>
                                                        {item.detected?.qty !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-gray-400 text-center uppercase tracking-tighter">AI: {item.detected.qty + (item.detected.bonus || 0)}</div>
                                                        )}
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black text-purple-500 uppercase">Unit Price (Rate)</label>
                                                            {item.isAiSuggested && <span className="text-[8px] text-purple-600 font-bold">✨</span>}
                                                        </div>
                                                        <input type="number" value={item.purchasePrice ?? 0} onChange={(e) => { const n = [...formItems]; n[idx].purchasePrice = e.target.value; setFormItems(n); }} className="w-full h-11 bg-purple-50/50 border border-purple-100 rounded-xl px-4 text-xs font-black text-purple-700 focus:bg-white transition-all outline-none" />
                                                        {item.detected?.rate !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-purple-500 text-center uppercase tracking-tighter">AI: {item.detected.rate}</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className={`text-[10px] font-black ${(discountWarning && !item.isWarningDismissed) ? 'text-orange-600 animate-pulse' : 'text-orange-500'} uppercase flex items-center gap-1`}>
                                                                Disc % {(discountWarning && !item.isWarningDismissed) && <AlertCircle className="h-3 w-3" />}
                                                            </label>
                                                        </div>
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                value={item.discountPercent ?? 0}
                                                                onChange={(e) => {
                                                                    const n = [...formItems];
                                                                    n[idx].discountPercent = e.target.value;
                                                                    setFormItems(n);
                                                                }}
                                                                className={`w-full h-11 ${(discountWarning && !item.isWarningDismissed) ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-orange-50/50 border-orange-100 text-orange-700'} border rounded-xl px-4 text-xs font-black focus:bg-white transition-all outline-none`}
                                                            />
                                                            {discountWarning && !item.isWarningDismissed && (
                                                                <div className="absolute -top-12 left-0 w-56 p-3 bg-orange-600 text-white text-[9px] font-bold rounded-xl shadow-2xl z-20 animate-fade-in pointer-events-auto flex flex-col gap-2 border border-orange-400">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <span>{discountWarning.message} (Avg: {discountWarning.avg}%)</span>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const n = [...formItems];
                                                                                n[idx].isWarningDismissed = true;
                                                                                setFormItems(n);
                                                                            }}
                                                                            className="px-2 py-1 bg-white/20 hover:bg-white/40 rounded-lg text-[8px] uppercase tracking-tighter transition-colors"
                                                                        >
                                                                            Dismiss Alert
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {item.detected?.discountPercent !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-orange-500 text-center uppercase tracking-tighter">AI: {item.detected.discountPercent}%</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-red-500 uppercase">GST %</label>
                                                        <input
                                                            type="number"
                                                            value={item.gstPercent ?? item.taxPercent ?? 0}
                                                            onChange={(e) => {
                                                                const n = [...formItems];
                                                                n[idx].gstPercent = e.target.value;
                                                                n[idx].taxPercent = e.target.value;
                                                                setFormItems(n);
                                                            }}
                                                            className="w-full h-11 bg-red-50/50 border border-red-100 rounded-xl px-2 text-xs font-black text-red-700 focus:bg-white transition-all outline-none text-center"
                                                        />
                                                        {(item.detected?.gstPercent !== undefined || item.detected?.taxPercent !== undefined) && (
                                                            <div className="mt-1 text-[8px] font-black text-red-500 text-center uppercase tracking-tighter">AI: {item.detected?.gstPercent || item.detected?.taxPercent}%</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-indigo-500 uppercase">F.Tax %</label>
                                                        <input
                                                            type="number"
                                                            value={item.furtherTaxPercent ?? 0}
                                                            onChange={(e) => {
                                                                const n = [...formItems];
                                                                n[idx].furtherTaxPercent = e.target.value;
                                                                setFormItems(n);
                                                            }}
                                                            className="w-full h-11 bg-indigo-50/50 border border-indigo-100 rounded-xl px-2 text-xs font-black text-indigo-700 focus:bg-white transition-all outline-none text-center"
                                                        />
                                                        {item.detected?.furtherTaxPercent !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-indigo-500 text-center uppercase tracking-tighter">AI: {item.detected.furtherTaxPercent}%</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-amber-500 uppercase">Non-ATL %</label>
                                                        <input
                                                            type="number"
                                                            value={item.nonAtlTaxPercent ?? 0}
                                                            onChange={(e) => {
                                                                const n = [...formItems];
                                                                n[idx].nonAtlTaxPercent = e.target.value;
                                                                setFormItems(n);
                                                            }}
                                                            className="w-full h-11 bg-amber-50/50 border border-amber-100 rounded-xl px-2 text-xs font-black text-amber-700 focus:bg-white transition-all outline-none text-center"
                                                        />
                                                        {item.detected?.nonAtlTaxPercent !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-amber-500 text-center uppercase tracking-tighter">AI: {item.detected.nonAtlTaxPercent}%</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-blue-500 uppercase">Adv.T %</label>
                                                        <input
                                                            type="number"
                                                            value={item.advTaxPercent ?? 0}
                                                            onChange={(e) => {
                                                                const n = [...formItems];
                                                                n[idx].advTaxPercent = e.target.value;
                                                                setFormItems(n);
                                                            }}
                                                            className="w-full h-11 bg-blue-50/50 border border-blue-100 rounded-xl px-2 text-xs font-black text-blue-800 focus:bg-white transition-all outline-none text-center"
                                                        />
                                                        {item.detected?.advanceTaxPercent !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-blue-500 text-center uppercase tracking-tighter">AI: {item.detected.advanceTaxPercent}%</div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-1 space-y-2">
                                                        <label className="text-[10px] font-black text-teal-500 uppercase">ATL Status</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const n = [...formItems];
                                                                const newStatus = !n[idx].isATL;
                                                                n[idx].isATL = newStatus;
                                                                if (!newStatus) {
                                                                    n[idx].nonAtlTaxPercent = 2.5; // Default for NON-ATL in Pakistan
                                                                } else {
                                                                    n[idx].nonAtlTaxPercent = 0;
                                                                }
                                                                setFormItems(n);
                                                            }}
                                                            className={`w-full h-11 rounded-xl text-[9px] font-black uppercase transition-all ${item.isATL !== false ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-red-50 text-red-700 border border-red-100'}`}
                                                        >
                                                            {item.isATL !== false ? 'ATL' : 'NON-ATL'}
                                                        </button>
                                                    </div>

                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">Net Amount</label>
                                                        <div className="h-11 flex items-center px-4 bg-gray-50 rounded-xl text-xs font-black text-gray-700">
                                                            {netAmount.toFixed(2)}
                                                        </div>
                                                        {(item.detected?.netAmount !== undefined || item.detected?.net !== undefined) && (
                                                            <div className="mt-1 text-[8px] font-black text-gray-400 text-center uppercase tracking-tighter">
                                                                AI Net: {Number(item.detected?.netAmount ?? item.detected?.net).toFixed(2)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">Eff. Cost / Unit</label>
                                                        <div className="h-11 flex items-center px-4 bg-yellow-50 text-yellow-700 border border-yellow-100 rounded-xl text-xs font-black">
                                                            {effectiveCost}
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2 space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">Remarks / Scheme</label>
                                                        <input type="text" value={item.remarks || ""} onChange={(e) => { const n = [...formItems]; n[idx].remarks = e.target.value; setFormItems(n); }} placeholder="e.g. 10% Off" className="w-full h-11 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold focus:bg-white transition-all outline-none" />
                                                        {item.detected?.discount !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-orange-500 text-center uppercase tracking-tighter">AI Disc: {item.detected.discount}%</div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-6 gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-violet-500 uppercase">TP Value</label>
                                                        <div className="h-11 flex items-center px-4 bg-violet-50 text-violet-700 border border-violet-100 rounded-xl text-xs font-black">
                                                            {grossAmount.toFixed(2)}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">MRP Value</label>
                                                        <div className="h-11 flex items-center px-4 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl text-xs font-black">
                                                            {""}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-orange-500 uppercase">INV Disc Amt</label>
                                                        <div className="h-11 flex items-center px-4 bg-orange-50 text-orange-700 border border-orange-100 rounded-xl text-xs font-black">
                                                            {discountAmount.toFixed(2)}
                                                        </div>
                                                        {item.detected?.discountInvAmount !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-orange-500 text-center uppercase tracking-tighter">AI: {Number(item.detected.discountInvAmount).toFixed(2)}</div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase">Prod Disc Amt</label>
                                                        <div className="h-11 flex items-center px-4 bg-gray-50 text-gray-300 border border-gray-100 rounded-xl text-xs font-black">
                                                            {""}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-red-500 uppercase">S.Tax Amt</label>
                                                        <div className="h-11 flex items-center px-4 bg-red-50 text-red-700 border border-red-100 rounded-xl text-xs font-black">
                                                            {gstAmount.toFixed(2)}
                                                        </div>
                                                        {item.detected?.salesTaxAmount !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-red-500 text-center uppercase tracking-tighter">AI: {Number(item.detected.salesTaxAmount).toFixed(2)}</div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-blue-500 uppercase">A.I Tax Amt</label>
                                                        <div className="h-11 flex items-center px-4 bg-blue-50 text-blue-800 border border-blue-100 rounded-xl text-xs font-black">
                                                            {advTaxAmount.toFixed(2)}
                                                        </div>
                                                        {item.detected?.advanceTaxAmount !== undefined && (
                                                            <div className="mt-1 text-[8px] font-black text-blue-500 text-center uppercase tracking-tighter">AI: {Number(item.detected.advanceTaxAmount).toFixed(2)}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest"
                                    >
                                        <Plus className="h-4 w-4" /> Add Manual Item
                                    </button>
                                </div>
                            </div>

                            <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl p-8 border-t border-gray-100 -mx-8 -mb-8 rounded-b-[2rem]">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-200 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Save className="h-5 w-5" />
                                    )}
                                    {isSubmitting ? 'Recording Shipment...' : 'Confirm & Save Stock Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

