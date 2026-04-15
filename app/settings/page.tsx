"use client";

import { useState, useEffect } from "react";
import {
    User,
    Bell,
    Palette,
    Lock,
    Save,
    Building,
    Phone,
    Mail,
    MapPin,
    Loader2,
    CheckCircle2
} from "lucide-react";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Mock data for settings
    const settings = {
        name: "MediStock Pharmacy",
        owner: "Administrator",
        phone: "+92 300 0000000",
        email: "admin@medistock.com",
        address: "Hospital Road, City Center"
    };

    const tabs = [
        { id: "profile", label: "Institutional Profile", icon: Building },
        { id: "notifications", label: "Alert Config", icon: Bell },
        { id: "appearance", label: "UI Personalization", icon: Palette },
        { id: "security", label: "Identity & Access", icon: Lock },
    ];

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaving(true);
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        setTimeout(() => {
            console.log("Mock settings saved:", data);
            setShowSuccess(true);
            setIsSaving(false);
            setTimeout(() => setShowSuccess(false), 3000);
        }, 800);
    };

    const handleResetSystem = async () => {
        if (!confirm("⚠️ CRITICAL ACTION: Are you absolutely sure? This will PERMANENTLY WIPE all medicines, purchase records, sales history, and supplier data.")) return;
        setIsResetting(true);
        setTimeout(() => {
            localStorage.clear();
            setIsResetting(false);
            alert("✨ SYSTEM RESET COMPLETE: All records have been purged.");
            window.location.reload();
        }, 1500);
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">System Preferences</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Configure hospital identity and operational safety parameters.</p>
                </div>
                {showSuccess && (
                    <div className="flex items-center gap-2 text-green-600 font-bold animate-fade-in bg-green-50 px-4 py-2 rounded-xl">
                        <CheckCircle2 className="h-5 w-5" />
                        Settings Persistent!
                    </div>
                )}
            </div>

            <div className="grid gap-8 lg:grid-cols-4">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1">
                    <div className="card-premium rounded-3xl p-4 space-y-2 border-2 border-purple-50/10 bg-white/5 backdrop-blur-md">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-purple-600 text-white shadow-xl shadow-purple-500/30'
                                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <tab.icon className={`h-5 w-5 ${activeTab === tab.id ? 'stroke-[2.5px]' : ''}`} />
                                <span className="font-bold text-sm tracking-tight">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3">
                    {activeTab === "profile" && (
                        <div className="card-premium rounded-3xl p-8 border-2 border-purple-50 bg-white">
                            <div className="flex items-end gap-6 mb-10">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-2xl shadow-purple-500/20">
                                    <Building className="h-12 w-12" />
                                </div>
                                <div className="mb-2">
                                    <h3 className="text-2xl font-black text-gray-900 uppercase">Hospital Details</h3>
                                    <p className="text-sm text-gray-400 font-medium">Public facing information for receipts.</p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Pharmacy Identity</label>
                                        <input name="name" type="text" defaultValue={settings?.name} className="w-full h-14 rounded-2xl border-2 border-gray-100 px-6 text-sm font-bold focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Administrator</label>
                                        <input name="owner" type="text" defaultValue={settings?.owner} className="w-full h-14 rounded-2xl border-2 border-gray-100 px-6 text-sm font-bold focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none" />
                                    </div>
                                </div>

                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Direct Line</label>
                                        <input name="phone" type="text" defaultValue={settings?.phone} className="w-full h-14 rounded-2xl border-2 border-gray-100 px-6 text-sm font-bold focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Official Email</label>
                                        <input name="email" type="email" defaultValue={settings?.email} className="w-full h-14 rounded-2xl border-2 border-gray-100 px-6 text-sm font-bold focus:border-purple-600 focus:ring-4 focus:ring-purple-600/5 transition-all outline-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Physical Address</label>
                                    <textarea name="address" rows={3} defaultValue={settings?.address} className="w-full rounded-2xl border-2 border-gray-100 px-6 py-4 text-sm font-bold focus:border-purple-600 transition-all outline-none resize-none" />
                                </div>

                                <button disabled={isSaving} type="submit" className="w-full md:w-auto px-10 py-5 bg-purple-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-purple-700 transition-all flex items-center justify-center gap-3">
                                    {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                    {isSaving ? "Syncing..." : "Update Configuration"}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="card-premium rounded-3xl p-8 border-2 border-purple-50 bg-white">
                            <h3 className="text-xl font-bold text-gray-900 mb-8 italic underline decoration-purple-600 decoration-4 underline-offset-8">Critical Alert Matrix</h3>
                            <div className="grid gap-4">
                                {[
                                    { title: "Quantum Stock Watch", desc: "Automated trigger when units drop below safety margins.", enabled: true },
                                    { title: "Expiry Chrono-Monitor", desc: "Predictive alerts for chemical degradation cycles.", enabled: true },
                                    { title: "Financial Core Pulse", desc: "Real-time P&L deviation notifications.", enabled: false },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center justify-between p-6 rounded-2xl bg-gray-50/50 border border-gray-100 transition-colors">
                                        <div className="max-w-[70%]">
                                            <p className="font-black text-gray-900 leading-tight uppercase text-xs">{item.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1">{item.desc}</p>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${item.enabled ? 'bg-purple-600' : 'bg-gray-200'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${item.enabled ? 'right-1' : 'left-1'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-6">
                            <div className="card-premium rounded-3xl p-8 border-2 border-red-50 bg-red-50/10">
                                <div className="flex items-center gap-3 mb-6 text-red-600">
                                    <Lock className="h-6 w-6" />
                                    <h3 className="text-xl font-black uppercase tracking-tight italic">Danger Zone</h3>
                                </div>
                                <div className="p-8 rounded-[2.5rem] bg-white border-2 border-red-100 shadow-2xl shadow-red-500/5">
                                    <p className="font-black text-gray-900 uppercase text-xs tracking-widest mb-2 italic">Factory Reset System</p>
                                    <p className="text-xs text-gray-400 font-bold mb-8 leading-relaxed">This will PERMANENTLY delete all financial history and inventory data. This action is irreversible.</p>
                                    <button
                                        onClick={handleResetSystem}
                                        disabled={isResetting}
                                        className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-red-200 active:scale-[0.98]"
                                    >
                                        {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : "⚠️ Purge All System Records"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
