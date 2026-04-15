"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, Calendar, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
    getDaysUntilExpiry,
    getExpiryStatus,
    getExpiryBadgeClass,
    sortBatchesByFIFO,
    formatExpiryDate
} from "@/lib/expiryTracking";

interface Batch {
    id: string | number;
    batchNo: string;
    manufacturingDate?: string;
    expiryDate: string;
    quantity: number;
    mrp?: number;
    purchaseDate?: string;
}

interface BatchManagementProps {
    batches: Batch[];
    productName: string;
    onBatchAdd: (batch: Omit<Batch, 'id'>) => void;
    onBatchUpdate: (batchId: string | number, updates: Partial<Batch>) => void;
    onBatchDelete: (batchId: string | number) => void;
}

export default function BatchManagement({
    batches,
    productName,
    onBatchAdd,
    onBatchUpdate,
    onBatchDelete
}: BatchManagementProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [formData, setFormData] = useState({
        batchNo: '',
        manufacturingDate: '',
        expiryDate: '',
        quantity: '',
        mrp: '',
        purchaseDate: ''
    });

    const sortedBatches = sortBatchesByFIFO(batches);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const batchData = {
            batchNo: formData.batchNo,
            manufacturingDate: formData.manufacturingDate || undefined,
            expiryDate: formData.expiryDate,
            quantity: parseInt(formData.quantity),
            mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
            purchaseDate: formData.purchaseDate || undefined
        };

        if (editingBatch) {
            onBatchUpdate(editingBatch.id, batchData);
        } else {
            onBatchAdd(batchData);
        }

        resetForm();
    };

    const resetForm = () => {
        setFormData({
            batchNo: '',
            manufacturingDate: '',
            expiryDate: '',
            quantity: '',
            mrp: '',
            purchaseDate: ''
        });
        setShowAddModal(false);
        setEditingBatch(null);
    };

    const handleEdit = (batch: Batch) => {
        setEditingBatch(batch);
        setFormData({
            batchNo: batch.batchNo,
            manufacturingDate: batch.manufacturingDate || '',
            expiryDate: batch.expiryDate,
            quantity: batch.quantity.toString(),
            mrp: batch.mrp?.toString() || '',
            purchaseDate: batch.purchaseDate || ''
        });
        setShowAddModal(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                    Batch Management - {productName}
                </h3>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Batch
                </button>
            </div>

            {/* Batches List */}
            <div className="space-y-3">
                {sortedBatches.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No batches added yet</p>
                        <p className="text-sm">Add batches to track expiry dates</p>
                    </div>
                ) : (
                    sortedBatches.map((batch, index) => {
                        const daysLeft = getDaysUntilExpiry(batch.expiryDate);
                        const status = getExpiryStatus(batch.expiryDate);
                        const badgeClass = getExpiryBadgeClass(status);
                        const batchKey = `${String(batch.id ?? "batch")}-${batch.batchNo || "no-batch"}-${batch.expiryDate || "no-expiry"}-${index}`;

                        return (
                            <div
                                key={batchKey}
                                className={`card-premium rounded-xl p-4 ${index === 0 ? 'border-2 border-purple-300' : ''
                                    }`}
                            >
                                {index === 0 && (
                                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-purple-600">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Next to Use (FIFO)
                                    </div>
                                )}

                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-bold text-gray-900">
                                                Batch: {batch.batchNo}
                                            </span>
                                            <span className={`badge ${badgeClass}`}>
                                                {status === 'expired' ? 'EXPIRED' :
                                                    status === 'critical' ? `CRITICAL (${daysLeft}d)` :
                                                        status === 'warning' ? `WARNING (${daysLeft}d)` :
                                                            status === 'early' ? `EARLY (${daysLeft}d)` :
                                                                formatExpiryDate(batch.expiryDate)}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-500">Stock:</span>
                                                <p className="font-medium text-gray-900">
                                                    {batch.quantity} Boxes
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Expiry:</span>
                                                <p className="font-medium text-gray-900">
                                                    {formatExpiryDate(batch.expiryDate)}
                                                </p>
                                            </div>
                                            {batch.manufacturingDate && (
                                                <div>
                                                    <span className="text-gray-500">MFG:</span>
                                                    <p className="font-medium text-gray-900">
                                                        {formatExpiryDate(batch.manufacturingDate)}
                                                    </p>
                                                </div>
                                            )}
                                            {batch.mrp && (
                                                <div>
                                                    <span className="text-gray-500">MRP:</span>
                                                    <p className="font-medium text-gray-900">
                                                        PKR {Number(batch.mrp).toFixed(2)}
                                                    </p>
                                                </div>
                                            )}
                                            {batch.purchaseDate && (
                                                <div>
                                                    <span className="text-gray-500">Purchased:</span>
                                                    <p className="font-medium text-gray-900">
                                                        {new Date(batch.purchaseDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {status === 'expired' && (
                                            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm font-medium">
                                                <AlertTriangle className="h-4 w-4" />
                                                This batch is expired and blocked from sale
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(batch)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4 text-gray-600" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm(`Delete batch ${batch.batchNo}?`)) {
                                                    onBatchDelete(batch.id);
                                                }
                                            }}
                                            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Add/Edit Batch Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="card-premium rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {editingBatch ? 'Edit Batch' : 'Add New Batch'}
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Batch Number *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.batchNo}
                                    onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                                    className="input-field"
                                    placeholder="e.g., B12345"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        MFG Date (Optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.manufacturingDate}
                                        onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Expiry Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity (Boxes) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    className="input-field"
                                    placeholder="Number of Boxes"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    MRP (Optional)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.mrp}
                                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                    className="input-field"
                                    placeholder="PKR"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Purchase Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    className="input-field"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1"
                                >
                                    {editingBatch ? 'Update' : 'Add'} Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
