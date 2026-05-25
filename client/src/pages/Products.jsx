import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService';
import { getCategories } from '../services/categoryService';
import ProductModal from '../components/ProductModal';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineCube,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

// ─── Skeleton Row ───────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    <td className="px-4 py-3"><div className="h-4 w-10 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-16 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse" /></td>
    <td className="px-4 py-3">
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
      </div>
    </td>
  </tr>
);

// ─── Delete Confirmation Dialog ─────────────────────────────────────
const DeleteDialog = ({ isOpen, product, onConfirm, onCancel, loading }) => {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onCancel}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-xl w-full max-w-sm transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <HiOutlineTrash className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Delete Product
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                "{product?.name}"
              </span>
              ? This action cannot be undone.
            </p>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-xl">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`
                flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-all duration-200
                ${
                  loading
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-500 active:scale-[0.98]'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── Products Page ──────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All'); // All, In Stock, Low Inventory, Out Of Stock

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch data ────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      // Fetch both products and categories in parallel
      const [productsRes, categoriesRes] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Helpers ─────────────────────────────────────────────────
  const getProductStatus = (quantity, threshold) => {
    if (quantity === 0) return 'Out Of Stock';
    if (quantity <= threshold) return 'Low Inventory';
    return 'In Stock';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-700';
      case 'Low Inventory':
        return 'bg-yellow-100 text-yellow-700';
      case 'Out Of Stock':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // ─── Derived State ───────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (activeFilter === 'All') return products;
    return products.filter((p) => {
      const status = getProductStatus(p.quantity, p.lowStockThreshold);
      return status === activeFilter;
    });
  }, [products, activeFilter]);

  // ─── Create / Update handler ─────────────────────────────────
  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct._id, formData);
        toast.success('Product updated successfully');
      } else {
        await createProduct(formData);
        toast.success('Product created successfully');
      }
      setModalOpen(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setModalLoading(false);
    }
  };

  // ─── Delete handler ──────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      await deleteProduct(deletingProduct._id);
      toast.success('Product deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingProduct(null);
      fetchData();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to delete product';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Open modals ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setModalOpen(true);
  };

  const openDelete = (product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Inventory</h1>
          <p className="text-gray-500 mt-1">Manage your products and stock levels</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] shadow-sm transition-all duration-200"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px overflow-x-auto">
        {['All', 'In Stock', 'Low Inventory', 'Out Of Stock'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`
              whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2
              ${
                activeFilter === filter
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">
            Unable to load inventory
          </h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchData();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 active:scale-95 transition-all"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* ── Products Table ────────────────────────────────────── */}
      {!error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Barcode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Loading state */}
                {loading && (
                  <>
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                  </>
                )}

                {/* Data rows */}
                {!loading &&
                  filteredProducts.map((product, index) => {
                    const status = getProductStatus(product.quantity, product.lowStockThreshold);
                    return (
                      <tr
                        key={product._id}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-800">
                            {product.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-gray-500 text-xs bg-gray-100 px-2 py-1 rounded">
                            {product.sku}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {product.barcode || '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {product.category?.name || <span className="text-red-400 italic">Uncategorized</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          {product.quantity}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          ${Number(product.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(product)}
                              className="p-2 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit product"
                            >
                              <HiOutlinePencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDelete(product)}
                              className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete product"
                            >
                              <HiOutlineTrash className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && filteredProducts.length === 0 && (
            <div className="p-12 text-center">
              <HiOutlineCube className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No products found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {activeFilter === 'All' 
                  ? "You haven't added any products to your inventory yet."
                  : `No products found with status "${activeFilter}".`
                }
              </p>
              {activeFilter === 'All' && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  Add Product
                </button>
              )}
            </div>
          )}

          {/* Table footer with count */}
          {!loading && filteredProducts.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Product Modal ──────────────────────────────────────── */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSubmit={handleSubmit}
        product={editingProduct}
        categories={categories}
        products={products}
        loading={modalLoading}
      />

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        product={deletingProduct}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeletingProduct(null);
        }}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Products;
