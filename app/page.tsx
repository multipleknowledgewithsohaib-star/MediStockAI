"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Pill,
  Clock,
  CheckCircle2,
  Loader2,
  Calendar,
  ScanLine
} from "lucide-react";
import { useData } from "@/lib/hooks";
import { generateAllExpiryAlerts, getDaysUntilExpiry } from "@/lib/expiryTracking";
import ExpiryScanner from "@/components/expiry/ExpiryScanner";
import { useState } from "react";

export default function Dashboard() {
  const [showScanner, setShowScanner] = useState(false);
  const { data: dashboardData, loading: dashLoading, error } = useData<any>("/api/dashboard");
  const { data: products, loading: productsLoading } = useData<any[]>("/api/products");

  const expiryAlerts = useMemo(() => {
    if (!products) return [];
    return generateAllExpiryAlerts(products).slice(0, 5); // Show top 5
  }, [products]);

  const stats = useMemo(() => {
    if (!dashboardData || !products) return null;

    const lowStockCount = products.filter((p: { stock: number }) => (p.stock || 0) < 20).length;
    const expiringSoonCount = generateAllExpiryAlerts(products).length; // Includes everything up to 180 days (6 months)

    return {
      ...dashboardData.stats,
      lowStock: lowStockCount,
      expiringSoon: expiringSoonCount
    };
  }, [dashboardData, products]);

  if (dashLoading || productsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error || !dashboardData || !stats) {
    return (
      <div className="p-8 text-center text-red-500 card-premium">
        Error loading dashboard: {error || "No data available"}
      </div>
    );
  }

  const { recentSales, topSellingProducts } = dashboardData;

  const statCards = [
    {
      label: "Today's Sales",
      value: `PKR ${stats.todaySales.toLocaleString()}`,
      change: "+12.5%",
      trend: "up",
      icon: ShoppingCart,
      iconBg: "stat-icon-primary",
      shadow: "shadow-purple-100"
    },
    {
      label: "Total Revenue",
      value: `PKR ${stats.totalRevenue.toLocaleString()}`,
      change: "+20.1%",
      trend: "up",
      icon: DollarSign,
      iconBg: "stat-icon-success",
      shadow: "shadow-green-100"
    },
    {
      label: "Low Stock Items",
      value: stats.lowStock.toString(),
      change: stats.lowStock > 0 ? "Needs Restock" : "All Healthy",
      trend: stats.lowStock > 0 ? "warning" : "up",
      icon: Package,
      iconBg: stats.lowStock > 0 ? "stat-icon-warning" : "stat-icon-success",
      shadow: "shadow-orange-100"
    },
    {
      label: "Expiring Soon",
      value: stats.expiringSoon.toString(),
      change: stats.expiringSoon > 0 ? "Check Alerts" : "No Issues",
      trend: stats.expiringSoon > 0 ? "danger" : "up",
      icon: AlertTriangle,
      iconBg: stats.expiringSoon > 0 ? "stat-icon-danger" : "stat-icon-success",
      shadow: "shadow-red-100"
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight text-gradient">MediStock Operations</h1>
          <p className="text-white/70 mt-1 font-medium italic">MediStock Real-time Pharmacy Analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Health</span>
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Optimal
            </span>
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="btn-secondary flex items-center gap-2 group border-2 border-purple-100"
          >
            <ScanLine className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="text-purple-700">Quick Scan</span>
          </button>
          <Link href="/reports" className="btn-primary flex items-center gap-2 group">
            <TrendingUp className="h-4 w-4 group-hover:scale-110 transition-transform" />
            MediStock Reports
          </Link>
        </div>
      </div>

      {showScanner && (
        <ExpiryScanner
          onClose={() => setShowScanner(false)}
          onScanComplete={(items) => {
            console.log("Quick scan results:", items);
            setShowScanner(false);
          }}
        />
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <div
            key={i}
            className={`card-premium rounded-3xl p-6 border-b-4 ${stat.trend === 'danger' ? 'border-red-500' :
              stat.trend === 'warning' ? 'border-orange-500' :
                'border-purple-500'
              } transition-all hover:scale-[1.02] shadow-xl ${stat.shadow}/50`}
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className={`stat-icon ${stat.iconBg}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              {stat.trend === 'up' ? (
                <span className="flex items-center gap-1 text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1 rounded-lg">
                  <ArrowUpRight className="h-3 w-3" />
                  {stat.change}
                </span>
              ) : (
                <span className={`badge ${stat.trend === 'danger' ? 'badge-danger' : 'badge-warning'} text-[10px] uppercase font-black`}>
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-6">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-foreground mt-1">{stat.value}</p>

            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent Sales */}
        <div className="lg:col-span-2 card-premium rounded-3xl p-8 shadow-2xl shadow-gray-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Recent Sales</h3>
              <p className="text-sm text-gray-500 font-medium">Inventory movements recorded today</p>
            </div>
            <Link href="/sales" className="text-xs font-black text-purple-600 hover:text-purple-700 uppercase tracking-widest bg-purple-50 px-4 py-2 rounded-xl transition-all">
              View All History
            </Link>
          </div>

          <div className="space-y-4">
            {recentSales.map((sale: any) => (
              <div key={sale.id} className="flex items-center gap-4 p-5 rounded-2xl bg-gray-50/50 hover:bg-gray-100/50 transition-all border border-transparent hover:border-gray-100 group">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-200 group-hover:scale-110 transition-transform">
                  <Pill className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-foreground">{sale.medicine}</p>

                  <p className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Quantity: {sale.quantity} Strips</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-foreground">PKR {sale.amount.toLocaleString()}</p>

                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(sale.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
                <ShoppingCart className="h-10 w-10 text-gray-200" />
                <p className="text-gray-400 font-bold uppercase text-xs">No transactions recorded today</p>
              </div>
            )}
          </div>
        </div>

        {/* Expiry Alerts Summary */}
        <div className="card-premium rounded-3xl p-8 shadow-2xl shadow-gray-100 border-t-8 border-orange-500">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Vigilance</h3>
              <p className="text-sm text-gray-500 font-medium">Critical Medicine Lifecycles</p>
            </div>
            <Link href="/alerts" className="badge badge-danger group">
              {expiryAlerts.length} Active <ArrowUpRight className="h-3 w-3 inline ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {expiryAlerts.map((alert: any) => (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl transition-all border ${alert.days <= 30 ? 'bg-red-50 border-red-100' :
                  alert.days <= 90 ? 'bg-orange-50 border-orange-100' :
                    'bg-blue-50 border-blue-100'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${alert.days <= 30 ? 'bg-red-500' : 'bg-orange-500'} text-white`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate uppercase text-xs">{alert.productName}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">Batch: {alert.batchNo}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${alert.days <= 30 ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
                        }`}>
                        {alert.days <= 0 ? 'EXPIRED' : `${alert.days} DAYS LEFT`}
                      </span>
                      <span className="text-[10px] text-gray-400 font-black uppercase">Qty: {alert.quantity}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {expiryAlerts.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-4 bg-green-50 rounded-3xl">
                <CheckCircle2 className="h-10 w-10 text-green-200" />
                <p className="text-green-600 font-bold uppercase text-xs">Inventory is safe</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="card-premium rounded-3xl p-8 shadow-2xl shadow-gray-100 overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Best Performers</h3>
            <p className="text-sm text-gray-500 font-medium">Top moving inventory this month</p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-8 px-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Medicine</th>
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Movement</th>
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Revenue Generation</th>
                <th className="py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">In-Stock Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {topSellingProducts.map((product: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="py-6 min-w-[200px]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                        <Pill className="h-6 w-6 text-gray-400 group-hover:text-purple-600" />
                      </div>
                      <span className="font-black text-foreground uppercase tracking-tight">{product.name}</span>

                    </div>
                  </td>
                  <td className="py-6">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${Math.min(100, (product.sold / 500) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-600">{product.sold} UNITS</span>
                    </div>
                  </td>
                  <td className="py-6 text-right">
                    <span className="font-black text-gray-900">PKR {product.revenue.toLocaleString()}</span>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${product.stock > 100 ? 'bg-green-100 text-green-700' :
                      product.stock > 30 ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                      {product.stock > 100 ? 'Ample' : product.stock > 30 ? 'Limited' : 'Critical'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
