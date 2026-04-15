import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canAccessApiPath, canAccessAppPath, getDefaultRouteForRole } from "@/lib/auth/access";

const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

export default async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (
        pathname.startsWith("/_next") ||
        pathname === "/favicon.ico" ||
        PUBLIC_FILE_PATTERN.test(pathname) ||
        pathname.startsWith("/api/auth")
    ) {
        return NextResponse.next();
    }

    if (pathname === "/api/health") {
        return NextResponse.next();
    }

    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });
    const role = typeof token?.role === "string" ? token.role : null;

    if (pathname === "/login") {
        if (token && token.isActive !== false) {
            return NextResponse.redirect(new URL(getDefaultRouteForRole(role), req.url));
        }

        return NextResponse.next();
    }

    if (!token) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "Authentication required." }, { status: 401 });
        }

        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
    }

    if (token.isActive === false) {
        if (pathname.startsWith("/api/")) {
            return NextResponse.json({ error: "This account is inactive." }, { status: 403 });
        }

        return NextResponse.redirect(new URL("/login?error=inactive", req.url));
    }

    if (pathname.startsWith("/api/")) {
        if (!canAccessApiPath(role, pathname, req.method)) {
            return NextResponse.json({ error: "You do not have access to this API." }, { status: 403 });
        }

        return NextResponse.next();
    }

    if (!canAccessAppPath(role, pathname)) {
        return NextResponse.redirect(new URL(getDefaultRouteForRole(role), req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico).*)",
    ],
};
