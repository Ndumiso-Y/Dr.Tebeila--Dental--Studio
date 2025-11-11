import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import ReportSummaryCard from '../components/ReportSummaryCard';
import ReportChart from '../components/ReportChart';
import ReportExportBar from '../components/ReportExportBar';

interface InvoiceSummary {
  tenant_id: string;
  month: string;
  status: string;
  invoice_count: number;
  total_amount: number;
  total_paid: number;
  outstanding: number;
}

export default function ReportsDashboard() {
  const { tenantId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<InvoiceSummary[]>([]);

  useEffect(() => {
    if (tenantId) {
      fetchReportsData();
    }
  }, [tenantId]);

  const fetchReportsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[REPORTS_FETCH_START]', { tenantId });

      const { data, error: fetchError } = await supabase
        .from('vw_invoice_summary')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('month', { ascending: false });

      if (fetchError) throw fetchError;

      setSummaryData(data || []);
      console.log('[REPORTS_FETCH_SUCCESS]', data?.length, 'records');
    } catch (err: any) {
      console.error('[REPORTS_FETCH_ERROR]', err);
      setError(err.message || 'Failed to load reports data');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error loading reports: {error}</p>
          <button onClick={fetchReportsData} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  const totalInvoiced = summaryData.reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const totalPaid = summaryData.reduce((sum, item) => sum + (item.total_paid || 0), 0);
  const totalOutstanding = summaryData.reduce((sum, item) => sum + (item.outstanding || 0), 0);
  const quotationCount = summaryData.filter(item => item.status === 'Quotation').reduce((sum, item) => sum + item.invoice_count, 0);

  const monthlyData = summaryData
    .reduce((acc: any[], item) => {
      const existing = acc.find(x => x.month === item.month);
      if (existing) {
        existing.total_amount += item.total_amount || 0;
        existing.total_paid += item.total_paid || 0;
      } else {
        acc.push({
          month: new Date(item.month).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short' }),
          total_amount: item.total_amount || 0,
          total_paid: item.total_paid || 0,
        });
      }
      return acc;
    }, [])
    .slice(0, 6)
    .reverse();

  const statusData = summaryData.reduce((acc: any[], item) => {
    const existing = acc.find(x => x.name === item.status);
    if (existing) {
      existing.value += item.invoice_count;
    } else {
      acc.push({
        name: item.status,
        value: item.invoice_count,
      });
    }
    return acc;
  }, []);

  return (
    <Layout>
      <div id="reports-dashboard">
        <ReportExportBar
          onRefresh={fetchReportsData}
          data={summaryData}
          title="Financial Reports Dashboard"
        />

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReportSummaryCard
              title="Total Invoiced"
              value={totalInvoiced}
              icon="💰"
              color="blue"
            />
            <ReportSummaryCard
              title="Total Paid"
              value={totalPaid}
              icon="✅"
              color="green"
            />
            <ReportSummaryCard
              title="Outstanding"
              value={totalOutstanding}
              icon="⏰"
              color={totalOutstanding > 0 ? 'orange' : 'green'}
            />
            <ReportSummaryCard
              title="Quotations"
              value={quotationCount.toString()}
              icon="📋"
              color="gray"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportChart
              data={monthlyData}
              type="bar"
              title="Monthly Revenue Trend (Last 6 Months)"
            />
            <ReportChart
              data={statusData}
              type="pie"
              title="Invoice Status Distribution"
            />
          </div>

          {summaryData.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-500 text-lg">No invoice data available yet.</p>
              <p className="text-gray-400 mt-2">Create your first invoice to see reports here.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
