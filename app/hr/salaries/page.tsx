"use client";

import { useState, useEffect } from "react";
import { DollarSign, Plus, Search, Loader2 } from "lucide-react";

export default function SalariesPage() {
    const [salaries, setSalaries] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState("");
    
    // Default to current month YYYY-MM
    useEffect(() => {
        const now = new Date();
        const m = now.toISOString().substring(0, 7);
        setMonth(m);
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({ employeeId: "", bonus: "0", deduction: "0", status: "Unpaid" });

    const fetchData = async () => {
        if (!month) return;
        setLoading(true);
        try {
            const [salRes, empRes] = await Promise.all([
                fetch(`/api/hr/salaries?month=${month}`),
                fetch("/api/hr/employees")
            ]);
            const salData = await salRes.json();
            const empData = await empRes.json();
            
            if (salData.success) setSalaries(salData.salaries);
            if (empData.success) setEmployees(empData.employees);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month]);

    const handleProcess = async () => {
        if (!formData.employeeId) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/salaries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, month })
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ employeeId: "", bonus: "0", deduction: "0", status: "Unpaid" });
                fetchData();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Salaries</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Process payroll, bonuses, and deductions.</p>
                </div>
                <div className="flex gap-3">
                    <input 
                        type="month" 
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md outline-none" 
                    />
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Process Payroll
                    </button>
                </div>
            </div>

            <div className="card-premium rounded-[3rem] bg-white border-0 shadow-2xl shadow-purple-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <DollarSign className="h-5 w-5 text-purple-600" />
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Payroll - {month}</h3>
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
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Basic</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right text-green-600">Bonus</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right text-red-600">Deduction</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Net Salary</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {salaries.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No salaries processed for this month.</td>
                                </tr>
                            )}
                            {salaries.map((s: any) => (
                                <tr key={s.id} className="group hover:bg-gray-50 transition-all duration-300">
                                    <td className="py-6 px-8">
                                        <p className="font-black text-gray-900 text-sm">{s.employee?.name}</p>
                                    </td>
                                    <td className="py-6 px-8 text-right font-black text-sm text-gray-800">
                                        {s.basicSalary?.toLocaleString()}
                                    </td>
                                    <td className="py-6 px-8 text-right font-black text-sm text-green-600">
                                        +{s.bonus?.toLocaleString()}
                                    </td>
                                    <td className="py-6 px-8 text-right font-black text-sm text-red-600">
                                        -{s.deduction?.toLocaleString()}
                                    </td>
                                    <td className="py-6 px-8 text-right font-black text-sm text-purple-600">
                                        PKR {s.netSalary?.toLocaleString()}
                                    </td>
                                    <td className="py-6 px-8 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            s.status === 'Paid' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                            {s.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Process Payroll</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Employee</label>
                                <select 
                                    className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none"
                                    value={formData.employeeId}
                                    onChange={e => setFormData({...formData, employeeId: e.target.value})}
                                >
                                    <option value="">Select Employee...</option>
                                    {employees.map((emp: any) => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-green-600 uppercase tracking-widest block mb-2">Bonus (+)</label>
                                    <input type="number" className="w-full p-3.5 bg-green-50 border-0 rounded-xl text-sm font-bold text-green-900 focus:ring-4 focus:ring-green-600/10 outline-none placeholder:text-green-300" value={formData.bonus} onChange={e => setFormData({...formData, bonus: e.target.value})} placeholder="0"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-red-600 uppercase tracking-widest block mb-2">Deduction (-)</label>
                                    <input type="number" className="w-full p-3.5 bg-red-50 border-0 rounded-xl text-sm font-bold text-red-900 focus:ring-4 focus:ring-red-600/10 outline-none placeholder:text-red-300" value={formData.deduction} onChange={e => setFormData({...formData, deduction: e.target.value})} placeholder="0"/>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Status</label>
                                <select className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-purple-600/10 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                                    <option value="Unpaid">Unpaid</option>
                                    <option value="Paid">Paid (Generates Ledger Entry)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={handleProcess} disabled={isSubmitting || !formData.employeeId} className="flex-1 flex items-center justify-center py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
