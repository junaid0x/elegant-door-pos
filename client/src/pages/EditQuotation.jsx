import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProducts } from '../services/productService';
import { getQuotation, updateQuotation } from '../services/quotationService';
import toast from 'react-hot-toast';
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineSave,
  HiOutlineShoppingBag,
} from 'react-icons/hi';

const EditQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initialFetchLoading, setInitialFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [products, setProducts] = useState([]);
  const [quotationNumber, setQuotationNumber] = useState('');

  // Header State
  const [customerName, setCustomerName] = useState('');
  const [status, setStatus] = useState('draft');
  const [notes, setNotes] = useState('');
  
  // Summary Configurable State
  const [gstRate, setGstRate] = useState(5);
  const [pstRate, setPstRate] = useState(7);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Items State
  const [items, setItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [productsRes, quotationRes] = await Promise.all([
          getProducts(),
          getQuotation(id)
        ]);
        
        setProducts(productsRes.data);
        const quotation = quotationRes.data;
        
        if (quotation.status === 'converted') {
          setError('This quotation has been converted to an order and can no longer be edited.');
          setInitialFetchLoading(false);
          return;
        }

        setQuotationNumber(quotation.quotationNumber);
        setCustomerName(quotation.customerInfo?.name || '');
        setStatus(quotation.status || 'draft');
        setNotes(quotation.notes || '');
        
        setDeliveryFee(quotation.delivery || 0);
        setDiscountAmount(quotation.discount || 0);
        
        // Reverse calculate rates from amounts if subtotal exists
        const discSub = Math.max(0, quotation.subtotal - (quotation.discount || 0));
        if (discSub > 0) {
          if (quotation.gst !== undefined) setGstRate(Number(((quotation.gst / discSub) * 100).toFixed(2)));
          if (quotation.pst !== undefined) setPstRate(Number(((quotation.pst / discSub) * 100).toFixed(2)));
        }
        
        const mappedItems = quotation.items.map((item) => {
          const isJambInventory = !!item.jambProduct;
          const isHingeInventory = !!item.hingeProduct;

          return {
            id: crypto.randomUUID(),
            type: item.product ? 'product' : 'custom',
            product: item.product?._id || '',
            customName: item.customName || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            location: item.location || '',
            size: item.size || '',
            leftHand: item.leftHand !== undefined && item.leftHand !== null ? item.leftHand : '',
            rightHand: item.rightHand !== undefined && item.rightHand !== null ? item.rightHand : '',
            jambType: isJambInventory ? 'inventory' : 'custom',
            jambProduct: item.jambProduct || '',
            jambQuantity: item.jambQuantity || '',
            jambCustom: item.jambCustom || item.jamb || '', // fallback to legacy jamb field
            hingeType: isHingeInventory ? 'inventory' : 'custom',
            hingeProduct: item.hingeProduct || '',
            hingeQuantity: item.hingeQuantity || '',
            hingeCustom: item.hingeCustom || '',
            description: item.description || '',
          };
        });
        
        setItems(mappedItems);
      } catch (err) {
        const message = err.response?.data?.message || 'Failed to load quotation data';
        setError(message);
        toast.error(message);
      } finally {
        setInitialFetchLoading(false);
      }
    };
    
    fetchData();
  }, [id]);

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
        location: '',
        size: '',
        leftHand: '',
        rightHand: '',
        jambType: 'custom',
        jambProduct: '',
        jambQuantity: '',
        jambCustom: '',
        hingeType: 'custom',
        hingeProduct: '',
        hingeQuantity: '',
        hingeCustom: '',
        description: '',
      },
    ]);
  };

  const handleRemoveLine = (itemId) => {
    if (items.length === 1) {
      toast.error('Quotation must have at least one line');
      return;
    }
    setItems(items.filter((item) => item.id !== itemId));
  };

  const handleUpdateLine = (itemId, field, value) => {
    setItems(
      items.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };

          if (field === 'product' && value !== '') {
            const selectedProduct = products.find((p) => p._id === value);
            if (selectedProduct) {
              updatedItem.unitPrice = selectedProduct.price;
              updatedItem.customName = '';
              if (selectedProduct.sizes && selectedProduct.sizes.length > 0) {
                updatedItem.size = selectedProduct.sizes[0];
              } else {
                updatedItem.size = '';
              }
            }
          }

          if (field === 'type' && value === 'custom') {
            updatedItem.product = '';
            updatedItem.unitPrice = 0;
          }
          
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

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);
  }, [items]);

  const discountedSubtotal = Math.max(0, subtotal - Number(discountAmount || 0));
  const gstAmount = discountedSubtotal * (Number(gstRate || 0) / 100);
  const pstAmount = discountedSubtotal * (Number(pstRate || 0) / 100);
  const total = discountedSubtotal + gstAmount + pstAmount + Number(deliveryFee || 0);

  const handleSave = async () => {
    const invalidItem = items.find(
      (i) =>
        (i.type === 'product' && !i.product) ||
        (i.type === 'custom' && !i.customName.trim())
    );

    if (invalidItem) {
      toast.error('Please complete main product selection for all lines');
      return;
    }

    if (items.some((i) => i.quantity < 1)) {
      toast.error('Main product quantity must be at least 1 for all items');
      return;
    }

    setLoading(true);

    try {
      const payloadItems = items.map((i) => ({
        ...(i.type === 'product' ? { product: i.product } : { customName: i.customName }),
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.quantity) * Number(i.unitPrice),
        location: i.location || undefined,
        size: i.size || undefined,
        leftHand: i.leftHand !== '' ? Number(i.leftHand) : undefined,
        rightHand: i.rightHand !== '' ? Number(i.rightHand) : undefined,
        jambProduct: i.jambType === 'inventory' && i.jambProduct ? i.jambProduct : undefined,
        jambQuantity: i.jambType === 'inventory' && i.jambQuantity ? Number(i.jambQuantity) : undefined,
        jambCustom: i.jambType === 'custom' && i.jambCustom ? i.jambCustom : undefined,
        hingeProduct: i.hingeType === 'inventory' && i.hingeProduct ? i.hingeProduct : undefined,
        hingeQuantity: i.hingeType === 'inventory' && i.hingeQuantity ? Number(i.hingeQuantity) : undefined,
        hingeCustom: i.hingeType === 'custom' && i.hingeCustom ? i.hingeCustom : undefined,
        description: i.description || undefined,
      }));

      const payload = {
        customerInfo: { name: customerName },
        status,
        notes,
        items: payloadItems,
        subtotal,
        gst: Number(gstAmount),
        pst: Number(pstAmount),
        delivery: Number(deliveryFee),
        discount: Number(discountAmount),
        total,
      };

      await updateQuotation(id, payload);
      toast.success('Quotation updated successfully!');
      navigate('/quotations');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to update quotation';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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
        <h3 className="text-lg font-semibold text-red-700 mb-2">Notice</h3>
        <p className="text-red-500 mb-4">{error}</p>
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
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/quotations')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiOutlineArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <HiOutlineShoppingBag className="w-6 h-6 text-brand-600" />
              Edit Quotation {quotationNumber && <span className="text-gray-400 font-mono text-xl">#{quotationNumber}</span>}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Modify quotation lines</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotations')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <HiOutlineSave className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Quotation Lines ── */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">Quotation Lines</h2>
            <button
              onClick={handleAddLine}
              className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              <HiOutlinePlus className="w-4 h-4" />
              Add Line Item
            </button>
          </div>
          
          <div className="p-6 space-y-8 bg-gray-50/30">
            {items.map((item, index) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative group hover:border-brand-200 transition-colors">
                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={() => handleRemoveLine(item.id)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Remove line"
                  >
                    <HiOutlineTrash className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6 pr-12">
                  {/* Row 1: Core Product */}
                  <div className="flex flex-wrap lg:flex-nowrap gap-6 items-start">
                    <div className="w-full sm:w-1/4 lg:w-48 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Entry"
                        value={item.location}
                        onChange={(e) => handleUpdateLine(item.id, 'location', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                      />
                    </div>

                    <div className="w-full lg:flex-1 min-w-[250px]">
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</label>
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateLine(item.id, 'type', e.target.value)}
                          className="text-xs border-transparent bg-gray-100 rounded text-gray-600 hover:bg-gray-200 py-1 px-2 cursor-pointer focus:ring-0"
                        >
                          <option value="product">Inventory</option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>
                      {item.type === 'product' ? (
                        <div className="flex flex-col gap-1">
                          <select
                            value={item.product}
                            onChange={(e) => handleUpdateLine(item.id, 'product', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
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
                            return p?.bundles?.length > 0 ? (
                              <div className="pl-3 mt-1.5 space-y-1 border-l-2 border-brand-200 bg-brand-50/30 py-2.5 px-3 rounded-r-md">
                                {p.bundles.map((b, i) => (
                                  <div key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <span className="text-brand-400 font-bold">↳</span> 
                                    <span>{b.product?.name || 'Unknown Item'}</span>
                                    <span className="font-semibold text-gray-800 bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100">x{b.quantity}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null;
                          })()}
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="Enter custom product name..."
                          value={item.customName}
                          onChange={(e) => handleUpdateLine(item.id, 'customName', e.target.value)}
                          className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                        />
                      )}
                    </div>

                    <div className="w-[calc(50%-0.75rem)] lg:w-24 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLine(item.id, 'quantity', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 font-semibold text-center text-brand-700 bg-brand-50"
                      />
                    </div>

                    <div className="w-[calc(50%-0.75rem)] lg:w-32 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Price</label>
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
                          className="w-full pl-7 text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 pr-2"
                        />
                      </div>
                    </div>

                    <div className="w-full lg:w-24 flex-shrink-0 flex flex-col justify-end h-full mt-2 lg:mt-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 lg:text-right">Line Total</label>
                      <div className="text-base font-bold text-gray-900 lg:text-right pt-2 lg:pt-1.5">
                        ${(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Specs */}
                  <div className="flex gap-6 border-t border-gray-100 pt-5">
                    <div className="w-1/3 lg:w-48 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Size</label>
                      {(() => {
                        const p = item.type === 'product' ? products.find(prod => prod._id === item.product) : null;
                        if (p && p.sizes && p.sizes.length > 0) {
                          return (
                            <select
                              value={item.size}
                              onChange={(e) => handleUpdateLine(item.id, 'size', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 bg-white"
                            >
                              <option value="" disabled>Select size...</option>
                              {p.sizes.map((s, idx) => (
                                <option key={idx} value={s}>{s}</option>
                              ))}
                            </select>
                          );
                        }
                        return (
                          <input
                            type="text"
                            placeholder="e.g. 3.0x7.6"
                            value={item.size}
                            onChange={(e) => handleUpdateLine(item.id, 'size', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                          />
                        );
                      })()}
                    </div>
                    <div className="w-1/3 lg:w-24 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Left Hand</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.leftHand}
                        onChange={(e) => handleUpdateLine(item.id, 'leftHand', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 text-center"
                      />
                    </div>
                    <div className="w-1/3 lg:w-24 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Right Hand</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={item.rightHand}
                        onChange={(e) => handleUpdateLine(item.id, 'rightHand', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 text-center"
                      />
                    </div>
                  </div>

                  {/* Row 3: Jamb Config */}
                  <div className="flex flex-wrap lg:flex-nowrap gap-6 border-t border-gray-100 pt-5">
                    <div className="w-full lg:w-48 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Jamb Selection</label>
                      <select
                        value={item.jambType}
                        onChange={(e) => handleUpdateLine(item.id, 'jambType', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 bg-gray-50"
                      >
                        <option value="custom">Custom Text Entry</option>
                        <option value="inventory">Select from Inventory</option>
                      </select>
                    </div>
                    
                    <div className="w-full lg:flex-1 flex gap-4">
                      {item.jambType === 'inventory' ? (
                        <>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Jamb Product</label>
                            <select
                              value={item.jambProduct}
                              onChange={(e) => handleUpdateLine(item.id, 'jambProduct', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                            >
                              <option value="" disabled>Select jamb product...</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id} disabled={p.quantity === 0}>
                                  {p.name} {p.quantity === 0 ? '(Out of Stock)' : `(Avail: ${p.quantity})`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Total Qty</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.jambQuantity}
                              onChange={(e) => handleUpdateLine(item.id, 'jambQuantity', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 text-center"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Custom Jamb Details</label>
                          <input
                            type="text"
                            placeholder="e.g. 6-7/8 custom"
                            value={item.jambCustom}
                            onChange={(e) => handleUpdateLine(item.id, 'jambCustom', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 4: Hinge Config */}
                  <div className="flex flex-wrap lg:flex-nowrap gap-6 border-t border-gray-100 pt-5">
                    <div className="w-full lg:w-48 flex-shrink-0">
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Hinge Selection</label>
                      <select
                        value={item.hingeType}
                        onChange={(e) => handleUpdateLine(item.id, 'hingeType', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 bg-gray-50"
                      >
                        <option value="custom">Custom Text Entry</option>
                        <option value="inventory">Select from Inventory</option>
                      </select>
                    </div>
                    
                    <div className="w-full lg:flex-1 flex gap-4">
                      {item.hingeType === 'inventory' ? (
                        <>
                          <div className="flex-1">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Hinge Product</label>
                            <select
                              value={item.hingeProduct}
                              onChange={(e) => handleUpdateLine(item.id, 'hingeProduct', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                            >
                              <option value="" disabled>Select hinge product...</option>
                              {products.map((p) => (
                                <option key={p._id} value={p._id} disabled={p.quantity === 0}>
                                  {p.name} {p.quantity === 0 ? '(Out of Stock)' : `(Avail: ${p.quantity})`}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Total Qty</label>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              value={item.hingeQuantity}
                              onChange={(e) => handleUpdateLine(item.id, 'hingeQuantity', e.target.value)}
                              className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 text-center"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Custom Hinge Details</label>
                          <input
                            type="text"
                            placeholder="e.g. Standard 4x4"
                            value={item.hingeCustom}
                            onChange={(e) => handleUpdateLine(item.id, 'hingeCustom', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 5: Description */}
                  <div className="pt-5 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Notes / Description</label>
                    <textarea
                      rows={2}
                      placeholder="Optional details, accessories, or specific instructions..."
                      value={item.description}
                      onChange={(e) => handleUpdateLine(item.id, 'description', e.target.value)}
                      className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3 bg-gray-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Details & Summary Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Quotation Details</h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  placeholder="Optional walk-in"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="w-full text-sm border border-gray-300 rounded-lg shadow-sm bg-gray-100 py-2.5 px-3 text-gray-600">
                  Draft (Quotation)
                </div>
                <p className="text-xs text-gray-500 mt-2">Quotations do not deduct stock.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">General Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-brand-500 focus:ring-brand-500 py-2.5 px-3"
                  placeholder="Quotation-level notes..."
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Financial Summary</h2>
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <div className="space-y-4 text-sm flex-1">
                <div className="flex justify-between items-center text-gray-700">
                  <span className="text-base font-medium">Subtotal</span>
                  <span className="font-semibold text-base">${subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center text-gray-600 pt-2">
                  <div className="flex items-center gap-2">
                    <span>Discount ($)</span>
                  </div>
                  <div className="w-24 relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-xs">- $</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full pl-7 text-sm border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 py-1.5 pr-2 text-right"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>GST (%)</span>
                  </div>
                  <div className="w-24 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={gstRate}
                      onChange={(e) => setGstRate(e.target.value)}
                      className="w-full pr-7 text-sm border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 py-1.5 pl-2 text-right"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-xs">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>PST (%)</span>
                  </div>
                  <div className="w-24 relative">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={pstRate}
                      onChange={(e) => setPstRate(e.target.value)}
                      className="w-full pr-7 text-sm border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 py-1.5 pl-2 text-right"
                    />
                    <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-xs">%</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>Delivery ($)</span>
                  </div>
                  <div className="w-24 relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-xs">+ $</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(e.target.value)}
                      className="w-full pl-7 text-sm border-gray-300 rounded-md shadow-sm focus:border-brand-500 focus:ring-brand-500 py-1.5 pr-2 text-right"
                    />
                  </div>
                </div>

                <div className="border-t border-dashed border-gray-200 my-2 pt-2 space-y-1">
                  {gstAmount > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>GST Amount</span>
                      <span>${gstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {pstAmount > 0 && (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>PST Amount</span>
                      <span>${pstAmount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200 flex justify-between items-end mt-auto bg-gray-50 -mx-6 -mb-6 px-6 py-5 rounded-b-xl">
                <span className="text-lg font-bold text-gray-900">Grand Total</span>
                <span className="text-3xl font-bold text-brand-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditQuotation;
