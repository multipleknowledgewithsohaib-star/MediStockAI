"use client";

import { useState } from "react";
import {
    Clock,
    AlertTriangle,
    CheckCircle2,
    Search,
    Filter,
    ArrowUpDown,
    Download,
    Eye
} from "lucide-react";
import {
    getExpiryStatus,
    getExpiryBadgeClass,
    getDaysUntilExpiry,
    formatExpiryDate
} from "@/lib/expiryTracking";

interface ExpiryAlert {
    id: string | number;
    medicine: string;
    batch: string;
    days: number;
    quantity: number;
    type: 'critical' | 'warning' | 'early' | 'expired' | 'safe';
    expiryDate: string;
}

interface ExpiryAlertsDashboardProps {
    alerts: ExpiryAlert[];
}

export default function ExpiryAlertsDashboard({ alerts }: ExpiryAlertsDashboardProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("days");

    const filteredAlerts = alerts
        .filter(alert => {
            const matchesSearch = alert.medicine.toLowerCase().includes(searchTerm.toLowerCase()) ||
                alert.batch.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === "all" || alert.type === filterStatus;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === "days") return a.days - b.days;
            if (sortBy === "name") return a.medicine.localeCompare(b.medicine);
            if (sortBy === "quantity") return b.quantity - a.quantity;
            return 0;
        });

    return (
        <div className="space-y-6">
            {/* Header & Stats Summary */}
            <div className="grid gap-4 md:grid-cols-4">
                <div className="card-premium p-4 border-l-4 border-red-500">
                    <p className="text-sm font-medium text-gray-500 uppercase">Expired</p>
                    <p className="text-2xl font-bold text-gray-900">
                        {alerts.filter(a => a.days < 0).length}
                    </p>
                </div>
                <div className="card-premium p-4 border-l-4 border-red-500">
                    <p className="text-sm font-medium text-gray-500 uppercase italic font-bold">Critical (30d)</p>
                    <p className="text-2xl font-black text-red-600">
                        {alerts.filter(a => a.days >= 0 && a.days <= 30).length}
                    </p>
                </div>
                <div className="card-premium p-4 border-l-4 border-orange-500">
                    <p className="text-sm font-medium text-gray-500 uppercase italic font-bold">Warning (90d)</p>
                    <p className="text-2xl font-black text-orange-500">
                        {alerts.filter(a => a.days > 30 && a.days <= 90).length}
                    </p>
                </div>
                <div className="card-premium p-4 border-l-4 border-yellow-500">
                    <p className="text-sm font-medium text-gray-500 uppercase italic font-bold">Early (180d)</p>
                    <p className="text-2xl font-black text-yellow-600">
                        {alerts.filter(a => a.days > 90 && a.days <= 180).length}
                    </p>
                </div>
                <div className="card-premium p-4 border-l-4 border-green-500">
                    <p className="text-sm font-medium text-gray-500 uppercase">Total Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search medicine or batch..."
                        className="input-field pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex-1 md:flex-none">
                        <select
                            className="input-field py-2"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="expired">Expired</option>
                            <option value="critical">Critical</option>
                            <option value="warning">Warning</option>
                            <option value="early">Early Alert</option>
                        </select>
                    </div>
                    <div className="flex-1 md:flex-none">
                        <select
                            className="input-field py-2"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="days">Sort by Days</option>
                            <option value="name">Sort by Name</option>
                            <option value="quantity">Sort by Qty</option>
                        </select>
                    </div>
                    <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                        <Download className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Alerts Table */}
            <div className="card-premium overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="text-left p-4 text-sm font-semibold text-gray-600">Medicine</th>
                                <th className="text-left p-4 text-sm font-semibold text-gray-600">Batch No</th>
                                <th className="text-left p-4 text-sm font-semibold text-gray-600">Expiry Date</th>
                                <th className="text-left p-4 text-sm font-semibold text-gray-600">In Stock</th>
                                <th className="text-left p-4 text-sm font-semibold text-gray-600">Status</th>
                                <th className="text-right p-4 text-sm font-semibold text-gray-600">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAlerts.map((alert) => (
                                <tr key={alert.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-gray-900">{alert.medicine}</div>
                                    </td>
                                    <td className="p-4">
                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{alert.batch}</code>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {formatExpiryDate(alert.expiryDate)}
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {alert.quantity} units
                                    </td>
                                    <td className="p-4">
                                        <span className={`badge ${getExpiryBadgeClass(getExpiryStatus(alert.expiryDate))}`}>
                                            {alert.days < 0 ? 'Expired' :
                                                alert.days <= 30 ? `Critical (${alert.days}d)` :
                                                    alert.days <= 90 ? `Warning (${alert.days}d)` :
                                                        alert.days <= 180 ? `Early (${alert.days}d)` :
                                                            `${alert.days} days left`}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button className="text-purple-600 hover:text-purple-700 p-2">
                                            <Eye className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredAlerts.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-20 text-gray-400">
                                        <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p>No expiry alerts matching filters</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
