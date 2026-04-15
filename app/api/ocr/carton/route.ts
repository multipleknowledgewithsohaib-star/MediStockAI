import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY?.replace(/['"]/g, '').trim();
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured in .env" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Convert base64 to parts
        const base64Data = image.split(",")[1] || image;
        const imagePart = {
            inlineData: {
                data: base64Data,
                mimeType: "image/png",
            },
        };

        const prompt = `
            Extract pharmaceutical batch information from this medicine product box/carton image.
            Return a strictly valid JSON object.
            
            Look for these specific fields:
            1. Batch Number (often prefixed with B, B.N, BN, Lot, etc.)
            2. Manufacturing Date (MFG, MFD, M, etc.)
            3. Expiry Date (EXP, E, ED, etc.)
            4. MRP or Retail Price in PKR (Maximum Retail Price).
            
            The JSON should follow this structure:
            {
                "batchNo": "Extract string",
                "mfgDate": "YYYY-MM-DD (convert format if needed, use 1st day if only month/year)",
                "expiryDate": "YYYY-MM-DD (convert format if needed, use 1st day if only month/year)",
                "mrp": 0.00 (number only),
                "productName": "Extract product name if visible"
            }
            
            Rules:
            - If a date is MM/YY or MM/YYYY, convert to YYYY-MM-01.
            - Extract MRP as a decimal number.
            - If any field is not found, use "" for strings and null for mrp.
            - Return ONLY the JSON object.
        `;

        const modelNames = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];
        let lastError = null;

        for (const name of modelNames) {
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent([prompt, imagePart]);
                const response = await result.response;
                const text = response.text();

                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text;
                const data = JSON.parse(jsonStr);

                return NextResponse.json({ success: true, data });
            } catch (e: any) {
                lastError = e;
            }
        }

        throw lastError;

    } catch (error: any) {
        console.error("Gemini Carton OCR Error:", error);
        return NextResponse.json(
            { error: "AI Model Error", details: error.message },
            { status: 500 }
        );
    }
}
