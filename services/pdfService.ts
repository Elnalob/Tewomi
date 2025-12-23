
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "../types";
import { CURRENCY } from "../constants";

export const pdfService = {
  generateInvoicePDF: (invoice: Invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text(invoice.business.name, 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Business Details", 20, 30);
    doc.text(`Email: ${invoice.business.email}`, 20, 35);
    doc.text(`Bank: ${invoice.business.bankName}`, 20, 40);
    doc.text(`Acc No: ${invoice.business.accountNumber}`, 20, 45);
    doc.text(`Name: ${invoice.business.accountName}`, 20, 50);

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("INVOICE", pageWidth - 20, 20, { align: "right" });

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Date: ${invoice.issueDate}`, pageWidth - 20, 35, { align: "right" });
    doc.text(`Due: ${invoice.dueDate}`, pageWidth - 20, 40, { align: "right" });

    // Bill To
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Bill To:", 20, 70);
    doc.setFontSize(10);
    doc.text(invoice.client.name, 20, 76);
    doc.text(invoice.client.email, 20, 81);

    // Items Table
    autoTable(doc, {
      startY: 90,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: invoice.items.map(item => [
        item.description,
        item.quantity,
        `${CURRENCY}${item.unitPrice.toLocaleString()}`,
        `${CURRENCY}${item.total.toLocaleString()}`
      ]),
      theme: 'striped',
      headStyles: { fillStyle: 'DF', fillColor: [79, 70, 229] }, // Tailwind indigo-600
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;

    // Totals
    doc.text("Subtotal:", pageWidth - 60, finalY + 10);
    doc.text(`${CURRENCY}${invoice.subtotal.toLocaleString()}`, pageWidth - 20, finalY + 10, { align: "right" });

    doc.text("VAT (7.5%):", pageWidth - 60, finalY + 16);
    doc.text(`${CURRENCY}${invoice.tax.toLocaleString()}`, pageWidth - 20, finalY + 16, { align: "right" });

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Total:", pageWidth - 60, finalY + 25);
    doc.text(`${CURRENCY}${invoice.total.toLocaleString()}`, pageWidth - 20, finalY + 25, { align: "right" });

    // Footer
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Notes:", 20, finalY + 40);
      doc.text(invoice.notes, 20, finalY + 46);
    }

    doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
  }
};
