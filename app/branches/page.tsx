"use client";

import { useState } from "react";
import {
    Plus,
    X,
    MapPin,
    Hash,
    Building2,
    Store,
    LayoutGrid,
    Search,
    ChevronRight,
    Edit2,
    Trash2,
    MoreVertical,
    CheckCircle2,
    Clock
} from "lucide-react";
import { useData } from "@/lib/hooks";
import { branchService, Branch } from "@/lib/services/branch.service";

export default function BranchesPage() {
    const [showAddModal, setShowAddModal] = useState(false);
    const { data: branches, refetch } = useData<Branch[]>("/api/branches");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [newBranch, setNewBranch] = useState({
        name: "",
        location: "",
        type: "Pharmacy" as "Main" | "Pharmacy"
    });

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await branchService.addBranch(newBranch);
            await refetch();
            setShowAddModal(false);
            setNewBranch({ name: "", location: "", type: "Pharmacy" });
        } catch (error) {
            console.error("Failed to add branch:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: number | string) => {
        if (confirm("Are you sure you want to delete this branch?")) {
            await branchService.deleteBranch(id);
            await refetch();
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Entity Network</h1>
                    <p className="text-gray-500 mt-1 font-medium">Manage your hospital branches and pharmacy locations.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Expand Network
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card-premium p-6 rounded-[2rem] border-0 shadow-xl shadow-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 rounded-2xl text-blue-600">
                        <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Hubs</p>
                        <p className="text-2xl font-black text-gray-900">{branches?.filter(b => b.type === 'Main').length || 0}</p>
                    </div>
                </div>
                <div className="card-premium p-6 rounded-[2rem] border-0 shadow-xl shadow-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-purple-50 rounded-2xl text-purple-600">
                        <Store className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pharmacies</p>
                        <p className="text-2xl font-black text-gray-900">{branches?.filter(b => b.type === 'Pharmacy').length || 0}</p>
                    </div>
                </div>
                <div className="card-premium p-6 rounded-[2rem] border-0 shadow-xl shadow-gray-100 flex items-center gap-4 text-green-600 bg-green-50/50">
                    <div className="p-4 bg-white rounded-2xl">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Status</p>
                        <p className="text-sm font-black uppercase tracking-tight">Network Synced</p>
                    </div>
                </div>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches?.map((branch) => (
                    <div key={branch.id} className="group relative bg-white rounded-[2.5rem] p-8 shadow-xl shadow-gray-100/50 border border-gray-100 hover:border-blue-200 transition-all overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all">
                            <button className="p-2 hover:bg-gray-50 rounded-xl" onClick={() => handleDelete(branch.id)}>
                                <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                        </div>

                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                            branch.type === 'Main' ? "bg-blue-600 text-white shadow-blue-100" : "bg-purple-600 text-white shadow-purple-100"
                        )}>
                            {branch.type === 'Main' ? <Building2 className="h-7 w-7" /> : <Store className="h-7 w-7" />}
                        </div>

                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{branch.name}</h3>
                            <div className="flex items-center gap-2 mt-2 text-gray-400 font-bold text-xs uppercase tracking-widest">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    branch.type === 'Main' ? "bg-blue-500" : "bg-purple-500"
                                )} />
                                {branch.type}
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                                    <p className="text-sm font-bold text-gray-700">{branch.location}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-gray-50 rounded-lg">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                                        <p className="text-xs font-black text-green-600 uppercase tracking-tight italic">Operational</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-50">
                            <button className="w-full py-4 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest text-gray-400 transition-all flex items-center justify-center gap-2">
                                Manage branch
                                <ChevronRight className="h-3 w-3" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Placeholder for Empty State */}
                {(!branches || branches.length === 0) && (
                    <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-300">
                        <LayoutGrid className="h-16 w-16 mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm opacity-40">No entities discovered</p>
                    </div>
                )}
            </div>

            {/* Add Branch Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 animate-fade-in-up shadow-2xl relative border border-white/20">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">New Entity</h2>
                                <p className="text-gray-500 font-medium text-sm">Add a new branch or pharmacy.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl transition-all">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAddBranch} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="h-3 w-3" /> Entity Name
                                </label>
                                <input
                                    type="text"
                                    value={newBranch.name}
                                    onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                                    placeholder="e.g. Bahadurabad Branch"
                                    className="w-full h-14 bg-gray-50/50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <MapPin className="h-3 w-3" /> Physical Location
                                </label>
                                <input
                                    type="text"
                                    value={newBranch.location}
                                    onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                                    placeholder="e.g. Shop #45, Main Market"
                                    className="w-full h-14 bg-gray-50/50 border border-gray-100 rounded-[1.25rem] px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 className="h-3 w-3" /> Entity Type
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewBranch({ ...newBranch, type: 'Main' })}
                                        className={cn(
                                            "h-14 rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2",
                                            newBranch.type === 'Main' ? "bg-blue-600 text-white shadow-lg shadow-blue-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                        )}
                                    >
                                        <Building2 className="h-3.5 w-3.5" />
                                        Main Hub
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewBranch({ ...newBranch, type: 'Pharmacy' })}
                                        className={cn(
                                            "h-14 rounded-[1.25rem] font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-2",
                                            newBranch.type === 'Pharmacy' ? "bg-purple-600 text-white shadow-lg shadow-purple-100" : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                                        )}
                                    >
                                        <Store className="h-3.5 w-3.5" />
                                        Pharmacy
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 flex items-center justify-center"
                            >
                                {isSubmitting ? "Syncing..." : "Connect Entity"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility class merger helper (since cn might not be available exactly this way, I'll provide a mini-version if needed or just use template literals)
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
