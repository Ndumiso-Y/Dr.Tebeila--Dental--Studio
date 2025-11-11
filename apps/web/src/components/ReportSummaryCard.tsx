import { formatCurrency } from '../lib/invoiceUtils';

interface ReportSummaryCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'green' | 'orange' | 'blue' | 'gray';
}

const colorClasses = {
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-gray-50 text-gray-700 border-gray-200',
};

const iconClasses = {
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-600',
  blue: 'bg-blue-100 text-blue-600',
  gray: 'bg-gray-100 text-gray-600',
};

export default function ReportSummaryCard({ title, value, icon, color }: ReportSummaryCardProps) {
  // Format value if it's a number (assumes currency)
  const displayValue = typeof value === 'number' ? formatCurrency(value) : value;

  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold">{displayValue}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${iconClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
