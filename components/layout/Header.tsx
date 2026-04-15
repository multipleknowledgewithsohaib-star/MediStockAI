"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { Bell, Building2, ChevronDown, LogOut, Menu, Search, Store, TrendingUp } from "lucide-react";
import { POS_ROLE } from "@/lib/auth/access";
import { storage } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
    const { data: session, status } = useSession();
    const [branches, setBranches] = useState<any[]>([]);
    const [activeBranch, setActiveBranch] = useState<any>(null);

    const isPosUser = session?.user?.role === POS_ROLE;

    useEffect(() => {
        if (isPosUser) {
            const lockedBranch = session?.user?.branchId
                ? {
                    id: session.user.branchId,
                    name: session.user.branchName || "Assigned Branch",
                    type: "Assigned",
                }
                : null;

            setActiveBranch(lockedBranch);
            storage.set("activeBranch", lockedBranch);
            return;
        }

        let cancelled = false;

        const loadBranches = async () => {
            try {
                const response = await fetch("/api/branches");
                if (!response.ok) {
                    throw new Error("Failed to load branches");
                }

                const branchList = await response.json();
                if (cancelled) {
                    return;
                }

                setBranches(branchList);

                const storedBranch = storage.get("activeBranch", null);
                if (storedBranch) {
                    setActiveBranch(storedBranch);
                } else if (branchList.length > 0) {
                    const defaultBranch = branchList[0];
                    setActiveBranch(defaultBranch);
                    storage.set("activeBranch", defaultBranch);
                }
            } catch (error) {
                if (!cancelled) {
                    setBranches([]);
                }
            }
        };

        loadBranches();

        return () => {
            cancelled = true;
        };
    }, [isPosUser, session?.user?.branchId, session?.user?.branchName]);

    const handleBranchChange = (branch: any) => {
        if (isPosUser) {
            return;
        }

        setActiveBranch(branch);
        storage.set("activeBranch", branch);
        window.dispatchEvent(new Event("jailwatch_storage_change"));
    };

    const userName = session?.user?.name || "MediStock User";
    const userRoleLabel = isPosUser ? "POS User" : "Administrator";
    const userInitials = userName
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "MS";

    return (
        <header className="fixed top-0 right-0 z-30 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 md:px-6 lg:left-64 lg:w-auto">
            <div className="flex items-center gap-4">
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
                >
                    <Menu className="h-5 w-5 text-gray-600" />
                </button>
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search anything..."
                        className="h-10 w-64 rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isPosUser && (
                    <div className="relative group mr-2">
                        <button
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 transition-all font-black text-[10px] uppercase tracking-widest hover:border-blue-400",
                                activeBranch?.type === "Main"
                                    ? "bg-blue-50 text-blue-600 border-blue-100"
                                    : "bg-purple-50 text-purple-600 border-purple-100"
                            )}
                        >
                            {activeBranch?.type === "Main" ? <Building2 className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                            {activeBranch?.name || "Select Branch"}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                        </button>

                        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 z-[110]">
                            <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 mb-1">
                                Switch Entity
                            </p>

                            <button
                                onClick={() => handleBranchChange({ id: "all", name: "All Branches", type: "Global" })}
                                className={cn(
                                    "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold mb-1",
                                    activeBranch?.id === "all"
                                        ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
                                        : "text-gray-600 hover:bg-gray-50 border border-dashed border-gray-200"
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    <span>All Branches</span>
                                </div>
                                <span
                                    className={cn(
                                        "text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase",
                                        activeBranch?.id === "all" ? "bg-white/20" : "bg-purple-100 text-purple-600"
                                    )}
                                >
                                    Global
                                </span>
                            </button>

                            {branches.map((branch: any) => (
                                <button
                                    key={branch.id}
                                    onClick={() => handleBranchChange(branch)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-xs font-bold",
                                        activeBranch?.id === branch.id
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                                            : "text-gray-600 hover:bg-gray-50"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {branch.type === "Main" ? <Building2 className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                                        <span>{branch.name}</span>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase",
                                            activeBranch?.id === branch.id ? "bg-white/20" : "bg-gray-100 text-gray-400"
                                        )}
                                    >
                                        {branch.type}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <button className="relative p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 border-2 border-white"></span>
                </button>
                <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>

                <div className="flex items-center gap-3 p-1 pr-3 rounded-xl border border-gray-200 hover:bg-zinc-50 transition-colors group relative">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/20">
                        {userInitials}
                    </div>
                    <div className="hidden sm:block">
                        <p className="text-xs font-bold text-gray-900 leading-none">
                            {status === "loading" ? "Loading..." : userName}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium mt-1">{userRoleLabel}</p>
                    </div>

                    <button
                        onClick={() => signOut({ callbackUrl: "/login" })}
                        className="absolute -top-full right-0 hidden group-hover:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-red-600 shadow-xl hover:bg-red-50 transition-all active:scale-95"
                        style={{ top: "100%", marginTop: "0.5rem" }}
                    >
                        <LogOut className="h-3 w-3" />
                        Sign Out
                    </button>
                </div>
            </div>
        </header>
    );
}
