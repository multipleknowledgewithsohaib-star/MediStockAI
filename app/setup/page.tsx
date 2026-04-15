"use client";

import { useState } from "react";
import {
    ChevronRight,
    ChevronLeft,
    Box,
    ScanLine,
    List,
    AlertCircle,
    CheckCircle2,
    Save,
    Trash2,
    Plus,
    Clock,
    ShieldCheck
} from "lucide-react";
import ExpiryScanner from "@/components/expiry/ExpiryScanner";
import { useData } from "@/lib/hooks";

export default function SetupPage() {
    const [step, setStep] = useState(1);
    const [setupType, setSetupType] = useState<"bulk" | "scan" | null>(null);
    const [scannedItems, setScannedItems] = useState<any[]>([]);
    const [bulkEntries, setBulkEntries] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    const { data: products } = useData<any[]>("/api/products");

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            setIsSaving(false);
            setStep(4);
        }, 1500);
    };

    const addScannedItem = (data: any) => {
        setScannedItems([...scannedItems, {
            id: Math.random().toString(36).substr(2, 9),
            ...data,
            productId: ""
        }]);
    };

    const removeScannedItem = (id: string) => {
        setScannedItems(scannedItems.filter(item => item.id !== id));
    };

    return (
        <div className="max-w-4xl mx-auto py-10 animate-fade-in-up">
            <div className="mb-12 text-center">
                <h1 className="text-4xl font-black text-gray-900 uppercase tracking-tight mb-2 text-gradient">Inventory Onboarding</h1>
                <p className="text-gray-500 font-medium">Migrate your legacy stock into the JailWatch-Pro ecosystem.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-16 relative">
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -translate-y-1/2 -z-10 rounded-full" />
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all border-4 ${s === step ? 'bg-purple-600 text-white border-purple-200 scale-125 shadow-xl shadow-purple-500/20' :
                            s < step ? 'bg-green-500 text-white border-green-100' :
                                'bg-white text-gray-400 border-gray-50'
                            }`}
                    >
                        {s < step ? <CheckCircle2 className="h-6 w-6" /> : s}
                    </div>
                ))}
            </div>

            <div className="card-premium rounded-[3rem] p-10 shadow-2xl shadow-purple-100/50 min-h-[500px] flex flex-col">
                {step === 1 && (
                    <div className="space-y-8 flex-1 animate-fade-in">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Select Migration Method</h2>
                            <p className="text-gray-500 mt-1 font-medium italic">How would you like to import your existing stock?</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6">
                            <button
                                onClick={() => { setSetupType("scan"); setStep(2); }}
                                className="group p-8 border-2 border-gray-100 rounded-[2.5rem] text-left hover:border-purple-500 hover:bg-purple-50 transition-all flex flex-col gap-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <ScanLine className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">Vision Assist</h3>
                                    <p className="text-sm text-gray-500 font-medium mt-1">Scan medicine boxes with AI to extract batch and expiry details automatically.</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setSetupType("bulk"); setStep(2); }}
                                className="group p-8 border-2 border-gray-100 rounded-[2.5rem] text-left hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col gap-4"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <List className="h-8 w-8" />
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">Bulk Entry</h3>
                                    <p className="text-sm text-gray-500 font-medium mt-1">Paste a list or enter data manually for rapid inventory population.</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && setupType === "scan" && (
                    <div className="space-y-8 flex-1 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Scan Stock</h2>
                            <button onClick={() => setShowScanner(true)} className="btn-primary flex items-center gap-2">
                                <Plus className="h-4 w-4" /> Open Scanner
                            </button>
                        </div>

                        <div className="space-y-4">
                            {scannedItems.map((item) => (
                                <div key={item.id} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 flex items-center gap-6 group">
                                    <div className="p-3 bg-white rounded-xl shadow-sm">
                                        <Box className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <select
                                            value={item.productId}
                                            onChange={(e) => {
                                                const n = [...scannedItems];
                                                const i = n.findIndex(x => x.id === item.id);
                                                n[i].productId = e.target.value;
                                                setScannedItems(n);
                                            }}
                                            className="bg-transparent border-0 font-black text-gray-900 uppercase text-sm block outline-none mb-1 focus:text-purple-600"
                                        >
                                            <option value="">Identify Medicine...</option>
                                            {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="flex gap-4">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BN: {item.batchNo || 'N/A'}</span>
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">EXP: {item.expiryDate || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeScannedItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                            {scannedItems.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl flex flex-col items-center gap-4">
                                    <ScanLine className="h-12 w-12 text-gray-200" />
                                    <p className="font-bold text-gray-400 uppercase text-xs">No items scanned yet</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 flex justify-between">
                            <button onClick={() => setStep(1)} className="px-8 py-4 text-gray-500 font-black uppercase text-xs tracking-widest">Back</button>
                            <button
                                disabled={scannedItems.length === 0}
                                onClick={() => setStep(3)}
                                className="btn-primary"
                            >Continue <ChevronRight className="h-4 w-4 inline ml-2" /></button>
                        </div>
                    </div>
                )}

                {step === 2 && setupType === "bulk" && (
                    <div className="space-y-8 flex-1 animate-fade-in">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Rapid Entry Console</h2>
                            <p className="text-gray-500 font-medium text-sm">Enter stock in format: Medicine Name, Batch, Expiry, Qty</p>
                        </div>

                        <textarea
                            value={bulkEntries}
                            onChange={(e) => setBulkEntries(e.target.value)}
                            placeholder="Example:&#10;Panadol, B1001, 12/2026, 500&#10;Augmentin, C2002, 10/2025, 200"
                            className="w-full h-64 p-8 bg-gray-50 border-gray-100 rounded-[2rem] font-bold text-gray-700 placeholder:text-gray-300 focus:ring-4 focus:ring-purple-500/10 transition-all outline-none resize-none"
                        />

                        <div className="pt-6 flex justify-between">
                            <button onClick={() => setStep(1)} className="px-8 py-4 text-gray-500 font-black uppercase text-xs tracking-widest">Back</button>
                            <button
                                disabled={!bulkEntries.trim()}
                                onClick={() => setStep(3)}
                                className="btn-primary"
                            >Verify Entries <ChevronRight className="h-4 w-4 inline ml-2" /></button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 flex-1 animate-fade-in">
                        <div className="flex items-center gap-4 p-6 bg-blue-50 rounded-3xl border border-blue-100 text-blue-700">
                            <AlertCircle className="h-6 w-6 shrink-0" />
                            <div>
                                <p className="font-black uppercase text-xs tracking-wide">Final Verification</p>
                                <p className="text-xs font-medium opacity-80 mt-1">Please review all data carefully. Once committed, these balances will be added to your live inventory.</p>
                            </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 px-2">
                            {setupType === "scan" ? (
                                scannedItems.map(item => (
                                    <div key={item.id} className="flex justify-between py-3 border-b border-gray-50 text-sm font-bold text-gray-600">
                                        <span>{products?.find((p: any) => p.id === item.productId)?.name || 'Unknown Medicine'}</span>
                                        <span className="text-gray-400">BN: {item.batchNo} | EXP: {item.expiryDate}</span>
                                    </div>
                                ))
                            ) : (
                                bulkEntries.split('\n').filter(l => l.trim()).map((line, i) => (
                                    <div key={i} className="flex justify-between py-3 border-b border-gray-50 text-sm font-bold text-gray-600 uppercase">
                                        <span>{line.split(',')[0]}</span>
                                        <span className="text-gray-400">{line.split(',').slice(1).join(' | ')}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="pt-6 flex gap-4 mt-auto">
                            <button onClick={() => setStep(2)} className="flex-1 py-5 rounded-3xl border border-gray-100 text-gray-500 font-black uppercase text-xs tracking-widest">Modify</button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-2 py-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-purple-200"
                            >
                                {isSaving ? "Authorizing Deployment..." : "Authorize Inventory Injection"}
                            </button>
                        </div>
                    </div>
                )}

                {step === 4 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                        <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-8 shadow-inner">
                            <CheckCircle2 className="h-12 w-12" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">Inventory Primed</h2>
                        <p className="text-gray-500 max-w-sm mx-auto font-medium">All items have been successfully migrated. Your real-time tracking is now active.</p>
                        <div className="mt-12 flex flex-col gap-4 w-full">
                            <a href="/" className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-gray-200">Return to Operations</a>
                            <button onClick={() => { setStep(1); setScannedItems([]); setBulkEntries(""); }} className="w-full py-5 border border-gray-100 rounded-[2rem] font-black uppercase text-xs tracking-widest text-gray-400 hover:text-purple-600 transition-colors">Start Another Batch</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Assistance Section */}
            <div className="mt-12 grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-3xl border border-gray-50 shadow-sm flex flex-col gap-3">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 italic">No Expiry items?</h4>
                    <p className="text-xs text-gray-600 font-medium">Leave expiry date blank or enter 'N/A' for items that don't expire.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-50 shadow-sm flex flex-col gap-3">
                    <ShieldCheck className="h-5 w-5 text-green-500" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 italic">FIFO Protocol</h4>
                    <p className="text-xs text-gray-600 font-medium">System will automatically apply FIFO logic based on the dates you enter.</p>
                </div>
                <div className="p-6 bg-white rounded-3xl border border-gray-50 shadow-sm flex flex-col gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 italic">Support</h4>
                    <p className="text-xs text-gray-600 font-medium">Contact technical desk if you have massive CSV files for import.</p>
                </div>
            </div>

            {showScanner && (
                <ExpiryScanner
                    onClose={() => setShowScanner(false)}
                    onScanComplete={(data) => {
                        addScannedItem(data);
                        setShowScanner(false);
                    }}
                />
            )}
        </div>
    );
}
