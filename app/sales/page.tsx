"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Loader2, Pill, Printer, Search, ShoppingCart, Trash2, WifiOff } from "lucide-react";
import { useData } from "@/lib/hooks";
import { printInvoice } from "@/lib/print";
import { storage } from "@/lib/storage";

type ProductRecord = {
    id: number;
    name: string;
    salePrice: number;
    stock: number;
    unitsPerPack: number;
    discountPercent: number;
    isDiscountActive: boolean;
    pricingSnapshotId: number | null;
    batches?: Array<{ id: number; batchNo: string }>;
};

type CartItem = {
    productId: number;
    name: string;
    quantity: number;
    rateAtSaleTime: number;
    discountPercentAtSaleTime: number;
    unitDiscountAmount: number;
    unitsPerPack: number;
    batchId?: number;
    batch: string;
    pricingSnapshotId: number | null;
};

type PendingSale = {
    localId: string;
    invoiceNo: string;
    branchId: number | null;
    paidAmount: number;
    items: Array<{
        productId: number;
        batchId?: number;
        quantity: number;
        pricingSnapshotId: number | null;
    }>;
};

type SaleRecord = {
    id: number | string;
    invoiceNo: string;
    date: string;
    total: number;
    items?: Array<unknown>;
    pendingSync?: boolean;
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

const getLineDiscount = (item: CartItem) => roundCurrency(item.unitDiscountAmount * item.quantity);
const getLineTotal = (item: CartItem) => roundCurrency((item.rateAtSaleTime * item.quantity) - getLineDiscount(item));

export default function SalesPage() {
    const { data: session } = useSession();
    const [searchTerm, setSearchTerm] = useState("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cashPaid, setCashPaid] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncingPending, setIsSyncingPending] = useState(false);

    const { data: products, loading: productsLoading, refetch: refetchProducts } = useData<ProductRecord[]>("/api/products");
    const { data: salesHistory, refetch: refetchSales } = useData<SaleRecord[]>("/api/sales");

    useEffect(() => {
        let cancelled = false;

        const syncPendingSales = async () => {
            if (cancelled || typeof window === "undefined" || !window.navigator.onLine) {
                return;
            }

            const pendingSales = storage.get("pendingSales", []) as PendingSale[];
            if (pendingSales.length === 0) {
                return;
            }

            setIsSyncingPending(true);
            const remainingSales: PendingSale[] = [];

            for (const pendingSale of pendingSales) {
                try {
                    const response = await fetch("/api/sales", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(pendingSale),
                    });

                    if (!response.ok) {
                        remainingSales.push(pendingSale);
                        continue;
                    }

                    const cachedSales = storage.get("sales", []) as Array<{ id: string }>;
                    storage.setSilently("sales", cachedSales.filter((sale) => sale.id !== pendingSale.localId));
                } catch {
                    remainingSales.push(pendingSale);
                }
            }

            storage.setSilently("pendingSales", remainingSales);
            window.dispatchEvent(new Event("jailwatch_storage_change"));
            await Promise.all([refetchProducts(), refetchSales()]);

            if (!cancelled) {
                setIsSyncingPending(false);
            }
        };

        syncPendingSales();
        window.addEventListener("online", syncPendingSales);

        return () => {
            cancelled = true;
            window.removeEventListener("online", syncPendingSales);
        };
    }, [refetchProducts, refetchSales]);

    const filteredProducts = useMemo(
        () => (products || []).filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())),
        [products, searchTerm]
    );

    const subtotal = roundCurrency(cart.reduce((sum, item) => sum + (item.rateAtSaleTime * item.quantity), 0));
    const totalDiscount = roundCurrency(cart.reduce((sum, item) => sum + getLineDiscount(item), 0));
    const total = roundCurrency(cart.reduce((sum, item) => sum + getLineTotal(item), 0));
    const change = cashPaid > total ? roundCurrency(cashPaid - total) : 0;

    const addToCart = (product: ProductRecord) => {
        const unitsPerPack = Math.max(1, Number(product.unitsPerPack) || 1);
        const rateAtSaleTime = roundCurrency(Number(product.salePrice) / unitsPerPack);
        const discountPercentAtSaleTime = product.isDiscountActive ? Number(product.discountPercent) || 0 : 0;
        const unitDiscountAmount = roundCurrency((rateAtSaleTime * discountPercentAtSaleTime) / 100);

        setCart((previousCart) => {
            const existingItem = previousCart.find((item) => item.productId === product.id);
            if (existingItem) {
                return previousCart.map((item) =>
                    item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }

            return [
                ...previousCart,
                {
                    productId: product.id,
                    name: product.name,
                    quantity: 1,
                    rateAtSaleTime,
                    discountPercentAtSaleTime,
                    unitDiscountAmount,
                    unitsPerPack,
                    batchId: product.batches?.[0]?.id,
                    batch: product.batches?.[0]?.batchNo || "N/A",
                    pricingSnapshotId: product.pricingSnapshotId,
                },
            ];
        });
    };

    const updateQuantity = (productId: number, quantity: number) => {
        const safeQuantity = Math.max(0, quantity);
        setCart((previousCart) =>
            safeQuantity === 0
                ? previousCart.filter((item) => item.productId !== productId)
                : previousCart.map((item) => item.productId === productId ? { ...item, quantity: safeQuantity } : item)
        );
    };

    const completeSale = async () => {
        if (cart.length === 0 || isSubmitting) return;

        setIsSubmitting(true);

        const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
        const activeBranch = storage.get("activeBranch", null);
        const branchId = activeBranch?.id && activeBranch.id !== "all" ? Number(activeBranch.id) : null;

        const payload = {
            invoiceNo,
            branchId,
            paidAmount: cashPaid,
            items: cart.map((item) => ({
                productId: item.productId,
                batchId: item.batchId,
                quantity: item.quantity,
                pricingSnapshotId: item.pricingSnapshotId,
            })),
        };

        const printableItems = cart.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            rateAtSaleTime: item.rateAtSaleTime,
            discountAmountAtSaleTime: getLineDiscount(item),
            netAmount: getLineTotal(item),
        }));

        const finishClientSide = async (saleId: string | number) => {
            printInvoice({
                id: saleId,
                invoiceNo,
                total,
                discount: totalDiscount,
                paidAmount: cashPaid,
                changeAmount: change,
                items: printableItems,
            }, session?.user?.name || "POS User");

            setCart([]);
            setCashPaid(0);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2500);
            await Promise.all([refetchProducts(), refetchSales()]);
        };

        try {
            if (typeof window !== "undefined" && !window.navigator.onLine) {
                throw new Error("OFFLINE_MODE");
            }

            const response = await fetch("/api/sales", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const responseBody = await response.json();

            if (!response.ok) {
                throw new Error(responseBody?.error || "Failed to complete sale.");
            }

            await finishClientSide(responseBody.id);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Failed to complete sale.";

            if (message === "OFFLINE_MODE" || message.toLowerCase().includes("failed to fetch")) {
                const localId = `offline-${Date.now()}`;
                const cachedSale = {
                    id: localId,
                    invoiceNo,
                    date: new Date().toISOString(),
                    total,
                    items: printableItems,
                    pendingSync: true,
                };

                const pendingSales = storage.get("pendingSales", []) as PendingSale[];
                storage.set("sales", [cachedSale, ...storage.get("sales", [])]);
                storage.set("pendingSales", [{ localId, invoiceNo, branchId, paidAmount: cashPaid, items: payload.items }, ...pendingSales]);

                await finishClientSide(localId);
            } else {
                alert(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-8 animate-fade-in-up">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white uppercase">Point of Sale</h1>
                        <p className="text-white/70 mt-1 italic">Discounts are auto-calculated from the admin-defined product percentage.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isSyncingPending && (
                            <span className="inline-flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-700">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Syncing Offline Sales
                            </span>
                        )}
                        <span className="text-sm text-gray-500">Grand Total: <strong className="text-green-600">PKR {total.toLocaleString()}</strong></span>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search medicine to add..."
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="h-14 w-full rounded-2xl border border-gray-200 bg-white pl-12 pr-4 text-base focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"
                            />
                        </div>

                        {productsLoading ? (
                            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 text-purple-600 animate-spin" /></div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredProducts.map((product) => {
                                    const rate = roundCurrency(Number(product.salePrice) / Math.max(1, product.unitsPerPack || 1));
                                    const discountAmount = product.isDiscountActive ? roundCurrency((rate * (Number(product.discountPercent) || 0)) / 100) : 0;

                                    return (
                                        <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0} className={`card-premium rounded-2xl p-4 text-left hover:scale-[1.02] transition-transform ${product.stock <= 0 ? "opacity-60 cursor-not-allowed" : ""}`}>
                                            <div className="mb-3 flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-100 to-blue-100"><Pill className="h-5 w-5 text-purple-600" /></div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="rounded-xl bg-purple-50 p-3">
                                                    <p className="text-[10px] font-black uppercase text-purple-500">Rate</p>
                                                    <p className="text-base font-black text-purple-700">PKR {rate.toFixed(2)}</p>
                                                </div>
                                                <div className="rounded-xl bg-emerald-50 p-3">
                                                    <p className="text-[10px] font-black uppercase text-emerald-500">Discount</p>
                                                    <p className="text-base font-black text-emerald-700">PKR {discountAmount.toFixed(2)}</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="card-premium rounded-2xl p-6">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Sales</h3>
                            <div className="space-y-3">
                                {(salesHistory || []).slice(0, 5).map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between rounded-xl bg-gray-50/80 p-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${sale.pendingSync ? "bg-amber-100" : "bg-green-100"}`}>
                                                {sale.pendingSync ? <WifiOff className="h-5 w-5 text-amber-600" /> : <Check className="h-5 w-5 text-green-600" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{sale.invoiceNo}</p>
                                                <p className="text-xs text-gray-500">{new Date(sale.date).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-gray-900">PKR {sale.total.toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">{sale.pendingSync ? "Pending Sync" : `${sale.items?.length || 0} items`}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card-premium sticky top-24 h-fit rounded-2xl p-6">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Current Bill</h3>
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="h-5 w-5 text-purple-600" />
                                <span className="badge badge-info">{cart.length} items</span>
                            </div>
                        </div>

                        {cart.length === 0 ? (
                            <div className="py-12 text-center">
                                <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                                <p className="text-gray-500">Cart is empty</p>
                            </div>
                        ) : (
                            <>
                                <div className="mb-6 max-h-[320px] space-y-3 overflow-y-auto">
                                    {cart.map((item) => (
                                        <div key={item.productId} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-bold text-gray-900">{item.name}</p>
                                                    <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Batch: {item.batch}</p>
                                                </div>
                                                <button onClick={() => updateQuantity(item.productId, 0)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-[10px] font-black uppercase">
                                                <div className="rounded-xl bg-purple-50 p-3 text-purple-700">Rate<div className="mt-1 text-sm">PKR {item.rateAtSaleTime.toFixed(2)}</div></div>
                                                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">Discount<div className="mt-1 text-sm">PKR {getLineDiscount(item).toFixed(2)}</div></div>
                                                <div className="rounded-xl bg-blue-50 p-3 text-blue-700">Line Total<div className="mt-1 text-sm">PKR {getLineTotal(item).toFixed(2)}</div></div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Quantity</span>
                                                <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                                                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="px-3 py-2 text-gray-500">-</button>
                                                    <input type="number" min={1} value={item.quantity} onChange={(event) => updateQuantity(item.productId, Number(event.target.value) || 1)} className="w-16 border-x border-gray-200 py-2 text-center text-sm font-black outline-none" />
                                                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="px-3 py-2 text-gray-500">+</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3 border-t border-gray-100 pt-4">
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Gross Total</span><span className="text-gray-900">PKR {subtotal.toLocaleString()}</span></div>
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Discount (Rupees)</span><span className="text-emerald-600">PKR {totalDiscount.toLocaleString()}</span></div>
                                    <div className="flex justify-between border-t border-gray-100 pt-3"><span className="text-lg font-black text-gray-900">Grand Total</span><span className="text-2xl font-black text-purple-600">PKR {total.toLocaleString()}</span></div>

                                    <div className="rounded-2xl bg-gray-50 p-4">
                                        <div className="mb-3 flex items-center justify-between">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-500">Cash Received</label>
                                            <input type="number" value={cashPaid || ""} onChange={(event) => setCashPaid(Number(event.target.value))} className="h-10 w-32 rounded-xl border border-gray-200 px-4 text-right text-base font-black text-green-600" />
                                        </div>
                                        <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400">Change Return</label>
                                            <span className="text-xl font-black text-orange-600">PKR {change.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <button onClick={() => setCart([])} className="flex-1 rounded-xl border border-gray-200 py-3 text-gray-600">Clear</button>
                                    <button onClick={completeSale} disabled={isSubmitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-white">
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                        Complete Sale
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><Check className="h-8 w-8 text-green-600" /></div>
                        <h3 className="mb-2 text-xl font-bold text-gray-900">Sale Complete!</h3>
                        <p className="text-gray-500">Invoice has been generated</p>
                        <p className="mt-4 text-2xl font-bold text-purple-600">PKR {total.toLocaleString()}</p>
                    </div>
                </div>
            )}
        </>
    );
}
