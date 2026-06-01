import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder } from '../services/orderService';
import toast from 'react-hot-toast';
import {
  HiOutlinePrinter,
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';
import DocumentPrint from '../components/DocumentPrint';

const Invoice = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getOrder(id);
        setOrder(res.data);
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load invoice data';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 print:hidden">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-center mt-12 print:hidden">
        <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Invoice</h3>
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
        >
          Return to Orders
        </button>
      </div>
    );
  }

  if (!order) return null;

  // Dynamically name document Type based on status
  const documentType = ['shipped', 'completed', 'payment_pending'].includes(order.status) 
    ? 'INVOICE' 
    : 'ORDER';

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:bg-white print:py-0 print:h-auto">
      {/* ── Screen-Only Action Bar ── */}
      <div className="max-w-5xl mx-auto mb-6 px-4 print:hidden flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Back to Orders
        </button>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all shadow-sm"
        >
          <HiOutlinePrinter className="w-4 h-4" />
          Print Document
        </button>
      </div>

      {/* ── Printable Invoice Document ── */}
      <div className="max-w-5xl mx-auto shadow-lg print:shadow-none print:w-full overflow-hidden">
        <DocumentPrint data={order} type={documentType} />
      </div>
    </div>
  );
};

export default Invoice;
