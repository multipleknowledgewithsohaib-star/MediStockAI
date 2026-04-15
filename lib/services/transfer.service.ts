import { storage } from '../storage';

export interface Transfer {
    id: number | string;
    productId: number | string;
    productName: string;
    fromBranchId: number | string;
    toBranchId: number | string;
    quantity: number;
    batchNo: string;
    date: string;
    status: 'Completed' | 'Pending';
}

export const transferService = {
    // Execute a stock transfer
    executeTransfer: async (data: {
        productId: number | string;
        productName: string;
        batchNo: string;
        fromBranchId: number | string;
        toBranchId: number | string;
        quantity: number;
    }) => {
        // 1. Update Source Branch Stock
        const batches = storage.get('batches', []);
        const products = storage.get('products', []);
        
        // Find the source batch (Using loose equality == to handle string/number ID mismatches from UI)
        let sourceBatchIdx = batches.findIndex((b: any) => 
            b.batchNo === data.batchNo && 
            b.branchId == data.fromBranchId && 
            b.productId == data.productId
        );

        // [FORCE TRANSFER LOGIC]
        // If source batch doesn't exist, try to find a "Template Batch" from another branch to get metadata (Expiry, etc.)
        if (sourceBatchIdx === -1) {
            const templateBatch = batches.find((b: any) => b.batchNo === data.batchNo && b.productId == data.productId);
            
            // Create a virtual batch at source with 0 quantity
            const newSourceBatch = {
                ...(templateBatch || {}),
                id: Date.now() + Math.random().toString(36).substr(2, 5),
                productId: data.productId,
                batchNo: data.batchNo,
                branchId: data.fromBranchId,
                quantity: 0,
                createdAt: new Date().toISOString()
            };
            
            batches.push(newSourceBatch);
            sourceBatchIdx = batches.length - 1;
        }

        // Deduct from source (Allows negative stock)
        batches[sourceBatchIdx].quantity -= data.quantity;

        // 2. Update Target Branch Stock (Create or Update)
        const targetBatchIdx = batches.findIndex((b: any) => 
            b.batchNo === data.batchNo && 
            b.branchId == data.toBranchId && 
            b.productId == data.productId
        );

        if (targetBatchIdx !== -1) {
            // Update existing batch at target branch
            batches[targetBatchIdx].quantity += data.quantity;
        } else {
            // Create new batch record at target branch
            const sourceBatch = batches[sourceBatchIdx];
            batches.push({
                ...sourceBatch,
                id: Date.now() + 1 + Math.random().toString(36).substr(2, 5),
                quantity: data.quantity,
                branchId: data.toBranchId,
                createdAt: new Date().toISOString()
            });
        }

        // Save batches
        storage.set('batches', batches);

        // 4. Sync Products Storage (ensure nested batches in Product grid reflect change)
        const sourceProduct = products.find((p: any) => p.id == data.productId);
        
        if (sourceProduct && sourceProduct.batches) {
            // Update source product's nested batches
            const pSourceBatch = sourceProduct.batches.find((b: any) => b.batchNo === data.batchNo && b.branchId == data.fromBranchId);
            if (pSourceBatch) pSourceBatch.quantity -= data.quantity;

            // Update/Add to destination product's nested batches
            const pTargetBatch = sourceProduct.batches.find((b: any) => b.batchNo === data.batchNo && b.branchId == data.toBranchId);
            if (pTargetBatch) {
                pTargetBatch.quantity += data.quantity;
            } else {
                // Find the just-created or updated batch in the global list to ensure we have the correct ID and metadata
                const globalTargetBatch = batches.find((b: any) => b.batchNo === data.batchNo && b.branchId == data.toBranchId && b.productId == data.productId);
                if (globalTargetBatch) {
                    sourceProduct.batches.push({ ...globalTargetBatch });
                }
            }
            storage.set('products', products);
        }

        // 3. Record Transfer Log
        const transfers = storage.get('transfers', []);
        const newTransfer: Transfer = {
            id: Date.now(),
            ...data,
            date: new Date().toISOString(),
            status: 'Completed'
        };
        transfers.unshift(newTransfer);
        storage.set('transfers', transfers);

        // 5. Trigger global change event for UI sync
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('jailwatch_storage_change'));
        }

        return newTransfer;
    },

    getTransfers: async (): Promise<Transfer[]> => {
        return storage.get('transfers', []);
    }
};
