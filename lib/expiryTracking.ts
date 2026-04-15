/**
 * Expiry Tracking System
 * Comprehensive utilities for pharmacy expiry management
 */

export interface Batch {
    id: string | number;
    batchNo: string;
    manufacturingDate?: string;
    expiryDate: string;
    quantity: number;
    productId?: string | number;
    mrp?: number;
    purchaseDate?: string;
}

export interface Product {
    id: string | number;
    name: string;
    batches?: Batch[];
    stock?: number;
}

export type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'early' | 'safe';
export type AlertSeverity = 'high' | 'medium' | 'low';

/**
 * Calculate days until expiry
 */
export function getDaysUntilExpiry(expiryDate: string): number {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Get expiry status based on days remaining
 * - Expired: < 0 days
 * - Critical: 0-30 days (User requested 15-30, but <15 is even more critical)
 * - Warning: 31-90 days (2-3 months)
 * - Early: 91-180 days (Up to 6 months)
 * - Safe: > 180 days
 */
export function getExpiryStatus(expiryDate: string): ExpiryStatus {
    const daysLeft = getDaysUntilExpiry(expiryDate);

    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'critical';
    if (daysLeft <= 90) return 'warning';
    if (daysLeft <= 180) return 'early';
    return 'safe';
}

/**
 * Get color for expiry status
 */
export function getExpiryColor(status: ExpiryStatus): string {
    const colors = {
        expired: 'red',
        critical: 'red',
        warning: 'orange',
        early: 'yellow',
        safe: 'green'
    };
    return colors[status];
}

/**
 * Get badge class for expiry status
 */
export function getExpiryBadgeClass(status: ExpiryStatus): string {
    const classes = {
        expired: 'badge-danger',
        critical: 'badge-danger',
        warning: 'badge-warning',
        early: 'badge-warning', // Yellow uses warning badge style
        safe: 'badge-success'
    };
    return classes[status];
}

/**
 * Sort batches by expiry date (FIFO - First In, First Out)
 * Earliest expiry first
 */
export function sortBatchesByFIFO(batches: Batch[]): Batch[] {
    return [...batches].sort((a, b) => {
        const dateA = new Date(a.expiryDate).getTime();
        const dateB = new Date(b.expiryDate).getTime();
        return dateA - dateB;
    });
}

/**
 * Get the next batch to use (FIFO)
 */
export function getNextBatch(batches: Batch[]): Batch | null {
    if (!batches || batches.length === 0) return null;
    const sortedBatches = sortBatchesByFIFO(batches);
    // Return first batch with quantity > 0
    return sortedBatches.find(b => b.quantity > 0) || null;
}

/**
 * Filter batches by expiry status
 */
export function filterBatchesByStatus(batches: Batch[], status: ExpiryStatus): Batch[] {
    return batches.filter(batch => getExpiryStatus(batch.expiryDate) === status);
}

/**
 * Get all near-expiry batches (within specified days)
 */
export function getNearExpiryBatches(batches: Batch[], withinDays: number = 90): Batch[] {
    return batches.filter(batch => {
        const daysLeft = getDaysUntilExpiry(batch.expiryDate);
        return daysLeft >= 0 && daysLeft <= withinDays;
    });
}

/**
 * Get all expired batches
 */
export function getExpiredBatches(batches: Batch[]): Batch[] {
    return batches.filter(batch => getDaysUntilExpiry(batch.expiryDate) < 0);
}

/**
 * Calculate total stock from all batches
 */
export function getTotalStockFromBatches(batches: Batch[]): number {
    return batches.reduce((total, batch) => total + (batch.quantity || 0), 0);
}

/**
 * Generate expiry alert for a batch
 */
export function generateExpiryAlert(batch: Batch, productName: string) {
    const daysLeft = getDaysUntilExpiry(batch.expiryDate);
    const status = getExpiryStatus(batch.expiryDate);

    let severity: AlertSeverity = 'low';
    let message = '';

    if (status === 'expired') {
        severity = 'high';
        message = `${productName} (Batch ${batch.batchNo}) has expired`;
    } else if (status === 'critical') {
        severity = 'high';
        message = `${productName} (Batch ${batch.batchNo}) expires in ${daysLeft} days`;
    } else if (status === 'warning') {
        severity = 'medium';
        message = `${productName} (Batch ${batch.batchNo}) expires in ${daysLeft} days`;
    }
    //comment
    return {
        id: batch.id,
        medicine: productName,
        batch: batch.batchNo,
        days: daysLeft,
        quantity: batch.quantity,
        type: status === 'critical' ? 'critical' : status === 'warning' ? 'warning' : 'info',
        severity,
        message,
        expiryDate: batch.expiryDate
    };
}

/**
 * Generate all expiry alerts for products
 */
export function generateAllExpiryAlerts(products: Product[]) {
    const alerts: any[] = [];

    products.forEach(product => {
        if (product.batches && product.batches.length > 0) {
            const nearExpiryBatches = getNearExpiryBatches(product.batches, 180);
            const expiredBatches = getExpiredBatches(product.batches);

            [...expiredBatches, ...nearExpiryBatches].forEach(batch => {
                alerts.push(generateExpiryAlert(batch, product.name));
            });
        }
    });

    // Sort by days left (ascending)
    return alerts.sort((a, b) => a.days - b.days);
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
}

/**
 * Parse expiry date from various formats
 * Supports: MM/YYYY, MM-YYYY, YYYY-MM, etc.
 */
export function parseExpiryDate(dateStr: string): string | null {
    try {
        // Remove any text like "EXP:", "Expiry:", etc.
        const cleaned = dateStr.replace(/(Exp|EXP|Expiry|Use before|MFG\/EXP)[:.]?\s*/gi, '').trim();

        // Try to parse different formats
        const patterns = [
            /(\d{2})[\/\-](\d{4})/,  // MM/YYYY or MM-YYYY
            /(\d{2})[\/\-](\d{2})/,  // MM/YY
            /(\d{4})[\/\-](\d{2})/,  // YYYY/MM
        ];

        for (const pattern of patterns) {
            const match = cleaned.match(pattern);
            if (match) {
                let month, year;
                if (match[1].length === 4) {
                    // YYYY/MM format
                    year = parseInt(match[1]);
                    month = parseInt(match[2]);
                } else {
                    // MM/YYYY or MM/YY format
                    month = parseInt(match[1]);
                    year = parseInt(match[2]);
                    if (year < 100) {
                        year += 2000; // Convert YY to YYYY
                    }
                }

                if (month >= 1 && month <= 12) {
                    return `${year}-${month.toString().padStart(2, '0')}-01`;
                }
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Check if batch should be blocked from sale
 */
export function isBatchBlocked(batch: Batch): boolean {
    const status = getExpiryStatus(batch.expiryDate);
    return status === 'expired';
}

/**
 * Get expiry summary statistics
 */
export function getExpirySummary(products: Product[]) {
    let totalBatches = 0;
    let expiredCount = 0;
    let criticalCount = 0; // 0-30 days
    let warningCount = 0;  // 31-90 days
    let within180Count = 0; // 91-180 days

    products.forEach(product => {
        if (product.batches) {
            totalBatches += product.batches.length;

            product.batches.forEach(batch => {
                const daysLeft = getDaysUntilExpiry(batch.expiryDate);

                if (daysLeft < 0) {
                    expiredCount++;
                } else if (daysLeft <= 30) {
                    criticalCount++;
                } else if (daysLeft <= 90) {
                    warningCount++;
                } else if (daysLeft <= 180) {
                    within180Count++;
                }
            });
        }
    });

    return {
        totalBatches,
        expiredCount,
        criticalCount,
        warningCount,
        within180Count,
        safeCount: totalBatches - expiredCount - criticalCount - warningCount - within180Count
    };
}
