"use client";

import { useState, useMemo } from "react";
import {
    AlertTriangle,
    Clock,
    Package,
    Bell,
    Check,
    X,
    Loader2,
    Calendar,
    Download,
    Filter
} from "lucide-react";
import { useData } from "@/lib/hooks";
import ExpiryAlertsDashboard from "@/components/expiry/ExpiryAlertsDashboard";
import { generateAllExpiryAlerts } from "@/lib/expiryTracking";

export default function AlertsPage() {
    const { data: batches, loading: batchesLoading } = useData<any[]>("/api/batches");
    const { data: products } = useData<any[]>("/api/products");
    const [activeTab, setActiveTab] = useState<'risk' | 'suggestions'>('risk');

    const today = new Date();

    // Calculate Expiry Risk Buckets (Step 5)
    const riskBuckets = useMemo(() => {
        if (!batches) return { 'expired': [], '3m': [], '6m': [] };

        const buckets: any = { 'expired': [], '3m': [], '6m': [] };
        batches.forEach(b => {
            if (!b.expiryDate) return;
            const exp = new Date(b.expiryDate);
            const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            const product = products?.find(p => p.id === b.productId);
            const item = { ...b, productName: product?.name || "Unknown", diffDays };

            if (diffDays < 0) buckets['expired'].push(item);
            else if (diffDays <= 90) buckets['3m'].push(item);
            else if (diffDays <= 180) buckets['6m'].push(item);
        });
        return buckets;
    }, [batches, products]);

    const totalRiskValue = useMemo(() => {
        return [...riskBuckets['expired'], ...riskBuckets['3m'], ...riskBuckets['6m']]
            .reduce((sum, b) => sum + (b.quantity * (b.purchasePrice || b.rate || 0)), 0);
    }, [riskBuckets]);

    if (batchesLoading) return (
        <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Loss Control Intelligence</h1>
                    <p className="text-white/70 mt-1 font-medium italic text-sm">Step 5: AI-driven financial risk and inventory protection.</p>
                </div>
                <div className="flex gap-2 text-right">
                    <div className="px-6 py-3 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[8px] font-black text-red-400 uppercase tracking-widest leading-none mb-1">Total PKR at Risk</p>
                        <p className="text-xl font-black text-red-600">PKR {totalRiskValue.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Risk Buckets Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {[
                    { label: "Already Expired", items: riskBuckets['expired'], color: "bg-red-600", light: "bg-red-50", text: "text-red-600", icon: X },
                    { label: "3 Months (Near Expiry)", items: riskBuckets['3m'], color: "bg-orange-600", light: "bg-orange-50", text: "text-orange-600", icon: Clock },
                    { label: "6 Months (Monitoring)", items: riskBuckets['6m'], color: "bg-purple-600", light: "bg-purple-50", text: "text-purple-600", icon: Bell },
                ].map((bucket, i) => (
                    <div key={i} className="card-premium rounded-[2rem] p-8 border border-gray-100 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className={`w-12 h-12 rounded-2xl ${bucket.color} flex items-center justify-center text-white shadow-xl`}>
                                <bucket.icon className="h-6 w-6" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{bucket.label}</p>
                                <p className={`text-2xl font-black ${bucket.text}`}>{bucket.items.length} Batches</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {bucket.items.slice(0, 3).map((item: any, idx: number) => (
                                <div key={idx} className={`${bucket.light} p-3 rounded-xl flex items-center justify-between`}>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{item.productName}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">Batch #{item.batchNo}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-black text-gray-900">{item.quantity} Units</p>
                                        <p className={`text-[9px] font-black uppercase ${bucket.text}`}>
                                            {item.diffDays < 0 ? 'EXPIRED' : `${item.diffDays} Days Left`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                            {bucket.items.length > 3 && (
                                <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest pt-2">+{bucket.items.length - 3} More Batches</p>
                            )}
                            {bucket.items.length === 0 && (
                                <div className="py-10 text-center opacity-20">
                                    <Check className="h-8 w-8 mx-auto" />
                                    <p className="text-[10px] font-black uppercase mt-2">Zero Risk</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Smart Suggestions (Step 5 Suggestions) */}
            <div className="card-premium rounded-[2.5rem] bg-white p-10 overflow-hidden relative border border-gray-100">
                <div className="absolute top-0 right-0 p-10 opacity-10">
                    <Bell className="h-40 w-40 text-purple-200" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg">
                            <Filter className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">AI Protection Suggestions</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Suggestion 1: Priority Sale */}
                        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 hover:bg-purple-50 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="px-3 py-1 rounded-lg bg-green-500 text-white text-[10px] font-black uppercase tracking-widest">Priority Sale</div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Action Required</p>
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2">Push for Counter Sales</h4>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">AI detected 5 batches with &gt; 100 units expiring in 60 days. Suggesting "Priority Sale" status at front-desk.</p>
                            <button className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-purple-700 hover:scale-[1.02] transition-all">View Targeted Batches</button>
                        </div>

                        {/* Suggestion 2: Return to Company */}
                        <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6 hover:bg-blue-50 transition-all group">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="px-3 py-1 rounded-lg bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest">Return Policy</div>
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Low Stock Alert</p>
                            </div>
                            <h4 className="text-xl font-black text-gray-900 mb-2">Claim Near-Expiry Returns</h4>
                            <p className="text-gray-500 text-sm mb-6 leading-relaxed">8 items have &lt; 20 units left and 120 days shelf life. Better to return now for full credit refund.</p>
                            <button className="w-full py-4 border border-blue-200 text-blue-700 bg-blue-50 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-100 transition-all">Generate Return List</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
