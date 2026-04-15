const roundCurrency = (value: number) => Number((Number(value) || 0).toFixed(2));

const escapeHtml = (value: unknown) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const normalizeInvoiceItem = (item: any) => {
    const quantity = Number(item?.quantity) || 0;
    const rate = roundCurrency(
        item?.rateAtSaleTime ??
        item?.rate ??
        item?.price ??
        0
    );
    const discountAmount = roundCurrency(
        item?.discountAmountAtSaleTime ??
        item?.discountAmount ??
        0
    );
    const lineTotal = roundCurrency(
        item?.netAmount ??
        item?.lineTotal ??
        (rate * quantity) - discountAmount
    );

    return {
        name: String(item?.product?.name || item?.name || "Unknown Product"),
        quantity,
        rate,
        discountAmount,
        lineTotal,
    };
};

export const printInvoice = (sale: any, userName?: string) => {
    const printWindow = window.open("", "_blank", "width=420,height=700");
    if (!printWindow) return;

    const items = Array.isArray(sale?.items) ? sale.items.map(normalizeInvoiceItem) : [];
    const totalGross = roundCurrency(items.reduce((acc: number, item: ReturnType<typeof normalizeInvoiceItem>) => acc + (item.rate * item.quantity), 0));
    const totalDiscount = roundCurrency(items.reduce((acc: number, item: ReturnType<typeof normalizeInvoiceItem>) => acc + item.discountAmount, 0) || sale?.discount || 0);
    const grandTotal = roundCurrency(sale?.total ?? items.reduce((acc: number, item: ReturnType<typeof normalizeInvoiceItem>) => acc + item.lineTotal, 0));
    const paidAmount = roundCurrency(sale?.paidAmount ?? grandTotal);
    const changeAmount = roundCurrency(sale?.changeAmount ?? Math.max(0, paidAmount - grandTotal));
    const receiptNo = sale?.invoiceNo || `INV-${String(sale?.id ?? "").padStart(6, "0")}`;
    const saleDate = sale?.date ? new Date(sale.date) : new Date();

    const html = `
        <html>
            <head>
                <title>Invoice ${escapeHtml(receiptNo)}</title>
                <style>
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        width: 72mm;
                        margin: 0;
                        padding: 2mm;
                        font-size: 10px;
                        line-height: 1.25;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 4px 0; }
                    .meta-row, .summary-row {
                        display: flex;
                        justify-content: space-between;
                        gap: 8px;
                    }
                    .item {
                        margin-bottom: 6px;
                    }
                    .item-grid {
                        display: grid;
                        grid-template-columns: 1.6fr 0.7fr 1fr 1fr 1fr;
                        gap: 4px;
                        align-items: center;
                    }
                    .tiny {
                        font-size: 8px;
                    }
                    .totals-box {
                        border: 1px solid #000;
                        padding: 4px;
                        margin: 8px 0;
                    }
                    @media print {
                        @page {
                            size: 80mm auto;
                            margin: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="text-center">
                    <div class="bold" style="font-size:18px;">MediStock</div>
                    <div>SHAHRAH-E-PAKISTAN, KARACHI</div>
                    <div>UAN: 021 111 246 246</div>
                    <div class="bold" style="margin-top: 4px;">CUSTOMER INVOICE</div>
                </div>

                <div class="divider"></div>

                <div class="meta-row">
                    <span>Invoice:</span>
                    <span class="bold">${escapeHtml(receiptNo)}</span>
                </div>
                <div class="meta-row">
                    <span>Date:</span>
                    <span>${escapeHtml(saleDate.toLocaleDateString())}</span>
                </div>
                <div class="meta-row">
                    <span>Time:</span>
                    <span>${escapeHtml(saleDate.toLocaleTimeString())}</span>
                </div>
                <div class="meta-row">
                    <span>User:</span>
                    <span>${escapeHtml(userName || "MediStock User")}</span>
                </div>
                <div>Customer: WALK-IN CUSTOMER</div>

                <div class="divider"></div>
                <div class="item-grid tiny bold">
                    <div>Product</div>
                    <div class="text-right">Qty</div>
                    <div class="text-right">Rate</div>
                    <div class="text-right">Disc</div>
                    <div class="text-right">Total</div>
                </div>
                <div class="divider"></div>

                ${items.map((item: ReturnType<typeof normalizeInvoiceItem>) => `
                    <div class="item">
                        <div class="bold">${escapeHtml(item.name)}</div>
                        <div class="item-grid">
                            <div></div>
                            <div class="text-right">${item.quantity}</div>
                            <div class="text-right">${item.rate.toFixed(2)}</div>
                            <div class="text-right">${item.discountAmount.toFixed(2)}</div>
                            <div class="text-right bold">${item.lineTotal.toFixed(2)}</div>
                        </div>
                    </div>
                `).join("")}

                <div class="divider"></div>

                <div class="summary-row">
                    <span>Gross Total</span>
                    <span>${totalGross.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Discount (PKR)</span>
                    <span>${totalDiscount.toFixed(2)}</span>
                </div>
                <div class="summary-row bold">
                    <span>Grand Total</span>
                    <span>${grandTotal.toFixed(2)}</span>
                </div>

                <div class="totals-box">
                    <div class="summary-row">
                        <span>Cash Received</span>
                        <span>${paidAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Change Return</span>
                        <span>${changeAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div class="divider"></div>
                <div class="text-center tiny">
                    Discount is shown in rupees as applied at the time of sale.<br/>
                    Product discount percentage is not printed on customer invoices.
                </div>

                <div style="margin-top: 10px;" class="text-center bold">
                    THANK YOU & COME AGAIN
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(function () { window.close(); }, 100);
                    };
                </script>
            </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
};
