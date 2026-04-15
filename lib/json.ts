export function safeParseJson<T>(input: string | null | undefined, fallback: T): T {
    const raw = typeof input === "string" ? input.trim() : "";
    if (!raw || raw === "undefined") {
        return fallback;
    }

    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

export async function parseResponseJson<T>(response: Response, fallback: T): Promise<T> {
    const text = await response.text();
    return safeParseJson(text, fallback);
}
