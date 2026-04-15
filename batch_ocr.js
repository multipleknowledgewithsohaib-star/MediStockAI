import { GoogleGenerativeAI } from "@google/generative-ai";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.replace(/['"]/g, '').trim());

const IMAGES_DIR = path.join(process.cwd(), "CamScanner");
const DONE_DIR = path.join(IMAGES_DIR, "Done");
const BATCH_SIZE = 20;
const DELAY_BETWEEN_REQUESTS = 10000; // 10 seconds to stay under free tier RPM

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractAndSave(imagePath) {
    const fileName = path.basename(imagePath);
    console.log(`[OCR] Processing ${fileName}...`);
    
    const imageData = fs.readFileSync(imagePath);
    const base64Data = imageData.toString("base64");

    const prompt = `
        Extract all relevant information from this pharmaceutical/medical invoice image into a strictly valid JSON object.
        Focus on 100% accuracy for Product Name, Batch, Expiry, Qty, Rate, and Net Amount.
        
        JSON Structure:
        {
            "supplierName": "Supplier Company name",
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
                    "net": 0.00,
                    "expiry": "YYYY-MM-DD"
                }
            ]
        }
        Rules:
        1. Return ONLY the JSON object.
        2. If expiry is missing, use "2026-12-01".
        3. Standardize date format to YYYY-MM-DD.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: "image/jpeg",
        },
    };

    try {
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const data = JSON.parse(jsonMatch ? jsonMatch[0] : text);

        console.log(`[DB] Saving data for invoice ${data.invoiceNo} from ${data.supplierName}`);

        // DB Transactions
        const resultDb = await prisma.$transaction(async (tx) => {
            // 0. Find a valid branch
            const branch = await tx.branch.findFirst();
            const branchId = branch ? branch.id : null;

            // 1. Supplier
            let supplier = await tx.supplier.findFirst({
                where: { name: { contains: data.supplierName } }
            });
            if (!supplier) {
                supplier = await tx.supplier.create({
                    data: {
                        name: data.supplierName || "OCR Unknown",
                        phone: "extracted via OCR",
                        address: "Extracted via OCR"
                    }
                });
            }

            // 2. Purchase
            const purchase = await tx.purchase.create({
                data: {
                    invoiceNo: data.invoiceNo || `OCR-${Date.now()}`,
                    date: new Date(data.date || new Date()),
                    total: data.total || 0,
                    supplierId: supplier.id,
                    branchId: branchId
                }
            });

            // 3. Items
            for (const item of data.items) {
                let product = await tx.product.findFirst({
                    where: { OR: [ { name: { contains: item.name } }, { name: item.name } ] }
                });

                if (!product) {
                    product = await tx.product.create({
                        data: {
                            name: item.name,
                            brand: "Generic",
                            category: "Medicine",
                            purchasePrice: item.rate || 0,
                            salePrice: (item.rate || 0) * 1.2,
                            item_code: `ITM-${Math.random().toString(36).slice(-5).toUpperCase()}`,
                            stock: 0
                        }
                    });
                }

                const totalQty = (item.qty || 0) + (item.bonus || 0);

                const batch = await tx.batch.create({
                    data: {
                        batchNo: item.batch || "B-NEW",
                        expiryDate: new Date(item.expiry || "2026-12-01"),
                        quantity: totalQty,
                        productId: product.id,
                        branchId: branchId,
                        supplierId: supplier.id,
                        purchasePrice: item.rate
                    }
                });

                await tx.purchaseItem.create({
                    data: {
                        purchaseId: purchase.id,
                        productId: product.id,
                        batchId: batch.id,
                        quantity: item.qty || 0,
                        bonusQty: item.bonus || 0,
                        price: item.rate || 0,
                        netAmount: item.net || 0
                    }
                });

                await tx.product.update({
                    where: { id: product.id },
                    data: {
                        stock: { increment: totalQty },
                        purchasePrice: item.rate
                    }
                });
            }
            return purchase;
        });

        // Move file to Done folder
        fs.renameSync(imagePath, path.join(DONE_DIR, fileName));
        console.log(`✅ Success: ${fileName} processed and moved to Done.`);
        return { success: true, fileName };

    } catch (error) {
        console.error(`❌ Error processing ${fileName}:`, error.message);
        fs.appendFileSync("OCR_ERROR_LOG.txt", `[${new Date().toISOString()}] File: ${fileName} Error: ${error.message}\n`);
        return { success: false, fileName, error: error.message };
    }
}

async function main() {
    console.log("🚀 Starting Batch OCR Processing...");
    
    if (!fs.existsSync(DONE_DIR)) fs.mkdirSync(DONE_DIR);

    const files = fs.readdirSync(IMAGES_DIR)
        .filter(f => f.toLowerCase().endsWith(".jpg") || f.toLowerCase().endsWith(".png") || f.toLowerCase().endsWith(".jpeg"))
        .slice(0, BATCH_SIZE);

    if (files.length === 0) {
        console.log("No images found in CamScanner folder.");
        return;
    }

    console.log(`Found ${files.length} images to process in this batch.`);

    const results = [];
    for (const file of files) {
        const result = await extractAndSave(path.join(IMAGES_DIR, file));
        results.push(result);
        
        // Rate limiting
        if (files.indexOf(file) < files.length - 1) {
            console.log(`Waiting ${DELAY_BETWEEN_REQUESTS/1000}s to prevent quota error...`);
            await sleep(DELAY_BETWEEN_REQUESTS);
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n--- BATCH SUMMARY ---`);
    console.log(`Total: ${files.length}`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${files.length - successCount}`);
    console.log(`Check OCR_ERROR_LOG.txt for details.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
