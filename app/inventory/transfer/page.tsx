"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    X,
    ArrowRightLeft,
    Building2,
    Store,
    Package,
    ArrowRight,
    Search,
    History,
    CheckCircle2,
    AlertCircle,
    Calendar,
    ChevronDown,
    Loader2
} from "lucide-react";
import { useData } from "@/lib/hooks";
import { storage } from "@/lib/storage";
import { transferService, Transfer } from "@/lib/services/transfer.service";

export default function StockTransferPage() {
    const { data: branches } = useData<any[]>("/api/branches");
    const { data: products } = useData<any[]>("/api/products");
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    
    // Form State
    const [formData, setFormData] = useState({
        fromBranchId: "",
        toBranchId: "",
        productId: "",
        batchNo: "",
        quantity: 1
    });

    const [availableBatches, setAvailableBatches] = useState<any[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadTransfers();
    }, []);

    const loadTransfers = async () => {
        const history = await transferService.getTransfers();
        setTransfers(history);
    };

    // Filter batches when branch or product changes
    useEffect(() => {
        if (formData.fromBranchId && formData.productId) {
            const allBatches = storage.get('batches', []);
            
            // Try to find batches at the source branch first
            let filtered = allBatches.filter((b: any) => 
                b.branchId == formData.fromBranchId && 
                b.productId == formData.productId
            );

            // If no batches found AT SOURCE, show batches of this product from OTHER branches (as templates)
            if (filtered.length === 0) {
                const globalBatches = allBatches.filter((b: any) => b.productId == formData.productId);
                // Keep only unique batch numbers for templates
                const uniqueBatches: any[] = [];
                const seen = new Set();
                globalBatches.forEach((b: any) => {
                    if (!seen.has(b.batchNo)) {
                        seen.add(b.batchNo);
                        uniqueBatches.push({ ...b, quantity: 0, isTemplate: true });
                    }
                });
                filtered = uniqueBatches;
            }

            setAvailableBatches(filtered);
        } else {
            setAvailableBatches([]);
        }
    }, [formData.fromBranchId, formData.productId]);

    const handleTransfer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBatch && !formData.batchNo) return;
        
        if (formData.fromBranchId === formData.toBranchId) {
            alert("Source and destination branches must be different!");
            return;
        }

        setIsSubmitting(true);
        try {
            const product = products?.find(p => p.id == formData.productId);
            await transferService.executeTransfer({
                productId: formData.productId,
                productName: product?.name || "Unknown Product",
                batchNo: formData.batchNo,
                fromBranchId: formData.fromBranchId,
                toBranchId: formData.toBranchId,
                quantity: formData.quantity
            });
            
            alert("Stock transferred successfully!");
            setFormData({ ...formData, productId: "", batchNo: "", quantity: 1 });
            setSelectedBatch(null);
            loadTransfers();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isForceTransfer = selectedBatch && formData.quantity > selectedBatch.quantity;

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-100">
                        <ArrowRightLeft className="h-8 w-8" />
                    </div>
                    Stock Transfer
                </h1>
                <p className="text-gray-500 mt-2 font-medium">Relocate inventory across your entity network with precision.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Form Section */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-100 border border-gray-100">
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-8">Execute Relocation</h2>
                        
                        <form onSubmit={handleTransfer} className="space-y-6">
                            {/* Branch Selection Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">From Branch</label>
                                    <select
                                        value={formData.fromBranchId}
                                        onChange={(e) => setFormData({ ...formData, fromBranchId: e.target.value })}
                                        className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Select Source</option>
                                        {branches?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.type})</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">To Branch</label>
                                    <select
                                        value={formData.toBranchId}
                                        onChange={(e) => setFormData({ ...formData, toBranchId: e.target.value })}
                                        className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold outline-none focus:ring-4 focus:ring-purple-500/10 transition-all appearance-none"
                                        required
                                    >
                                        <option value="">Select Destination</option>
                                        {branches?.map(b => (
                                            <option key={b.id} value={b.id} disabled={b.id == formData.fromBranchId}>
                                                {b.name} ({b.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Product Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Select Product</label>
                                <select
                                    value={formData.productId}
                                    onChange={(e) => setFormData({ ...formData, productId: e.target.value, batchNo: "" })}
                                    className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    required
                                    disabled={!formData.fromBranchId}
                                >
                                    <option value="">Choose item to relocate</option>
                                    {products?.map(p => <option key={p.id} value={p.id}>{p.name} - {p.brand}</option>)}
                                </select>
                            </div>

                            {/* Batch Selection */}
                            {formData.productId && (
                                <div className="space-y-2 animate-fade-in">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Available Batches</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {availableBatches.length > 0 ? (
                                            availableBatches.map(batch => (
                                                <button
                                                    key={batch.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({ ...formData, batchNo: batch.batchNo });
                                                        setSelectedBatch(batch);
                                                    }}
                                                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                                        formData.batchNo === batch.batchNo 
                                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                                                        : "bg-gray-50 border-gray-100 hover:border-blue-300"
                                                    }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className={`text-xs font-black uppercase tracking-tight ${formData.batchNo === batch.batchNo ? "text-white" : "text-gray-900"}`}>
                                                                Batch: {batch.batchNo}
                                                            </p>
                                                            {batch.isTemplate && (
                                                                <span className="text-[8px] font-black bg-orange-500 text-white px-1.5 py-0.5 rounded-full uppercase">Virtual</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-[10px] font-medium ${formData.batchNo === batch.batchNo ? "text-blue-100" : "text-gray-400"}`}>
                                                            Exp: {new Date(batch.expiryDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-black ${formData.batchNo === batch.batchNo ? "text-white" : "text-blue-600"}`}>
                                                            {batch.quantity} Units
                                                        </p>
                                                        <p className={`text-[10px] font-black uppercase ${formData.batchNo === batch.batchNo ? "text-blue-100" : "text-gray-400"}`}>
                                                            {batch.isTemplate ? "Not in Branch" : "In Stock"}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center gap-3 text-orange-700">
                                                <AlertCircle className="h-5 w-5" />
                                                <p className="text-xs font-bold">No batches found for this product in the system.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-between">
                                    <span>Transfer Quantity</span>
                                    {isForceTransfer && (
                                        <span className="text-orange-500 uppercase animate-pulse">⚠️ Force Mode</span>
                                    )}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                                        className={`w-full h-14 bg-gray-50 border ${isForceTransfer ? 'border-orange-300 ring-4 ring-orange-500/5' : 'border-gray-100'} rounded-2xl px-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all`}
                                        required
                                        disabled={!formData.batchNo}
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                                        Max: {selectedBatch?.quantity || 0}
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.batchNo || formData.fromBranchId === formData.toBranchId}
                                className={`w-full py-5 ${isForceTransfer ? 'bg-gradient-to-r from-orange-600 to-red-600 shadow-orange-200' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200'} text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2`}
                            >
                                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (isForceTransfer ? "Force Relocation" : "Initiate Relocation")}
                                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                            </button>
                        </form>
                    </div>

                    {/* Quick Guidance */}
                    <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <ArrowRightLeft className="h-32 w-32 rotate-12" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                            Relocation Rules
                        </h3>
                        <ul className="space-y-4 text-xs font-medium text-blue-100/80">
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                                <span>Batches are automatically split when partially transferred.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                                <span>Destination entities immediately reflect updated stock levels.</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1" />
                                <span>Relocations are logged permanently for inventory audits.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* History Section */}
                <div className="lg:col-span-7">
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-gray-100 border border-gray-100 min-h-[600px]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
                                <History className="h-6 w-6 text-blue-600" />
                                Recent Relocations
                            </h2>
                            <div className="badge badge-info bg-blue-50 text-blue-600 font-black px-4 py-2 rounded-xl border-blue-100">
                                {transfers.length} LOGS
                            </div>
                        </div>

                        <div className="space-y-4">
                            {transfers.length > 0 ? (
                                transfers.map((log) => {
                                    const from = branches?.find(b => b.id == log.fromBranchId);
                                    const to = branches?.find(b => b.id == log.toBranchId);
                                    
                                    return (
                                        <div key={log.id} className="p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 hover:bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-gray-100/50 transition-all">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-xl text-blue-600 shadow-sm">
                                                        <Package className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 uppercase">{log.productName}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Batch: {log.batchNo}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-gray-900">{log.quantity}</p>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Units</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-white/50 p-4 rounded-2xl border border-gray-100">
                                                <div className="flex flex-col items-center">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Source</p>
                                                    <div className="flex items-center gap-2 text-blue-600">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        <span className="text-[10px] font-black uppercase italic">{from?.name || "Main"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center">
                                                    <ArrowRight className="h-4 w-4 text-gray-300" />
                                                </div>
                                                <div className="flex flex-col items-center">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Destination</p>
                                                    <div className="flex items-center gap-2 text-purple-600">
                                                        <Store className="h-3.5 w-3.5" />
                                                        <span className="text-[10px] font-black uppercase italic">{to?.name || "Target"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-1.5 text-green-500">
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    Completed
                                                </div>
                                                <div className="text-gray-400 italic">
                                                    {new Date(log.date).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-300 opacity-50">
                                    <ArrowRightLeft className="h-16 w-16 mb-4" />
                                    <p className="font-black uppercase tracking-widest text-sm text-center">No relocation data<br />recorded yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
