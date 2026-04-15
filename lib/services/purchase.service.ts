import { storage } from '../storage';

/**
 * Purchase Service
 * Handles complex logic for purchase invoices, specifically historical analysis.
 */
export const purchaseService = {
    /**
     * Calculates the average discount percentage for a product from a specific supplier.
     * 
     * SQL Equivalent:
     * SELECT AVG(discount_percent) 
     * FROM purchases p
     * JOIN purchase_items pi ON p.id = pi.purchase_id
     * WHERE pi.product_id = :productId AND p.supplier_id = :supplierId
     */
    getAverageDiscount: (productId: string | number, supplierId: string | number): number => {
        const purchases = storage.get('purchases', []);
        
        let totalDiscount = 0;
        let count = 0;

        purchases.forEach((purchase: any) => {
            // Check if this purchase belongs to the supplier
            // Supporting both nested object and direct ID for flexibility
            const pSupplierId = purchase.supplier?.id || purchase.supplierId;
            
            if (pSupplierId == supplierId) {
                purchase.items.forEach((item: any) => {
                    if (item.productId == productId) {
                        // Ensure we have a valid numeric discount
                        const discount = parseFloat(item.discountPercent);
                        if (!isNaN(discount)) {
                            totalDiscount += discount;
                            count++;
                        }
                    }
                });
            }
        });

        return count > 0 ? parseFloat((totalDiscount / count).toFixed(2)) : 0;
    },

    /**
     * Checks if a current discount triggers a smart warning.
     * Rules:
     * 1. If average discount > 0 AND current discount == 0 -> Warning
     * 2. If average discount >= 5 AND current discount < 2 -> Warning
     */
    checkDiscountWarning: (productId: string | number, supplierId: string | number, currentDiscount: number) => {
        const avgDiscount = purchaseService.getAverageDiscount(productId, supplierId);
        
        if (avgDiscount > 0 && currentDiscount === 0) {
            return {
                isWarning: true,
                avg: avgDiscount,
                message: "Warning: This product usually has a discount from this supplier, but no discount was detected in this invoice."
            };
        }

        if (avgDiscount >= 5 && currentDiscount < 2) {
            return {
                isWarning: true,
                avg: avgDiscount,
                message: `Warning: This product usually has a higher discount (Avg: ${avgDiscount}%) from this supplier.`
            };
        }

        return { isWarning: false, avg: avgDiscount };
    }
};
