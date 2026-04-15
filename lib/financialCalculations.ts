import { storage } from './storage';
import { isWithinReportWindow } from './reportDates';

const normalizeComparableText = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const saleItemMatchesProduct = (saleItem: any, product: any) => {
    const saleProductId = String(saleItem?.productId ?? "");
    const productId = String(product?.id ?? "");
    if (saleProductId && productId && saleProductId === productId) {
        return true;
    }

    const saleName = normalizeComparableText(saleItem?.name);
    const productName = normalizeComparableText(product?.name);
    if (!saleName || !productName) {
        return false;
    }

    return saleName === productName || saleName.includes(productName) || productName.includes(saleName);
};

export function calculateDashboardStats(branchId?: string | number | null) {
    const allSales = storage.get('sales', []);
    const allProducts = storage.get('products', []);
    const today = new Date().toISOString().split('T')[0];

    // Filter by branch if provided
    const sales = branchId 
        ? allSales.filter((s: any) => s.branchId == branchId)
        : allSales;
    const visibleSales = sales.filter((s: any) => isWithinReportWindow(s.date));
        
    const products = branchId
        ? allProducts.filter((p: any) => p.batches?.some((b: any) => b.branchId == branchId))
        : allProducts;

    const todaySales = visibleSales
        .filter((s: any) => s.date.startsWith(today))
        .reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const totalRevenue = visibleSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);

    const lowStock = products.filter((p: any) => {
        const branchStock = branchId 
            ? (p.batches?.filter((b: any) => b.branchId == branchId).reduce((sum: number, b: any) => sum + b.quantity, 0) || 0)
            : (p.stock || 0);
        return branchStock < 20;
    }).length;

    // Estimate expiring soon based on products with batches
    let expiringSoon = 0;
    const now = new Date();
    products.forEach((p: any) => {
        if (p.batches) {
            const hasExpiring = p.batches.some((b: any) => {
                if (!b.expiryDate) return false;
                const exp = new Date(b.expiryDate);
                const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return diffDays > 0 && diffDays <= 90;
            });
            if (hasExpiring) expiringSoon++;
        }
    });

    return {
        stats: {
            todaySales,
            totalRevenue,
            lowStock,
            expiringSoon
        },
        recentSales: visibleSales.slice(0, 5).map((s: any) => ({
            id: s.id,
            medicine: s.items?.[0]?.name || "Medicine",
            quantity: s.items?.[0]?.quantity || 0,
            amount: s.total,
            time: s.date
        })),
        topSellingProducts: products.map((p: any) => {
            const soldAmt = visibleSales.reduce((sum: number, s: any) => {
                const item = s.items?.find((i: any) => saleItemMatchesProduct(i, p));
                return sum + (item ? item.quantity : 0);
            }, 0);
            const revenue = visibleSales.reduce((sum: number, s: any) => {
                const item = s.items?.find((i: any) => saleItemMatchesProduct(i, p));
                return sum + (item ? (item.pricePerUnit * item.quantity) : 0);
            }, 0);
            return {
                name: p.name,
                sold: soldAmt,
                revenue: revenue,
                stock: p.stock
            };
        }).sort((a: any, b: any) => b.sold - a.sold).slice(0, 5)
    };
}

export function calculateFinanceSummary(branchId?: string | number | null) {
    const allSales = storage.get('sales', []);
    const allPurchases = storage.get('purchases', []);

    const sales = branchId 
        ? allSales.filter((s: any) => s.branchId == branchId)
        : allSales;
    const visibleSales = sales.filter((s: any) => isWithinReportWindow(s.date));

    const purchases = branchId 
        ? allPurchases.filter((p: any) => p.branchId == branchId)
        : allPurchases;
    const visiblePurchases = purchases.filter((p: any) => isWithinReportWindow(p.date));

    const totalRevenue = visibleSales.reduce((sum: number, s: any) => sum + (s.total || 0), 0);
    const totalExpenses = visiblePurchases.reduce((sum: number, p: any) => sum + (p.total || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    const txSales = visibleSales.map((s: any) => {
        const sortDate = new Date(s.date).getTime();
        return {
            id: `s-${s.id}`,
            type: 'income',
            description: `Sale: ${s.invoiceNo}`,
            date: new Date(s.date).toLocaleDateString(),
            amount: s.total,
            sortDate: Number.isFinite(sortDate) ? sortDate : 0
        };
    });

    const txPurchases = visiblePurchases.map((p: any) => {
        const sortDate = new Date(p.date).getTime();
        return {
            id: `p-${p.id}`,
            type: 'expense',
            description: `Purchase: ${p.invoiceNo || p.id}`,
            date: new Date(p.date).toLocaleDateString(),
            amount: p.total,
            sortDate: Number.isFinite(sortDate) ? sortDate : 0
        };
    });

    const recentTransactions = [...txSales, ...txPurchases]
        .sort((a: any, b: any) => (b.sortDate || 0) - (a.sortDate || 0))
        .slice(0, 10)
        .map(({ sortDate, ...tx }: any) => tx);

    // Group sales and purchases by month across all years for the chart
    const aggregator: Record<string, { month: string; monthIndex: number; year: number; sales: number; purchases: number }> = {};

    const addToMonthlyAggregator = (dateValue: any, field: "sales" | "purchases", amount: number) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) {
            return;
        }

        const year = date.getFullYear();
        const monthIndex = date.getMonth();
        const key = `${year}-${monthIndex}`;

        if (!aggregator[key]) {
            aggregator[key] = {
                month: date.toLocaleString('default', { month: 'short' }),
                monthIndex,
                year,
                sales: 0,
                purchases: 0
            };
        }

        aggregator[key][field] += amount || 0;
    };

    visibleSales.forEach((s: any) => addToMonthlyAggregator(s.date, "sales", Number(s.total) || 0));
    visiblePurchases.forEach((p: any) => addToMonthlyAggregator(p.date, "purchases", Number(p.total) || 0));

    const monthlySales = Object.values(aggregator)
        .sort((a, b) => (a.year - b.year) || (a.monthIndex - b.monthIndex))
        .map(({ month, year, sales, purchases }) => ({ month, year, sales, purchases }));

    const products = storage.get('products', []);
    const topProducts = products.map((p: any) => {
        const soldAmt = visibleSales.reduce((sum: number, s: any) => {
            const item = s.items?.find((i: any) => saleItemMatchesProduct(i, p));
            return sum + (item ? item.quantity : 0);
        }, 0);
        const revenue = visibleSales.reduce((sum: number, s: any) => {
            const item = s.items?.find((i: any) => saleItemMatchesProduct(i, p));
            return sum + (item ? (item.pricePerUnit * item.quantity) : 0);
        }, 0);
        return { name: p.name, sold: soldAmt, revenue: revenue };
    }).sort((a: any, b: any) => b.sold - a.sold).slice(0, 5);

    return {
        totalRevenue,
        totalExpenses,
        netProfit,
        recentTransactions,
        monthlySales,
        topProducts,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: netProfit
    };
}
