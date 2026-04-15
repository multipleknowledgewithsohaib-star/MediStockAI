"use client";

import { useState, useEffect } from "react";
import { Key, Plus, Loader2 } from "lucide-react";

export default function RolesPage() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/hr/roles");
            const data = await res.json();
            if (data.success) setRoles(data.roles);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Roles & Permissions</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Configure system access rules.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {roles.map((r: any) => (
                     <div key={r.id} className="card-premium p-8 rounded-[2rem] bg-white border-0 shadow-2xl flex flex-col justify-between">
                         <div>
                             <div className="w-12 h-12 rounded-2xl bg-gray-900 shadow-xl shadow-gray-900/20 flex items-center justify-center mb-6">
                                 <Key className="h-5 w-5 text-white" />
                             </div>
                             <h3 className="text-xl font-black text-gray-900 uppercase">{r.name}</h3>
                             <p className="text-gray-500 mt-2 text-xs font-medium bg-gray-50 p-4 rounded-xl leading-relaxed font-mono">
                                 {r.permissions}
                             </p>
                         </div>
                     </div>
                 ))}
                 
                 {loading && <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}
            </div>
        </div>
    );
}
