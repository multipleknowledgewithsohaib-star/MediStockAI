"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    // Nuclear data reset logic (runs once)
    useEffect(() => {
        const resetKey = 'jailwatch_nuclear_reset_v2';
        if (!localStorage.getItem(resetKey)) {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('jailwatch_clean_')) {
                    localStorage.removeItem(key);
                }
            });
            localStorage.setItem(resetKey, 'true');
            window.location.reload();
        }
    }, []);

    if (isLoginPage) {
        return <div className="min-h-screen bg-zinc-950">{children}</div>;
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 overflow-x-hidden">
            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 transition-opacity lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar with controlled state */}
            <Sidebar isOpen={isSidebarOpen} setOpen={setIsSidebarOpen} />

            <div className={cn(
                "transition-all duration-300 min-h-screen flex flex-col",
                "lg:pl-64" // Desktop fixed padding
            )}>
                <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

                <main className="flex-1 p-4 md:p-6 lg:p-8 mt-16 overflow-y-auto">
                    <div className="container mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
