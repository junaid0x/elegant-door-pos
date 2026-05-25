const Order = require('../models/Order');
const Product = require('../models/Product');

// ─── HELPER FUNCTIONS ───────────────────────────────────────────

// Flatten items and their bundles into an aggregated map of required quantities
const getAggregatedStockMap = async (items) => {
  const stockMap = {}; // { productId: quantity }
  
  for (const item of items) {
    if (item.product) {
      const productId = item.product.toString();
      stockMap[productId] = (stockMap[productId] || 0) + item.quantity;
      
      const product = await Product.findById(productId);
      if (product && product.bundles && product.bundles.length > 0) {
        for (const bundle of product.bundles) {
          if (bundle.product) {
            const bundleId = bundle.product.toString();
            stockMap[bundleId] = (stockMap[bundleId] || 0) + (item.quantity * bundle.quantity);
          }
        }
      }
    }
  }
  return stockMap;
};

// Safely deduct stock using atomic $inc. Rolls back if any product fails.
const deductStock = async (items) => {
  const stockMap = await getAggregatedStockMap(items);
  const deductedIds = [];
  
  for (const [productId, requiredQty] of Object.entries(stockMap)) {
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, quantity: { $gte: requiredQty } },
      { $inc: { quantity: -requiredQty } },
      { new: true }
    );

    if (!updatedProduct) {
      // rollback
      for (const [rolledBackId, rolledBackQty] of deductedIds) {
        await Product.findByIdAndUpdate(rolledBackId, { $inc: { quantity: rolledBackQty } });
      }
      const productCheck = await Product.findById(productId);
      const errorMessage = productCheck
        ? `Insufficient stock for product/bundle: ${productCheck.name}`
        : `Product not found: ${productId}`;
      return { success: false, message: errorMessage };
    }
    deductedIds.push([productId, requiredQty]);
  }
  return { success: true };
};

// Restore stock (used for cancellations or deletions)
const restoreStock = async (items) => {
  const stockMap = await getAggregatedStockMap(items);
  for (const [productId, restoreQty] of Object.entries(stockMap)) {
    await Product.findByIdAndUpdate(productId, { $inc: { quantity: restoreQty } });
  }
};

// Returns true if the status means the order is 'active' (stock should be deducted)
const isActiveStatus = (status) => {
  return !['draft', 'cancelled'].includes(status);
};

// Pre-flight validation to ensure we don't save orders with insufficient stock
const validateStockLevels = async (items) => {
  const stockMap = await getAggregatedStockMap(items);
  for (const [productId, requiredQty] of Object.entries(stockMap)) {
    const productCheck = await Product.findById(productId);
    if (!productCheck) return { success: false, message: `Product not found: ${productId}` };
    if (productCheck.quantity < requiredQty) {
      return { success: false, message: `Insufficient stock for: ${productCheck.name}. Requested: ${requiredQty}, Available: ${productCheck.quantity}` };
    }
  }
  return { success: true };
};

// Pre-flight validation specifically for updates, considering stock that would be restored
const validateUpdateStockLevels = async (order, newItems) => {
  const wasActive = isActiveStatus(order.status);
  const newStockMap = await getAggregatedStockMap(newItems);
  const oldStockMap = wasActive ? await getAggregatedStockMap(order.items) : {};
  
  for (const [productId, requiredQty] of Object.entries(newStockMap)) {
    const productCheck = await Product.findById(productId);
    if (!productCheck) return { success: false, message: `Product not found: ${productId}` };
    
    let effectiveStock = productCheck.quantity;
    if (oldStockMap[productId]) {
      effectiveStock += oldStockMap[productId];
    }
    
    if (effectiveStock < requiredQty) {
      return { success: false, message: `Insufficient stock for: ${productCheck.name}. Requested: ${requiredQty}, Available: ${effectiveStock}` };
    }
  }
  return { success: true };
};

// ─── CONTROLLER FUNCTIONS ───────────────────────────────────────

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate({
        path: 'items.product',
        select: 'name sku barcode bundles',
        populate: {
          path: 'bundles.product',
          select: 'name sku'
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch orders',
      error: error.message,
    });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: 'items.product',
      select: 'name sku barcode bundles',
      populate: {
        path: 'bundles.product',
        select: 'name sku'
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch order',
      error: error.message,
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { items, status } = req.body;

    // Generate Order Number if not provided
    if (!req.body.orderNumber) {
      req.body.orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 1000
      )}`;
    }

    // Validate Items array
    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item',
      });
    }

    const orderStatus = status || 'draft';

    // PRE-FLIGHT CHECK: Always validate stock levels even for drafts, to prevent bad data
    const stockValidation = await validateStockLevels(items);
    if (!stockValidation.success) {
      return res.status(400).json({
        success: false,
        message: stockValidation.message,
      });
    }

    // If order is created as active, attempt to deduct stock first
    if (isActiveStatus(orderStatus)) {
      const deductionResult = await deductStock(items);
      if (!deductionResult.success) {
        return res.status(400).json({
          success: false,
          message: deductionResult.message,
        });
      }
    }

    const order = await Order.create(req.body);
    const populatedOrder = await Order.findById(order._id).populate({
      path: 'items.product',
      select: 'name sku barcode bundles',
      populate: {
        path: 'bundles.product',
        select: 'name sku'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: populatedOrder,
    });
  } catch (error) {
    // Note: If Order.create() fails but stock was deducted, we ideally need to rollback here.
    // Since this is a simple system without full transactions, we will just rely on mongoose validation
    // passing before we reach here (the schema validation mostly matches frontend).
    // In a production system, a real replica set transaction would wrap this entire block.
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create order',
      error: error.message,
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { items: newItems, status: newStatus } = req.body;

    let order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // PRE-FLIGHT CHECK: Always validate effective stock levels
    if (newItems) {
      const stockValidation = await validateUpdateStockLevels(order, newItems);
      if (!stockValidation.success) {
        return res.status(400).json({
          success: false,
          message: stockValidation.message,
        });
      }
    }

    const wasActive = isActiveStatus(order.status);
    const willBeActive = isActiveStatus(newStatus || order.status);
    const itemsChanged = newItems && JSON.stringify(newItems) !== JSON.stringify(order.items);

    // INVENTORY LOGIC:
    // If order is active and items changed, OR if order transitions between active/inactive
    if (wasActive && !willBeActive) {
      // Transitioning to inactive (cancelled or draft)
      await restoreStock(order.items);
    } else if (!wasActive && willBeActive) {
      // Transitioning to active
      const itemsToDeduct = newItems || order.items;
      const deductionResult = await deductStock(itemsToDeduct);
      if (!deductionResult.success) {
        return res.status(400).json({
          success: false,
          message: deductionResult.message,
        });
      }
    } else if (wasActive && willBeActive && itemsChanged) {
      // Remaining active, but items changed. 
      // Simplest robust method: restore old stock, then attempt to deduct new stock.
      await restoreStock(order.items);
      const deductionResult = await deductStock(newItems);
      
      if (!deductionResult.success) {
        // Rollback: Re-deduct the old items to keep the database consistent
        await deductStock(order.items);
        return res.status(400).json({
          success: false,
          message: deductionResult.message,
        });
      }
    }

    order = await Order.findByIdAndUpdate(orderId, req.body, {
      new: true,
      runValidators: true,
    }).populate({
      path: 'items.product',
      select: 'name sku barcode bundles',
      populate: {
        path: 'bundles.product',
        select: 'name sku'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not update order',
      error: error.message,
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Prevent deletion of shipped or completed orders to protect inventory integrity
    if (['shipped', 'completed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a ${order.status} order. Cancel it instead if needed.`,
      });
    }

    // If the order is active, restore the stock before deleting
    if (isActiveStatus(order.status)) {
      await restoreStock(order.items);
    }

    await Order.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete order',
      error: error.message,
    });
  }
};

module.exports = {
  getOrders,
  getOrder,
  createOrder,
  updateOrder,
  deleteOrder,
};
