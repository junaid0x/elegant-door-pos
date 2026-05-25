const Product = require('../models/Product');
const User = require('../models/User');

const Category = require('../models/Category');

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Protected
const getStats = async (req, res, next) => {
  try {
    // --- Core counts (run in parallel for speed) ---
    const [totalProducts, outOfStock, lowInventory, inStock, totalUsers] =
      await Promise.all([
        // Total products
        Product.countDocuments(),

        // Out of stock: quantity === 0
        Product.countDocuments({ quantity: 0 }),

        // Low inventory: quantity > 0 AND quantity <= lowStockThreshold
        Product.countDocuments({
          $expr: {
            $and: [
              { $gt: ['$quantity', 0] },
              { $lte: ['$quantity', '$lowStockThreshold'] },
            ],
          },
        }),

        // In stock: quantity > lowStockThreshold
        Product.countDocuments({
          $expr: { $gt: ['$quantity', '$lowStockThreshold'] },
        }),

        // Total active users
        User.countDocuments({ isActive: true }),
      ]);

    // --- Inventory value aggregation ---
    const inventoryValueResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
        },
      },
    ]);
    const totalInventoryValue =
      inventoryValueResult.length > 0 ? inventoryValueResult[0].totalValue : 0;

    // --- Category count ---
    const totalCategories = await Category.countDocuments();

    // --- Low stock & Out of stock products (actionable list) ---
    const lowStockProducts = await Product.find({
      $expr: {
        $lte: ['$quantity', '$lowStockThreshold'],
      },
    })
      .select('name sku quantity lowStockThreshold price')
      .sort({ quantity: 1 })
      .limit(10)
      .lean();

    // --- Recent products (last 5 added) ---
    const recentProducts = await Product.find()
      .select('name sku quantity price createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    res.json({
      success: true,
      data: {
        totalProducts,
        inStock,
        lowInventory,
        outOfStock,
        totalUsers,
        totalInventoryValue,
        totalCategories,
        lowStockProducts,
        recentProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats };
