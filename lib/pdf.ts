import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateInvoicePDF = (sale: any, userName?: string) => {
    const doc = new jsPDF({
        unit: 'mm',
        format: [80, 250] // Increased height for detailed footer
    });

    let y = 10;
    const margin = 5;
    const pageWidth = 80;

    // 1. Header (BIN HASHIM STYLE)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MediStock", pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("SHAHRAH-E-PAKISTAN, KARACHI", pageWidth / 2, y, { align: "center" });
    y += 3.5;
    doc.text("UAN: 021 111 246 246", pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Original Receipt", pageWidth / 2, y, { align: "center" });
    y += 6;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");

    // 2. Transaction Info Section
    doc.text(`Receipt # ${sale.id.toString().padStart(8, '0')}`, margin, y);
    doc.text(`Pos id: POS-101`, pageWidth - margin, y, { align: "right" });
    y += 4;

    const now = new Date();
    doc.text(`Date: ${now.toLocaleDateString()}`, margin, y);
    doc.text(`Time: ${now.toLocaleTimeString()}`, pageWidth - margin, y, { align: "right" });
    y += 4;

    doc.text(`User: ${userName || 'ADMIN CORE'}`, margin, y);
    y += 4;
    doc.text(`Customer: WALK-IN CUSTOMER`, margin, y);
    y += 5;

    // 3. Table Header
    doc.setFont("helvetica", "bold");
    doc.text("Pack Unit     Gross  DisAmt  Item Total", margin, y);
    y += 1.5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    // 4. Items List
    doc.setFont("helvetica", "normal");
    let totalGross = 0;
    let totalDiscount = sale.discount || 0;

    sale.items.forEach((item: any) => {
        // Line 1: Item Name
        const cleanName = item.name.replace(" (Pcs)", "").replace(" (Strip)", "");
        doc.setFont("helvetica", "bold");
        doc.text(cleanName.toUpperCase(), margin, y);
        y += 4;

        // Line 2: Quantities and Prices
        doc.setFont("helvetica", "normal");
        const qtyStr = item.qtyDisplay || `${item.quantity.toString().padStart(2, '0')}  00`;
        const gross = (Number(item.price) || 0) * (Number(item.quantity) || 0);
        totalGross += gross;

        doc.text(qtyStr, margin + 2, y);
        doc.text((Number(item.price) || 0).toFixed(2).padStart(8, ' '), margin + 25, y);
        doc.text("0.00".padStart(8, ' '), margin + 42, y); // Item level discount placeholder
        doc.text(gross.toFixed(2).padStart(10, ' '), pageWidth - margin, y, { align: "right" });
        y += 5;
    });

    // 5. Totals Summary Table
    y += 1;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Total", margin, y);
    doc.text((sale.items?.length || 0).toString().padStart(4, ' '), margin + 15, y);
    doc.text((Number(totalDiscount) || 0).toFixed(0).padStart(4, ' '), margin + 45, y);
    doc.text((Number(sale.total) || 0).toFixed(0).padStart(5, ' '), pageWidth - margin, y, { align: "right" });
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.text("Total Gross    Total Discount    Total Net", pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text(`${totalGross.toFixed(0)}            ${totalDiscount.toFixed(0)}            ${sale.total.toFixed(0)}`, pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 2;
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // 6. Invoice Value Box
    doc.setLineWidth(0.5);
    doc.rect(margin, y - 4, pageWidth - (margin * 2), 7);
    doc.setFontSize(10);
    doc.text("Invoice Value", margin + 2, y + 1);
    doc.setFontSize(14);
    doc.text(sale.total.toLocaleString(), pageWidth - margin - 2, y + 1, { align: "right" });
    y += 8;

    // 7. Payment Mode Section
    doc.setFontSize(8);
    doc.text("Mode Of Payment", pageWidth / 2, y, { align: "center" });
    y += 1.5;
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.text("CASH", margin, y);
    doc.text(sale.total.toFixed(2), pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("Total Payment :", margin, y);
    doc.text(sale.total.toFixed(2), pageWidth - margin, y, { align: "right" });
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    // 8. Cash Breakdown
    doc.setFont("helvetica", "normal");
    doc.text("CashReceived:", margin, y);
    doc.text((sale.paidAmount || 0).toFixed(0), pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.text("CashRefund:", margin, y);
    doc.text((sale.changeAmount || 0).toFixed(0), pageWidth - margin, y, { align: "right" });
    y += 8;

    // 9. Detailed Footer (Terms & Conditions)
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text("CUSTOMER RESPONSIBILITY", pageWidth / 2, y, { align: "center" });
    y += 4;
    doc.setFont("helvetica", "normal");
    const footerText = [
        "*Please Check Your Medicine By Prescription &",
        "Expiry Date Of Medicine Yourself, Or Through",
        "Your Medical Consultant",
        "*In Case Of Any Doubt Of Wrong Medicine, It",
        "May Be Returned",
        "*Please Match Your Purchased Items With The",
        "Bill. In Case Of Any Discrepancy, Call Our",
        "Helpline Or Whatsapp Us On The Number",
        "Below."
    ];
    footerText.forEach(line => {
        doc.text(line, pageWidth / 2, y, { align: "center" });
        y += 3.5;
    });

    y += 4;
    doc.setFont("helvetica", "bold");
    doc.text("For Complaints, Please", pageWidth / 2, y, { align: "center" });
    y += 5;
    doc.setFontSize(10);
    doc.text("WhatsApp 0302-8647611", pageWidth / 2, y, { align: "center" });

    y += 8;
    doc.setFontSize(8);
    doc.text("THANKYOU&COME AGAIN", pageWidth / 2, y, { align: "center" });

    doc.save(`Invoice_${sale.id}.pdf`);
};

export const generateReportPDF = (data: any, title: string) => {
    const doc = new jsPDF();

    doc.setFontSize(24);
    doc.setTextColor(126, 34, 206);
    doc.text(title, 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 105, 30, { align: "center" });

    autoTable(doc, {
        startY: 40,
        head: [["Metric", "Value"]],
        body: Object.entries(data).map(([k, v]) => [k, v as string]),
        theme: "grid",
        headStyles: { fillColor: [126, 34, 206] }
    });

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
