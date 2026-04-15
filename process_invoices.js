import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim());

async function extractAndSave(imagePath, supplierNameHint) {
    console.log(`Processing ${imagePath}...`);
    const imageData = fs.readFileSync(imagePath);
    const base64Data = imageData.toString("base64");

    const prompt = `
        Extract all relevant information from this pharmaceutical/medical invoice image into a strictly valid JSON object.
        Focus on 100% accuracy for Product Name, Batch, Expiry, Qty, Rate, and Net Amount.
        
        JSON Structure:
        {
            "supplierName": "${supplierNameHint || ''}",
            "invoiceNo": "Invoice #",
            "date": "YYYY-MM-DD",
            "total": 0.00,
            "items": [
                {
                    "name": "Full Product Name",
                    "batch": "Batch Number",
                    "qty": 0,
                    "bonus": 0,
                    "rate": 0.00,
                    "discountPercent": 0.00,
                    "net": 0.00,
                    "expiry": "YYYY-MM-DD"
                }
            ]
        }
        Rules:
        1. Return ONLY the JSON object.
        2. If expiry is missing, use "2026-12-01".
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: "image/png",
        },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

    console.log(`Extracted data for ${data.supplierName}:`, JSON.stringify(data, null, 2));

    // --- DB OPERATIONS ---
    
    // 1. Supplier
    let supplier = await prisma.supplier.findFirst({
        where: { name: { contains: data.supplierName } }
    });
    if (!supplier) {
        supplier = await prisma.supplier.create({
            data: {
                name: data.supplierName || "Unknown Supplier",
                phone: "OCR",
                email: "ocr@vendor.com",
                address: "Karachi, Pakistan"
            }
        });
    }

    // 2. Purchase
    const purchase = await prisma.purchase.create({
        data: {
            invoiceNo: data.invoiceNo || `OCR-${Date.now()}`,
            date: new Date(data.date || new Date()),
            total: data.total || 0,
            supplierId: supplier.id,
            branchId: 1 // Default branch
        }
    });

    // 3. Products and Batches
    for (const item of data.items) {
        let product = await prisma.product.findFirst({
            where: { name: { contains: item.name } }
        });

        if (!product) {
            product = await prisma.product.create({
                data: {
                    name: item.name,
                    brand: "Generics",
                    category: "Medical",
                    purchasePrice: item.rate,
                    salePrice: item.rate * 1.2, // 20% markup
                    item_code: `ITM-${Math.random().toString(36).slice(-5).toUpperCase()}`,
                    stock: 0
                }
            });
        }

        const totalQty = (item.qty || 0) + (item.bonus || 0);

        // Create Batch
        const batch = await prisma.batch.create({
            data: {
                batchNo: item.batch || "B-NEW",
                expiryDate: new Date(item.expiry || "2026-12-01"),
                quantity: totalQty,
                productId: product.id,
                branchId: 1,
                supplierId: supplier.id,
                purchasePrice: item.rate
            }
        });

        // Create PurchaseItem
        await prisma.purchaseItem.create({
            data: {
                purchaseId: purchase.id,
                productId: product.id,
                batchId: batch.id,
                quantity: item.qty || 0,
                price: item.rate || 0
            }
        });

        // Update Product Stock
        await prisma.product.update({
            where: { id: product.id },
            data: {
                stock: { increment: totalQty },
                purchasePrice: item.rate
            }
        });
    }

    console.log(`✅ Finished ${imagePath}`);
}

async function main() {
    // Media paths are provided in the environment as input_file_0, input_file_1
    // But since I'm running this script via tool, I'll pass filenames
    const images = process.argv.slice(2);
    for (const img of images) {
        await extractAndSave(img);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
