import { DefaultSession } from "next-auth";
import type { AppRole } from "@/lib/auth/access";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role?: AppRole;
            isActive?: boolean;
            branchId?: number | null;
            branchName?: string | null;
        } & DefaultSession["user"];
    }

    interface User {
        role: AppRole;
        isActive: boolean;
        branchId: number | null;
        branchName: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: AppRole;
        isActive?: boolean;
        branchId?: number | null;
        branchName?: string | null;
    }
}
