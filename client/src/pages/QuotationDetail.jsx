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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error || !quotation) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-center mt-12">
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
    <div className="max-w-4xl mx-auto pb-12 print:p-0 print:max-w-full">
      {/* ── Header Actions (Hidden when printing) ── */}
      <div className="flex items-center justify-between mb-8 print:hidden">
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
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden print:border-none print:shadow-none mt-6 print:mt-0">
        <div className="p-8 print:p-0">
          <div className="flex justify-between items-start mb-8 print:mb-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">QUOTATION</h2>
              <p className="text-gray-500 font-mono">{quotation.quotationNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">Elegant Doors</p>
              <p className="text-gray-500 text-sm">123 Business Ave</p>
              <p className="text-gray-500 text-sm">City, State 12345</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8 print:mb-4">
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 print:mb-1">Quote For</h3>
              <p className="font-medium text-gray-800">{quotation.customerInfo?.name || 'Walk-in Customer'}</p>
              {quotation.customerInfo?.email && <p className="text-gray-600 text-sm">{quotation.customerInfo.email}</p>}
            </div>
            <div className="text-right">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 print:mb-1">Date</h3>
              <p className="font-medium text-gray-800">
                {new Date(quotation.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {quotation.status === 'converted' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                  Converted to Order
                </span>
              )}
            </div>
          </div>

          <table className="w-full text-left mb-8 print:mb-4">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 print:py-1 font-semibold text-gray-700">Item</th>
                <th className="py-3 print:py-1 font-semibold text-gray-700 text-center w-24">Qty</th>
                <th className="py-3 print:py-1 font-semibold text-gray-700 text-right w-32">Price</th>
                <th className="py-3 print:py-1 font-semibold text-gray-700 text-right w-32">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotation.items?.map((item, idx) => (
                <tr key={idx} className="print-avoid-break">
                  <td className="py-4 print:py-1">
                    <p className="font-medium text-gray-800">{item.product ? item.product.name : item.customName}</p>
                    
                    {/* Internal Only: SKU */}
                    {item.product?.sku && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono print:hidden">SKU: {item.product.sku}</p>
                    )}
                    
                    {/* Internal Only: Bundled Items */}
                    {item.product?.bundles?.length > 0 && (
                      <div className="pl-3 mt-1.5 space-y-1 border-l-2 border-gray-200 py-1 rounded-r-md print:hidden">
                        {item.product.bundles.map((b, i) => (
                          <div key={i} className="text-xs text-gray-500 flex items-center gap-1.5">
                            <span className="text-gray-300 font-bold">↳</span> 
                            <span>{b.product?.name || 'Unknown Item'}</span>
                            <span className="font-semibold text-gray-600">x{b.quantity}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    </td>
                    <td className="px-6 py-4 print:py-1 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 print:py-1 text-right text-gray-600">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 print:py-1 text-right font-medium text-gray-800">${item.lineTotal.toFixed(2)}</td>
                  </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">${quotation.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (12%)</span>
                <span className="font-medium">${quotation.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-brand-600">${quotation.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {quotation.notes && (
            <div className="mt-8 pt-8 print:mt-4 print:pt-4 border-t border-gray-100 print-avoid-break">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 print:mb-1">Notes</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap">{quotation.notes}</p>
            </div>
          )}
          
          <div className="mt-12 print:mt-6 text-center text-gray-400 text-sm italic print:block hidden print-avoid-break">
            This is a quotation, not an invoice. Prices are subject to change.
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationDetail;
