import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getQuotation, convertQuotationToOrder } from '../services/quotationService';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlineDocumentText,
  HiOutlinePrinter,
  HiOutlineSwitchHorizontal,
} from 'react-icons/hi';
import DocumentPrint from '../components/DocumentPrint';

const QuotationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuotation = async () => {
      try {
        const res = await getQuotation(id);
        setQuotation(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load quotation');
      } finally {
        setLoading(false);
      }
    };
    fetchQuotation();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleConvert = async () => {
    if (!window.confirm('Are you sure you want to convert this quotation to a real order? This will instantly deduct stock for all inventory items.')) return;
    
    setConverting(true);
    try {
      const res = await convertQuotationToOrder(id);
      toast.success('Converted to order successfully!');
      // Navigate to the newly created order
      navigate(`/orders/${res.data.order._id}/edit`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to convert to order');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 print:hidden">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-center mt-12 print:hidden">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
        <p className="text-red-500 mb-4">{error || 'Quotation not found'}</p>
        <button
          onClick={() => navigate('/quotations')}
          className="px-4 py-2 bg-white text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
        >
          Return to Quotations
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:bg-white print:py-0 print:h-auto">
      {/* ── Header Actions (Hidden when printing) ── */}
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-6 px-4 print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Quotation Detail</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <HiOutlinePrinter className="w-4 h-4" />
            Print
          </button>
          
          {quotation.status === 'draft' ? (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <HiOutlineSwitchHorizontal className="w-4 h-4" />
              {converting ? 'Converting...' : 'Convert to Order'}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/orders/${quotation.convertedToOrder?._id}/edit`)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors"
            >
              <HiOutlineDocumentText className="w-4 h-4" />
              View Order {quotation.convertedToOrder?.orderNumber}
            </button>
          )}
        </div>
      </div>

      {/* ── Quotation Document ── */}
      <div className="max-w-5xl mx-auto shadow-lg print:shadow-none print:w-full overflow-hidden">
        <DocumentPrint data={quotation} type="QUOTATION" />
      </div>
    </div>
  );
};

export default QuotationDetail;
