import { GoogleGenerativeAI } from "@google/generative-ai";

type GeminiOcrResult = {
    data: any;
    model: string;
};

type GeminiOcrError = Error & {
    status?: number;
    details?: string;
    help?: string;
};

const FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-flash-latest",
];

function extractJson(text: string) {
    const cleaned = String(text || "").trim();
    const normalized = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    const jsonMatch = normalized.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : normalized);
}

function parseInlineData(dataUrl: string) {
    const mimeTypeMatch = dataUrl.match(/^data:([a-zA-Z]+\/[a-zA-Z0-9.+_-]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    const base64Data = dataUrl.split(",")[1] || dataUrl;

    return {
        inlineData: {
            data: base64Data,
            mimeType,
        },
    };
}

async function listCandidateModels(apiKey: string) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            return FALLBACK_MODELS;
        }

        const payload = await response.json();
        const availableModels = (payload.models || [])
            .filter((model: any) =>
                Array.isArray(model.supportedMethods) &&
                model.supportedMethods.includes("generateContent")
            )
            .map((model: any) => String(model.name || "").split("/").pop())
            .filter((name: string) => /flash|pro/i.test(name));

        if (!availableModels.length) {
            return FALLBACK_MODELS;
        }

        const ordered = [
            ...FALLBACK_MODELS.filter((name) => availableModels.includes(name)),
            ...availableModels.filter((name: string) => !FALLBACK_MODELS.includes(name)),
        ];

        return [...new Set(ordered)];
    } catch {
        return FALLBACK_MODELS;
    }
}

function buildError(lastError: any, triedModels: string[]): GeminiOcrError {
    const message = String(lastError?.message || "Unknown OCR failure");
    const error = new Error("AI OCR failed") as GeminiOcrError;
    error.details = message;

    if (message.includes("429")) {
        error.status = 429;
        error.message = "Gemini quota or rate limit reached";
        error.help = `The current API key cannot process OCR right now. Tried models: ${triedModels.join(", ")}`;
        return error;
    }

    if (message.includes("404")) {
        error.status = 502;
        error.message = "Configured Gemini model is unavailable";
        error.help = `The OCR service skipped unsupported model names and tried: ${triedModels.join(", ")}`;
        return error;
    }

    if (message.includes("503")) {
        error.status = 503;
        error.message = "Gemini service is temporarily busy";
        error.help = `Retry after a short wait. Tried models: ${triedModels.join(", ")}`;
        return error;
    }

    error.status = 500;
    error.message = "AI Model Error";
    error.help = `Tried models: ${triedModels.join(", ")}`;
    return error;
}

async function runGeminiOnly(apiKey: string, fileDataUrl: string, prompt: string): Promise<GeminiOcrResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const documentPart = parseInlineData(fileDataUrl);
    const modelNames = await listCandidateModels(apiKey);

    let lastError: any = null;
    const triedModels: string[] = [];

    for (const modelName of modelNames) {
        triedModels.push(modelName);

        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json",
                },
            });

            const result = await model.generateContent([prompt, documentPart]);
            const response = await result.response;
            const text = response.text();

            return {
                data: extractJson(text),
                model: modelName,
            };
        } catch (error: any) {
            lastError = error;
        }
    }

    throw buildError(lastError, triedModels);
}

export async function runGeminiDocumentOcr(apiKey: string, fileDataUrl: string, prompt: string): Promise<GeminiOcrResult> {
    return runGeminiOnly(apiKey, fileDataUrl, prompt);
}
