import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function GET() {
    try {
        let settings = await prisma.settings.findFirst();
        
        // If no settings exist, create a default record
        if (!settings) {
            settings = await prisma.settings.create({
                data: {
                    id: 1,
                    pharmacyName: "MediStock Pharmacy",
                    ownerName: "Administrator",
                    phone: "",
                    email: "",
                    address: ""
                }
            });
        }
        
        return NextResponse.json(settings);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // Upsert logic for a single settings record (ID 1)
        const settings = await prisma.settings.upsert({
            where: { id: 1 },
            update: {
                pharmacyName: body.pharmacyName,
                ownerName: body.ownerName,
                phone: body.phone,
                email: body.email,
                address: body.address,
                logo: body.logo,
                geminiApiKey: body.geminiApiKey,
            },
            create: {
                id: 1,
                pharmacyName: body.pharmacyName || "MediStock Pharmacy",
                ownerName: body.ownerName || "Administrator",
                phone: body.phone || "",
                email: body.email || "",
                address: body.address || "",
                logo: body.logo,
                geminiApiKey: body.geminiApiKey,
            }
        });
        
        return NextResponse.json(settings);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
