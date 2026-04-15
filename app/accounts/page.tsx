"use client";

import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  Plus,
  Clock,
  MoreVertical,
  Loader2
} from "lucide-react";

export default function AccountsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    // Form states
    const [entryType, setEntryType] = useState("Revenue");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchAccounts = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/accounts');
            const json = await res.json();
            if (json.success) setData(json);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSaveEntry = async () => {
        if (!category || !amount) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: entryType,
                    category,
                    amount,
                    date
                })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setCategory("");
                setAmount("");
                setDate("");
                fetchAccounts();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived states
    const stats = [
        { label: "Total Balance", value: `PKR ${data?.stats?.totalBalance?.toLocaleString() || 0}`, icon: Wallet, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Total Revenue", value: `PKR ${data?.stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
        { label: "Total Expenses", value: `PKR ${data?.stats?.totalExpenses?.toLocaleString() || 0}`, icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
        { label: "Net Gain", value: `${(data?.stats?.netGain || 0) >= 0 ? '+' : ''}PKR ${data?.stats?.netGain?.toLocaleString() || 0}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
    ];

    const transactions = (data?.transactions || []).filter((t: any) => 
        t.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Accountant Core</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Monitor revenue, expenses, and hospital accounts.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md">Export Ledger</button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Record Entry
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <div key={i} className="card-premium p-6 rounded-[2rem] bg-white border-0 shadow-2xl shadow-purple-500/5 flex items-center gap-4 transition-all hover:scale-105 duration-300">
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                            <h4 className="text-xl font-black text-gray-900">{loading ? <Loader2 className="w-5 h-5 animate-spin mt-1 mx-auto" /> : stat.value}</h4>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2 card-premium rounded-[3rem] bg-white border-0 shadow-2xl shadow-purple-100 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                        <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-purple-600" />
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Recent Activity</h3>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text"
                                placeholder="Search ledger..."
                                className="pl-12 pr-6 py-3 bg-gray-50 border-0 rounded-2xl text-xs font-bold w-64 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-0 flex-1 overflow-x-auto relative">
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                            </div>
                        )}
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Entry Details</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Amount</th>
                                    <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {transactions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">No ledger entries found.</td>
                                    </tr>
                                )}
                                {transactions.map((t: any) => (
                                    <tr key={t.id} className="group hover:bg-gray-50 transition-all duration-300">
                                        <td className="py-6 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2.5 rounded-xl ${
                                                    t.type === 'Revenue' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                    {t.type === 'Revenue' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                                                </div>
                                                <div>
                                                    <p className="font-black text-gray-900 text-sm">Entry #{t.id}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">{t.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-8">
                                            <span className="px-4 py-1.5 rounded-full bg-gray-100 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="py-6 px-8 text-center">
                                            <p className={`font-black text-sm ${
                                                t.type === 'Revenue' ? 'text-green-600' : 'text-red-500'
                                            }`}>
                                                {t.type === 'Revenue' ? '+' : '-'} {t.amount?.toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="py-6 px-8 text-right">
                                            <div className="flex flex-col items-end">
                                                <p className="font-black text-gray-900 text-xs">{t.date}</p>
                                                <p className={`text-[10px] font-black uppercase tracking-tighter ${
                                                    t.status === 'Completed' ? 'text-green-500' : 'text-orange-500'
                                                }`}>{t.status}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="space-y-8">
                    <div className="card-premium rounded-[3rem] bg-gray-900 border-0 p-8 text-white relative overflow-hidden shadow-2xl shadow-purple-900/10 h-full flex flex-col justify-between">
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                            <Wallet className="h-48 w-48" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold italic underline border-purple-500 decoration-purple-500 mb-6">Financial Summary</h3>
                            <div className="space-y-6">
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Liabilities</p>
                                    <h4 className="text-2xl font-black mt-1 tracking-tight">PKR {data?.stats?.currentLiabilities?.toLocaleString() || 0}</h4>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pending Clearances</p>
                                    <h4 className="text-2xl font-black mt-1 tracking-tight text-orange-400">PKR {data?.stats?.pendingClearances?.toLocaleString() || 0}</h4>
                                </div>
                                <div className="p-6 bg-white/5 rounded-3xl border border-white/10 mt-6 border-purple-500/30">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales Revenue vs Purchases</p>
                                    <div className="mt-2 space-y-1 text-sm text-gray-300 font-medium">
                                        <p>Sales: <span className="text-white">PKR {data?.stats?.breakdown?.totalSalesRevenue?.toLocaleString() || 0}</span></p>
                                        <p>Purchases: <span className="text-white">PKR {data?.stats?.breakdown?.totalPurchaseCost?.toLocaleString() || 0}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button className="w-full py-5 bg-white text-gray-900 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all mt-8">Generate Report</button>
                    </div>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Record New Entry</h2>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Entry Type</label>
                                <select 
                                    className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none transition-all"
                                    value={entryType}
                                    onChange={(e) => setEntryType(e.target.value)}
                                >
                                    <option value="Revenue">Revenue</option>
                                    <option value="Expense">Expense</option>
                                    <option value="Salary">Salary</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Category / Description</label>
                                <input 
                                    type="text" 
                                    className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none transition-all placeholder:font-medium placeholder:text-gray-400" 
                                    placeholder="e.g. Utility Bills, Lab Services" 
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Amount (PKR)</label>
                                <input 
                                    type="number" 
                                    className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none transition-all placeholder:font-medium placeholder:text-gray-400" 
                                    placeholder="0" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Date (Optional, defaults to today)</label>
                                <input 
                                    type="date" 
                                    className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none transition-all" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveEntry}
                                className="flex-1 flex justify-center items-center py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
                                disabled={isSubmitting || !category || !amount}
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Entry"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
