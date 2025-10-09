import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';

export default function InvoiceDetail() {
  const { id } = useParams();

  return (
    <Layout>
      <div className="card">
        <h1 className="text-2xl font-bold mb-4">Invoice Detail</h1>
        <p className="text-gray-600">Invoice ID: {id}</p>
        <p className="text-sm text-gray-500 mt-4">
          (Detail view to be implemented)
        </p>
      </div>
    </Layout>
  );
}
