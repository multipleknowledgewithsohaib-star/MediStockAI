"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, Pill } from "lucide-react";

export default function LoginPage() {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const inactiveError = searchParams.get("error") === "inactive";

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(inactiveError ? "This account is inactive." : null);

    const helperText = useMemo(() => {
        if (error) {
            return error;
        }

        return "Sign in with your assigned account to continue.";
    }, [error]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
            callbackUrl,
        });

        if (!result || result.error) {
            setError("Invalid email or password.");
            setIsSubmitting(false);
            return;
        }

        window.location.href = result.url || callbackUrl;
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-fade-in-up">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-purple-500/20 rotate-3">
                        <Pill className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">
                        Medi<span className="text-purple-500">Stock</span>
                    </h1>
                    <p className="text-zinc-400 font-medium">Pharmacy Management System</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-1">Secure Sign In</h2>
                        <p className={`text-sm ${error ? "text-red-400" : "text-zinc-500"}`}>{helperText}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <label className="block">
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Email</span>
                            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 h-14">
                                <Mail className="h-4 w-4 text-zinc-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="admin@medistock.local"
                                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600"
                                    autoComplete="email"
                                    required
                                />
                            </div>
                        </label>

                        <label className="block">
                            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Password</span>
                            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 h-14">
                                <Lock className="h-4 w-4 text-zinc-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600"
                                    autoComplete="current-password"
                                    required
                                />
                            </div>
                        </label>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-2xl flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-purple-500/50 active:scale-95"
                        >
                            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
                            {isSubmitting ? "Signing In..." : "Sign In"}
                        </button>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-zinc-800"></span>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-zinc-900 px-2 text-zinc-500 font-black tracking-widest">Role Based Access</span>
                        </div>
                    </div>

                    <p className="text-center text-zinc-600 text-[10px] leading-relaxed uppercase tracking-widest">
                        Admin users can manage inventory. POS users can only access billing and invoices.
                    </p>
                </div>
            </div>
        </div>
    );
}
