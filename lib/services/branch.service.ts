import { storage } from '../storage';
import { mockBranches } from '../mockData';

export interface Branch {
    id: number | string;
    name: string;
    location: string;
    type: 'Main' | 'Pharmacy';
    createdAt?: string;
}

const STORAGE_KEY = 'branches';

export const branchService = {
    // Get all branches
    getBranches: async (): Promise<Branch[]> => {
        // First check localStorage
        const localBranches = storage.get(STORAGE_KEY, mockBranches);
        if (localBranches.length > 0) return localBranches;
        
        // Fallback to API/Prisma (for future implementation)
        try {
            const response = await fetch('/api/branches');
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    storage.set(STORAGE_KEY, data);
                    return data;
                }
            }
        } catch (e) {
            console.error("Failed to fetch branches from API:", e);
        }
        
        return mockBranches;
    },

    // Add a new branch
    addBranch: async (branch: Omit<Branch, 'id' | 'createdAt'>): Promise<Branch> => {
        const branches = await branchService.getBranches();
        const newBranch: Branch = {
            ...branch,
            id: Date.now(),
            createdAt: new Date().toISOString()
        };
        
        const updated = [...branches, newBranch];
        storage.set(STORAGE_KEY, updated);
        
        // Also sync with API (optional for now)
        try {
            await fetch('/api/branches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newBranch)
            });
        } catch (e) {
            console.error("Failed to sync new branch with API:", e);
        }
        
        return newBranch;
    },

    // Update branch
    updateBranch: async (id: number | string, data: Partial<Branch>): Promise<Branch | null> => {
        const branches = await branchService.getBranches();
        const index = branches.findIndex(b => b.id === id);
        if (index === -1) return null;
        
        branches[index] = { ...branches[index], ...data };
        storage.set(STORAGE_KEY, branches);
        
        try {
            await fetch(`/api/branches/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(branches[index])
            });
        } catch (e) {
            console.error("Failed to sync branch update with API:", e);
        }
        
        return branches[index];
    },

    // Delete branch
    deleteBranch: async (id: number | string): Promise<boolean> => {
        const branches = await branchService.getBranches();
        const filtered = branches.filter(b => b.id !== id);
        
        if (filtered.length === branches.length) return false;
        
        storage.set(STORAGE_KEY, filtered);
        
        try {
            await fetch(`/api/branches/${id}`, { method: 'DELETE' });
        } catch (e) {
            console.error("Failed to delete branch from API:", e);
        }
        
        return true;
    }
};
