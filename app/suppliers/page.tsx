"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    Phone,
    Mail,
    MapPin,
    ChevronRight,
    Loader2,
    Pencil,
    Trash2,
    X
} from "lucide-react";
import { useData } from "@/lib/hooks";

export default function SuppliersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const [deletingSupplier, setDeletingSupplier] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: suppliers, loading, refetch } = useData<any[]>("/api/suppliers");

    const filteredSuppliers = suppliers?.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleAddSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    phone: formData.get("phone"),
                    email: formData.get("email"),
                    address: formData.get("address"),
                }),
            });

            if (!res.ok) throw new Error("Failed to add supplier");
            setShowAddModal(false);
            refetch();
        } catch (err) {
            alert("Error adding supplier.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditSupplier = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingSupplier) return;
        setIsEditing(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch(`/api/suppliers/${editingSupplier.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    phone: formData.get("phone"),
                    email: formData.get("email"),
                    address: formData.get("address"),
                }),
            });

            if (!res.ok) throw new Error("Failed to update supplier");
            setEditingSupplier(null);
            refetch();
        } catch (err) {
            alert("Error updating supplier.");
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteSupplier = async () => {
        if (!deletingSupplier) return;
        setIsDeleting(true);

        try {
            const res = await fetch(`/api/suppliers/${deletingSupplier.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete supplier");
            setDeletingSupplier(null);
            refetch();
        } catch (err) {
            alert("Error deleting supplier. It may have linked purchase orders.");
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-10 w-10 text-purple-600 animate-spin" /></div>;

    return (
        <>
            <div className="flex flex-col gap-8 animate-fade-in-up">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Vendors &amp; Suppliers</h1>
                        <p className="text-white/70 mt-1 font-medium italic">Direct contact and order history with medicine suppliers.</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Supplier
                    </button>
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-sm"
                    />
                </div>

                {/* Suppliers Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="card-premium rounded-2xl p-6 hover:shadow-xl hover:shadow-purple-500/10 transition-all border border-gray-100">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/30">
                                        {supplier.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{supplier.name}</h3>
                                        <p className="text-xs text-purple-600 font-bold uppercase">ID: SUP-{supplier.id.toString().padStart(4, '0')}</p>
                                    </div>
                                </div>
                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        id={`edit-supplier-${supplier.id}`}
                                        onClick={() => setEditingSupplier(supplier)}
                                        title="Edit Supplier"
                                        className="p-2 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                        id={`delete-supplier-${supplier.id}`}
                                        onClick={() => setDeletingSupplier(supplier)}
                                        title="Delete Supplier"
                                        className="p-2 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    {supplier.phone || "—"}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    {supplier.email || "—"}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    {supplier.address || "—"}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Total Orders</p>
                                    <p className="font-bold text-gray-900">{supplier.totalOrders ?? 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Last Order</p>
                                    <p className="font-bold text-gray-900">{supplier.lastOrder ? new Date(supplier.lastOrder).toLocaleDateString() : "Never"}</p>
                                </div>
                            </div>

                            <button className="w-full mt-6 py-3 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                                Order History
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    ))}

                    {filteredSuppliers.length === 0 && (
                        <div className="col-span-3 text-center py-16 text-gray-400">
                            <p className="text-lg font-medium">No suppliers found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Supplier Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 animate-fade-in-up shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Add Supplier</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddSupplier} className="space-y-4">
                            <input name="name" required placeholder="Supplier Name" className="w-full h-11 border rounded-xl px-4" />
                            <input name="phone" placeholder="Phone Number (Optional)" className="w-full h-11 border rounded-xl px-4" />
                            <input name="email" type="email" placeholder="Email Address (Optional)" className="w-full h-11 border rounded-xl px-4" />
                            <textarea name="address" placeholder="Office Address (Optional)" className="w-full border rounded-xl px-4 py-2 min-h-[100px]" />
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button>
                                <button disabled={isSubmitting} type="submit" className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold disabled:opacity-60">
                                    {isSubmitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Supplier Modal */}
            {editingSupplier && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-lg p-6 animate-fade-in-up shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Edit Supplier</h2>
                            <button onClick={() => setEditingSupplier(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSupplier} className="space-y-4">
                            <input name="name" required defaultValue={editingSupplier.name} placeholder="Supplier Name" className="w-full h-11 border rounded-xl px-4" />
                            <input name="phone" defaultValue={editingSupplier.phone || ""} placeholder="Phone Number (Optional)" className="w-full h-11 border rounded-xl px-4" />
                            <input name="email" type="email" defaultValue={editingSupplier.email || ""} placeholder="Email Address (Optional)" className="w-full h-11 border rounded-xl px-4" />
                            <textarea name="address" defaultValue={editingSupplier.address || ""} placeholder="Office Address (Optional)" className="w-full border rounded-xl px-4 py-2 min-h-[100px]" />
                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setEditingSupplier(null)} className="flex-1 py-3 border rounded-xl">Cancel</button>
                                <button disabled={isEditing} type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold disabled:opacity-60">
                                    {isEditing ? "Saving..." : "Update Supplier"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingSupplier && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 animate-fade-in-up shadow-2xl">
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                                <Trash2 className="h-8 w-8 text-red-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Delete Supplier?</h2>
                            <p className="text-gray-500 text-sm">
                                Are you sure you want to delete <span className="font-bold text-gray-800">{deletingSupplier.name}</span>? This action cannot be undone.
                            </p>
                            <div className="flex gap-4 w-full pt-2">
                                <button
                                    onClick={() => setDeletingSupplier(null)}
                                    className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isDeleting}
                                    onClick={handleDeleteSupplier}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-60"
                                >
                                    {isDeleting ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
