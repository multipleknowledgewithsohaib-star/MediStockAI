export const dynamic = "force-dynamic"; // ✅ prevents prerender error

"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(() => searchParams.get("callbackUrl") || "/", [searchParams]);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (provider: string) => {
    setLoading(true);
    try {
      await signIn(provider, { callbackUrl });
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-center text-2xl font-bold">Login</h1>
        <div className="space-y-4">
          <button
            onClick={() => handleLogin("google")}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
            Sign in with Google
          </button>
          <button
            onClick={() => handleLogin("credentials")}
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Lock className="mr-2 h-5 w-5" />}
            Sign in with Email
          </button>
        </div>
      </div>
    </div>
  );
}
