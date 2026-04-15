"use client";

import { useState, useEffect } from "react";
import { CalendarRange, Plus, Loader2, Check, X } from "lucide-react";

export default function LeavesPage() {
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({ employeeId: "", fromDate: "", toDate: "", reason: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leavesRes, empRes] = await Promise.all([
                fetch("/api/hr/leaves"),
                fetch("/api/hr/employees")
            ]);
            const lData = await leavesRes.json();
            const eData = await empRes.json();
            if (lData.success) setLeaves(lData.leaves);
            if (eData.success) setEmployees(eData.employees);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChangeStatus = async (id: number, status: string) => {
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/leaves", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, status })
            });
            if (res.ok) fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApply = async () => {
        if (!formData.employeeId || !formData.fromDate || !formData.toDate) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/leaves", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ employeeId: "", fromDate: "", toDate: "", reason: "" });
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
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Leave Management</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Review and approve staff leave requests.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-orange-600/20 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Apply Leave
                </button>
            </div>

            <div className="card-premium rounded-[3rem] bg-white border-0 shadow-2xl shadow-orange-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 border-b border-gray-50 flex items-center gap-3 bg-white">
                    <CalendarRange className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Active Requests</h3>
                </div>

                <div className="p-0 flex-1 overflow-x-auto relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                        </div>
                    )}
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">From</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">To</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {leaves.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">No leave requests found.</td>
                                </tr>
                            )}
                            {leaves.map((l: any) => (
                                <tr key={l.id} className="group hover:bg-gray-50 transition-all duration-300">
                                    <td className="py-6 px-8">
                                        <p className="font-black text-gray-900 text-sm">{l.employee?.name}</p>
                                    </td>
                                    <td className="py-6 px-8 text-sm font-black text-gray-800">{new Date(l.fromDate).toLocaleDateString()}</td>
                                    <td className="py-6 px-8 text-sm font-black text-gray-800">{new Date(l.toDate).toLocaleDateString()}</td>
                                    <td className="py-6 px-8 text-xs font-medium text-gray-500 max-w-[200px] truncate">{l.reason || 'N/A'}</td>
                                    <td className="py-6 px-8 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            l.status === 'Approved' ? 'bg-green-100 text-green-600' :
                                            l.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8 text-right space-x-2">
                                        {l.status === 'Pending' && (
                                            <>
                                                <button disabled={isSubmitting} onClick={() => handleChangeStatus(l.id, 'Approved')} className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-all disabled:opacity-50 inline-flex">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button disabled={isSubmitting} onClick={() => handleChangeStatus(l.id, 'Rejected')} className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all disabled:opacity-50 inline-flex">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
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
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Apply for Leave</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Employee</label>
                                <select className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 outline-none" value={formData.employeeId} onChange={e => setFormData({...formData, employeeId: e.target.value})}>
                                    <option value="">Select Employee...</option>
                                    {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">From</label><input type="date" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 outline-none" value={formData.fromDate} onChange={e => setFormData({...formData, fromDate: e.target.value})} /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">To</label><input type="date" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 outline-none" value={formData.toDate} onChange={e => setFormData({...formData, toDate: e.target.value})} /></div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Reason</label>
                                <textarea className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 outline-none resize-none" rows={3} value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="Reason for leave..."></textarea>
                            </div>
                        </div>
                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest">Cancel</button>
                            <button onClick={handleApply} disabled={isSubmitting || !formData.employeeId || !formData.fromDate || !formData.toDate} className="flex-1 flex justify-center py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
