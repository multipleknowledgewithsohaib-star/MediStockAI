"use client";

import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Loader2
} from "lucide-react";
import { useData } from "@/lib/hooks";

export default function FinancePage() {
    const { data: financeData, loading } = useData<any>("/api/finance");

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-purple-600 animate-spin" /></div>;

    const summary = {
        totalRevenue: financeData?.totalRevenue || 0,
        totalExpenses: financeData?.totalExpenses || 0,
        netProfit: financeData?.netProfit || 0,
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div>
                <h1 className="text-3xl font-black text-white tracking-tight uppercase">Financial Ledger</h1>
                <p className="text-white/70 mt-1 font-medium italic">Real-time revenue and expense tracking from all transactions.</p>
            </div>
            <h1 className="text-3xl font-black"></h1>
            {/* Summary Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="card-premium rounded-3xl p-8 border-2 border-green-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-500 flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <span className="badge badge-success">Automated</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Sales Revenue</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">PKR {summary.totalRevenue.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card-premium rounded-3xl p-8 border-2 border-red-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                            <TrendingDown className="h-6 w-6" />
                        </div>
                        <span className="badge badge-danger">Purchases</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Operating Expenses</p>
                        <p className="text-3xl font-black text-gray-900 mt-1">PKR {summary.totalExpenses.toLocaleString()}</p>
                    </div>
                </div>

                <div className="card-premium rounded-3xl p-8 border-2 border-purple-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                            <DollarSign className="h-6 w-6" />
                        </div>
                        <span className="badge badge-info">Net Gain</span>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Calculated Net Profit</p>
                        <p className="text-3xl font-black text-purple-600 mt-1">PKR {summary.netProfit.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="card-premium rounded-3xl overflow-hidden border-2 border-gray-50">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">Transaction History</h3>
                        <p className="text-sm text-gray-500 font-medium">Synced with MediStock Sales & Inventory Core</p>
                    </div>
                    <button className="px-6 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-black uppercase tracking-widest hover:bg-gray-100 transition-all">
                        Export Ledger
                    </button>
                </div>
                <div className="divide-y divide-gray-50">
                    {financeData?.recentTransactions?.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between p-6 hover:bg-gray-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {tx.type === 'income' ? (
                                        <ArrowUpRight className="h-5 w-5" />
                                    ) : (
                                        <ArrowDownRight className="h-5 w-5" />
                                    )}
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{tx.description}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400 font-bold">{tx.date}</p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${tx.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                            {tx.type === 'income' ? 'Credit' : 'Debit'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-lg font-black ${tx.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.type === 'income' ? '+' : '-'} PKR {tx.amount.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                    {(!financeData?.recentTransactions || financeData.recentTransactions.length === 0) && (
                        <div className="p-12 text-center text-gray-400">
                            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-10" />
                            <p className="font-bold">Waiting for transactional pulses...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
