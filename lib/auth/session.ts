import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { ADMIN_ROLE, type AppRole } from "@/lib/auth/access";
import { authOptions } from "@/lib/auth/auth-options";

export type AuthenticatedUser = {
    id: number;
    name: string;
    email: string;
    role: AppRole;
    isActive: boolean;
    branchId: number | null;
    branchName: string | null;
};

const toAuthenticatedUser = (session: Session | null) => {
    const rawId = Number(session?.user?.id);

    if (!session?.user || !Number.isInteger(rawId) || !session.user.role) {
        return null;
    }

    return {
        id: rawId,
        name: session.user.name ?? "Unknown User",
        email: session.user.email ?? "",
        role: session.user.role,
        isActive: Boolean(session.user.isActive),
        branchId: session.user.branchId ?? null,
        branchName: session.user.branchName ?? null,
    } satisfies AuthenticatedUser;
};

export async function getCurrentUser() {
    const session = await getServerSession(authOptions);
    return toAuthenticatedUser(session);
}

export async function requireAuthenticatedUser(allowedRoles?: AppRole[]) {
    const user = await getCurrentUser();

    if (!user) {
        return {
            response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
        };
    }

    if (!user.isActive) {
        return {
            response: NextResponse.json({ error: "This account is inactive." }, { status: 403 }),
        };
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return {
            response: NextResponse.json({ error: "You do not have access to this resource." }, { status: 403 }),
        };
    }

    return { user };
}

export function isAdminUser(user: Pick<AuthenticatedUser, "role"> | null | undefined) {
    return user?.role === ADMIN_ROLE;
}
