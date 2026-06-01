import { useState, useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';

const ProductModal = ({
  isOpen,
  onClose,
  onSubmit,
  product,
  categories,
  products = [], // new prop
  loading,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    sizes: [],
    category: '',
    quantity: 0,
    price: 0,
    lowStockThreshold: 5,
    description: '',
    bundles: [],
  });
  const [errors, setErrors] = useState({});
  const nameInputRef = useRef(null);

  const isEdit = !!product;

  // Prefill form when editing, reset when creating
  useEffect(() => {
    if (isOpen) {
      if (product) {
        setFormData({
          name: product.name || '',
          sku: product.sku || '',
          barcode: product.barcode || '',
          sizes: product.sizes || [],
          category: product.category?._id || product.category || '',
          quantity: product.quantity || 0,
          price: product.price || 0,
          lowStockThreshold: product.lowStockThreshold || 5,
          description: product.description || '',
          bundles: product.bundles ? product.bundles.map(b => ({
            product: b.product?._id || b.product,
            quantity: b.quantity
          })) : [],
        });
      } else {
        setFormData({
          name: '',
          sku: '',
          barcode: '',
          sizes: [],
          category: '',
          quantity: 0,
          price: 0,
          lowStockThreshold: 5,
          description: '',
          bundles: [],
        });
      }
      setErrors({});

      // Auto-focus the name field
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, product]);

  // Form validation
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Product name is required';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name cannot exceed 100 characters';
    }

    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.quantity === '' || formData.quantity < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }

    if (formData.price === '' || formData.price < 0) {
      newErrors.price = 'Valid price is required';
    }

    if (formData.lowStockThreshold === '' || formData.lowStockThreshold < 0) {
      newErrors.lowStockThreshold = 'Valid threshold is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    let parsedValue = value;
    if (type === 'number') {
      parsedValue = value === '' ? '' : Number(value);
    }

    setFormData((prev) => ({ ...prev, [name]: parsedValue }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddBundle = () => {
    setFormData((prev) => ({
      ...prev,
      bundles: [...prev.bundles, { product: '', quantity: 1 }],
    }));
  };

  const handleRemoveBundle = (index) => {
    setFormData((prev) => ({
      ...prev,
      bundles: prev.bundles.filter((_, i) => i !== index),
    }));
  };

  const handleBundleChange = (index, field, value) => {
    let parsedValue = value;
    if (field === 'quantity') {
      parsedValue = value === '' ? '' : Number(value);
    }
    
    setFormData((prev) => {
      const newBundles = [...prev.bundles];
      newBundles[index] = { ...newBundles[index], [field]: parsedValue };
      return { ...prev, bundles: newBundles };
    });
  };

  const handleAddSize = () => {
    setFormData((prev) => ({
      ...prev,
      sizes: [...prev.sizes, ''],
    }));
  };

  const handleRemoveSize = (index) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  };

  const handleSizeChange = (index, value) => {
    setFormData((prev) => {
      const newSizes = [...prev.sizes];
      newSizes[index] = value;
      return { ...prev, sizes: newSizes };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl transform transition-all max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <h2 className="text-lg font-semibold text-gray-800">
              {isEdit ? 'Edit Product' : 'New Product'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <HiOutlineX className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name Field */}
                <div className="col-span-1 md:col-span-2">
                  <label
                    htmlFor="product-name"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    id="product-name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Modern Solid Wood Door"
                    className={`
                      w-full px-3 py-2.5 border rounded-lg text-gray-800
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.name
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* SKU Field */}
                <div>
                  <label
                    htmlFor="product-sku"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    SKU <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="product-sku"
                    name="sku"
                    type="text"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="e.g. DOOR-001"
                    className={`
                      w-full px-3 py-2.5 border rounded-lg text-gray-800 uppercase
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.sku
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-500">{errors.sku}</p>
                  )}
                </div>

                {/* Barcode Field */}
                <div>
                  <label
                    htmlFor="product-barcode"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Barcode
                  </label>
                  <input
                    id="product-barcode"
                    name="barcode"
                    type="text"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Optional barcode"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition-all text-sm"
                  />
                </div>

                {/* Sizes Field */}
                <div className="col-span-1 md:col-span-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Sizes
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Add Size
                    </button>
                  </div>
                  {formData.sizes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No predefined sizes. (Can still be entered manually on orders)</p>
                  ) : (
                    <div className="space-y-3">
                      {formData.sizes.map((size, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={size}
                            onChange={(e) => handleSizeChange(index, e.target.value)}
                            placeholder="e.g. 3.0x7.6x1-3/4"
                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition-all text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSize(index)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Remove size"
                          >
                            <HiOutlineX className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category Field */}
                <div className="col-span-1 md:col-span-2">
                  <label
                    htmlFor="product-category"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Category <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="product-category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`
                      w-full px-3 h-[42px] py-2 border rounded-lg text-gray-800 bg-white
                      focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.category
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  >
                    <option value="" disabled>Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-500">{errors.category}</p>
                  )}
                </div>

                {/* Price Field */}
                <div>
                  <label
                    htmlFor="product-price"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Price <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="product-price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    className={`
                      w-full px-3 py-2.5 border rounded-lg text-gray-800
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.price
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-500">{errors.price}</p>
                  )}
                </div>

                {/* Quantity Field */}
                <div>
                  <label
                    htmlFor="product-quantity"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Quantity <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="product-quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="0"
                    className={`
                      w-full px-3 py-2.5 border rounded-lg text-gray-800
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.quantity
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-500">{errors.quantity}</p>
                  )}
                </div>

                {/* Low Stock Threshold Field */}
                <div className="col-span-1 md:col-span-2">
                  <label
                    htmlFor="product-threshold"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Low Stock Threshold
                  </label>
                  <input
                    id="product-threshold"
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    placeholder="5"
                    className={`
                      w-full px-3 py-2.5 border rounded-lg text-gray-800
                      placeholder-gray-400 focus:outline-none focus:ring-2 transition-all text-sm
                      ${
                        errors.lowStockThreshold
                          ? 'border-red-300 focus:ring-red-400/50'
                          : 'border-gray-200 focus:ring-brand-400/50 focus:border-brand-400/50'
                      }
                    `}
                  />
                  {errors.lowStockThreshold && (
                    <p className="mt-1 text-sm text-red-500">{errors.lowStockThreshold}</p>
                  )}
                </div>

                {/* Description Field */}
                <div className="col-span-1 md:col-span-2">
                  <label
                    htmlFor="product-description"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="product-description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Optional description"
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 transition-all text-sm resize-none"
                  />
                </div>
                
                {/* Product Bundles */}
                <div className="col-span-1 md:col-span-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Product Bundles (Optional)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBundle}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      + Add Item
                    </button>
                  </div>
                  {formData.bundles.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No bundled items added.</p>
                  ) : (
                    <div className="space-y-4">
                      {formData.bundles.map((bundle, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                          <div className="flex-1 w-full sm:w-auto">
                            <select
                              value={bundle.product}
                              onChange={(e) => handleBundleChange(index, 'product', e.target.value)}
                              className="w-full px-3 h-[42px] border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 text-sm transition-all"
                            >
                              <option value="" disabled>Select product...</option>
                              {products
                                .filter(p => !isEdit || p._id !== product._id) // Prevent self-referencing
                                .map(p => (
                                  <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-full sm:w-32 flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              value={bundle.quantity}
                              onChange={(e) => handleBundleChange(index, 'quantity', e.target.value)}
                              placeholder="Qty"
                              className="w-full px-3 h-[42px] border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-400/50 focus:border-brand-400/50 text-sm transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveBundle(index)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            >
                              <HiOutlineX className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0 rounded-b-xl">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`
                  px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200
                  ${
                    loading
                      ? 'bg-brand-400 cursor-not-allowed'
                      : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98] shadow-sm'
                  }
                `}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : isEdit ? (
                  'Update Product'
                ) : (
                  'Save Product'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ProductModal;
