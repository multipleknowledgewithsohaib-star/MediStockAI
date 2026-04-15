// Branches - Initial Setup (ID 1: Main, ID 2: Pharmacy, ID 3: Pharmacy)
export const mockBranches: any[] = [
    { id: 1, name: "Bahadurabad", location: "Main Shop", type: "Main" },
    { id: 2, name: "Gulshan", location: "Pharmacy Area", type: "Pharmacy" },
    { id: 3, name: "Nazimabad", location: "West Block", type: "Pharmacy" }
];

// Products with batches assigned to different branches
export const mockProducts: any[] = [
    {
        id: "p1",
        name: "Panadol Extra",
        brand: "GSK",
        category: "Pain Relief",
        unitsPerPack: 20,
        stock: 120,
        salePrice: 50,
        batches: [
            { id: "b1", batchNo: "BATCH-001", expiryDate: "2025-12-01", quantity: 70, branchId: 1 },
            { id: "b2", batchNo: "BATCH-002", expiryDate: "2026-03-15", quantity: 50, branchId: 1 },
        ]
    },
    {
        id: "p2",
        name: "Augmentin 625mg",
        brand: "GSK",
        category: "Antibiotics",
        unitsPerPack: 6,
        stock: 45,
        salePrice: 340,
        batches: [
            { id: "b3", batchNo: "BATCH-003", expiryDate: "2025-10-15", quantity: 45, branchId: 2 }, // Gulshan
        ]
    },
    {
        id: "p3",
        name: "Brufen Syrup",
        brand: "Abbott",
        category: "Syrup",
        unitsPerPack: 1,
        stock: 80,
        salePrice: 120,
        batches: [
            { id: "b4", batchNo: "BATCH-004", expiryDate: "2026-01-20", quantity: 80, branchId: 1 },
        ]
    }
];

// Sales tagged with branches
export const mockSales: any[] = [
    { 
        id: 101, 
        invoiceNo: "INV-0001", 
        date: new Date().toISOString(), 
        branchId: 1, 
        total: 500, 
        discount: 0, 
        paidAmount: 500, 
        changeAmount: 0, 
        items: [{ productId: "p1", name: "Panadol Extra", quantity: 10, pricePerUnit: 50 }],
        soldBy: "ADMIN CORE"
    },
    { 
        id: 102, 
        invoiceNo: "INV-665544", 
        date: new Date().toISOString(), 
        branchId: 2, 
        total: 340, 
        discount: 0, 
        paidAmount: 340, 
        changeAmount: 0, 
        items: [{ productId: "p2", name: "Augmentin 625mg", quantity: 1, pricePerUnit: 340 }],
        soldBy: "Gulshan Staff"
    }
];

export const mockStats = { todaySales: 0, totalRevenue: 0, lowStock: 0, expiringSoon: 0 };
export const mockDashboardData = { stats: mockStats, recentSales: [], topSellingProducts: [], expiryAlerts: [] };
export const mockSuppliers: any[] = [];
export const mockFinance = { revenue: 0, expenses: 0, profit: 0, transactions: [] };
export const mockPurchases: any[] = [];
export const mockAlerts: any[] = [];

// Helper functions for calculated data are in financialCalculations.ts
