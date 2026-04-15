export async function readJsonBody(req: Request) {
    const text = await req.text();
    if (!text.trim()) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error("Invalid JSON request body");
    }
}
