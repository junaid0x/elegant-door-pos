import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotations, deleteQuotation } from '../services/quotationService';
import toast from 'react-hot-toast';
import {
  HiOutlinePlus,
  HiOutlineEye,
  HiOutlineDocumentText,
  HiOutlinePencil,
  HiOutlineClipboardList,
  HiOutlineRefresh,
  HiOutlineExclamationCircle,
  HiOutlineTrash,
} from 'react-icons/hi';

// ─── Skeleton Row ───────────────────────────────────────────────────
const SkeletonRow = () => (
  <tr>
    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-32 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-12 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-20 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3"><div className="h-4 w-24 bg-gray-200 rounded animate-pulse" /></td>
    <td className="px-4 py-3">
      <div className="flex gap-2 justify-end">
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
      </div>
    </td>
  </tr>
);

// ─── Delete Confirmation Dialog ─────────────────────────────────────
const DeleteDialog = ({ isOpen, quotation, onConfirm, onCancel, loading }) => {
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
              Delete Quotation
            </h3>
            <p className="text-sm text-gray-500">
              Are you sure you want to delete quotation{' '}
              <span className="font-medium text-gray-700">
                {quotation?.quotationNumber}
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
// ─── Quotations Page ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const Quotations = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Tab filters mapping
  const TABS = [
    { label: 'All', value: 'all' },
    { label: 'Draft', value: 'draft' },
    { label: 'In Processed', value: 'in_processed' },
    { label: 'Payment Pending', value: 'payment_pending' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];
  
  const [activeFilter, setActiveFilter] = useState('all');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ─── Fetch data ────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    try {
      setError(null);
      const res = await getQuotations();
      setQuotations(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load quotations';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // ─── Helpers ─────────────────────────────────────────────────
  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Draft</span>;
      case 'in_processed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Processed</span>;
      case 'payment_pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">Payment Pending</span>;
      case 'shipped':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Shipped</span>;
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAction = (actionName) => {
    toast(`${actionName} feature coming soon!`, { icon: '🚧' });
  };

  const openDelete = (quotation) => {
    if (['completed', 'shipped'].includes(quotation.status)) {
      toast.error(`Cannot delete a ${quotation.status} quotation.`);
      return;
    }
    setDeletingQuotation(quotation);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingQuotation) return;
    setDeleteLoading(true);
    try {
      await deleteQuotation(deletingQuotation._id);
      toast.success('Quotation deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingQuotation(null);
      fetchQuotations();
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to delete quotation';
      toast.error(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ─── Derived State ───────────────────────────────────────────
  const filteredQuotations = useMemo(() => {
    if (!Array.isArray(quotations)) return [];
    if (activeFilter === 'all') return quotations;
    return quotations.filter((o) => o.status === activeFilter);
  }, [quotations, activeFilter]);

  // Get counts for tabs
  const getTabCount = (tabValue) => {
    if (!Array.isArray(quotations)) return 0;
    if (tabValue === 'all') return quotations.length;
    return quotations.filter((o) => o.status === tabValue).length;
  };

  // ─── Render ──────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quotations</h1>
          <p className="text-gray-500 mt-1">Manage and track customer quotations</p>
        </div>
        <button
          onClick={() => navigate('/quotations/create')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] shadow-sm transition-all duration-200"
        >
          <HiOutlinePlus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {/* ── Filter Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 pb-px overflow-x-auto hide-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`
              flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors border-b-2
              ${
                activeFilter === tab.value
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            {tab.label}
            {!loading && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeFilter === tab.value ? 'bg-brand-50 text-brand-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {getTabCount(tab.value)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">
            Unable to load quotations
          </h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchQuotations();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 active:scale-95 transition-all"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* ── Quotations Table ────────────────────────────────────── */}
      {!error && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Quotation #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Lines</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Subtotal</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
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
                  filteredQuotations.map((quotation) => (
                    <tr
                      key={quotation._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-gray-800 font-medium">
                          {quotation.quotationNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">
                            {quotation.customerInfo?.name || <span className="text-gray-400 italic">Walk-in Customer</span>}
                          </span>
                          {quotation.customerInfo?.email && (
                            <span className="text-xs text-gray-500">{quotation.customerInfo.email}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(quotation.status)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {quotation.items?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">
                        ${Number(quotation.subtotal).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(quotation.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/quotations/${quotation._id}`)}
                            className="p-2 rounded-md text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="View Quotation"
                          >
                            <HiOutlineEye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              // We only have one detail view for quotations which acts as the printable page too
                              navigate(`/quotations/${quotation._id}`);
                            }}
                            className="p-2 rounded-md text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title="Print"
                          >
                            <HiOutlineDocumentText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDelete(quotation)}
                            className={`p-2 rounded-md transition-colors ${
                              ['completed', 'shipped'].includes(quotation.status)
                                ? 'text-gray-300 cursor-not-allowed opacity-50'
                                : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                            }`}
                            title={['completed', 'shipped'].includes(quotation.status) ? "Cannot delete shipped/completed quotations" : "Delete Quotation"}
                            disabled={['completed', 'shipped'].includes(quotation.status)}
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
          {!loading && filteredQuotations.length === 0 && (
            <div className="p-12 text-center">
              <HiOutlineClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                No quotations found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {activeFilter === 'all' 
                  ? "You haven't received any quotations yet."
                  : `No quotations found with status "${TABS.find(t => t.value === activeFilter)?.label}".`
                }
              </p>
              {activeFilter === 'all' && (
                <button
                  onClick={() => navigate('/quotations/create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 active:scale-[0.98] transition-all"
                >
                  <HiOutlinePlus className="w-4 h-4" />
                  New Quotation
                </button>
              )}
            </div>
          )}

          {/* Table footer */}
          {!loading && filteredQuotations.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {filteredQuotations.length} quotation{filteredQuotations.length === 1 ? '' : 's'}
              </p>
            </div>
          )}
        </div>
      )}

      <DeleteDialog
        isOpen={deleteDialogOpen}
        quotation={deletingQuotation}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setDeletingQuotation(null);
        }}
        loading={deleteLoading}
      />
    </div>
  );
};

export default Quotations;
