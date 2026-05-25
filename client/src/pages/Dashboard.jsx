import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats } from '../services/dashboardService';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  HiOutlineCube,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineXCircle,
  HiOutlineUsers,
  HiOutlineCurrencyDollar,
  HiOutlineTag,
  HiOutlineRefresh,
  HiOutlineClock,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

// ─── Skeleton Loader ────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`bg-gray-200 rounded-md animate-pulse ${className}`} />
);

// ─── Stat Card ──────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color, loading }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50',
      icon: 'bg-blue-100 text-blue-600',
      value: 'text-blue-700',
      border: 'border-blue-100',
    },
    green: {
      bg: 'bg-emerald-50',
      icon: 'bg-emerald-100 text-emerald-600',
      value: 'text-emerald-700',
      border: 'border-emerald-100',
    },
    amber: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      value: 'text-amber-700',
      border: 'border-amber-100',
    },
    red: {
      bg: 'bg-red-50',
      icon: 'bg-red-100 text-red-600',
      value: 'text-red-700',
      border: 'border-red-100',
    },
    violet: {
      bg: 'bg-violet-50',
      icon: 'bg-violet-100 text-violet-600',
      value: 'text-violet-700',
      border: 'border-violet-100',
    },
    teal: {
      bg: 'bg-teal-50',
      icon: 'bg-teal-100 text-teal-600',
      value: 'text-teal-700',
      border: 'border-teal-100',
    },
    slate: {
      bg: 'bg-slate-50',
      icon: 'bg-slate-100 text-slate-600',
      value: 'text-slate-700',
      border: 'border-slate-100',
    },
  };

  const c = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`${c.bg} border ${c.border} rounded-xl p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          {loading ? (
            <Skeleton className="h-9 w-16 mt-1" />
          ) : (
            <p className={`text-3xl font-bold ${c.value}`}>{value}</p>
          )}
        </div>
        <div className={`p-2.5 rounded-lg ${c.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

// ─── Helper: calculate percentage ───────────────────────────────────
const calcPercent = (part, total) => {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 100);
};

// ─── Helper: format currency ────────────────────────────────────────
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─── Helper: format date ────────────────────────────────────────────
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ─── Progress Bar ───────────────────────────────────────────────────
const InventoryBar = ({ label, value, total, colorClass, textColorClass }) => {
  const pct = calcPercent(value, total);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className={`font-medium ${textColorClass}`}>{pct}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2.5">
        <div
          className={`${colorClass} h-2.5 rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// ─── Dashboard Component ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowInventory: 0,
    outOfStock: 0,
    totalUsers: 0,
    totalInventoryValue: 0,
    totalCategories: 0,
    lowStockProducts: [],
    recentProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch stats — reusable for initial load + refresh
  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);

    try {
      setError(null);
      const response = await getDashboardStats();
      setStats(response.data);
      setLastUpdated(new Date());
      if (isRefresh) toast.success('Dashboard refreshed');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Failed to load dashboard data';
      setError(message);
      if (!isRefresh) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ─── Stat cards config ──────────────────────────────────────────
  const cards = [
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: HiOutlineCube,
      color: 'blue',
    },
    {
      title: 'In Stock',
      value: stats.inStock,
      icon: HiOutlineCheckCircle,
      color: 'green',
    },
    {
      title: 'Low Inventory',
      value: stats.lowInventory,
      icon: HiOutlineExclamation,
      color: 'amber',
    },
    {
      title: 'Out of Stock',
      value: stats.outOfStock,
      icon: HiOutlineXCircle,
      color: 'red',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: HiOutlineUsers,
      color: 'violet',
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(stats.totalInventoryValue),
      icon: HiOutlineCurrencyDollar,
      color: 'teal',
    },
    {
      title: 'Categories',
      value: stats.totalCategories,
      icon: HiOutlineTag,
      color: 'slate',
    },
  ];

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back,{' '}
            <span className="font-medium text-gray-700">{user?.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              Updated{' '}
              {lastUpdated.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <button
            onClick={() => fetchStats(true)}
            disabled={refreshing || loading}
            className={`
              inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg
              border border-gray-200 bg-white text-gray-700
              hover:bg-gray-50 active:scale-95 transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            <HiOutlineRefresh
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error State ─────────────────────────────────────────── */}
      {error && !loading && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <HiOutlineExclamationCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">
            Unable to load dashboard
          </h3>
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchStats();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-500 active:scale-95 transition-all"
          >
            <HiOutlineRefresh className="w-4 h-4" />
            Try Again
          </button>
        </div>
      )}

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      {!error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {cards.map((card) => (
            <StatCard key={card.title} {...card} loading={loading} />
          ))}
        </div>
      )}

      {/* ── Bottom Sections (two-column on large screens) ──────── */}
      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* ── Inventory Overview ──────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Inventory Overview
            </h2>

            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : stats.totalProducts > 0 ? (
              <div className="space-y-3">
                <InventoryBar
                  label="In Stock"
                  value={stats.inStock}
                  total={stats.totalProducts}
                  colorClass="bg-emerald-500"
                  textColorClass="text-emerald-600"
                />
                <InventoryBar
                  label="Low Inventory"
                  value={stats.lowInventory}
                  total={stats.totalProducts}
                  colorClass="bg-amber-500"
                  textColorClass="text-amber-600"
                />
                <InventoryBar
                  label="Out of Stock"
                  value={stats.outOfStock}
                  total={stats.totalProducts}
                  colorClass="bg-red-500"
                  textColorClass="text-red-600"
                />
              </div>
            ) : (
              <div className="text-center py-6">
                <HiOutlineCube className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No products yet. Add products to see inventory breakdown.
                </p>
              </div>
            )}
          </div>

          {/* ── Low Stock Alerts ────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Actionable Stock Alerts
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats.lowStockProducts && stats.lowStockProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">
                        Threshold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.lowStockProducts.map((p) => (
                      <tr
                        key={p._id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2.5">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.sku}</p>
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            p.quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {p.quantity === 0 ? 'Out of stock' : p.quantity}
                          </span>
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {p.lowStockThreshold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6">
                <HiOutlineCheckCircle className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {stats.totalProducts > 0
                    ? 'All products are well-stocked!'
                    : 'No products to monitor yet.'}
                </p>
              </div>
            )}
          </div>

          {/* ── Recent Products ─────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Recently Added Products
            </h2>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats.recentProducts && stats.recentProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-right">SKU</th>
                      <th className="pb-2 font-medium text-right">Qty</th>
                      <th className="pb-2 font-medium text-right">Price</th>
                      <th className="pb-2 font-medium text-right">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentProducts.map((p) => (
                      <tr
                        key={p._id}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="py-2.5 font-medium text-gray-800">
                          {p.name}
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {p.sku}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {p.quantity}
                        </td>
                        <td className="py-2.5 text-right text-gray-700">
                          {formatCurrency(p.price)}
                        </td>
                        <td className="py-2.5 text-right text-gray-400 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <HiOutlineClock className="w-3.5 h-3.5" />
                            {formatDate(p.createdAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6">
                <HiOutlineCube className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No products added yet. Start by creating categories and
                  products.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
