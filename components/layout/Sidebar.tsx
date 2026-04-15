"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import {
    Calculator,
    ChevronRight,
    Contact,
    FileText,
    LayoutDashboard,
    LogOut,
    Package,
    Pill,
    Settings,
    ShoppingCart,
    TruckIcon,
    Users,
    Wallet,
    BarChart3,
    Bell,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ADMIN_ROLE, POS_ROLE } from "@/lib/auth/access";
import { cn } from "@/lib/utils";

type SidebarItem = {
    icon: LucideIcon;
    label: string;
    href: string;
    disabled?: boolean;
};

const adminSidebarItems: SidebarItem[] = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Pill, label: "Products", href: "/products" },
    { icon: ShoppingCart, label: "Sales", href: "/sales" },
    { icon: TruckIcon, label: "Purchases", href: "/purchases" },
    { icon: Package, label: "Stock", href: "/stock" },
    { icon: TruckIcon, label: "Transfers", href: "/inventory/transfer", disabled: true },
    { icon: Wallet, label: "Finance", href: "/finance" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
    { icon: Users, label: "Suppliers", href: "/suppliers" },
    { icon: Bell, label: "Alerts", href: "/alerts", disabled: true },
    { icon: FileText, label: "Invoices", href: "/invoices" },
    { icon: Contact, label: "HR", href: "/hr", disabled: true },
    { icon: Calculator, label: "Accountant", href: "/accounts", disabled: true },
    { icon: Users, label: "Branches", href: "/branches", disabled: true },
    { icon: Settings, label: "Settings", href: "/settings", disabled: true },
];

const posSidebarItems: SidebarItem[] = [
    { icon: ShoppingCart, label: "POS Billing", href: "/sales" },
    { icon: FileText, label: "Invoices", href: "/invoices" },
];

interface SidebarProps {
    isOpen: boolean;
    setOpen: (open: boolean) => void;
}

export function Sidebar({ isOpen, setOpen }: SidebarProps) {
    const pathname = usePathname();
    const { data: session, status } = useSession();

    const role = session?.user?.role === POS_ROLE ? POS_ROLE : ADMIN_ROLE;
    const sidebarItems = role === POS_ROLE ? posSidebarItems : adminSidebarItems;
    const userName = session?.user?.name || "MediStock User";
    const userEmail = session?.user?.email || "";
    const userInitials = userName
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "MS";

    return (
        <aside
            className={cn(
                "fixed left-0 top-0 z-40 h-screen w-64 sidebar-gradient text-white transition-transform duration-300 lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <button
                onClick={() => setOpen(false)}
                className="lg:hidden absolute right-4 top-6 p-2 rounded-lg bg-white/10"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex h-20 items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Pill className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tighter text-white">MediStock</h1>
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-widest">
                            {role === POS_ROLE ? "Billing Console" : "Management Core"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1 p-4 mt-2">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider px-3 mb-2">
                    {role === POS_ROLE ? "POS Menu" : "Main Menu"}
                </p>
                {sidebarItems.map((item) => {
                    const isDisabled = Boolean(item.disabled);
                    const isActive = !isDisabled && pathname === item.href;
                    const itemClasses = cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        isDisabled
                            ? "text-white/35 cursor-not-allowed opacity-60"
                            : isActive
                                ? "bg-white text-purple-600 shadow-lg"
                                : "text-white/80 hover:bg-white/10 hover:text-white"
                    );

                    const content = (
                        <>
                            <item.icon className="h-5 w-5" />
                            <span className="flex-1">{item.label}</span>
                            {isDisabled ? (
                                <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white/40">
                                    Closed
                                </span>
                            ) : (
                                isActive && <ChevronRight className="h-4 w-4" />
                            )}
                        </>
                    );

                    if (isDisabled) {
                        return (
                            <div
                                key={item.href}
                                className={itemClasses}
                                aria-disabled="true"
                                title="This section is closed"
                            >
                                {content}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={itemClasses}
                        >
                            {content}
                        </Link>
                    );
                })}
            </div>

            <div className="absolute bottom-0 left-0 w-full p-4 border-t border-white/10">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 backdrop-blur">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center text-sm font-bold">
                        {userInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {status === "loading" ? "Loading user..." : userName}
                        </p>
                        <p className="text-xs text-white/60 truncate">
                            {role === POS_ROLE ? "POS User" : "Administrator"}
                            {userEmail ? ` · ${userEmail}` : ""}
                        </p>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        title="Sign out"
                    >
                        <LogOut className="h-4 w-4 text-white/60" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
