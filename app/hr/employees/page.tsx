"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Search, Loader2 } from "lucide-react";

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state for adding employee
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: "", email: "", phone: "", cnic: "", designation: "", baseSalary: "", branchId: "1", roleId: "1"
    });

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hr/employees");
            const data = await res.json();
            if (data.success) {
                setEmployees(data.employees);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleSave = async () => {
        if (!formData.name) return;
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/hr/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: "", email: "", phone: "", cnic: "", designation: "", baseSalary: "", branchId: "1", roleId: "1" });
                fetchEmployees();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredEmployees = employees.filter((e: any) =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.designation && e.designation.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Staff Management</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Directory of all employees and staff members.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New Employee
                </button>
            </div>

            <div className="card-premium rounded-[3rem] bg-white border-0 shadow-2xl shadow-blue-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Employee Directory</h3>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search names or roles..."
                            className="pl-12 pr-6 py-3 bg-gray-50 border-0 rounded-2xl text-xs font-bold w-64 focus:ring-4 focus:ring-blue-600/5 transition-all outline-none text-gray-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-0 flex-1 overflow-x-auto relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    )}
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee Profile</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Salary</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredEmployees.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-400 font-medium">No employees found.</td>
                                </tr>
                            )}
                            {filteredEmployees.map((e: any) => (
                                <tr key={e.id} className="group hover:bg-gray-50 transition-all duration-300">
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                                                {e.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <p className="font-black text-gray-900 text-sm">{e.name}</p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase">{e.designation || 'Staff'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <p className="text-sm font-medium text-gray-800">{e.email || 'No email'}</p>
                                        <p className="text-[10px] text-gray-500">{e.phone || 'No phone'}</p>
                                    </td>
                                    <td className="py-6 px-8">
                                        <p className="text-sm font-black text-gray-900">PKR {e.baseSalary?.toLocaleString()}</p>
                                    </td>
                                    <td className="py-6 px-8 text-right">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${e.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                            {e.status}
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
                    <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-6">Onboard Employee</h2>

                        <div className="grid grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Full Name *</label>
                                <input type="text" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-600/10 outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. John Doe" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Designation</label>
                                <input type="text" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-600/10 outline-none" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} placeholder="e.g. Pharmacist" />
                            </div>
                            <div>

                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Base Salary (PKR)</label>
                                <input type="number" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-600/10 outline-none" value={formData.baseSalary} onChange={e => setFormData({ ...formData, baseSalary: e.target.value })} placeholder="0" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Email Address</label>
                                <input type="email" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-600/10 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Phone Number</label>
                                <input type="text" className="w-full p-3.5 bg-gray-50 border-0 rounded-xl text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-600/10 outline-none" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8">
                            <button onClick={() => setIsModalOpen(false)} disabled={isSubmitting} className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                            <button onClick={handleSave} disabled={isSubmitting || !formData.name} className="flex-1 flex items-center justify-center py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Employee"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
