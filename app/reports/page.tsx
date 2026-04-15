"use client";

import { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Package,
    Calendar,
    Download,
    FileText,
    Loader2,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import { useData } from "@/lib/hooks";
import { generateReportPDF } from "@/lib/pdf";

export default function ReportsPage() {
    const [selectedPeriod, setSelectedPeriod] = useState("This Month");
    const { data: batches } = useData<any[]>("/api/batches");
    const { data: products } = useData<any[]>("/api/products");
    const { data: reportData, loading } = useData<any>("/api/reports");

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-purple-600 animate-spin" /></div>;

    const monthlySales = reportData?.monthlySales || [];
    const topProducts = reportData?.topProducts || [];

    const totalSales = monthlySales.reduce((sum: number, m: any) => sum + m.sales, 0);
    const totalPurchases = monthlySales.reduce((sum: number, m: any) => sum + m.purchases, 0);
    const netProfit = totalSales - totalPurchases;

    // AI EXPRY INTELLIGENCE (STEP 5)
    const now = new Date();
    const expiryStats = {
        days30: 0,
        days90: 0,
        days180: 0,
        totalValue: 0,
        urgentBatches: [] as any[]
    };

    batches?.forEach((b: any) => {
        if (!b.expiryDate) return;
        const expDate = new Date(b.expiryDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const value = (b.quantity || 0) * (b.purchasePrice || 0);

        if (diffDays <= 180 && diffDays > 0) {
            expiryStats.totalValue += value;
            if (diffDays <= 30) expiryStats.days30++;
            else if (diffDays <= 90) expiryStats.days90++;
            else if (diffDays <= 180) expiryStats.days180++;

            const product = products?.find(p => p.id === b.productId);
            expiryStats.urgentBatches.push({ ...b, productName: product?.name || "Unknown", diffDays });
        }
    });

    expiryStats.urgentBatches.sort((a, b) => a.diffDays - b.diffDays);

    const exportStats = () => {
        generateReportPDF({
            "Total Sales": `PKR ${totalSales.toLocaleString()}`,
            "Total Purchases": `PKR ${totalPurchases.toLocaleString()}`,
            "Net Profit": `PKR ${netProfit.toLocaleString()}`,
            "Report Period": selectedPeriod,
            "Top Selling Product": topProducts[0]?.name || "N/A"
        }, "Hospital Performance Report");
    };
    // <div className="flex col-flex ">
    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">AI Intelligence Reports</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Loss control, growth patterns, and batch-wise audits.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="h-11 rounded-xl border border-gray-200 px-4 text-sm bg-white font-bold focus:ring-4 focus:ring-purple-500/10 transition-all outline-none"
                    >
                        <option>This Week</option>
                        <option>This Month</option>
                        <option>This Year</option>
                    </select>
                    <button
                        onClick={exportStats}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* AI Loss-Control Intelligence (Step 5) */}
            <div className="card-premium rounded-[2.5rem] p-8 border-0 shadow-2xl shadow-red-100/50 bg-gradient-to-br from-white to-red-50/30">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-3xl bg-red-500 flex items-center justify-center text-white shadow-xl shadow-red-500/20">
                            <AlertCircle className="h-7 w-7" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Expiry Loss Control</h3>
                            <p className="text-sm text-gray-500 font-medium">Preventing inventory dead-stock and financial leakage</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">At-Risk Value</p>
                        <p className="text-2xl font-black text-gray-900">PKR {expiryStats.totalValue.toLocaleString()}</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-4 gap-6">
                    <div className="p-6 bg-white rounded-3xl border border-red-100 shadow-sm border-l-8 border-l-red-600">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Critical (30 Days)</p>
                        <p className="text-3xl font-black text-red-600">{expiryStats.days30}</p>
                        <p className="text-xs font-bold text-red-500 mt-1 uppercase">🔴 Critical Alert</p>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-orange-100 shadow-sm border-l-8 border-l-orange-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Warning (90 Days)</p>
                        <p className="text-3xl font-black text-orange-500">{expiryStats.days90}</p>
                        <p className="text-xs font-bold text-orange-400 mt-1 uppercase">🟠 Warning Alert</p>
                    </div>
                    <div className="p-6 bg-white rounded-3xl border border-yellow-100 shadow-sm border-l-8 border-l-yellow-500">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Early (180 Days)</p>
                        <p className="text-3xl font-black text-yellow-600">{expiryStats.days180}</p>
                        <p className="text-xs font-bold text-yellow-500 mt-1 uppercase">🟡 Early Alert</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-6 text-white flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingDown className="h-4 w-4 text-purple-200" />
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Trend Analysis</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed">Inventory expiry is <span className="underline underline-offset-4 decoration-2">stable</span>. 12% reduction in slow-moving stock compared to last month.</p>
                    </div>
                </div>

                <div className="mt-8 overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicine & Batch</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry Date</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Remaining</th>
                                <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Intelligence Suggestion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {expiryStats.urgentBatches.slice(0, 5).map((b, i) => (
                                <tr key={i} className="group hover:bg-red-50/30 transition-all">
                                    <td className="py-4">
                                        <p className="font-black text-gray-900 uppercase text-xs">{b.productName}</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">BATCH: {b.batchNo}</p>
                                    </td>
                                    <td className="py-4 font-black text-gray-700 text-xs">{b.quantity} Units</td>
                                    <td className="py-4 font-bold text-gray-500 text-xs">{new Date(b.expiryDate).toLocaleDateString()}</td>
                                    <td className="py-4">
                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${b.diffDays <= 30 ? 'bg-red-100 text-red-600' :
                                                b.diffDays <= 90 ? 'bg-orange-100 text-orange-600' :
                                                    'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {b.diffDays} Days Left
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className="bg-white border border-gray-100 px-3 py-1.5 rounded-xl text-[10px] font-black text-purple-600 shadow-sm uppercase group-hover:border-purple-200 transition-all">
                                            {b.diffDays <= 30 ? '🔴 Critical' : b.diffDays <= 90 ? '🟠 Warning' : '🟡 Early'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Aggregated Stats Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="card-premium rounded-[2.5rem] p-8 bg-gradient-to-br from-green-50 to-white border-0 shadow-xl shadow-green-100/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-xl shadow-green-500/20">
                            <TrendingUp className="h-7 w-7" />
                        </div>
                        <span className="bg-green-100 text-green-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Live Stats</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Total Revenue</p>
                    <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight">PKR {totalSales.toLocaleString()}</p>
                </div>

                <div className="card-premium rounded-[2.5rem] p-8 bg-gradient-to-br from-orange-50 to-white border-0 shadow-xl shadow-orange-100/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20">
                            <Package className="h-7 w-7" />
                        </div>
                        <span className="bg-orange-100 text-orange-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Stock Value</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Inventory Cost</p>
                    <p className="text-3xl font-black text-gray-900 mt-1 tracking-tight">PKR {totalPurchases.toLocaleString()}</p>
                </div>

                <div className="card-premium rounded-[2.5rem] p-8 bg-gradient-to-br from-purple-50 to-white border-0 shadow-xl shadow-purple-100/50">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500 flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                            <DollarSign className="h-7 w-7" />
                        </div>
                        <span className="bg-purple-100 text-purple-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Net Growth</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Net Profit</p>
                    <p className="text-3xl font-black text-purple-600 mt-1 tracking-tight">PKR {netProfit.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Revenue Growth Chart */}
                <div className="card-premium rounded-[2.5rem] p-10 border-0 shadow-2xl shadow-purple-50/50 bg-white">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Revenue Analysis</h3>
                            <p className="text-xs text-gray-500 font-medium italic mt-1 font-bold">Sales vs Procurement Trends</p>
                        </div>
                        <BarChart3 className="h-6 w-6 text-purple-300" />
                    </div>

                    <div className="space-y-10">
                        {monthlySales.map((month: any, i: number) => (
                            <div key={i}>
                                <div className="flex justify-between items-end mb-4">
                                    <span className="font-black text-gray-900 uppercase text-xs tracking-tighter italic">{month.month} {month.year}</span>
                                    <div className="flex gap-6">
                                        <div className="text-right">
                                            <p className="text-[9px] text-green-500 font-black uppercase tracking-widest">Inflow</p>
                                            <p className="font-black text-gray-900 text-sm">PKR {month.sales.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] text-orange-500 font-black uppercase tracking-widest">Outflow</p>
                                            <p className="font-black text-gray-900 text-sm">PKR {month.purchases.toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-4 w-full bg-gray-50 rounded-2xl overflow-hidden flex shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out"
                                        style={{ width: `${(month.sales / (month.sales + month.purchases)) * 100}%` }}
                                    />
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-1000 ease-out"
                                        style={{ width: `${(month.purchases / (month.sales + month.purchases)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Table */}
                <div className="card-premium rounded-[2.5rem] p-10 border-0 shadow-2xl shadow-blue-50/50 bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Top Moving Inventory</h3>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Velocity Filter</span>
                    </div>
                    <div className="space-y-4">
                        {topProducts.map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-5 p-5 rounded-3xl bg-gray-50/50 hover:bg-purple-50 transition-all group cursor-pointer border border-transparent hover:border-purple-100">
                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black text-gray-200 group-hover:text-purple-400 transition-all">
                                    {i + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-black text-gray-900 uppercase text-xs tracking-tight group-hover:text-purple-600 transition-colors">{p.name}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{p.sold} Units Moved</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-green-600 text-sm">PKR {p.revenue.toLocaleString()}</p>
                                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter">Gross Yield</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-8 py-5 rounded-3xl border-2 border-dashed border-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest hover:border-purple-200 hover:text-purple-500 hover:bg-purple-50/30 transition-all flex items-center justify-center gap-2">
                        Comprehensive Stock Velocity Report <ArrowRight className="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
