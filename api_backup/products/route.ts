import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const products = await prisma.product.findMany({
            include: {
                batches: true
            }
        });
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    console.log("POST /api/products - Request started");
    try {
        const body = await req.json();
        console.log("POST /api/products - Body received:", body);

        const { name, brand, category, purchasePrice, salePrice, batchNo, expiryDate, quantity, unitsPerPack, defaultDiscount } = body;

        // Robust date parsing
        let parsedExpiryDate = new Date(expiryDate);
        if (isNaN(parsedExpiryDate.getTime())) {
            console.error("POST /api/products - Invalid Expiry Date:", expiryDate);
            return NextResponse.json({ error: "Invalid Expiry Date format. Use YYYY-MM-DD" }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name: String(name),
                brand: String(brand),
                category: String(category),
                purchasePrice: Number(purchasePrice),
                salePrice: Number(salePrice),
                defaultDiscount: Number(defaultDiscount || 0),
                unitsPerPack: Number(unitsPerPack || 1),
                stock: Number(quantity) * Number(unitsPerPack || 1),
                batches: {
                    create: {
                        batchNo: String(batchNo),
                        expiryDate: parsedExpiryDate,
                        quantity: Number(quantity) * Number(unitsPerPack || 1)
                    }
                }
            },
            include: {
                batches: true
            }
        });

        console.log("POST /api/products - Product created successfully:", product.id);
        return NextResponse.json(product);
    } catch (error: any) {
        console.error("POST /api/products - Create Error:", error.message || error);
        return NextResponse.json({
            error: "Failed to create product",
            details: error.message || String(error)
        }, { status: 500 });
    }
}
