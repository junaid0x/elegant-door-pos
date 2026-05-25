import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrder } from '../services/orderService';
import toast from 'react-hot-toast';
import {
  HiOutlinePrinter,
  HiOutlineArrowLeft,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

  return (
    <div className="bg-gray-50 min-h-screen py-8 print:bg-white print:py-0">
      {/* ── Screen-Only Action Bar ── */}
      <div className="max-w-4xl mx-auto mb-6 px-4 print:hidden flex items-center justify-between">
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
          Print Invoice
        </button>
      </div>

      {/* ── Printable Invoice Document ── */}
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg print:shadow-none print:rounded-none overflow-hidden">
        <div className="p-10 sm:p-14 print:p-0">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-12 print:mb-6">
            <div>
              <img 
                src="/logo-new.png" 
                alt="Elegant Doors" 
                className="h-16 object-contain mb-4"
                onError={(e) => {
                  // Fallback just in case logo isn't found
                  e.target.style.display = 'none';
                }}
              />
              <div className="text-gray-600 text-sm space-y-1">
                <p className="font-semibold text-gray-800 text-base">Elegant Doors Inc.</p>
                <p>GST # 790017016</p>
                <p>Unit 108, 17220 Heather Drive</p>
                <p>Surrey, BC V3S 8G6</p>
                <p>+1 (604) 781-1380</p>
                <p><a href="mailto:rddoorsltd@gmail.com" className="text-brand-600 hover:underline">rddoorsltd@gmail.com</a></p>
              </div>
            </div>
            
            <div className="text-left sm:text-right">
              <h1 className="text-4xl font-bold text-gray-800 tracking-tight mb-2 uppercase">Invoice</h1>
              <p className="text-gray-500 font-mono text-lg mb-4">#{order.orderNumber}</p>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <span className="text-gray-500 font-medium">Date:</span>
                <span className="text-gray-800 font-semibold">{formatDate(order.createdAt)}</span>
                
                <span className="text-gray-500 font-medium">Due:</span>
                <span className="text-gray-800 font-semibold">On Receipt</span>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 mb-10 print:mb-6" />

          {/* Billing Info */}
          <div className="mb-12 print:mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 print:mb-1">Bill To</h3>
            <p className="text-lg font-semibold text-gray-800">
              {order.customerInfo?.name || <span className="italic text-gray-500">Walk-in Customer</span>}
            </p>
            {order.customerInfo?.email && (
              <p className="text-gray-600 mt-1">{order.customerInfo.email}</p>
            )}
            {order.customerInfo?.phone && (
              <p className="text-gray-600 mt-1">{order.customerInfo.phone}</p>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-12 print:mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 print:py-2 font-semibold">Description</th>
                  <th className="px-6 py-4 print:py-2 font-semibold text-center w-24">Qty</th>
                  <th className="px-6 py-4 print:py-2 font-semibold text-right w-32">Unit Price</th>
                  <th className="px-6 py-4 print:py-2 font-semibold text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm text-gray-800">
                {order.items?.map((item, index) => (
                  <tr key={item._id || index} className="group hover:bg-gray-50/30 print-avoid-break">
                    <td className="px-6 py-4 print:py-2">
                      {item.product ? (
                        <div className="font-medium text-gray-800">{item.product.name}</div>
                      ) : (
                        <div className="font-medium italic text-gray-600">{item.customName}</div>
                      )}
                      
                      {/* Internal Only: SKU */}
                      {item.product?.sku && (
                        <div className="text-xs text-gray-400 mt-0.5 font-mono print:hidden">SKU: {item.product.sku}</div>
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
                    <td className="px-6 py-4 print:py-2 text-center">{item.quantity}</td>
                    <td className="px-6 py-4 print:py-2 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-6 py-4 print:py-2 text-right font-medium">${Number(item.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes */}
          <div className="flex flex-col sm:flex-row justify-between gap-12">
            <div className="flex-1">
              {order.notes && (
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Order Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 border border-gray-100">
                    {order.notes}
                  </div>
                </div>
              )}
            </div>
            
            <div className="w-full sm:w-72">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-800">${Number(order.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pb-3 border-b border-gray-100">
                  <span>Tax (12%)</span>
                  <span className="font-medium text-gray-800">${Number(order.tax).toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-lg font-bold text-gray-800">Total</span>
                  <span className="text-2xl font-bold text-brand-600">${Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-20 pt-8 print:mt-10 print:pt-4 border-t border-gray-200 text-center text-sm text-gray-400">
            <p>Thank you for your business!</p>
            <p className="mt-1">For any inquiries regarding this invoice, please contact us at contact@elegantdoors.com.</p>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default Invoice;
