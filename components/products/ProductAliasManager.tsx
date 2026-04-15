import React, { useState } from 'react';
import { Tag, Plus, X, Loader2 } from 'lucide-react';

interface Alias {
    id: number;
    alias: string;
}

interface ProductAliasManagerProps {
    productId: number;
    aliases: Alias[];
    onAliasAdded: (newAlias: Alias) => void;
}

export default function ProductAliasManager({ productId, aliases, onAliasAdded }: ProductAliasManagerProps) {
    const [newAlias, setNewAlias] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddAlias = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlias.trim()) return;

        setIsAdding(true);
        try {
            const response = await fetch('/api/products/aliases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alias: newAlias, productId })
            });

            if (!response.ok) throw new Error('Failed to add alias');

            const data = await response.json();
            onAliasAdded(data);
            setNewAlias('');
        } catch (error) {
            console.error(error);
            alert('Failed to add alias. It might already exist.');
        } finally {
            setIsAdding(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Aliases (OCR Matching)</h4>
            </div>

            <div className="flex flex-wrap gap-2">
                {aliases.map((a, index) => (
                    <div key={`${String(a.id ?? "alias")}-${a.alias}-${index}`} className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200 group">
                        <Tag className="h-3 w-3" />
                        {a.alias}
                    </div>
                ))}
            </div>

            <form onSubmit={handleAddAlias} className="flex gap-2">
                <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    placeholder="Add new alias (e.g. Panadol Tablet)"
                    className="flex-1 h-10 rounded-xl border-gray-200 bg-gray-50 px-4 text-xs focus:ring-2 focus:ring-purple-500/20 transition-all shadow-sm"
                />
                <button
                    disabled={isAdding}
                    type="submit"
                    className="h-10 px-4 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
                >
                    {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                    Add Alias
                </button>
            </form>

            <p className="text-[10px] text-gray-400 italic">
                Aliases help the system recognize this product in invoices even if the supplier uses a different name.
            </p>
        </div>
    );
}
