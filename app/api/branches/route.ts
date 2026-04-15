import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/server/requestJson";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const branches = await prisma.branch.findMany({
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(branches);
    } catch (error: any) {
        console.error("GET /api/branches error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await readJsonBody(req);
        const { name, location, type } = body;

        if (!name) {
            return NextResponse.json({ error: "Branch name is required" }, { status: 400 });
        }

        const branch = await prisma.branch.create({
            data: {
                name,
                location: location || "",
                type: type || "Pharmacy"
            }
        });

        return NextResponse.json(branch);
    } catch (error: any) {
        console.error("POST /api/branches error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
