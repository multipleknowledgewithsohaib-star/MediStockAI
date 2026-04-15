"use client";

import { useState, useEffect } from "react";
import { Clock, Download, Search, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function AttendancePage() {
    const [attendance, setAttendance] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isMarking, setIsMarking] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [attRes, empRes] = await Promise.all([
                fetch(`/api/hr/attendance?date=${date}`),
                fetch("/api/hr/employees")
            ]);
            const attData = await attRes.json();
            const empData = await empRes.json();
            
            if (attData.success) setAttendance(attData.attendance);
            if (empData.success) setEmployees(empData.employees);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [date]);

    const handleMark = async (employeeId: number, action: "checkIn" | "checkOut") => {
        setIsMarking(true);
        try {
            const res = await fetch("/api/hr/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId, action })
            });
            if (res.ok) {
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsMarking(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-fade-in-up">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tight">Attendance</h1>
                    <p className="text-white/70 mt-1 font-medium italic">Monitor staff presence and track timings.</p>
                </div>
                <div className="flex gap-3">
                    <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all backdrop-blur-md outline-none" 
                    />
                </div>
            </div>

            <div className="card-premium rounded-[3rem] bg-white border-0 shadow-2xl shadow-green-100 overflow-hidden min-h-[500px] flex flex-col">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Daily Roster - {date}</h3>
                    </div>
                </div>

                <div className="p-0 flex-1 overflow-x-auto relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                        </div>
                    )}
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check In</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Check Out</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="py-5 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {employees.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-gray-400 font-medium">No employees found.</td>
                                </tr>
                            )}
                            {employees.map((emp: any) => {
                                const record: any = attendance.find((a: any) => a.employeeId === emp.id);
                                return (
                                    <tr key={emp.id} className="group hover:bg-gray-50 transition-all duration-300">
                                        <td className="py-6 px-8">
                                            <p className="font-black text-gray-900 text-sm">{emp.name}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">{emp.designation || 'Staff'}</p>
                                        </td>
                                        <td className="py-6 px-8">
                                            <p className="text-sm font-black text-gray-800">
                                                {record?.checkIn ? new Date(record.checkIn).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </p>
                                        </td>
                                        <td className="py-6 px-8">
                                            <p className="text-sm font-black text-gray-800">
                                                {record?.checkOut ? new Date(record.checkOut).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                                            </p>
                                        </td>
                                        <td className="py-6 px-8 text-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                !record ? 'bg-gray-100 text-gray-500' :
                                                record.status === 'Present' ? 'bg-green-100 text-green-600' : 
                                                record.status === 'Late' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'
                                            }`}>
                                                {!record ? 'Pending' : record.status}
                                            </span>
                                        </td>
                                        <td className="py-6 px-8 text-right space-x-2">
                                            <button 
                                                disabled={isMarking || !!record?.checkIn}
                                                onClick={() => handleMark(emp.id, 'checkIn')}
                                                className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                Check In
                                            </button>
                                            <button 
                                                disabled={isMarking || !record?.checkIn || !!record?.checkOut}
                                                onClick={() => handleMark(emp.id, 'checkOut')}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50"
                                            >
                                                Check Out
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
