import { randomBytes, scryptSync } from "crypto";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const hashPassword = (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    return `scrypt:${salt}:${hash}`;
};

const DEFAULT_PASSWORDS = {
    admin: process.env.SEED_ADMIN_PASSWORD || "Admin@123",
    pos1: process.env.SEED_POS1_PASSWORD || "PosUser1@123",
    pos2: process.env.SEED_POS2_PASSWORD || "PosUser2@123",
};

const parseBranchId = (value: string | undefined) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
};

async function resolveBranchId(value: string | undefined) {
    const parsed = parseBranchId(value);
    if (parsed === null) {
        return null;
    }

    const branch = await prisma.branch.findUnique({
        where: { id: parsed },
        select: { id: true },
    });

    return branch?.id ?? null;
}

async function upsertUser({
    name,
    email,
    password,
    role,
    branchId,
}: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    branchId: number | null;
}) {
    const passwordHash = hashPassword(password);

    await prisma.user.upsert({
        where: { email },
        update: {
            name,
            password: passwordHash,
            role,
            isActive: true,
            branchId,
        },
        create: {
            name,
            email,
            password: passwordHash,
            role,
            isActive: true,
            branchId,
        },
    });
}

async function main() {
    const adminBranchId = await resolveBranchId(process.env.SEED_ADMIN_BRANCH_ID);
    const pos1BranchId = await resolveBranchId(process.env.SEED_POS1_BRANCH_ID);
    const pos2BranchId = await resolveBranchId(process.env.SEED_POS2_BRANCH_ID);

    const settings = await prisma.settings.findFirst({
        select: { id: true },
    });

    if (!settings) {
        await prisma.settings.create({
            data: {
                id: 1,
                pharmacyName: "MediStock Pharmacy",
                ownerName: "Administrator",
                phone: "",
                email: "",
                address: "",
            },
        });
    }

    await upsertUser({
        name: "Admin User",
        email: "admin@medistock.local",
        password: DEFAULT_PASSWORDS.admin,
        role: UserRole.ADMIN,
        branchId: adminBranchId,
    });

    await upsertUser({
        name: "POS User 1",
        email: "pos1@medistock.local",
        password: DEFAULT_PASSWORDS.pos1,
        role: UserRole.POS,
        branchId: pos1BranchId,
    });

    await upsertUser({
        name: "POS User 2",
        email: "pos2@medistock.local",
        password: DEFAULT_PASSWORDS.pos2,
        role: UserRole.POS,
        branchId: pos2BranchId,
    });

    console.log("Seeded role-based accounts:");
    console.log("  admin@medistock.local");
    console.log("  pos1@medistock.local");
    console.log("  pos2@medistock.local");
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
