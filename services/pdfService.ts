
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "../types";

export const pdfService = {
  generateInvoicePDF: (invoice: Invoice) => {
    // Standard PDF fonts (Helvetica, Times) do not support the Naira symbol (₦).
    // Using 'N' is the standard, reliable fallback to avoid encoding errors and garbled text.
    const CURR = "N";

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const slate900: [number, number, number] = [15, 23, 42]; // #0f172a
    const slate500: [number, number, number] = [100, 116, 139]; // #64748b
    const slate200: [number, number, number] = [226, 232, 240]; // #e2e8f0
    const slate50: [number, number, number] = [248, 250, 252]; // #f8fafc

    // 1. Header Section
    // Left: Exact Business Name & Email
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    const bizName = (invoice.business.name || 'YOUR BUSINESS').toUpperCase();
    doc.text(bizName, margin, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(invoice.business.email || '', margin, 32);

    if (invoice.business.address) {
      doc.setFontSize(8);
      doc.text(invoice.business.address, margin, 38);
    }
    if (invoice.business.phone) {
      doc.setFontSize(8);
      doc.text(invoice.business.phone, margin, 43);
    }

    // Right: Large "INVOICE" watermark-style & Number
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(240, 240, 240); // Very light gray highlight
    doc.text("INVOICE", pageWidth - margin, 25, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, 32, { align: 'right' });

    // 2. Client & Date Section
    const sectionY = 55;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text("BILL TO", margin, sectionY);
    doc.text("DATE", pageWidth - margin, sectionY, { align: 'right' });

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text(invoice.client.name || 'Client Name', margin, sectionY + 8);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.issueDate, pageWidth - margin, sectionY + 8, { align: 'right' });

    if (invoice.dueDate) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("DUE DATE", pageWidth - margin, sectionY + 16, { align: 'right' });
      doc.setFontSize(10);
      doc.text(invoice.dueDate, pageWidth - margin, sectionY + 24, { align: 'right' });
    }

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(invoice.client.email || '', margin, sectionY + 14);
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, margin, sectionY + 20);
    }
    if (invoice.client.address) {
      doc.text(invoice.client.address, margin, sectionY + 26);
    }

    // 3. Main Bold Horizontal Line - Moved down to avoid overlap with address
    const lineY = sectionY + 40;
    doc.setDrawColor(slate900[0], slate900[1], slate900[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, lineY, pageWidth - margin, lineY);

    // 4. Line Items Table with Headers - Perfectly Aligned
    autoTable(doc, {
      startY: lineY + 5,
      head: [['Description', 'Qty', 'Price', 'Total']],
      body: invoice.items.map(item => [
        item.unit ? `${item.description} (${item.unit})` : (item.description || '...'),
        item.quantity,
        `${invoice.business.currency || CURR}${item.unitPrice.toLocaleString()}`,
        `${invoice.business.currency || CURR}${item.total.toLocaleString()}`
      ]),
      theme: 'plain',
      headStyles: {
        fontSize: 9,
        fontStyle: 'bold',
        textColor: slate500,
        cellPadding: { top: 8, bottom: 8, left: 0, right: 0 } // Synchronized padding
      },
      styles: {
        fontSize: 10,
        cellPadding: { top: 8, bottom: 8, left: 0, right: 0 }, // Synchronized padding
        textColor: slate900,
        font: 'helvetica'
      },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold', halign: 'left' },
        1: { halign: 'center', cellWidth: 25 },
        2: { halign: 'right', cellWidth: 40 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      },
      // Ensure headers follow the same horizontal alignment as columns
      didParseCell: (data) => {
        if (data.section === 'head') {
          if (data.column.index === 1) data.cell.styles.halign = 'center';
          if (data.column.index === 2) data.cell.styles.halign = 'right';
          if (data.column.index === 3) data.cell.styles.halign = 'right';
        }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY || 130;

    // 5. Totals Section
    const totalsX = pageWidth - margin;
    const totalsWidth = 70;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text("Subtotal", totalsX - totalsWidth, currentY + 15);
    doc.text(`${invoice.business.currency || CURR}${invoice.subtotal.toLocaleString()}`, totalsX, currentY + 15, { align: 'right' });

    currentY += 15;

    doc.setDrawColor(slate900[0], slate900[1], slate900[2]);
    doc.setLineWidth(0.5);
    doc.line(totalsX - totalsWidth, currentY + 5, totalsX, currentY + 5);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Total", totalsX - totalsWidth, currentY + 18);
    doc.text(`${invoice.business.currency || CURR}${invoice.total.toLocaleString()}`, totalsX, currentY + 18, { align: 'right' });

    // 6. Payment Details Box
    const boxY = Math.max(currentY + 45, 190);
    const boxHeight = 48;

    doc.setFillColor(slate50[0], slate50[1], slate50[2]);
    doc.setDrawColor(slate200[0], slate200[1], slate200[2]);
    doc.setLineDashPattern([2, 2], 0);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');
    doc.setLineDashPattern([], 0);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text("PAYMENT DETAILS", margin + 10, boxY + 12);

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(invoice.business.bankName || 'Bank Name', margin + 10, boxY + 22);

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text(invoice.business.accountNumber || '', margin + 10, boxY + 35);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(slate500[0], slate500[1], slate500[2]);
    doc.text(invoice.business.accountName?.toUpperCase() || '', margin + 10, boxY + 43);

    doc.setFont("times", "italic");
    doc.setFontSize(36);
    doc.setTextColor(slate900[0], slate900[1], slate900[2]);
    doc.text("Thank you!", pageWidth - margin - 10, boxY + 30, { align: 'right' });

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  }
};
