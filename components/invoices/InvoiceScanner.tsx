"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
    Camera,
    Upload,
    X,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ScanLine,
    Clipboard,
    Trash2,
    Plus,
    FileText,
    DollarSign,
    Calendar
} from "lucide-react";
import Script from "next/script";
import { compressImage } from "@/lib/imageUtils";

declare global {
    interface Window {
        Tesseract: any;
    }
}

interface ScannedInvoice {
    id: string;
    invoiceNo: string;
    date: string;
    total: number;
    supplierName: string;
    items: any[];
}

interface InvoiceScannerProps {
    onScanComplete: (data: ScannedInvoice) => void;
    onClose: () => void;
}

export default function InvoiceScanner({ onScanComplete, onClose }: InvoiceScannerProps) {
    const [scanning, setScanning] = useState(false);
    const [detectedData, setDetectedData] = useState<ScannedInvoice | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePaste = useCallback(async (e: ClipboardEvent) => {
        const item = e.clipboardData?.items[0];
        if (item?.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const originalBase64 = event.target?.result as string;
                    try {
                        const compressedBase64 = await compressImage(originalBase64);
                        startScan(compressedBase64, file.name);
                    } catch (err) {
                        console.error("Compression failed, using original:", err);
                        startScan(originalBase64, file.name);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    }, []);

    useEffect(() => {
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [handlePaste]);

    const preprocessImage = async (imageSrc: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve(imageSrc);

                const scale = Math.min(1.5, 2000 / Math.max(img.width, img.height));
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const avg = 0.299 * r + 0.587 * g + 0.114 * b;
                    const val = avg > 150 ? 255 : 0;
                    data[i] = data[i + 1] = data[i + 2] = val;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/png', 1.0));
            };
            img.onerror = () => resolve(imageSrc);
            img.src = imageSrc;
        });
    };

    const parseInvoiceText = (text: string): Partial<ScannedInvoice> => {
        const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
        const cleanText = text.replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ');

        let invoiceNo = "INV-" + Math.floor(100000 + Math.random() * 900000);
        let date = new Date().toISOString().split('T')[0];
        let total = 0;
        let supplierName = "CASH SUPPLIER";
        let items: any[] = [];

        // 1. Invoice Number Detection
        const invRegex = /(?:INV|BILL|NO|NUMBER|ID)[.\s]*[:\-]?[\s]*([A-Z0-9-]{4,12})/i;
        const invMatch = cleanText.match(invRegex);
        if (invMatch) invoiceNo = invMatch[1].trim();

        // 2. Date Detection
        const dateRegex = /\b(\d{1,2})[\s\/\.\-]+(\d{1,2})[\s\/\.\-]+(\d{2,4})\b/g;
        const dateMatch = cleanText.match(dateRegex);
        if (dateMatch) {
            const parts = dateMatch[0].split(/[\/\-\.]/);
            if (parts.length === 3) {
                let d = parts[0], m = parts[1], y = parts[2];
                if (parseInt(m) > 12) [d, m] = [m, d];
                if (y.length === 2) y = "20" + y;
                date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
        }

        // 3. Amount Detection
        const amountRegex = /(?:TOTAL|GRAND TOTAL|NET|PAID|AMOUNT|RS|PKR)[.\s]*[:\-]?[\s]*([0-9,]{2,}(?:\.[0-9]{2})?)/gi;
        const amountMatches = Array.from(cleanText.matchAll(amountRegex));
        if (amountMatches.length > 0) {
            const amounts = amountMatches.map(m => parseFloat(m[1].replace(/,/g, ''))).filter(n => n > 0);
            if (amounts.length > 0) total = Math.max(...amounts);
        }

        // 4. ITEM EXTRACTION ENGINE (Heuristic)
        const garbageWords = ['TOTAL', 'GRAND', 'INVOICE', 'BILL', 'DATE', 'TABLET', 'CAPSULE', 'PKR', 'RS', 'TAX', 'GROSS', 'NET', 'PAID', 'DUE', 'CHANGE', 'CASH', 'CREDIT'];

        for (const line of rawLines) {
            const upperLine = line.toUpperCase();
            // Skip lines that look like metadata or totals
            if (garbageWords.some(w => upperLine.includes(w)) && !upperLine.includes('BABY')) continue;

            // Pattern: [ITEM NAME] ... [QTY] ... [PRICE]
            // We look for text that has a number at the end or middle
            const itemRegex = /^([A-Z][A-Z\s0-9]{3,25})(?:.*?)\s+(\d+)\s*(?:.*?)\s*([0-9,]{2,}(?:\.[0-9]{2})?)$/i;
            const match = line.match(itemRegex);

            if (match) {
                items.push({
                    name: match[1].trim(),
                    quantity: parseInt(match[2]),
                    pricePerUnit: parseFloat(match[3].replace(/,/g, '')),
                    total: parseInt(match[2]) * parseFloat(match[3].replace(/,/g, ''))
                });
            } else if (upperLine.length > 5 && (upperLine.includes('BABY') || upperLine.includes('COMF') || upperLine.includes('SPOON'))) {
                // Fallback for user-specific items if regex fails but keyword matches
                items.push({
                    name: line.replace(/[0-9.]/g, '').trim(),
                    quantity: parseInt(line.match(/\d+/)?.[0] || "1"),
                    pricePerUnit: 0,
                    total: 0
                });
            }
        }

        return { invoiceNo, date, total, supplierName, items };
    };

    const startScan = async (imageData: string, fileName?: string) => {
        setScanning(true);
        try {
            const response = await fetch('/api/ocr/invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData, fileName })
            });

            if (!response.ok) {
                const error = await response.json();
                const messageParts = [error.error || 'Gemini OCR failed', error.details, error.help].filter(Boolean);
                throw new Error(messageParts.join(' | '));
            }

            const result = await response.json();
            const data = result.data;
            const invoice = Array.isArray(data?.invoices) ? data.invoices[0] : data;

            setDetectedData({
                id: Date.now().toString(),
                invoiceNo: invoice?.invoiceNo || "INV-GEN",
                date: invoice?.date || new Date().toISOString().split('T')[0],
                total: invoice?.total || 0,
                supplierName: invoice?.supplierName || "UNRECOGNIZED SUPPLIER",
                items: invoice?.items || []
            });
        } catch (error) {
            console.error("Scan failed:", error);
            alert(`Could not process image with Gemini AI. ${error instanceof Error ? error.message : "Falling back to manual entry."}`);
        } finally {
            setScanning(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const originalBase64 = event.target?.result as string;
                try {
                    const compressedBase64 = await compressImage(originalBase64);
                    startScan(compressedBase64, file.name);
                } catch (err) {
                    console.error("Compression failed, using original:", err);
                    startScan(originalBase64, file.name);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <Script
                src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"
                strategy="lazyOnload"
            />

            <div className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl animate-fade-in-up relative">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">AI Invoice Vision</h3>
                        <p className="text-sm text-gray-500 font-medium">Extracting Amount, Date & Bill No instantly.</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                        <X className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                {!scanning && !detectedData && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                            <div className="p-3 bg-white rounded-2xl shadow-sm">
                                <Clipboard className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-black text-xs text-blue-600 uppercase tracking-widest mb-1">Clipboard Ready</h4>
                                <p className="text-xs text-blue-800/70 font-medium leading-relaxed">Simply **Paste (Ctrl+V)** the invoice image here.</p>
                            </div>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="group w-full flex flex-col items-center justify-center p-16 border-4 border-dashed border-gray-100 rounded-[2.5rem] hover:border-purple-400 hover:bg-purple-50 transition-all"
                        >
                            <div className="p-6 bg-white rounded-3xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                <Upload className="h-10 w-10 text-purple-600" />
                            </div>
                            <span className="font-black text-gray-900 uppercase text-sm tracking-widest">Select Invoice Image</span>
                        </button>
                    </div>
                )}

                {scanning && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-16 w-16 text-purple-600 animate-spin mb-4" />
                        <h4 className="text-xl font-black text-gray-900 uppercase">Analyzing Document...</h4>
                        <p className="text-sm text-gray-500 mt-2">Running Neural OCR engine</p>
                    </div>
                )}

                {detectedData && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-green-50 border border-green-100 rounded-3xl p-6 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                                <span className="font-black text-green-800 uppercase text-sm tracking-widest">Data Extracted Successfully</span>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Invoice Number</label>
                                <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-purple-600" />
                                    <input
                                        value={detectedData.invoiceNo}
                                        onChange={(e) => setDetectedData({ ...detectedData, invoiceNo: e.target.value })}
                                        className="bg-transparent border-0 font-black text-gray-900 focus:ring-0 w-full"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date</label>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-blue-600" />
                                        <input
                                            type="date"
                                            value={detectedData.date}
                                            onChange={(e) => setDetectedData({ ...detectedData, date: e.target.value })}
                                            className="bg-transparent border-0 font-black text-gray-900 focus:ring-0 w-full"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Total Amount (PKR)</label>
                                    <div className="flex items-center gap-3">
                                        <DollarSign className="h-4 w-4 text-green-600" />
                                        <input
                                            type="number"
                                            value={detectedData.total}
                                            onChange={(e) => setDetectedData({ ...detectedData, total: parseFloat(e.target.value) })}
                                            className="bg-transparent border-0 font-black text-gray-900 focus:ring-0 w-full"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => onScanComplete(detectedData)}
                            className="w-full py-5 rounded-3xl bg-purple-600 text-white font-black uppercase tracking-widest shadow-xl shadow-purple-200 hover:bg-purple-700 hover:scale-[1.02] transition-all"
                        >
                            Import Into Database
                        </button>
                    </div>
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>
        </div>
    );
}
