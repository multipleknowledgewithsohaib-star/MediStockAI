"use client";

import Link from "next/link";
import { Users, Clock, DollarSign, Key, CalendarRange, UserPlus } from "lucide-react";

export default function HRDashboard() {
    const cards = [
        { title: "Employees", icon: Users, href: "/hr/employees", description: "Manage staff directory, roles, and profiles", color: "bg-blue-500", shadow: "shadow-blue-500/20" },
        { title: "Attendance", icon: Clock, href: "/hr/attendance", description: "Check-in/out and monitor daily presence", color: "bg-green-500", shadow: "shadow-green-500/20" },
        { title: "Salaries", icon: DollarSign, href: "/hr/salaries", description: "Process payroll, bonuses, and deductions", color: "bg-purple-500", shadow: "shadow-purple-500/20" },
        { title: "Leaves", icon: CalendarRange, href: "/hr/leaves", description: "Approve or reject leave requests", color: "bg-orange-500", shadow: "shadow-orange-500/20" },
        { title: "Roles & Permissions", icon: Key, href: "/hr/roles", description: "Configure system access rules", color: "bg-gray-700", shadow: "shadow-gray-700/20" },
    ];

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Human Resources</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Manage employees, payroll, and attendance.</p>
                </div>
                <Link href="/hr/employees" className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-purple-600/20 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Add Employee
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cards.map((card, i) => (
                    <Link key={i} href={card.href} className="card-premium p-8 rounded-[2rem] bg-white border-0 shadow-2xl transition-all hover:-translate-y-2 duration-300 group flex flex-col justify-between min-h-[220px]">
                        <div>
                            <div className={`w-14 h-14 rounded-2xl ${card.color} ${card.shadow} shadow-lg flex items-center justify-center mb-6 transition-transform group-hover:scale-110`}>
                                <card.icon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">{card.title}</h3>
                            <p className="text-gray-500 mt-2 font-medium text-sm">{card.description}</p>
                        </div>
                        <div className="mt-8 flex items-center gap-2 text-purple-600 font-black text-xs uppercase tracking-widest opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                            Access Module <span className="text-lg leading-none">&rarr;</span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
