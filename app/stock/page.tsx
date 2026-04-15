"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Package,
    AlertTriangle,
    History,
    Calendar,
    ChevronRight,
    Loader2
} from "lucide-react";
import { useData } from "@/lib/hooks";

export default function StockPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");

    const { data: products, loading: productsLoading } = useData<any[]>("/api/products");
    const { data: batches, loading: batchesLoading } = useData<any[]>("/api/batches");

    // Flatten batches and join with product data
    const batchList = (batches || [])
        .map((b: any) => {
            // Use loose check for productId matching (String vs Number)
            const product = products?.find(p => String(p.id) === String(b.productId));
            if (!product) return null; // Mark for filtering if product no longer exists
            
            return {
                ...b,
                productName: product?.name || "Unknown Medicine",
                category: product?.category || "General",
                salePrice: product?.salePrice || 0
            };
        })
        .filter((b): b is any => b !== null); // Filter out records for deleted products

    const filteredBatches = batchList.filter(b => {
        const matchesSearch = b.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.batchNo.toLowerCase().includes(searchTerm.toLowerCase());

        if (filter === "low") return matchesSearch && b.quantity < 50;
        return matchesSearch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const stats = {
        totalItems: products?.length || 0,
        totalBatches: batches?.length || 0,
        lowStockBatches: batchList.filter(b => b.quantity < 50).length || 0,
        totalValue: batchList.reduce((sum, b) => {
            const quantity = Number(b.quantity) || 0;
            const unitCost = Number(b.purchasePrice || b.rate || 0);
            return sum + (quantity * unitCost);
        }, 0)
    };

    if (productsLoading || batchesLoading) return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-purple-600 animate-spin" /></div>;

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Batch Ledger</h1>
                    <h2 className="text-2xl"></h2>
                    <p className="text-white/70 mt-1 font-medium italic">Step 2: Stock managed per-batch for 100% audit accuracy.</p>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid gap-6 md:grid-cols-4">
                {[
                    { label: "Medications", value: stats.totalItems, icon: Package, color: "bg-blue-600" },
                    { label: "Active Batches", value: stats.totalBatches, icon: History, color: "bg-purple-600" },
                    { label: "Low Batches", value: stats.lowStockBatches, icon: AlertTriangle, color: "bg-orange-600" },
                    { label: "Total Value (PKR)", value: (stats.totalValue || 0).toLocaleString(), icon: ArrowUpRight, color: "bg-green-600" },
                ].map((stat, i) => (
                    <div key={i} className="card-premium rounded-3xl p-6 flex items-center gap-5 border border-gray-100 hover:shadow-2xl hover:shadow-purple-500/5 transition-all">
                        <div className={`w-14 h-14 rounded-2xl ${stat.color} flex items-center justify-center shadow-xl text-white`}>
                            <stat.icon className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="card-premium rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-2xl shadow-purple-500/5 bg-white">
                <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row gap-6 justify-between items-center bg-gray-50/30">
                    <div className="relative flex-1 max-w-xl">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Medicine or Batch No..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-16 w-full rounded-2xl border-none bg-white pl-16 pr-8 text-sm font-bold shadow-sm focus:ring-4 focus:ring-purple-500/10 placeholder:text-gray-300 transition-all outline-none"
                        />
                    </div>
                    <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm">
                        <button onClick={() => setFilter("all")} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>All Batches</button>
                        <button onClick={() => setFilter("low")} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === 'low' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>Low Stock</button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-50">
                                <th className="text-left py-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Medication</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-purple-500 uppercase tracking-widest bg-purple-50/30">Batch Identity</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-orange-500 uppercase tracking-widest">Dates (MFG/EXP)</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-blue-500 uppercase tracking-widest">Retail Price (MRP)</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-blue-500 uppercase tracking-widest">Available Qty</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-green-500 uppercase tracking-widest">Amount (PKR)</th>
                                <th className="text-left py-6 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredBatches.map((batch) => (
                                <tr key={batch.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 font-bold text-xs uppercase">
                                                {batch.productName[0]}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm group-hover:text-purple-600 transition-colors">{batch.productName}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{batch.category}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8 bg-purple-50/10">
                                        <span className="px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-wider shadow-sm">
                                            #{batch.batchNo}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-gray-400 uppercase w-8">MFG:</span>
                                                <span className="text-xs font-bold text-gray-600">{batch.mfgDate ? new Date(batch.mfgDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-orange-500 uppercase w-8">EXP:</span>
                                                <span className="text-xs font-bold text-gray-900">{batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col font-black">
                                            <span className="text-sm text-blue-600">PKR {batch.mrp || batch.rate || 0}</span>
                                            <span className="text-[9px] text-blue-400 uppercase tracking-widest">Retail MRP</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col">
                                            <span className="text-lg font-black text-gray-900">{batch.quantity}</span>
                                            <span className="text-[9px] font-black text-blue-500 uppercase">Units in Stock</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col font-black">
                                            <span className="text-sm text-gray-900">PKR {(batch.purchasePrice || batch.rate || 0).toLocaleString()}</span>
                                            <span className="text-[9px] text-green-500 uppercase">Unit Amount</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase ${batch.quantity > 50 ? 'bg-green-100 text-green-700' :
                                            batch.quantity > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {batch.quantity > 50 ? 'Stable' : batch.quantity > 0 ? 'Low' : 'Empty'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredBatches.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                                <Search className="h-8 w-8 text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-bold text-sm">No batch records found matching your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
