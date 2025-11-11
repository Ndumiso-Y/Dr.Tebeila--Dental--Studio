import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '../lib/invoiceUtils';

interface ReportChartProps {
  data: any[];
  type: 'bar' | 'pie' | 'line';
  title: string;
}

const STATUS_COLORS = {
  Paid: '#22c55e',
  Finalized: '#eab308',
  Quotation: '#3b82f6',
  Draft: '#6b7280',
  Void: '#dc2626',
  Other: '#f97316',
};

const COLORS = ['#05984B', '#0E8ECC', '#f97316', '#eab308', '#ef4444', '#8b5cf6'];

export default function ReportChart({ data, type, title }: ReportChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'bar' && (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="total_amount" name="Invoiced" fill="#05984B" />
            <Bar dataKey="total_paid" name="Paid" fill="#0E8ECC" />
          </BarChart>
        )}

        {type === 'line' && (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: any) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="total_amount" name="Invoiced" stroke="#05984B" strokeWidth={2} />
            <Line type="monotone" dataKey="total_paid" name="Paid" stroke="#0E8ECC" strokeWidth={2} />
          </LineChart>
        )}

        {type === 'pie' && (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => `${entry.name}: ${entry.value}`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
