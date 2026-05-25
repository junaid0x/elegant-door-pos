import { useState, useEffect, useCallback } from 'react';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/categoryService';
import CategoryModal from '../components/CategoryModal';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineTag,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

// ─── Skeleton Row ───────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    <td className="px-4 py-3">
      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
    </td>
    <td className="px-4 py-3">
      <div className="flex gap-2">
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
      </div>
    </td>
  </tr>
);

// ─── Delete Confirmation Dialog ─────────────────────────────────────
const DeleteDialog = ({ isOpen, category, onConfirm, onCancel, loading }) => {
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
              Delete Category
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                "{category?.name}"
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
// ─── Categories Page ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch categories ────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const response = await getCategories();
      setCategories(response.data);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load categories';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ─── Create / Update handler ─────────────────────────────────
  const handleSubmit = async (formData) => {
    setModalLoading(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, formData);
        toast.success('Category updated successfully');
      } else {
        await createCategory(formData);
        toast.success('Category created successfully');
      }
      setModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
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
    if (!deletingCategory) return;
    setDeleteLoading(true);
    try {
      await deleteCategory(deletingCategory._id);
      toast.success('Category deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      fetchCategories();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to delete category';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Open modals ─────────────────────────────────────────────
  const openCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEdit = (category) => {
    setEditingCategory(category);
    setModalOpen(true);
  };

  const openDelete = (category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
          <p className="text-gray-500 mt-1">Manage product categories</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] shadow-sm transition-all duration-200"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Category
        </button>
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">
            Unable to load categories
          </h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchCategories();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 active:scale-95 transition-all"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* ── Categories Table ────────────────────────────────────── */}
      {!error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                    Actions
                  </th>
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
                  </>
                )}

                {/* Data rows */}
                {!loading &&
                  categories.map((category, index) => (
                    <tr
                      key={category._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-800">
                          {category.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {category.description || (
                          <span className="text-gray-300 italic">
                            No description
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(category)}
                            className="p-2 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit category"
                          >
                            <HiOutlinePencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(category)}
                            className="p-2 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete category"
                          >
                            <HiOutlineTrash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {!loading && categories.length === 0 && (
            <div className="p-12 text-center">
              <HiOutlineTag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No categories yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Create your first category to start organizing products.
              </p>
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all"
              >
                <HiOutlinePlus className="w-4 h-4" />
                New Category
              </button>
            </div>
          )}

          {/* Table footer with count */}
          {!loading && categories.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} total
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Category Modal ──────────────────────────────────────── */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingCategory(null);
        }}
        onSubmit={handleSubmit}
        category={editingCategory}
        loading={modalLoading}
      />

      {/* ── Delete Confirmation ─────────────────────────────────── */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        category={deletingCategory}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeletingCategory(null);
        }}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Categories;
