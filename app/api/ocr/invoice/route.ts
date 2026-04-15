import { NextResponse } from "next/server";
import { runGeminiDocumentOcr } from "@/lib/server/geminiOcr";
import { buildPharmaInvoiceOcrPrompt } from "@/lib/server/pharmaInvoicePrompt";
import { normalizePharmaInvoiceOcrData } from "@/lib/server/pharmaInvoiceOcr";

export async function POST(req: Request) {
    try {
        const { image, fileName } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY?.replace(/['"]/g, '').trim();
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured in .env" },
                { status: 500 }
            );
        }

        const result = await runGeminiDocumentOcr(apiKey, image, buildPharmaInvoiceOcrPrompt());
        const normalizedData = normalizePharmaInvoiceOcrData(result.data, { sourceFile: fileName });
        return NextResponse.json({ success: true, data: normalizedData, model: result.model });

    } catch (error: any) {
        console.error("Invoice OCR Error:", error);
        return NextResponse.json(
            {
                error: error.message || "Internal Server Error",
                details: error.details || error.message,
                help: error.help,
            },
            { status: error.status || 500 }
        );
    }
}
