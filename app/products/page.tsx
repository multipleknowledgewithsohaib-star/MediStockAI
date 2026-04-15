"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Edit2,
    Trash2,
    Eye,
    Pill,
    AlertCircle,
    Loader2,
    X,
    Package,
    ScanLine,
    Clock,
    Clipboard,
    Calendar
} from "lucide-react";
import { isPlaceholderProductRecord, useData } from "@/lib/hooks";
import { storage } from "@/lib/storage";
import BatchManagement from "@/components/expiry/BatchManagement";
import ExpiryScanner from "@/components/expiry/ExpiryScanner";
import {
    getExpiryStatus,
    getExpiryBadgeClass,
    getDaysUntilExpiry,
    formatExpiryDate
} from "@/lib/expiryTracking";
import LinkedSuppliersTable from "@/components/products/LinkedSuppliersTable";
import ProductAliasManager from "@/components/products/ProductAliasManager";

export default function ProductsPage() {
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [showAddModal, setShowAddModal] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [prefilledData, setPrefilledData] = useState<any>(null);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    const { data: initialProducts, loading, error, refetch } = useData<any[]>("/api/products");
    const [localProducts, setLocalProducts] = useState<any[]>([]);

    // Initialize local products from hook
    useEffect(() => {
        if (initialProducts) {
            setLocalProducts(initialProducts);
        }
    }, [initialProducts]);

    // Prevent SSR/client hydration mismatch from localStorage reads
    useEffect(() => { setMounted(true); }, []);

    useEffect(() => {
        if (!mounted) return;

        const storedProducts = storage.get('products', []);
        const placeholderProducts = storedProducts.filter((product: any) => isPlaceholderProductRecord(product));

        if (placeholderProducts.length === 0) {
            return;
        }

        const placeholderIds = new Set(placeholderProducts.map((product: any) => String(product?.id)));
        const cleanedProducts = storedProducts.filter((product: any) => !isPlaceholderProductRecord(product));
        const cleanedBatches = storage.get('batches', []).filter((batch: any) => !placeholderIds.has(String(batch?.productId)));

        storage.set('products', cleanedProducts);
        storage.set('batches', cleanedBatches);
        setLocalProducts(prev => prev.filter((product: any) => !isPlaceholderProductRecord(product)));
    }, [mounted]);

    const categories = ["All", "Pain Relief", "Antibiotics", "Diabetes", "Cardiology", "Vitamins", "Syrup", "Injection", "Sachet", "Others"];
    const normalizedSearchTerm = searchTerm.toLowerCase();

    const filteredProducts = (localProducts || []).filter((p: any) => {
        const productName = String(p?.name || "");
        const productBrand = String(p?.brand || "");
        const productCategory = String(p?.category || "Others");
        const matchesSearch = productName.toLowerCase().includes(normalizedSearchTerm) ||
            productBrand.toLowerCase().includes(normalizedSearchTerm);
        const matchesCategory = selectedCategory === "All" || productCategory === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleSelectProduct = (productId: string | number) => {
        const normalizedId = String(productId);
        setSelectedProductIds(prev => 
            prev.includes(normalizedId) ? prev.filter(id => id !== normalizedId) : [...prev, normalizedId]
        );
    };

    const handleSelectAll = () => {
        if (selectedProductIds.length === filteredProducts.length) {
            setSelectedProductIds([]); // Deselect all
        } else {
            setSelectedProductIds(filteredProducts.map((p: any) => String(p.id))); // Select all filtered
        }
    };

    const handleBulkDelete = async () => {
        if (selectedProductIds.length === 0) return;
        if (confirm(`Are you sure you want to delete ${selectedProductIds.length} products? This action cannot be undone.`)) {
            try {
                const res = await fetch('/api/products/bulk', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: selectedProductIds })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to bulk delete");
                }

                // Clean up legacy local storage
                const currentProducts = storage.get('products', []);
                const currentBatches = storage.get('batches', []);
                storage.set('products', currentProducts.filter((p: any) => !selectedProductIds.includes(String(p.id))));
                storage.set('batches', currentBatches.filter((b: any) => !selectedProductIds.includes(String(b.productId))));

                // Update local state
                setLocalProducts(prev => prev.filter(p => !selectedProductIds.includes(String(p.id))));
                setSelectedProductIds([]);
                
                alert("Products correctly removed from the database.");
            } catch (err: any) {
                console.error("Bulk delete failed:", err);
                alert("Could not bulk delete products: " + err.message);
            }
        }
    };

    const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        setIsSubmitting(true);

        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        const strips = parseInt(productData.stripsPerBox as string, 10) || 1;
        const tabs = parseInt(productData.tabletsPerStrip as string, 10) || 1;
        const unitsPerPack = strips * tabs;
        const quantity = parseInt(productData.quantity as string, 10) || 0;
        const salePrice = parseFloat(productData.salePrice as string) || 0;
        const discountPercent = Math.min(100, Math.max(0, parseFloat(productData.discountPercent as string) || 0));
        const isDiscountActive = Boolean(productData.isDiscountActive) && discountPercent > 0;

        const saveProduct = async () => {
            const currentProducts = storage.get('products', []);

            if (editingProduct) {
                const response = await fetch(`/api/products/${editingProduct.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_code: productData.item_code,
                        name: productData.name,
                        brand: productData.brand,
                        category: productData.category,
                        salePrice,
                        discountPercent,
                        isDiscountActive,
                        stripsPerBox: strips,
                        tabletsPerStrip: tabs,
                        unitsPerPack
                    })
                });

                const responseBody = await response.json();
                if (!response.ok) {
                    throw new Error(responseBody?.error || "Failed to update product");
                }

                const updatedSnapshot = {
                    ...editingProduct,
                    ...responseBody,
                    stripsPerBox: strips,
                    tabletsPerStrip: tabs,
                    unitsPerPack,
                    salePrice,
                    discountPercent,
                    isDiscountActive
                };

                const updatedProducts = currentProducts.map((p: any) =>
                    String(p.id) === String(editingProduct.id) ? updatedSnapshot : p
                );
                storage.set('products', updatedProducts);
                setLocalProducts(prev =>
                    prev.map((product: any) => String(product.id) === String(editingProduct.id) ? updatedSnapshot : product)
                );
                alert("Product information updated successfully!");
            } else {
                const activeBranch = storage.get('activeBranch', null);
                const branchId = activeBranch?.id;

                const response = await fetch('/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        item_code: productData.item_code,
                        name: productData.name,
                        brand: productData.brand,
                        category: productData.category,
                        purchasePrice: 0,
                        salePrice,
                        stock: quantity,
                        stripsPerBox: strips,
                        tabletsPerStrip: tabs,
                        unitsPerPack,
                        discountPercent,
                        isDiscountActive
                    })
                });

                const responseBody = await response.json();
                if (!response.ok) {
                    throw new Error(responseBody?.error || "Failed to save product");
                }

                const newProduct = {
                    ...responseBody,
                    item_code: productData.item_code,
                    name: productData.name,
                    brand: productData.brand,
                    category: productData.category,
                    stripsPerBox: strips,
                    tabletsPerStrip: tabs,
                    unitsPerPack,
                    stock: quantity,
                    salePrice,
                    discountPercent,
                    isDiscountActive,
                    createdAt: responseBody?.createdAt || new Date().toISOString(),
                    batches: [
                        {
                            id: Math.random().toString(36).substr(2, 9),
                            batchNo: productData.batchNo,
                            mfgDate: productData.mfgDate,
                            expiryDate: productData.expiryDate,
                            quantity,
                            branchId: branchId,
                            createdAt: new Date().toISOString()
                        }
                    ]
                };

                storage.set('products', [
                    newProduct,
                    ...currentProducts.filter((product: any) =>
                        String(product.id) !== String(newProduct.id) &&
                        String(product.item_code || "").toLowerCase() !== String(newProduct.item_code || "").toLowerCase()
                    )
                ]);
                setLocalProducts(prev => [
                    newProduct,
                    ...prev.filter((product: any) =>
                        String(product.id) !== String(newProduct.id) &&
                        String(product.item_code || "").toLowerCase() !== String(newProduct.item_code || "").toLowerCase()
                    )
                ]);
                
                const currentBatches = storage.get('batches', []);
                const newBatch = {
                    productId: newProduct.id,
                    ...newProduct.batches[0]
                };
                storage.set('batches', [newBatch, ...currentBatches]);
                
                alert(responseBody?.reusedExisting ? "Existing product reused successfully!" : "Product successfully added to inventory!");
                window.dispatchEvent(new Event('jailwatch_storage_change'));
            }

            await refetch();
            setShowAddModal(false);
            setEditingProduct(null);
            setPrefilledData(null);
            setIsSubmitting(false);
        };

        saveProduct().catch((err: any) => {
            console.error("Product save failed:", err);
            alert("Could not save product: " + (err?.message || "Unknown error"));
            setIsSubmitting(false);
        });

    };

    const handleBatchAdd = (newBatch: any) => {
        console.log("Adding batch:", newBatch);
        alert("Batch added successfully!");
        // Logic to update state/refresh products would go here
    };

    const handleBatchUpdate = (batchId: any, updates: any) => {
        console.log("Updating batch:", batchId, updates);
        alert("Batch updated!");
    };

    const handleBatchDelete = (batchId: any) => {
        console.log("Deleting batch:", batchId);
        alert("Batch deleted!");
    };

    const handleDeleteProduct = async (productId: string | number) => {
        if (confirm("Are you sure you want to delete this product? This will also remove all its batch records from the database.")) {
            try {
                const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || "Failed to delete from database");
                }

                // Clean up legacy local storage
                const currentProducts = storage.get('products', []);
                const currentBatches = storage.get('batches', []);
                storage.set('products', currentProducts.filter((p: any) => String(p.id) !== String(productId)));
                storage.set('batches', currentBatches.filter((b: any) => String(b.productId) !== String(productId)));

                // Update local state
                setLocalProducts(prev => prev.filter(p => String(p.id) !== String(productId)));
                
                alert("Product correctly removed from the database.");
            } catch (err: any) {
                console.error("Delete failed:", err);
                alert("Could not delete product: " + err.message);
            }
        }
    };

    if (loading) return (
        <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-10 w-10 text-purple-600 animate-spin" />
        </div>
    );

    return (
        <>
            <div className="flex flex-col gap-8 animate-fade-in-up">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        <h1 className="text-3xl font-black text-white uppercase tracking-tight">MediStock Inventory</h1>
                        <p className="text-white/70 mt-1 font-medium italic">Manage MediStock products and stock levels.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowScanner(true)}
                            className="btn-secondary flex items-center gap-2"
                        >
                            <ScanLine className="h-4 w-4" />
                            Scan Expiry
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add New Product
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, brand or salt..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-12 pr-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat
                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                    : "bg-white text-gray-600 border border-gray-200 hover:border-purple-500"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Bulk Select Control Bar (Visible when some products exist) */}
                {filteredProducts.length > 0 && (
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100 shadow-sm px-5 pb-3">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedProductIds.length === filteredProducts.length && filteredProducts.length > 0}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer shadow-sm"
                                id="select-all-top"
                            />
                            <label htmlFor="select-all-top" className="text-sm font-bold text-gray-700 cursor-pointer uppercase tracking-tight">
                                Select All {filteredProducts.length} Products
                            </label>
                        </div>
                        {selectedProductIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="text-xs font-black text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-red-500/20"
                            >
                                <Trash2 className="h-4 w-4" /> Delete Selected ({selectedProductIds.length})
                            </button>
                        )}
                    </div>
                )}

                {/* Products Grid */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {filteredProducts.map((product: any) => {
                                    const nextBatch = product.batches?.[0]; 
                                    const status = nextBatch ? getExpiryStatus(nextBatch.expiryDate) : 'safe';
                                    const badgeClass = getExpiryBadgeClass(status);

                                    return (
                                        <div key={product.id} className={`card-premium rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform relative ${selectedProductIds.includes(String(product.id)) ? 'ring-2 ring-purple-500 bg-purple-50/30' : ''}`}>
                                            <div className="absolute top-5 left-5 z-20">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedProductIds.includes(String(product.id))}
                                                    onChange={() => handleSelectProduct(product.id)}
                                                    className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-gray-300 cursor-pointer shadow-md bg-white border-2"
                                                />
                                            </div>
                                            {status !== 'safe' && (
                                                <div className={`absolute top-0 right-0 px-3 py-1 text-[10px] font-black uppercase rounded-bl-xl ${status === 'expired' || status === 'critical' ? 'bg-red-500 text-white' :
                                                    status === 'warning' ? 'bg-orange-500 text-white' :
                                                        'bg-yellow-500 text-gray-900'
                                                    }`}>
                                                    {status === 'expired' ? 'Expired' :
                                                        status === 'critical' ? 'Critical Alert' :
                                                            status === 'warning' ? 'Warning Alert' :
                                                                'Early Alert'}
                                                </div>
                                            )}

                                            <div className="p-6">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center ml-8">
                                                        <Pill className="h-6 w-6 text-purple-600" />
                                                    </div>
                                                    <div className="flex gap-1 relative z-20">
                                                        <button
                                                            onClick={() => {
                                                                setEditingProduct(product);
                                                                setShowAddModal(true);
                                                            }}
                                                            className="p-2 hover:bg-purple-50 hover:text-purple-600 rounded-lg text-gray-400 transition-colors"
                                                            title="Edit Product"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedProduct(product)}
                                                            className="p-2 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"
                                                            title="View Details"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteProduct(product.id)}
                                                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 transition-colors"
                                                            title="Delete Product"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <h3 className="font-bold text-gray-900 text-lg lg:text-base group-hover:text-purple-600 transition-colors truncate">
                                                    {product.name || "Unnamed Product"}
                                                    {product.item_code && <span className="ml-2 text-[10px] text-gray-400 font-black uppercase">[{product.item_code}]</span>}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-4">{product.brand || "No brand"}</p>

                                                <div className="grid grid-cols-2 gap-4 mb-4">
                                                <div className="p-3 rounded-xl bg-purple-50">
                                                    <p className="text-[10px] text-purple-500 uppercase font-black">Box Price</p>
                                                    <p className="text-lg font-black text-purple-600">PKR {Number(product.salePrice).toFixed(2)}</p>
                                                </div>
                                                <div className="p-3 rounded-xl bg-blue-50">
                                                    <p className="text-[10px] text-blue-500 uppercase font-black">
                                                        Stock ({mounted && storage.get('activeBranch')?.id === 'all' ? 'Global' : 'Branch'})
                                                    </p>
                                                    <p className={`text-lg font-black ${product.stock < 10 ? 'text-red-500' : 'text-blue-600'}`}>{product.stock}</p>
                                                </div>
                                                </div>

                                                <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Discount</p>
                                                        <p className="text-xs font-bold text-emerald-800">
                                                            {product.isDiscountActive && Number(product.discountPercent) > 0
                                                                ? `${Number(product.discountPercent).toFixed(2)}% active`
                                                                : "No active product discount"}
                                                        </p>
                                                    </div>
                                                    <span className={`badge ${product.isDiscountActive && Number(product.discountPercent) > 0 ? 'badge-success' : 'badge-info'}`}>
                                                        {product.isDiscountActive && Number(product.discountPercent) > 0
                                                            ? `-${Number(product.discountPercent).toFixed(0)}%`
                                                            : 'OFF'}
                                                    </span>
                                                </div>

                                                <div className="flex flex-col gap-1 pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            <span className="text-[10px] font-bold text-gray-500 uppercase">
                                                                MFG: {nextBatch?.mfgDate ? formatExpiryDate(nextBatch.mfgDate) : 'N/A'}
                                                            </span>
                                                        </div>
                                                        <span className="badge badge-info text-[9px]">{product.category}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className={`h-3.5 w-3.5 ${status === 'expired' || status === 'critical' ? 'text-red-500' :
                                                            status === 'warning' ? 'text-orange-500' :
                                                                status === 'early' ? 'text-yellow-600' :
                                                                    'text-gray-400'
                                                            }`} />
                                                        <span className={`text-[10px] font-bold uppercase ${status === 'expired' || status === 'critical' ? 'text-red-500' :
                                                status === 'warning' ? 'text-orange-500' :
                                                    status === 'early' ? 'text-yellow-600' :
                                                        'text-gray-700'
                                                }`}>
                                                EXP: {nextBatch ? formatExpiryDate(nextBatch.expiryDate) : 'No Expiry'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-xl font-bold text-gray-900">No products found</h3>
                        <p className="text-gray-500">Try adjusting your search or add a new medicine.</p>
                        <button onClick={() => setShowAddModal(true)} className="mt-6 btn-primary inline-flex items-center gap-2">
                            <Plus className="h-4 w-4" /> Add First Product
                        </button>
                    </div>
                )}
            </div>

            <Modals
                showAddModal={showAddModal}
                setShowAddModal={(val: boolean) => {
                    setShowAddModal(val);
                    if (!val) {
                        setPrefilledData(null);
                        setEditingProduct(null);
                    }
                }}
                handleAddProduct={handleAddProduct}
                isSubmitting={isSubmitting}
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                editingProduct={editingProduct}
                categories={categories}
                handleBatchAdd={handleBatchAdd}
                handleBatchUpdate={handleBatchUpdate}
                handleBatchDelete={handleBatchDelete}
                setShowScanner={setShowScanner}
                prefilledData={prefilledData}
                refetch={refetch}
                mounted={mounted}
            />

            {showScanner && (
                <ExpiryScanner
                    onClose={() => setShowScanner(false)}
                    onScanComplete={(data) => {
                        console.log("Scanned:", data);
                        if (Array.isArray(data)) {
                            // Automatically pre-fill the first medicine found
                            setPrefilledData(data[0]);
                        } else {
                            setPrefilledData(data);
                        }
                        setShowAddModal(true);
                        setShowScanner(false);
                    }}
                />
            )}
        </>
    );
}

function Modals({
    showAddModal,
    setShowAddModal,
    handleAddProduct,
    isSubmitting,
    selectedProduct,
    setSelectedProduct,
    categories,
    handleBatchAdd,
    handleBatchUpdate,
    handleBatchDelete,
    setShowScanner,
    prefilledData,
    editingProduct,
    refetch,
    mounted
}: any) {
    const [selectedCat, setSelectedCat] = useState(editingProduct?.category || categories.filter((c: string) => c !== "All")[0]);

    // Update selected category when prefilled data or editing product changes
    useEffect(() => {
        if (editingProduct?.category) {
            setSelectedCat(editingProduct.category);
        } else if (prefilledData?.category) {
            setSelectedCat(prefilledData.category);
        }
    }, [editingProduct, prefilledData]);

    const getUnitsLabel = (cat: string) => {
        switch (cat) {
            case "Syrup": return "Bottles per Box";
            case "Injection": return "Vials per Box";
            case "Sachet": return "Sachets per Box";
            default: return "Tablets per Box";
        }
    };

    return (
        <>
            {/* Add Product Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in-up shadow-2xl relative">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">{editingProduct ? "Update Product" : "Add New Product"}</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct} className="p-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="col-span-2">
                                        <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-4">Basic Information</h3>
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Item Code</label>
                                        <input name="item_code" required type="text" defaultValue={editingProduct?.item_code || prefilledData?.item_code || ""} placeholder="e.g. ITEM001" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Medicine Name</label>
                                        <input name="name" required type="text" defaultValue={editingProduct?.name || prefilledData?.productName || ""} placeholder="e.g. Panadol" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Manufacturer/Brand</label>
                                        <input name="brand" required type="text" defaultValue={editingProduct?.brand || prefilledData?.brand || ""} placeholder="e.g. GSK" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Category</label>
                                        <select
                                            name="category"
                                            value={selectedCat}
                                            onChange={(e) => setSelectedCat(e.target.value)}
                                            className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20"
                                        >
                                            {categories.filter((c: string) => c !== "All").map((c: string) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Strips per Box</label>
                                            <input name="stripsPerBox" type="number" defaultValue={editingProduct?.stripsPerBox || 1} min={1} className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Tablets per Strip</label>
                                            <input name="tabletsPerStrip" type="number" defaultValue={editingProduct?.tabletsPerStrip || 1} min={1} className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                        </div>
                                    </div>
                                </div>
                                {!editingProduct && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest">Initial Stock & Expiry</h3>
                                            <button
                                                type="button"
                                                onClick={() => setShowScanner(true)}
                                                className="text-[10px] font-black text-purple-600 uppercase flex items-center gap-1 border border-purple-200 px-2 py-1 rounded-lg hover:bg-purple-50 transition-all"
                                            >
                                                <ScanLine className="h-3 w-3" /> AI Scan
                                            </button>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Batch Number</label>
                                            <input name="batchNo" required type="text" defaultValue={prefilledData?.batchNo || ""} placeholder="e.g. B12345" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">MFG Date</label>
                                                <input name="mfgDate" required type="date" defaultValue={prefilledData?.mfgDate || ""} className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                            </div>
                                            <div>
                                                <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Expiry Date</label>
                                                <input name="expiryDate" required type="date" defaultValue={prefilledData?.expiryDate || ""} className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Initial Qty (Boxes)</label>
                                            <input name="quantity" required type="number" placeholder="Boxes" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                        </div>
                                        <div className="pt-2">
                                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                                                <ScanLine className="h-5 w-5 text-purple-600" />
                                                <div>
                                                    <p className="text-[10px] font-black text-purple-600 uppercase">Pro Tip</p>
                                                    <p className="text-[11px] text-purple-800">Use "Scan Expiry" to capture data instantly from images.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {editingProduct && (
                                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                                        <Package className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase">Information</p>
                                            <p className="text-[11px] text-blue-800">Editing basic details. Manage individual batches in the "Details" section.</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Box Sale Price</label>
                                    <input name="salePrice" required type="number" step="0.01" defaultValue={editingProduct?.salePrice || prefilledData?.salePrice || ""} placeholder="PKR" className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-tighter">Discount Percent</label>
                                    <input
                                        name="discountPercent"
                                        type="number"
                                        step="0.01"
                                        min={0}
                                        max={100}
                                        defaultValue={editingProduct?.discountPercent || 0}
                                        placeholder="0"
                                        className="w-full mt-1 h-11 rounded-xl border-gray-200 bg-gray-50 px-4 text-sm focus:ring-2 focus:ring-purple-500/20"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                                        <div>
                                            <p className="text-xs font-black text-gray-700 uppercase tracking-tighter">Active Discount</p>
                                            <p className="text-[11px] text-gray-500">POS sirf is saved percentage ko rupees me convert karega.</p>
                                        </div>
                                        <input
                                            name="isDiscountActive"
                                            type="checkbox"
                                            value="true"
                                            defaultChecked={Boolean(editingProduct?.isDiscountActive)}
                                            className="h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="flex gap-4 mt-10">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 rounded-2xl border border-gray-200 bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-all">Cancel</button>
                                <button disabled={isSubmitting} type="submit" className="flex-1 py-4 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest shadow-xl shadow-purple-500/30 hover:bg-purple-700 hover:scale-[1.02] transition-all disabled:opacity-50">
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : (editingProduct ? "Save Changes" : "Register Product")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Product Details & Batch Management Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up shadow-2xl relative">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-900">Inventory Details</h2>
                            <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-8">
                            <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-gray-100">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-xl shadow-purple-200">
                                    <Package className="h-12 w-12 text-white" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h2 className="text-3xl font-black text-gray-900 uppercase">{selectedProduct.name}</h2>
                                    <p className="text-gray-500 font-bold text-lg mb-3">{selectedProduct.brand}</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <span className="badge badge-info">{selectedProduct.category}</span>
                                        <span className={`badge ${selectedProduct.stock > 10 ? 'badge-success' : 'badge-danger'}`}>
                                            {selectedProduct.stock} Boxes In {mounted ? storage.get('activeBranch', { name: "Stock" }).name : "Stock"}
                                        </span>
                                        <span className="badge bg-purple-100 text-purple-700 font-bold border border-purple-200">
                                            {selectedProduct.unitsPerPack > 1 ? `Box: PKR ${Number(selectedProduct.salePrice).toFixed(2)}` : `Unit: PKR ${Number(selectedProduct.salePrice).toFixed(2)}`}
                                        </span>
                                        <span className={`badge ${selectedProduct.isDiscountActive && Number(selectedProduct.discountPercent) > 0 ? 'badge-success' : 'badge-info'}`}>
                                            {selectedProduct.isDiscountActive && Number(selectedProduct.discountPercent) > 0
                                                ? `Discount ${Number(selectedProduct.discountPercent).toFixed(2)}%`
                                                : 'Discount Off'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <BatchManagement
                                batches={selectedProduct.batches || []}
                                productName={selectedProduct.name}
                                onBatchAdd={handleBatchAdd}
                                onBatchUpdate={handleBatchUpdate}
                                onBatchDelete={handleBatchDelete}
                            />

                            <div className="mt-12 grid md:grid-cols-2 gap-12 pt-12 border-t border-gray-100">
                                <div>
                                    <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-6">Linked Suppliers & Pricing</h3>
                                    <LinkedSuppliersTable 
                                        suppliers={selectedProduct.productSuppliers || []} 
                                        batches={selectedProduct.batches || []} 
                                    />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-6">Matching & Recognition</h3>
                                    <ProductAliasManager 
                                        productId={selectedProduct.id} 
                                        aliases={selectedProduct.aliases || []} 
                                        onAliasAdded={(newAlias) => {
                                            setSelectedProduct({
                                                ...selectedProduct,
                                                aliases: [...(selectedProduct.aliases || []), newAlias]
                                            });
                                            refetch(); // Refresh list to keep consistency
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
