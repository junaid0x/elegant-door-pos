const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Protected
const getStats = async (req, res, next) => {
  try {
    // --- Core counts (run in parallel for speed) ---
    const [totalProducts, totalUsers, totalCategories] = await Promise.all([
      prisma.product.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.category.count()
    ]);

    // Fetch all products with variants to calculate inventory accurately
    const products = await prisma.product.findMany({
      include: { variants: true }
    });

    let inStock = 0;
    let lowInventory = 0;
    let outOfStock = 0;
    let totalInventoryValue = 0;

    const lowStockProducts = [];

    products.forEach(p => {
      let productTotalQty = 0;
      let hasLowVariant = false;

      p.variants.forEach(v => {
        productTotalQty += v.quantity;
        totalInventoryValue += (v.quantity * Number(v.price));
        if (v.quantity > 0 && v.quantity <= p.lowStockThreshold) {
          hasLowVariant = true;
        }
      });

      if (productTotalQty === 0) {
        outOfStock++;
      } else if (hasLowVariant) {
        lowInventory++;
        if (lowStockProducts.length < 10) {
          lowStockProducts.push({
            id: p.id,
            name: p.name,
            sku: p.sku,
            quantity: productTotalQty, // mapped for legacy frontend table
            lowStockThreshold: p.lowStockThreshold,
            price: p.variants.length > 0 ? Number(p.variants[0].price) : 0,
            _id: p.id // Legacy mapping
          });
        }
      } else {
        inStock++;
      }
    });

    // Sort low stock products ascending by quantity
    lowStockProducts.sort((a, b) => a.quantity - b.quantity);

    // --- Recent products (last 5 added) ---
    const recentProductsRaw = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { variants: true }
    });

    const recentProducts = recentProductsRaw.map(p => ({
      name: p.name,
      sku: p.sku,
      quantity: p.variants.reduce((sum, v) => sum + v.quantity, 0),
      price: p.variants.length > 0 ? Number(p.variants[0].price) : 0,
      createdAt: p.createdAt,
      _id: p.id // Legacy mapping
    }));

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
