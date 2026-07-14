
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Invoice } from "../types";
import { storageService } from "./storageService";
import { VAT_RATE } from "../constants";

// --- Design System ---
// All colours are [R, G, B] tuples used throughout the PDF

/** Deep slate — primary text */
const INK: [number, number, number] = [15, 23, 42];        // #0f172a
/** Mid slate — secondary / labels */
const MUTED: [number, number, number] = [100, 116, 139];   // #64748b
/** Light slate — borders / dividers */
const BORDER: [number, number, number] = [226, 232, 240];  // #e2e8f0
/** Background tint — payment box fill */
const SURFACE: [number, number, number] = [248, 250, 252]; // #f8fafc
/** Indigo accent — header bar, total row highlight */
const ACCENT: [number, number, number] = [79, 70, 229];    // #4f46e5
/** Accent tint — subtle accent fills */
const ACCENT_LIGHT: [number, number, number] = [238, 242, 255]; // #eef2ff
/** Green — paid / balance highlight */
const GREEN: [number, number, number] = [34, 197, 94];     // #22c55e

/**
 * Converts a title-case string (handles multi-word descriptions cleanly).
 */
const toTitleCase = (str: string): string =>
  str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/**
 * Formats a number as a Naira (or custom currency) amount string.
 * jsPDF standard fonts don't support ₦, so we fall back to 'N'.
 */
const fmt = (amount: number, currency: string): string =>
  `${currency}${amount.toLocaleString('en-NG')}`;

/**
 * Draws the top accent bar that anchors the entire document header visually.
 */
const drawHeaderBar = (doc: jsPDF, pageWidth: number) => {
  // Solid indigo top stripe
  doc.setFillColor(ACCENT[0], ACCENT[1], ACCENT[2]);
  doc.rect(0, 0, pageWidth, 6, 'F');
};

/**
 * Draws a subtle watermark "TEWOMI" text in the background.
 * Runs after all content is placed so it sits behind nothing.
 */
const drawWatermark = (doc: jsPDF, pageWidth: number, pageHeight: number) => {
  doc.saveGraphicsState();
  // Very transparent light gray
  doc.setTextColor(240, 240, 240);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  // Rotate + center on page
  doc.text("TEWOMI", pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
};

export const pdfService = {
  generateInvoicePDF: (invoice: Invoice) => {
    // Standard PDF fonts don't support ₦ — use 'N' as the reliable fallback
    const CURR = "N";
    const currency = invoice.business.currency ? invoice.business.currency.replace('₦', 'N') : CURR;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const rightEdge = pageWidth - margin;

    // ────────────────────────────────────────────────
    // WATERMARK (drawn first, behind all content)
    // ────────────────────────────────────────────────
    drawWatermark(doc, pageWidth, pageHeight);

    // ────────────────────────────────────────────────
    // HEADER BAR
    // ────────────────────────────────────────────────
    drawHeaderBar(doc, pageWidth);

    // ────────────────────────────────────────────────
    // LOGO (if stored in localStorage)
    // ────────────────────────────────────────────────
    const logoBase64 = storageService.getLogo();
    let logoEndX = margin; // track where logo ends so text flows right of it

    if (logoBase64) {
      try {
        // Detect image format from base64 header
        const formatMatch = logoBase64.match(/^data:image\/(png|jpe?g|webp);base64,/i);
        const imgFormat = formatMatch ? formatMatch[1].toUpperCase().replace('JPEG', 'JPEG') : 'PNG';
        const pdfFormat = imgFormat === 'WEBP' ? 'JPEG' : imgFormat as 'PNG' | 'JPEG';

        // Target: max 40mm wide, max 20mm tall, maintain aspect ratio
        const tmpImg = new Image();
        tmpImg.src = logoBase64;
        const naturalW = tmpImg.naturalWidth || 300;
        const naturalH = tmpImg.naturalHeight || 100;
        const aspectRatio = naturalW / naturalH;

        let imgW = 40;
        let imgH = imgW / aspectRatio;
        if (imgH > 20) { imgH = 20; imgW = imgH * aspectRatio; }

        doc.addImage(logoBase64, pdfFormat, margin, 10, imgW, imgH);
        logoEndX = margin + imgW + 4; // 4mm gap after logo
      } catch (e) {
        console.warn("Logo could not be embedded in PDF:", e);
        logoEndX = margin;
      }
    }

    // ────────────────────────────────────────────────
    // BUSINESS DETAILS (left, below or beside logo)
    // ────────────────────────────────────────────────
    const bizY = logoBase64 ? 34 : 15;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const bizName = (invoice.business.name || 'YOUR BUSINESS').toUpperCase();
    doc.text(bizName, margin, bizY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    let bizDetailY = bizY + 6;
    if (invoice.business.email) {
      doc.text(invoice.business.email, margin, bizDetailY);
      bizDetailY += 5;
    }
    if (invoice.business.phone) {
      doc.text(invoice.business.phone, margin, bizDetailY);
      bizDetailY += 5;
    }
    if (invoice.business.address) {
      doc.text(invoice.business.address, margin, bizDetailY);
    }

    // ────────────────────────────────────────────────
    // "INVOICE" LABEL + NUMBER (right-aligned)
    // ────────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(ACCENT_LIGHT[0], ACCENT_LIGHT[1], ACCENT_LIGHT[2]);
    doc.text("INVOICE", rightEdge, 22, { align: 'right' });

    doc.setFontSize(10);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(`#${invoice.invoiceNumber}`, rightEdge, 30, { align: 'right' });

    // ────────────────────────────────────────────────
    // THIN DIVIDER
    // ────────────────────────────────────────────────
    const dividerY = 48;
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, dividerY, rightEdge, dividerY);

    // ────────────────────────────────────────────────
    // BILL TO + DATE BLOCK
    // ────────────────────────────────────────────────
    const sectionY = dividerY + 8;

    // Left: Bill To
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("BILL TO", margin, sectionY);

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(invoice.client.name || 'Client Name', margin, sectionY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    let clientDetailY = sectionY + 14;
    if (invoice.client.email) {
      doc.text(invoice.client.email, margin, clientDetailY);
      clientDetailY += 5;
    }
    if (invoice.client.phone) {
      doc.text(invoice.client.phone, margin, clientDetailY);
      clientDetailY += 5;
    }
    if (invoice.client.address) {
      doc.text(invoice.client.address, margin, clientDetailY);
    }

    // Right: Dates
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("ISSUE DATE", rightEdge, sectionY, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(invoice.issueDate, rightEdge, sectionY + 7, { align: 'right' });

    if (invoice.dueDate) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text("DUE DATE", rightEdge, sectionY + 16, { align: 'right' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(invoice.dueDate, rightEdge, sectionY + 23, { align: 'right' });
    }

    // ────────────────────────────────────────────────
    // BOLD DIVIDER before line items
    // ────────────────────────────────────────────────
    const tableStartY = sectionY + 36;
    doc.setDrawColor(INK[0], INK[1], INK[2]);
    doc.setLineWidth(1.2);
    doc.line(margin, tableStartY, rightEdge, tableStartY);

    // ────────────────────────────────────────────────
    // LINE ITEMS TABLE
    // ────────────────────────────────────────────────
    autoTable(doc, {
      startY: tableStartY + 2,
      head: [['Description', 'Qty', 'Unit Price', 'Total']],
      body: invoice.items.map(item => [
        item.unit
          ? `${toTitleCase(item.description)} (${item.unit})`
          : toTitleCase(item.description || '...'),
        item.quantity,
        fmt(item.unitPrice, currency),
        fmt(item.total, currency)
      ]),
      theme: 'plain',
      headStyles: {
        fontSize: 8,
        fontStyle: 'bold',
        textColor: MUTED,
        cellPadding: { top: 6, bottom: 6, left: 0, right: 0 },
        fillColor: false
      },
      styles: {
        fontSize: 10,
        cellPadding: { top: 7, bottom: 7, left: 0, right: 0 },
        textColor: INK,
        font: 'helvetica',
        lineColor: BORDER,
        lineWidth: 0
      },
      alternateRowStyles: {
        fillColor: SURFACE
      },
      columnStyles: {
        0: { cellWidth: 'auto', fontStyle: 'bold', halign: 'left' },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'right', cellWidth: 38 },
        3: { halign: 'right', fontStyle: 'bold', cellWidth: 42 },
      },
      didParseCell: (data) => {
        // Align headers to match column alignment
        if (data.section === 'head') {
          if (data.column.index === 1) data.cell.styles.halign = 'center';
          if (data.column.index === 2) data.cell.styles.halign = 'right';
          if (data.column.index === 3) data.cell.styles.halign = 'right';
        }
      },
      didDrawCell: (data) => {
        // Draw bottom border on each row for clean separation
        if (data.section === 'body') {
          doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
          doc.setLineWidth(0.3);
          doc.line(
            data.cell.x, data.cell.y + data.cell.height,
            data.cell.x + data.cell.width, data.cell.y + data.cell.height
          );
        }
      }
    });

    // ────────────────────────────────────────────────
    // TOTALS SECTION
    // ────────────────────────────────────────────────
    let currentY = (doc as any).lastAutoTable.finalY || 130;
    const pageHeight2 = doc.internal.pageSize.getHeight();
    const footerMargin = 20;

    // Estimate total height needed for totals + payment box
    const vatRowH = invoice.vatEnabled ? 10 : 0;
    const splitRowH = invoice.splitPayment ? 22 : 0;
    const requiredH = 45 + vatRowH + splitRowH + footerMargin;

    if (currentY + requiredH > pageHeight2) {
      doc.addPage();
      currentY = 20;
      drawHeaderBar(doc, pageWidth);
    }

    currentY += 10;
    const totalsLabelX = rightEdge - 65;

    // Helper: draw a totals row
    const drawTotalsRow = (
      label: string,
      value: string,
      yPos: number,
      bold = false,
      color: [number, number, number] = MUTED
    ) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(bold ? 11 : 10);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(label, totalsLabelX, yPos);
      doc.setTextColor(bold ? INK[0] : MUTED[0], bold ? INK[1] : MUTED[1], bold ? INK[2] : MUTED[2]);
      doc.text(value, rightEdge, yPos, { align: 'right' });
    };

    // Subtotal
    drawTotalsRow('Subtotal', fmt(invoice.subtotal, currency), currentY);
    currentY += 8;

    // 7.5% VAT row (only if vatEnabled)
    if (invoice.vatEnabled && invoice.vatAmount != null) {
      drawTotalsRow(
        `VAT (${(VAT_RATE * 100).toFixed(1)}%)`,
        fmt(invoice.vatAmount, currency),
        currentY
      );
      currentY += 8;
    }

    // Divider above total
    doc.setDrawColor(INK[0], INK[1], INK[2]);
    doc.setLineWidth(0.6);
    doc.line(totalsLabelX, currentY, rightEdge, currentY);
    currentY += 8;

    // Grand Total — prominent
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text("Total", totalsLabelX, currentY);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text(fmt(invoice.total, currency), rightEdge, currentY, { align: 'right' });
    currentY += 10;

    // Split Payment breakdown (if active)
    if (invoice.splitPayment) {
      const sp = invoice.splitPayment;
      currentY += 4;

      // Accent pill header for split payment
      doc.setFillColor(ACCENT_LIGHT[0], ACCENT_LIGHT[1], ACCENT_LIGHT[2]);
      doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, pageWidth - (margin * 2), 26, 2, 2, 'FD');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
      doc.text("PAYMENT SCHEDULE", margin + 6, currentY + 7);

      // Deposit row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      const depositLabel = sp.depositPercent
        ? `Commitment Deposit Due Now (${sp.depositPercent}%)`
        : `Commitment Deposit Due Now`;
      doc.text(depositLabel, margin + 6, currentY + 15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(fmt(sp.depositAmount, currency), rightEdge - 6, currentY + 15, { align: 'right' });

      // Balance row
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      doc.text("Balance Upon Delivery/Completion", margin + 6, currentY + 22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(GREEN[0], GREEN[1], GREEN[2]);
      doc.text(fmt(sp.balance, currency), rightEdge - 6, currentY + 22, { align: 'right' });

      currentY += 32;
    }

    // ────────────────────────────────────────────────
    // PAYMENT DETAILS BOX
    // ────────────────────────────────────────────────
    const boxSpacing = 10;
    const boxH = 42;
    let boxY = currentY + boxSpacing;

    // Check page overflow again for the payment box
    if (boxY + boxH + footerMargin > pageHeight2) {
      doc.addPage();
      boxY = 20;
      drawHeaderBar(doc, pageWidth);
    }

    doc.setFillColor(SURFACE[0], SURFACE[1], SURFACE[2]);
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, boxY, pageWidth - (margin * 2), boxH, 2, 2, 'FD');
    doc.setLineDashPattern([], 0);

    // Payment Details — label
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("PAYMENT DETAILS", margin + 8, boxY + 9);

    // Bank name
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(invoice.business.bankName || 'Bank Name', margin + 8, boxY + 17);

    // Account number — large and bold
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(invoice.business.accountNumber || '', margin + 8, boxY + 28);

    // Account holder name
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(
      (invoice.business.accountName || '').toUpperCase(),
      margin + 8, boxY + 35
    );

    // "Thank you!" calligraphy on the right
    doc.setFont("times", "italic");
    doc.setFontSize(28);
    doc.setTextColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.text("Thank you!", rightEdge - 8, boxY + 30, { align: 'right' });

    // ────────────────────────────────────────────────
    // FOOTER — Tewomi branding
    // ────────────────────────────────────────────────
    const finalPageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(
      `Generated by Tewomi Invoicer  •  ${new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}`,
      pageWidth / 2, finalPageHeight - 10,
      { align: 'center' }
    );

    // Thin accent bottom line
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, finalPageHeight - 6, rightEdge, finalPageHeight - 6);

    doc.save(`Invoice_${invoice.invoiceNumber}_${invoice.client.name || 'Client'}.pdf`);
  }
};
