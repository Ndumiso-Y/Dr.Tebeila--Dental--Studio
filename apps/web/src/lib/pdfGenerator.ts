import jsPDF from 'jspdf';
import { InvoiceWithDetails } from './supabase';
import { formatCurrency, formatDateDisplay } from './invoiceUtils';

/**
 * Generate and download a PDF invoice with brand styling
 *
 * @param invoice - The complete invoice with customer and line items
 */
export function generateInvoicePDF(invoice: InvoiceWithDetails): void {
  console.log('[PDF_GEN_START] Generating PDF for invoice:', invoice.invoice_number);

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Brand Colors
  const primaryColor: [number, number, number] = [5, 152, 75]; // #05984B
  const secondaryColor: [number, number, number] = [14, 142, 204]; // #0E8ECC
  const textColor: [number, number, number] = [31, 41, 55]; // gray-800

  // Header: Practice Name with Professional Layout
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('Dr. Tebeila Dental Studio', margin, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Refodile Health Centre • Polokwane', margin, 26);
  doc.text('Quality Dental Care for the Whole Family', margin, 32);

  yPos = 55;

  // Reset text color for body
  doc.setTextColor(...textColor);

  // Invoice Number & Status
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Invoice: ${invoice.invoice_number || 'DRAFT'}`, margin, yPos);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...secondaryColor);
  doc.text(`Status: ${invoice.status}`, margin, yPos + 6);

  doc.setTextColor(...textColor);

  yPos += 15;

  // Patient Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Patient Information', margin, yPos);

  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Name: ${invoice.customer.name}`, margin, yPos);

  if (invoice.customer.cell) {
    yPos += 5;
    doc.text(`Cell: ${invoice.customer.cell}`, margin, yPos);
  }

  if (invoice.customer.email) {
    yPos += 5;
    doc.text(`Email: ${invoice.customer.email}`, margin, yPos);
  }

  if (invoice.customer.phone) {
    yPos += 5;
    doc.text(`Phone: ${invoice.customer.phone}`, margin, yPos);
  }

  if (invoice.customer.id_number) {
    yPos += 5;
    doc.text(`ID Number: ${invoice.customer.id_number}`, margin, yPos);
  }

  if (invoice.customer.home_address) {
    yPos += 5;
    const addressLines = doc.splitTextToSize(`Address: ${invoice.customer.home_address}`, pageWidth - 2 * margin);
    doc.text(addressLines, margin, yPos);
    yPos += (addressLines.length - 1) * 5;
  }

  yPos += 10;

  // Invoice Dates
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Invoice Date:`, margin, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateDisplay(invoice.invoice_date), margin + 30, yPos);

  if (invoice.due_date) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Due Date:`, margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateDisplay(invoice.due_date), margin + 30, yPos);
  }

  yPos += 15;

  // Line Items Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Procedures & Services', margin, yPos);

  yPos += 8;

  // Table Header
  doc.setFillColor(243, 244, 246); // gray-100
  doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text('Description', margin + 2, yPos);
  doc.text('Qty', pageWidth - 100, yPos, { align: 'right' });
  doc.text('Price', pageWidth - 70, yPos, { align: 'right' });
  doc.text('VAT', pageWidth - 45, yPos, { align: 'right' });
  doc.text('Total', pageWidth - margin - 2, yPos, { align: 'right' });

  yPos += 8;

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  // Line Items
  invoice.invoice_items.forEach((item, index) => {
    if (yPos > 260) {
      // Add new page if needed
      doc.addPage();
      yPos = 20;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(249, 250, 251); // gray-50
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 8, 'F');
    }

    doc.text(item.description, margin + 2, yPos);
    doc.text(item.quantity.toString(), pageWidth - 100, yPos, { align: 'right' });
    doc.text(formatCurrency(item.unit_price), pageWidth - 70, yPos, { align: 'right' });
    doc.text(`${item.vat_rate}%`, pageWidth - 45, yPos, { align: 'right' });
    doc.text(formatCurrency(item.line_total_incl_vat), pageWidth - margin - 2, yPos, {
      align: 'right',
    });

    yPos += 8;
  });

  yPos += 5;

  // Totals Section
  doc.setDrawColor(209, 213, 219); // gray-300
  doc.line(pageWidth - 80, yPos, pageWidth - margin, yPos);

  yPos += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Subtotal (Excl. VAT):', pageWidth - 80, yPos);
  doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, yPos, { align: 'right' });

  yPos += 6;

  doc.setTextColor(...secondaryColor);
  doc.text('VAT (15%):', pageWidth - 80, yPos);
  doc.text(formatCurrency(invoice.total_vat), pageWidth - margin, yPos, { align: 'right' });

  doc.setTextColor(...textColor);

  yPos += 2;
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(pageWidth - 80, yPos, pageWidth - margin, yPos);

  yPos += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primaryColor);
  doc.text('Total Amount:', pageWidth - 80, yPos);
  doc.text(formatCurrency(invoice.total_amount), pageWidth - margin, yPos, { align: 'right' });

  doc.setTextColor(...textColor);

  // Payment Information (Gate S5)
  if (invoice.amount_paid !== null && invoice.amount_paid > 0) {
    yPos += 15;

    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Payment Information', margin, yPos);

    yPos += 8;

    // Payment details box
    doc.setFillColor(240, 253, 244); // green-50
    doc.rect(margin, yPos - 5, pageWidth - 2 * margin, 20, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Amount Paid:', margin + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(invoice.amount_paid), margin + 40, yPos);

    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.text('Payment Method:', margin + 5, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.payment_method || 'N/A', margin + 40, yPos);

    // Change due for Cash payments
    if (invoice.payment_method === 'Cash' && invoice.change_due !== null && invoice.change_due > 0) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.text('Change Returned:', margin + 5, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text(formatCurrency(invoice.change_due), margin + 40, yPos);
      doc.setTextColor(...textColor);
    }

    yPos += 10;
  }

  // Notes (if any)
  if (invoice.notes) {
    yPos += 15;

    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', margin, yPos);

    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
    doc.text(notesLines, margin, yPos);

    yPos += notesLines.length * 5;
  }

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 25;

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text('Thank you for your visit — Smile with Confidence 😊', pageWidth / 2, footerY, { align: 'center' });

  doc.setFontSize(8);
  doc.setTextColor(...primaryColor);
  doc.text('Refodile Health Centre • Polokwane', pageWidth / 2, footerY + 5, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text(
    '© 2025 Dr. Tebeila Dental Studio. All rights reserved.',
    pageWidth / 2,
    footerY + 10,
    { align: 'center' }
  );

  // Download the PDF
  const fileName = `${invoice.invoice_number || 'invoice'}.pdf`;
  doc.save(fileName);

  console.log('[PDF_GEN_COMPLETE] PDF downloaded:', fileName);
}
