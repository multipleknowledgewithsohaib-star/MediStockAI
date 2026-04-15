"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
    Search,
    Printer,
    Eye,
    FileText,
    Calendar,
    Loader2,
    ScanLine,
    X,
    Trash2
} from "lucide-react";
import { ADMIN_ROLE } from "@/lib/auth/access";
import { useData } from "@/lib/hooks";
import { printInvoice } from "@/lib/print";

export default function InvoicesPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const { data: invoices, loading, error, refetch } = useData<any[]>("/api/invoices");

    const getItemRate = (item: any) => Number(item?.rateAtSaleTime ?? item?.price ?? 0);
    const getItemDiscount = (item: any) => Number(item?.discountAmountAtSaleTime ?? item?.discountAmount ?? 0);
    const getItemTotal = (item: any) => Number(item?.netAmount ?? item?.lineTotal ?? ((getItemRate(item) * Number(item?.quantity || 0)) - getItemDiscount(item)));

    const filteredInvoices = invoices?.filter(inv =>
        inv.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleDeleteInvoice = async (id: string | number) => {
        if (session?.user?.role !== ADMIN_ROLE) {
            return;
        }

        if (confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
            const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
            const responseBody = await response.json();

            if (!response.ok) {
                alert(responseBody?.error || "Failed to delete invoice.");
                return;
            }

            refetch();
            alert("Invoice deleted successfully.");
        }
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Invoice Explorer</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Browse, search, and reprint past MediStock receipts.</p>
                </div>
                <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-50 text-purple-700 font-bold text-sm">
                    <FileText className="h-4 w-4" />
                    {invoices?.length || 0} Total Records
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by Invoice Number (e.g. INV-17...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-14 w-full rounded-2xl border-2 border-gray-100 bg-white pl-12 pr-4 text-base font-medium focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none"
                />
            </div>

            {/* Invoices List */}
            <div className="card-premium rounded-3xl overflow-hidden border-2 border-gray-50">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="text-left py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Invoice No</th>
                                <th className="text-left py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Date</th>
                                <th className="text-left py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Amount</th>
                                <th className="text-left py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Items</th>
                                <th className="text-left py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Created By</th>
                                <th className="text-right py-5 px-6 text-xs font-black text-gray-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-purple-100 transition-colors">
                                                <FileText className="h-4 w-4 text-gray-500 group-hover:text-purple-600" />
                                            </div>
                                            <span className="font-black text-gray-900 font-mono tracking-tighter">{inv.invoiceNo}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(inv.date).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-sm font-black text-gray-900 truncate block">PKR {inv.total.toLocaleString()}</span>
                                        {inv.discount > 0 && <span className="text-[10px] font-black text-green-600 uppercase">Discount: PKR {Number(inv.discount).toFixed(2)}</span>}
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="badge badge-info text-[10px] uppercase font-black">{inv.items.length} Products</span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-sm font-semibold text-gray-700">{inv.createdBy?.name || "System"}</span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 text-gray-400">
                                            <button
                                                onClick={() => setSelectedInvoice(inv)}
                                                className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                                title="View Items"
                                            >
                                                <Eye className="h-5 w-5" />
                                            </button>
                                            <button
                                                onClick={() => printInvoice({
                                                    ...inv,
                                                    items: inv.items.map((i: any) => ({
                                                        ...i,
                                                        name: i.product?.name || i.name || "Unknown Product"
                                                    }))
                                                }, inv.createdBy?.name || session?.user?.name || "MediStock User")}
                                                className="p-2 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-all"
                                                title="Direct Print"
                                            >
                                                <Printer className="h-5 w-5" />
                                            </button>
                                            {session?.user?.role === ADMIN_ROLE && (
                                                <button
                                                    onClick={() => handleDeleteInvoice(inv.id)}
                                                    className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="max-w-xs mx-auto space-y-3">
                                            <FileText className="h-12 w-12 text-gray-200 mx-auto" />
                                            <p className="text-gray-400 font-bold">{error || "No invoices found matching your pulse."}</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Invoice Details</h3>
                                <p className="text-sm font-medium text-gray-500">Bill No: <span className="text-purple-600 font-mono">{selectedInvoice.invoiceNo}</span></p>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="p-3 hover:bg-white rounded-2xl shadow-sm transition-all text-gray-400 hover:text-gray-900">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-8 max-h-[60vh] overflow-y-auto">
                            {selectedInvoice.items.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <div className="col-span-4">Product Item</div>
                                        <div className="col-span-2 text-center">Qty</div>
                                        <div className="col-span-2 text-right">Rate</div>
                                        <div className="col-span-2 text-right">Discount</div>
                                        <div className="col-span-2 text-right">Total</div>
                                    </div>
                                    <div className="space-y-2">
                                        {selectedInvoice.items.map((item: any, idx: number) => (
                                            <div key={idx} className="grid grid-cols-12 gap-4 p-4 bg-gray-50 rounded-2xl items-center border border-transparent hover:border-purple-100 transition-all">
                                                <div className="col-span-4">
                                                    <p className="font-black text-gray-900 uppercase text-sm">{item.product?.name || item.name}</p>
                                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">{item.batch || "SYSTEM BATCH"}</p>
                                                </div>
                                                <div className="col-span-2 text-center font-black text-purple-600 text-sm">{item.quantity}</div>
                                                <div className="col-span-2 text-right text-xs font-bold text-gray-600">PKR {getItemRate(item).toFixed(2)}</div>
                                                <div className="col-span-2 text-right text-xs font-bold text-emerald-600">PKR {getItemDiscount(item).toFixed(2)}</div>
                                                <div className="col-span-2 text-right font-black text-gray-900 text-sm">PKR {getItemTotal(item).toFixed(2)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center space-y-4">
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                                        <ScanLine className="h-10 w-10 text-blue-500" />
                                    </div>
                                    <div className="max-w-xs mx-auto">
                                        <h4 className="font-black text-gray-900 uppercase tracking-tight">AI Scanned Document</h4>
                                        <p className="text-sm text-gray-500 font-medium leading-relaxed mt-2">
                                            This record was digitized using AI Vision. Individual item breakdowns are stored in the physical archive.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-gray-100 grid gap-8 md:grid-cols-3">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="font-black text-gray-900 uppercase text-xs">Fully Paid</span>
                                    </div>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discount Applied</p>
                                    <p className="text-sm font-black text-emerald-600">PKR {Number(selectedInvoice.discount || 0).toFixed(2)}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grand Total</p>
                                    <p className="text-2xl font-black text-purple-600">PKR {selectedInvoice.total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex gap-4">
                            <button
                                onClick={() => printInvoice({
                                    ...selectedInvoice,
                                    items: selectedInvoice.items.map((i: any) => ({
                                        ...i,
                                        name: i.product?.name || i.name || "Unknown Product"
                                    }))
                                }, selectedInvoice.createdBy?.name || session?.user?.name || "MediStock User")}
                                className="flex-1 py-4 rounded-2xl bg-gray-900 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-gray-200"
                            >
                                <Printer className="h-4 w-4" />
                                Reprint Receipt
                            </button>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="flex-1 py-4 rounded-2xl bg-white border-2 border-gray-200 text-gray-900 font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
