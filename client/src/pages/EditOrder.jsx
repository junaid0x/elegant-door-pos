import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import { getOrder, updateOrder } from '../services/orderService';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSave,
  HiOutlineShoppingBag,
  HiOutlineRefresh,
} from 'react-icons/hi';

const EditOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // ─── State ───────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [products, setProducts] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');

  // Header State
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  
  // Items State
  const [items, setItems] = useState([]);

  // ─── Data Fetching ───────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        // Fetch products and order in parallel
        const [productsRes, orderRes] = await Promise.all([
          getProducts(),
          getOrder(id)
        ]);
        
        setProducts(productsRes.data);
        
        const order = orderRes.data;
        setOrderNumber(order.orderNumber);
        setCustomerName(order.customerInfo?.name || '');
        setStatus(order.status || 'draft');
        setNotes(order.notes || '');
        
        // Map backend items to frontend state format
        const mappedItems = order.items.map((item) => ({
          id: crypto.randomUUID(), // Local frontend ID for React keys
          type: item.product ? 'product' : 'custom',
          product: item.product?._id || '',
          customName: item.customName || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
        }));
        
        setItems(mappedItems);
        
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load order data';
        setError(message);
        toast.error(message);
      } finally {
        setInitialFetchLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

  // ─── Handlers ────────────────────────────────────────────────
  const handleAddLine = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        type: 'product',
        product: '',
        customName: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveLine = (itemId) => {
    if (items.length === 1) {
      toast.error('Order must have at least one line');
      return;
    }
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleUpdateLine = (itemId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          // If the user selects a new product from the dropdown, auto-fill the unit price
          if (field === 'product' && value !== '') {
            const selectedProduct = products.find((p) => p._id === value);
            if (selectedProduct) {
              updatedItem.unitPrice = selectedProduct.price;
              updatedItem.customName = '';
            }
          }

          // If switching to custom, clear product ID
          if (field === 'type' && value === 'custom') {
            updatedItem.product = '';
            updatedItem.unitPrice = 0;
          }
          
          // If switching to product, clear customName
          if (field === 'type' && value === 'product') {
            updatedItem.customName = '';
            updatedItem.unitPrice = 0;
          }

          return updatedItem;
        }
        return item;
      })
    );
  };

  // ─── Calculations ────────────────────────────────────────────
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [items]);

  // Fixed 12% Tax
  const tax = useMemo(() => {
    return subtotal * 0.12;
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + Number(tax || 0);
  }, [subtotal, tax]);

  // ─── Submission ──────────────────────────────────────────────
  const handleSave = async () => {
    // Validation
    const invalidItem = items.find(
      (i) =>
        (i.type === 'product' && !i.product) ||
        (i.type === 'custom' && !i.customName.trim())
    );

    if (invalidItem) {
      toast.error('Please complete all item names/selections');
      return;
    }

    if (items.some((i) => i.quantity < 1)) {
      toast.error('Quantity must be at least 1 for all items');
      return;
    }

    setLoading(true);

    try {
      // Map frontend state to backend schema
      const payloadItems = items.map((i) => ({
        ...(i.type === 'product' ? { product: i.product } : { customName: i.customName }),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.quantity) * Number(i.unitPrice),
      }));

      const payload = {
        customerInfo: { name: customerName },
        status,
        notes,
        items: payloadItems,
        subtotal,
        tax: Number(tax),
        total,
      };

      await updateOrder(id, payload);
      toast.success('Order updated successfully!');
      navigate('/orders');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update order';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────
  if (initialFetchLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-red-50 border border-red-200 rounded-xl text-center mt-12">
        <h3 className="text-lg font-semibold text-red-700 mb-2">Error Loading Order</h3>
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

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* ── Header Actions ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <HiOutlineShoppingBag className="w-6 h-6 text-brand-600" />
              Edit Order {orderNumber && <span className="text-gray-400 font-mono text-xl">#{orderNumber}</span>}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Modify order lines or update status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/orders')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <HiOutlineSave className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left Column: Main Order Details ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Order Lines Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Order Lines</h2>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-semibold min-w-[130px]">Type</th>
                    <th className="px-4 py-3 font-semibold min-w-[250px]">Item</th>
                    <th className="px-4 py-3 font-semibold w-24 min-w-[100px]">Qty</th>
                    <th className="px-4 py-3 font-semibold w-32 min-w-[120px]">Price</th>
                    <th className="px-4 py-3 font-semibold text-right w-32 min-w-[100px]">Total</th>
                    <th className="px-4 py-3 font-semibold text-center w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id} className="bg-white">
                      <td className="px-4 py-4 align-top">
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateLine(item.id, 'type', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 min-w-[110px]"
                        >
                          <option value="product">Inventory</option>
                          <option value="custom">Custom</option>
                        </select>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {item.type === 'product' ? (
                          <div className="flex flex-col gap-1">
                            <select
                              value={item.product}
                              onChange={(e) => handleUpdateLine(item.id, 'product', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 min-w-[220px]"
                            >
                              <option value="" disabled>Select product...</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id} disabled={p.quantity === 0}>
                                  {p.name} {p.quantity === 0 ? '(Out of Stock)' : `($${p.price})`}
                                </option>
                              ))}
                            </select>
                            {(() => {
                              const p = products.find((prod) => prod._id === item.product);
                              return (
                                <>
                                  {p?.barcode && (
                                    <span className="text-xs text-gray-500 font-mono px-1 mt-1">
                                      Barcode: {p.barcode}
                                    </span>
                                  )}
                                  {p?.bundles?.length > 0 && (
                                    <div className="pl-3 mt-1.5 space-y-1 border-l-2 border-brand-200 bg-brand-50/30 py-1.5 px-2 rounded-r-md">
                                      {p.bundles.map((b, i) => (
                                        <div key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                          <span className="text-brand-400 font-bold">↳</span> 
                                          <span>{b.product?.name || 'Unknown Item'}</span>
                                          <span className="font-semibold text-gray-800 bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">x{b.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="Enter item name..."
                            value={item.customName}
                            onChange={(e) => handleUpdateLine(item.id, 'customName', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 min-w-[220px]"
                          />
                        )}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateLine(item.id, 'quantity', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                        />
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleUpdateLine(item.id, 'unitPrice', e.target.value)}
                            className="w-full pl-7 text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 pr-3"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-right font-medium text-gray-700 pt-7">
                        ${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                      </td>
                      <td className="px-4 py-4 align-top text-center pt-6">
                        <button
                          onClick={() => handleRemoveLine(item.id)}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                          title="Remove line"
                        >
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={handleAddLine}
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <HiOutlinePlus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Column: Settings & Summary ── */}
        <div className="space-y-8">
          {/* Settings Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Details</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="Optional walk-in"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                >
                  <option value="draft">Draft</option>
                  <option value="in_processed">In Processed</option>
                  <option value="payment_pending">Payment Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {status === 'cancelled' && (
                  <p className="text-xs text-red-600 mt-1 font-medium">
                    Warning: Saving as cancelled will restore all inventory.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                  placeholder="Internal notes..."
                />
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tax (12%)</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-xl font-bold text-brand-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrder;
