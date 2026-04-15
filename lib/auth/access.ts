export type AppRole = "ADMIN" | "POS";

export const ADMIN_ROLE: AppRole = "ADMIN";
export const POS_ROLE: AppRole = "POS";

const SHARED_PAGE_PREFIXES = ["/sales", "/invoices"];
const ADMIN_ONLY_PAGE_PREFIXES = [
    "/",
    "/products",
    "/purchases",
    "/stock",
    "/finance",
    "/reports",
    "/suppliers",
    "/setup",
    "/test",
];
const CLOSED_PAGE_PREFIXES = [
    "/alerts",
    "/hr",
    "/accounts",
    "/branches",
    "/settings",
    "/inventory/transfer",
];

const matchesPath = (pathname: string, prefix: string) => {
    if (prefix === "/") {
        return pathname === "/";
    }

    return pathname === prefix || pathname.startsWith(`${prefix}/`);
};

export function getDefaultRouteForRole(role?: string | null) {
    return role === ADMIN_ROLE ? "/" : "/sales";
}

export function isClosedFeaturePath(pathname: string) {
    return CLOSED_PAGE_PREFIXES.some((prefix) => matchesPath(pathname, prefix));
}

export function isSharedAppPath(pathname: string) {
    return SHARED_PAGE_PREFIXES.some((prefix) => matchesPath(pathname, prefix));
}

export function isAdminOnlyAppPath(pathname: string) {
    return ADMIN_ONLY_PAGE_PREFIXES.some((prefix) => matchesPath(pathname, prefix));
}

export function canAccessAppPath(role: string | null | undefined, pathname: string) {
    if (isClosedFeaturePath(pathname)) {
        return false;
    }

    if (isSharedAppPath(pathname)) {
        return role === ADMIN_ROLE || role === POS_ROLE;
    }

    if (isAdminOnlyAppPath(pathname)) {
        return role === ADMIN_ROLE;
    }

    return role === ADMIN_ROLE;
}

export function canAccessApiPath(role: string | null | undefined, pathname: string, method: string) {
    const normalizedMethod = method.toUpperCase();

    if (pathname === "/api/health") {
        return normalizedMethod === "GET";
    }

    if (role === ADMIN_ROLE) {
        return true;
    }

    if (role !== POS_ROLE) {
        return false;
    }

    if (pathname === "/api/products") {
        return normalizedMethod === "GET";
    }

    if (pathname === "/api/sales") {
        return normalizedMethod === "GET" || normalizedMethod === "POST";
    }

    if (pathname === "/api/invoices") {
        return normalizedMethod === "GET";
    }

    return false;
}
