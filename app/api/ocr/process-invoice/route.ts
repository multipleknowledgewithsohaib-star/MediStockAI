import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { fuzzyMatchProduct, MatchableProduct } from "@/lib/fuzzyMatcher";
import { runGeminiDocumentOcr } from "@/lib/server/geminiOcr";
import { buildPharmaInvoiceOcrPrompt } from "@/lib/server/pharmaInvoicePrompt";
import { normalizePharmaInvoiceOcrData } from "@/lib/server/pharmaInvoiceOcr";

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { image, fileName } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY?.replace(/['"]/g, "").trim();

        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured in .env" },
                { status: 500 }
            );
        }

        const ocrResult = await runGeminiDocumentOcr(apiKey, image, buildPharmaInvoiceOcrPrompt());
        const extractedData = normalizePharmaInvoiceOcrData(ocrResult.data, { sourceFile: fileName });
        const ocrInvoices = extractedData.invoices || [];

        if (ocrInvoices.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    supplierId: null,
                    supplierName: "",
                    invoiceNo: "",
                    total: 0,
                    items: []
                }
            });
        }

        const allProcessedItems: any[] = [];
        let grandTotal = 0;
        let globalSupplierId: number | null = null;
        let globalSupplierName: string | null = null;

        // Load products for matching once
        const allProducts = await prisma.product.findMany({
            include: { aliases: true }
        });

        const matchableProducts: MatchableProduct[] = allProducts.map(p => ({
            id: p.id,
            name: p.name,
            item_code: p.item_code,
            aliases: p.aliases.map(a => a.alias)
        }));

        for (const invoice of ocrInvoices) {
            grandTotal += (invoice.total || 0);
            
            // 1. Detect/Create Supplier for THIS invoice
            let currentSupplier = null;
            if (invoice.supplierName && invoice.supplierName.trim().length > 0) {
                currentSupplier = await prisma.supplier.findFirst({
                    where: { name: { contains: invoice.supplierName } }
                });
        
                if (!currentSupplier) {
                    currentSupplier = await prisma.supplier.create({
                        data: {
                            name: invoice.supplierName,
                            phone: "", email: "", address: ""
                        }
                    });
                }
            }

            const currentSupplierId = currentSupplier?.id || null;
            if (!globalSupplierId) {
                globalSupplierId = currentSupplierId;
                globalSupplierName = currentSupplier?.name || "";
            }

            if (!invoice.items) continue;

            const processedItems = await Promise.all(invoice.items.map(async (item: any) => {
                const exactItemCodeMatch = item.itemCode
                    ? allProducts.find((product) => String(product.item_code || "").trim() === String(item.itemCode).trim())
                    : null;
                const match = exactItemCodeMatch
                    ? {
                        productId: exactItemCodeMatch.id,
                        score: 100,
                        type: "Item Code",
                        matchedOn: exactItemCodeMatch.item_code
                    }
                    : fuzzyMatchProduct(item.name, matchableProducts);
                const matchedProduct = match
                    ? allProducts.find((product) => String(product.id) === String(match.productId))
                    : null;
                let alert = null;
                let existingLink = null;

                if (match && currentSupplierId) {
                    existingLink = await prisma.productSupplier.findUnique({
                        where: {
                            productId_supplierId: {
                                productId: Number(match.productId),
                                supplierId: Number(currentSupplierId)
                            }
                        }
                    });

                    if (existingLink) {
                        if (item.discountPercent !== undefined && existingLink.discount !== item.discountPercent) {
                            alert = `Expected discount is ${existingLink.discount}%, but received ${item.discountPercent}%`;
                        }
                    }
                }

                return {
                    ...item,
                    matchedProductId: match?.productId || null,
                    matchedProductName: matchedProduct?.name || null,
                    matchedItemCode: matchedProduct?.item_code || null,
                    matchedBrand: matchedProduct?.brand || null,
                    matchedCategory: matchedProduct?.category || null,
                    matchScore: match?.score || null,
                    matchType: match?.type || null,
                    matchName: match?.matchedOn || null,
                    alert,
                    supplierId: currentSupplierId,
                    supplierName: currentSupplier?.name,
                    existingLink: !!existingLink,
                    invoiceNo: invoice.invoiceNo
                };
            }));

            allProcessedItems.push(...processedItems);
        }

        return NextResponse.json({
            success: true,
            data: {
                supplierId: globalSupplierId,
                supplierName: globalSupplierName,
                invoiceNo: ocrInvoices[0]?.invoiceNo,
                supplyId: ocrInvoices[0]?.supplyId,
                date: ocrInvoices[0]?.date,
                total: grandTotal,
                items: allProcessedItems,
                invoicesCount: ocrInvoices.length
            }
        });

    } catch (error: any) {
        console.error("Process Invoice Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Process Invoice Error",
                details: error.details || error.message,
                help: error.help,
            },
            { status: error.status || 500 }
        );
    }
}
