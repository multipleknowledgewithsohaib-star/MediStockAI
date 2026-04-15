"use client";

import { Package, TrendingDown, Percent, Calendar } from "lucide-react";

interface SupplierLink {
  id: number;
  purchasePrice: number;
  discount: number;
  supplierId: number;
  supplier: {
    id: number;
    name: string;
  };
}

interface Batch {
  id: number;
  batchNo: string;
  quantity: number;
  createdAt: string;
  purchasePrice?: number;
  discountPercent?: number;
  supplierId?: number;
  supplier?: {
    id: number;
    name: string;
  };
}

export default function LinkedSuppliersTable({ 
    suppliers, 
    batches 
}: { 
    suppliers: SupplierLink[], 
    batches?: Batch[] 
}) {
  // We want to show the purchase history per supplier. 
  // We want to show the purchase history.
  // We can merge in the standard discount from the 'suppliers' array if available.

  const history = (batches || []).map((batch, index) => {
      const standardLink = suppliers?.find(s => s.supplierId === batch.supplierId || s.supplier?.id === batch.supplier?.id);
      return {
          key: `${String(batch.id ?? "batch")}-${batch.batchNo || "no-batch"}-${batch.supplierId ?? batch.supplier?.id ?? "no-supplier"}-${index}`,
          id: batch.id,
          supplierName: batch.supplier?.name || "Local / Direct Purchase",
          date: batch.createdAt ? new Date(batch.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          quantity: batch.quantity,
          pricePaid: batch.purchasePrice || standardLink?.purchasePrice || 0,
          discount: batch.discountPercent || standardLink?.discount || 0,
          batchNo: batch.batchNo || "N/A"
      };
  });

  if (history.length === 0) {
    return (
      <div className="text-center py-8 rounded-2xl border-2 border-dashed border-gray-100 bg-gray-50/50">
        <Package className="h-10 w-10 mx-auto text-gray-300 mb-3" />
        <p className="text-sm font-bold text-gray-500">No supplier purchase history found.</p>
        <p className="text-xs text-gray-400 mt-1 uppercase font-black tracking-widest">Buy this item to add history</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full text-left text-sm min-w-[500px]">
        <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[9px] font-black text-gray-400 tracking-wider">
          <tr>
            <th className="px-3 py-2.5">Supplier</th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5 text-right">Qty</th>
            <th className="px-3 py-2.5 text-right">Price</th>
            <th className="px-3 py-2.5 text-right">Discount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {history.map((record) => (
            <tr key={record.key} className="hover:bg-purple-50/30 transition-colors">
              {/* Supplier */}
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 shrink-0 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Package className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-bold text-gray-800 text-xs truncate max-w-[100px]">
                    {record.supplierName}
                  </span>
                </div>
              </td>

              {/* Date */}
              <td className="px-3 py-2.5 text-[11px] text-gray-500 font-semibold whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-gray-300" />
                  {record.date}
                </div>
                <div className="text-[9px] text-gray-300 font-bold mt-0.5">BATCH: {record.batchNo}</div>
              </td>

              {/* Quantity */}
              <td className="px-3 py-2.5 text-right">
                <span className="text-xs font-black text-gray-700">{Math.round(record.quantity)}</span>
                <span className="text-[9px] text-gray-400 ml-0.5">boxes</span>
              </td>

              {/* Price Paid */}
              <td className="px-3 py-2.5 text-right">
                <div className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg">
                  <TrendingDown className="h-3 w-3" />
                  <span className="text-[11px] font-black">
                    {record.pricePaid > 0 ? `Rs.${Number(record.pricePaid).toFixed(0)}` : "—"}
                  </span>
                </div>
              </td>

              {/* Discount */}
              <td className="px-3 py-2.5 text-right">
                {record.discount > 0 ? (
                  <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-lg">
                    <Percent className="h-3 w-3" />
                    <span className="text-[11px] font-black">{record.discount}%</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300 font-bold">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
