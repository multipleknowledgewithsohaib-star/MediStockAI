import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { readJsonBody } from "@/lib/server/requestJson";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const aliases = await prisma.productAlias.findMany({
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        item_code: true
                    }
                }
            }
        });
        return NextResponse.json(aliases);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { alias, productId } = await readJsonBody(req);

        if (!alias || !productId) {
            return NextResponse.json({ error: "Alias and Product ID are required" }, { status: 400 });
        }

        const newAlias = await prisma.productAlias.create({
            data: {
                alias,
                productId: Number(productId)
            },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json(newAlias);
    } catch (error: any) {
        // If alias already exists, we can ignore or return error
        if (error.code === 'P2002') {
            return NextResponse.json({ error: "This alias already exists" }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
