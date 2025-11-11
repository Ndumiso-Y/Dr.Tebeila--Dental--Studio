import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportExportBarProps {
  onRefresh: () => void;
  data: any;
  title: string;
}

export default function ReportExportBar({ onRefresh, data, title }: ReportExportBarProps) {
  const [exporting, setExporting] = useState(false);

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const element = document.getElementById('reports-dashboard');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const filename = title.replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.pdf';
      pdf.save(filename);
    } catch (error) {
      console.error('[PDF_EXPORT_ERROR]', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      alert('No data available to export');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? '"' + val + '"' : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = title.replace(/\s+/g, '_') + '_' + new Date().toISOString().split('T')[0] + '.csv';
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <div className="flex gap-2">
          <button
            onClick={exportToPDF}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2"
          >
            📊 {exporting ? 'Exporting...' : 'Export PDF'}
          </button>
          <button
            onClick={exportToCSV}
            className="btn-secondary flex items-center gap-2"
          >
            📁 Download CSV
          </button>
          <button
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2"
          >
            🖨️ Print
          </button>
          <button
            onClick={onRefresh}
            className="btn-secondary flex items-center gap-2"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
