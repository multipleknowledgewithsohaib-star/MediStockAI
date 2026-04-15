export function buildPharmaInvoiceOcrPrompt() {
    return `
        Extract ALL information from EVERY SINGLE PAGE of this document (image or PDF).
        This document may contain multiple pharmaceutical invoices.
        SCAN EVERY LINE OF EVERY TABLE ON EVERY PAGE. DO NOT SKIP ANY PRODUCT ROW.

        JSON Structure:
        {
            "invoices": [
                {
                    "supplierName": "Name of the supplier",
                    "invoiceNo": "Invoice #",
                    "supplyId": "Supply Id / shipment reference when printed",
                    "date": "YYYY-MM-DD",
                    "total": 0.00,
                    "items": [
        {
            "itemCode": "Printed item code if visible",
            "name": "Full Product Name",
            "packing": "Pack size text if printed, e.g. 20's",
            "batch": "Batch Number",
            "qty": 0,
            "bonus": 0,
            "rate": 0.00,
            "amount": 0.00,
            "discountAmount": 0.00,
            "productDiscountAmount": 0.00,
            "salesTaxAmount": 0.00,
            "furtherTaxAmount": 0.00,
            "advanceTaxAmount": 0.00,
            "discountPercent": 0.00,
            "gstPercent": 0.00,
            "furtherTaxPercent": 0.00,
            "nonAtlTaxPercent": 0.00,
                            "advanceTaxPercent": 0.00,
                            "isATL": true,
                            "net": 0.00,
                            "expiry": "YYYY-MM-DD",
                            "mfgDate": "YYYY-MM-DD"
                        }
                    ]
                }
            ]
        }

        Read the invoice in TWO PASSES:
        1. First identify only real product rows.
        2. Then read each real row strictly from left to right on the SAME horizontal line.

        Real product row rules:
        - A real product row usually starts with a serial number under "No." and often a 4 to 7 digit item code on the far left.
        - Product name is the medicine description on that same row.
        - Ignore company headers, section headers, manufacturer labels, addresses, totals, and tax summaries.
        - Examples of section headers that are NOT products: "ATCO LABORATORIES LIMITED", "CHIESI PHARMACEUTICALS (PRIVATE) LIMITED", "HIGH Q NUTRITION (ST)", "LADA LABORATORIES (ST)".
        - If a line is a manufacturer/group heading in uppercase and does not have its own Qty, Batch, Expiry, Rate, and Amount row values, do not output it as a product.
        - Never move a product name from one row and TP/Qty/Batch/Amount from another row.

        Very important column mapping for pharma invoices:
        - Product name = medicine description column on the left.
        - itemCode = the 4 to 7 digit printed code that appears before the medicine name when present, e.g. 21018.
        - rate = TP / Trade Price / unit price column, NOT row total.
        - qty = Qty. column.
        - bonus = Bon / Bonus column.
        - batch and expiry usually come from Batch/Expiry combined column. Example: "121N013 /7-27" means batch "121N013" and expiry July 2027.
        - net = final row net / payable / total amount for that product line.
        - discountPercent must come from Dist. Disc / Comp Disc / Disc columns only.
        - gstPercent, advanceTaxPercent, nonAtlTaxPercent, furtherTaxPercent must come only from printed tax columns.
        - invoice date must come from the header field labeled "Inv. Date".
        - if the printed invoice year is blurry, use the year from Supply Id when present.

        Apex Distributor invoice layout:
        - Company header can appear as "APEX DISTRIBUTOR" and the document title may read "SALES INVOICE".
        - Use "Invoice No." / "Inv. No." as invoiceNo.
        - Use the top-right "Invoice Date" field or the printed DATE as date.
        - If both Gregorian and Hijri dates appear, keep the Gregorian date only.
        - Ignore "Cheque Date", "Order Date", "Payment Term", "D.O. No.", and any Hijri-only date as the invoice/shipment date.
        - Ignore customer detail blocks, payment terms, order no/order date, salesman, prepared by, page numbers, and footer warranty text.
        - Main table is typically: Quantity | Product Name | Packing | Batch | Expiry | Rate | Gross Amount | Disc. | Amount Exclusive Sales Tax | Sales Tax Amount | Further Tax Amount | Amount Inclusive Sales Tax.
        - Product Name maps to name.
        - Packing maps to packing and should be preserved as printed, e.g. 20's, 10's, 14's.
        - Batch maps to batch.
        - Expiry maps to expiry and is a visible column on every product row when printed.
        - Expiry values like 09/28, 11/28, 10/28, and 08/28 mean month/year. Read them as MM/YY, not day/month.
        - If the expiry column is faint or noisy, still extract the month/year from that cell and do not leave expiry empty.
        - Example row: "AMLO-Q 10MG | 120ml | ASR-07 | 10/27 | 355.51" means expiry is 2027-10-01 and the row is a product row.
        - Rate is the unit price.
        - Quantity is the small whole-number column on the far left.
        - Gross Amount is the row amount before discount/tax.
        - Amount Exclusive Sales Tax is the row subtotal before sales tax.
        - Sales Tax Amount and Further Tax Amount are printed rupee amounts, not quantities.
        - Store Sales Tax Amount in salesTaxAmount and Further Tax Amount in furtherTaxAmount.
        - Leave gstPercent, furtherTaxPercent, and advanceTaxPercent at 0 unless a percentage is explicitly printed.
        - Amount Inclusive Sales Tax is the final row total; store it in net / netAmount.
        - Do not confuse Packing with Batch or Quantity.

        Abdullah Brothers & Co. invoice layout:
        - Company header can appear as "ABDULLAH BROTHERS & CO." and the document title may read "SALES TAX INVOICE".
        - Use "Invoice No." as invoiceNo and "Inv. Date" as date.
        - Ignore "Order Date", "D.O. No.", salesman, deliveryman, payment term, and prepared-by text when extracting invoice date or product data.
        - The table header is: Quantity | Product Name | Packing | Batch | Expiry | Rate | Gross Amount | Disc. % | Amount Exclusive Sales Tax | Sales Tax Amount | Further S. Tax Amt. | Amount Inclusive Sales Tax.
        - In this layout, a manufacturer/group heading is often printed on its own uppercase line above the actual product row. Examples: "AMARANT PHARMACEUTICALS (PVT) LTD", "CONSUMER PRODUCTS", "CONTINENTAL PHARMACEUTICALS", "GENETICS PHARMACEUTICALS", "JENPHARM LIFE SCIENCES", "SCILIFE PHARMA (PVT.) LTD", "SOIS LIFE SCIENCES", "SURGE LABORATORIES", "WILLMAR SCHWABE".
        - Do NOT output those manufacturer/group headings as products.
        - The actual product row is the line below the heading, and it contains the quantity/packing/batch/expiry/rate values for that product.
        - If a line does not have its own printed Qty in the first column and printed Rate in the rate column, do not treat it as a product row.
        - Expiry values like 05/27, 09/27, 08/27, 10/27, 05/29, and 01/30 are month/year values, not day/month values. Convert them to YYYY-MM-01.
        - If a row does not have its own Qty, Packing, Batch, Expiry, or Rate values, it is not a product row.

        Premier Sales / Premier Medico invoice layout:
        - Left to right order is: item code + product name | M.R.P | TP | Qty. | Bon | Batch/Expiry | Amount | Dist. Disc | Comp Disc | GST | Add. GST | Net Amount.
        - Qty is the small whole-number column immediately after TP.
        - Bonus is the next small whole-number column immediately after Qty.
        - Batch/Expiry is immediately after Bonus.
        - Amount is the rounded money column immediately to the right of Batch/Expiry.
        - Dist. Disc and Comp Disc are percentage columns to the right of Amount. Do not mistake them for qty.
        - Handwritten ticks, circles, pen marks, or arrows over Qty / Bon / Batch must be ignored. Use the printed number or printed text underneath.
        - If a section header appears above a group, continue reading the actual product rows below it. Do not output the section header as an item.

        Muller & Phipps Pakistan (Pvt) Ltd. invoice layout:
        - Company header can appear as "MULLER & PHIPPS PAKISTAN (PVT) LTD." and the document title may read "CASH MEMO / INVOICE".
        - Use "Cash Memo/Invoice Number" as invoiceNo.
        - Use "Pick Summary No." as supplyId when it is printed.
        - Ignore metadata such as "Booked By", "Order Number", "Delivered By", "Invoice Due Date", depot information, NTN/STR numbers, and page numbers.
        - Main table is typically: PRODUCT CODE | PRODUCT DESCRIPTION | QTY | BATCH NUMBER | EXPIRY DATE | TP/RATE | GROSS AMOUNT | DISCOUNT AMOUNT | SALES TAX | FURTHER TAX | ADVANCE TAX | VAL. INCL. OF TAXES.
        - PRODUCT CODE maps to itemCode.
        - PRODUCT DESCRIPTION maps to name.
        - QTY is the quantity column and is usually a small whole number.
        - BATCH NUMBER and EXPIRY DATE are separate columns when visible.
        - TP/RATE is the unit rate.
        - GROSS AMOUNT is the row amount before tax.
        - DISCOUNT AMOUNT is usually 0.00 on this layout unless a real printed discount is shown.
        - SALES TAX and FURTHER TAX are often 0.00 on this layout.
        - ADVANCE TAX is a line tax amount in rupees, not a quantity. Store it in advanceTaxAmount.
        - VAL. INCL. OF TAXES is the final row net amount. Store it in net / netAmount.
        - If expiry is printed as a month/year like "SEP/2028" or "AUG/2027", convert it to YYYY-MM-01.
        - Numeric expiry values like "05/28", "06/28", "09/27", and "10/27" are also month/year. Read them as MM/YY, not day/month.
        - If OCR adds a trailing year like "11/28/2023", keep the month/year from the expiry column and ignore the extra trailing year noise.
        - Do not confuse page totals or footer totals with a product row amount.

        Premier examples:
        - TP 272.00 with row amount/net 544 means qty is 2.
        - TP 306.00 with row amount/net 612 means qty is 2.
        - TP 127.50 with row amount/net 383 means qty is 3.
        - TP 382.50 with row amount/net 765 means qty is 2.
        - TP 318.75 with row amount/net 319 means qty is 1.
        - TP 433.50 with row amount/net 867 means qty is 2.
        - DO NOT mistake rounded Amount values such as 319, 383, 544, 612, 765, 867, 1828, 2763, 5624 for quantity.

        UDL Distribution invoice layout:
        - Header company can be "UDL DISTRIBUTION (PVT) LTD".
        - Header fields include "CASH MEMO NO.", "D.C.NO.", and "DATE". Use the printed invoice/cash memo number as invoiceNo.
        - Main table is typically: S.# | PRODUCTS | QTY. | BATCH NO. | TP | TP VALUE / MRP VALUE | DISCOUNT INV / PROD | S. TAX | A. TAX | NET AMOUNT.
        - qty = QTY. column.
        - batch = BATCH NO. column.
        - rate = TP column.
        - net = NET AMOUNT column on the far right.
        - TP VALUE / MRP VALUE is a row value column, not quantity.
        - If TP VALUE is printed separately, return that row amount in "amount".
        - S. TAX and A. TAX are often printed as line tax AMOUNTS in rupees, not percentages.
        - In JSON, convert those printed rupee tax amounts into percentage fields:
          S. TAX -> gstPercent
          A. TAX -> advanceTaxPercent
        - Example: if qty 2 and TP 138.01 gives taxable value about 276, and net is about 277.40, then advanceTaxPercent should be 0.5, NOT 1 rupee.
        - Example: if qty 2 and TP 1071.09 gives taxable value about 2142, and net is about 2152.69, then advanceTaxPercent should be 0.5.
        - Some UDL invoices have split headers: DISCOUNT -> INV. / PROD., then S. TAX, A.I TAX, NET AMOUNT.
        - In those split-discount UDL invoices:
          PRODUCTS -> name
          QTY. -> qty
          BATCH NO. -> batch
          TP -> rate
          TP VALUE -> amount
          MRP VALUE is not needed; do not copy MRP VALUE into qty, rate, batch, or net.
          DISCOUNT INV. -> invoice discount for that row. If it is printed as a rupee amount, convert it into discountPercent and also return the rupee amount in discountAmount.
          DISCOUNT PROD. -> productDiscountAmount only when a real value is printed, otherwise keep it 0.
          S. TAX -> gstPercent and salesTaxAmount.
          A.I TAX / A. TAX -> advanceTaxPercent and advanceTaxAmount.
        - Common UDL split-discount pattern:
          INV discount is 1.5% of TP VALUE.
          S. TAX is 22.00%.
          A.I TAX / A. TAX is often 0.61% or 0.5%.
        - NEVER place A.I TAX rupee amount inside salesTaxAmount / S. TAX.
        - If one small printed tax amount fits about 0.5% or 0.61% and does not fit about 22%, store it as advanceTaxAmount, not salesTaxAmount.
        - NET AMOUNT on UDL should already include invoice discount, S. TAX, and A.I TAX / A. TAX.
        - License expiry printed in the top-right header is NOT the medicine expiry date. Do not copy license expiry into item expiry.
        - Many UDL invoices do not print item expiry in the line table. If not printed on the row, leave item expiry empty.

        UDL bonus section rules:
        - A separate "Bonus" section may appear below the main table.
        - A row inside the Bonus section is NOT a new billed line item.
        - If a bonus row repeats a product from the main table, add its printed quantity to that product's "bonus" field instead of creating a duplicate item.
        - Bonus rows usually do not have valid TP, subtotal, or net columns. Do NOT copy invoice subtotal, subtotal rounded off, or net payable amount into rate or net for bonus rows.
        - If a product appears once in the main table and again in Bonus, keep one item only:
          main row qty = billed quantity
          bonus = bonus section quantity
          rate/net = from the billed main row only

        Rules:
        1. MULTI-PAGE: Extract every product row from every page.
        2. MULTI-INVOICE: Keep each invoice separate inside the "invoices" array.
        3. DO NOT treat supplier names, company headers, addresses, NTN/GST info, totals, or table headings as products.
        4. BATCH: return only the batch code. EXPIRY: convert month/year or printed date to YYYY-MM-DD when possible.
        5. If a printed qty digit has a pen tick, slash, or handwritten check mark over it, use the printed digit only.
        6. NEVER copy row total/net amount into "qty" or "rate".
        7. NEVER use invoice total as unit price.
        8. Prefer printed table columns over any handwritten marks or stamps.
        9. If qty candidate looks like a money amount or rounded amount column value, reject it and use the actual small integer from Qty column, otherwise set "qty" to 0.
        10. If TP/unit price is unreadable set "rate" to 0.
        11. Keep the row line amount in "net" even if qty/rate are unreadable.
        12. Return ONLY the JSON object.
    `;
}
