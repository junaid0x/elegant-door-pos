const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { resolveVariant, buildStockMap, buildDiffMap, validateStockLevels } = require('../utils/inventoryEngine');

// ─── HELPER FUNCTIONS ───────────────────────────────────────────

const mapOrderForFrontend = (order) => {
  if (!order) return null;
  return {
    ...order,
    _id: order.id,
    orderNumber: order.orderNum,
    items: order.items ? order.items.map(item => ({
      ...item,
      _id: item.id,
      product: item.product ? {
        ...item.product,
        _id: item.product.id,
        bundles: item.product.bundlesAsParent ? item.product.bundlesAsParent.map(b => ({
          product: b.childProduct ? { ...b.childProduct, _id: b.childProduct.id } : null,
          quantity: b.quantity
        })) : []
      } : null,
      jambProduct: item.jambProduct ? { ...item.jambProduct, _id: item.jambProduct.id } : null,
      hingeProduct: item.hingeProduct ? { ...item.hingeProduct, _id: item.hingeProduct.id } : null
    })) : [],
    customerInfo: {
      name: order.customerName || '',
      email: order.customerEmail || '',
      phone: order.customerPhone || '',
      address: order.customerAddress || ''
    }
  };
};

const isActiveStatus = (status) => {
  return !['DRAFT', 'CANCELLED'].includes(status ? status.toUpperCase() : 'DRAFT');
};

const buildResolvedItemsData = async (items) => {
  if (!items) return [];
  return await Promise.all(items.map(async (item) => {
    const variantId = await resolveVariant(item.product || item.productId, item.size, prisma);
    const jambVariantId = await resolveVariant(item.jambProduct || item.jambProductId, null, prisma);
    const hingeVariantId = await resolveVariant(item.hingeProduct || item.hingeProductId, null, prisma);

    return {
      productId: item.product || item.productId ? parseInt(item.product || item.productId) : null,
      variantId: variantId,
      customName: item.customName || null,
      quantity: parseInt(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      lineTotal: parseFloat(item.lineTotal) || 0,
      location: item.location || null,
      size: item.size || null,
      jamb: item.jamb || null,
      jambCustom: item.jambCustom || null,
      hingeCustom: item.hingeCustom || null,
      leftHand: parseInt(item.leftHand) || 0,
      rightHand: parseInt(item.rightHand) || 0,
      description: item.description || null,
      jambProductId: item.jambProduct || item.jambProductId ? parseInt(item.jambProduct || item.jambProductId) : null,
      jambQuantity: parseInt(item.jambQuantity) || 0,
      hingeProductId: item.hingeProduct || item.hingeProductId ? parseInt(item.hingeProduct || item.hingeProductId) : null,
      hingeQuantity: parseInt(item.hingeQuantity) || 0
    };
  }));
};

// ─── CONTROLLER FUNCTIONS ───────────────────────────────────────

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: {
          include: {
            product: { include: { bundlesAsParent: { include: { childProduct: true } } } },
            variant: true,
            jambProduct: true,
            hingeProduct: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedData = orders.map(mapOrderForFrontend);

    res.status(200).json({
      success: true,
      count: mappedData.length,
      data: mappedData,
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid order ID' });

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { include: { bundlesAsParent: { include: { childProduct: true } } } },
            variant: true,
            jambProduct: true,
            hingeProduct: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: mapOrderForFrontend(order),
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
    const { items, status, orderNumber, subtotal, tax, gst, pst, delivery, discount, total, customerInfo, notes, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    const orderNum = orderNumber || `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const orderStatus = status ? status.toUpperCase() : 'DRAFT';

    const stockMap = await buildStockMap(items, prisma);

    if (isActiveStatus(orderStatus)) {
      const validation = await validateStockLevels(stockMap, prisma);
      if (!validation.success) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    const resolvedItems = await buildResolvedItemsData(items);

    const order = await prisma.$transaction(async (tx) => {
      if (isActiveStatus(orderStatus)) {
        for (const [vIdStr, reqQty] of Object.entries(stockMap)) {
          const vId = parseInt(vIdStr);
          await tx.productVariant.update({
            where: { id: vId },
            data: { quantity: { decrement: reqQty } }
          });
        }
      }

      return await tx.order.create({
        data: {
          orderNumber: orderNum,
          status: orderStatus,
          subtotal: parseFloat(subtotal) || 0,
          tax: parseFloat(tax) || 0,
          gst: parseFloat(gst) || 0,
          pst: parseFloat(pst) || 0,
          delivery: parseFloat(delivery) || 0,
          discount: parseFloat(discount) || 0,
          total: parseFloat(total) || 0,
          customerName: customerInfo?.name || null,
          customerEmail: customerInfo?.email || null,
          customerPhone: customerInfo?.phone || null,
          customerAddress: customerInfo?.address || null,
          notes: notes || null,
          paymentMethod: paymentMethod || null,
          items: {
            create: resolvedItems
          }
        },
        include: {
          items: {
            include: {
              product: { include: { bundlesAsParent: { include: { childProduct: true } } } },
              variant: true,
              jambProduct: true,
              hingeProduct: true
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: mapOrderForFrontend(order),
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(400).json({ success: false, message: 'Transaction aborted due to insufficient stock.' });
    }
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid order ID' });

    const { items: newItems, status, subtotal, tax, gst, pst, delivery, discount, total, customerInfo, notes, paymentMethod } = req.body;
    const newStatus = status ? status.toUpperCase() : null;

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const wasActive = isActiveStatus(existingOrder.status);
    const willBeActive = isActiveStatus(newStatus || existingOrder.status);
    
    const diffMap = await buildDiffMap(
      wasActive ? existingOrder.items : [],
      willBeActive && newItems ? newItems : (willBeActive ? existingOrder.items : []),
      prisma
    );

    // Validate that negative differences (meaning we are deducting more stock) are available
    const deductionsOnlyMap = {};
    for (const [vId, diff] of Object.entries(diffMap)) {
      if (diff > 0) deductionsOnlyMap[vId] = diff;
    }
    if (Object.keys(deductionsOnlyMap).length > 0) {
      const validation = await validateStockLevels(deductionsOnlyMap, prisma);
      if (!validation.success) {
        return res.status(400).json({ success: false, message: validation.message });
      }
    }

    let resolvedItems = undefined;
    if (newItems) {
      resolvedItems = await buildResolvedItemsData(newItems);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Apply exact delta changes safely
      for (const [vIdStr, diff] of Object.entries(diffMap)) {
        const vId = parseInt(vIdStr);
        if (diff > 0) {
          await tx.productVariant.update({
            where: { id: vId },
            data: { quantity: { decrement: diff } }
          });
        } else if (diff < 0) {
          await tx.productVariant.update({
            where: { id: vId },
            data: { quantity: { increment: Math.abs(diff) } }
          });
        }
      }

      if (resolvedItems) {
        await tx.orderItem.deleteMany({ where: { orderId: id } });
      }

      return await tx.order.update({
        where: { id },
        data: {
          status: newStatus || existingOrder.status,
          subtotal: subtotal !== undefined ? parseFloat(subtotal) : existingOrder.subtotal,
          tax: tax !== undefined ? parseFloat(tax) : existingOrder.tax,
          gst: gst !== undefined ? parseFloat(gst) : existingOrder.gst,
          pst: pst !== undefined ? parseFloat(pst) : existingOrder.pst,
          delivery: delivery !== undefined ? parseFloat(delivery) : existingOrder.delivery,
          discount: discount !== undefined ? parseFloat(discount) : existingOrder.discount,
          total: total !== undefined ? parseFloat(total) : existingOrder.total,
          customerName: customerInfo?.name !== undefined ? customerInfo.name : existingOrder.customerName,
          customerEmail: customerInfo?.email !== undefined ? customerInfo.email : existingOrder.customerEmail,
          customerPhone: customerInfo?.phone !== undefined ? customerInfo.phone : existingOrder.customerPhone,
          customerAddress: customerInfo?.address !== undefined ? customerInfo.address : existingOrder.customerAddress,
          notes: notes !== undefined ? notes : existingOrder.notes,
          paymentMethod: paymentMethod !== undefined ? paymentMethod : existingOrder.paymentMethod,
          ...(resolvedItems && {
            items: { create: resolvedItems }
          })
        },
        include: {
          items: {
            include: {
              product: { include: { bundlesAsParent: { include: { childProduct: true } } } },
              variant: true,
              jambProduct: true,
              hingeProduct: true
            }
          }
        }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: mapOrderForFrontend(updatedOrder),
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(400).json({ success: false, message: 'Transaction aborted. Insufficient stock or invalid variant.' });
    }
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid order ID' });

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (['SHIPPED', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete a ${order.status} order. Cancel it instead if needed.`,
      });
    }

    await prisma.$transaction(async (tx) => {
      if (isActiveStatus(order.status)) {
        const stockMap = await buildStockMap(order.items, tx);
        for (const [vIdStr, restoreQty] of Object.entries(stockMap)) {
          const vId = parseInt(vIdStr);
          await tx.productVariant.update({
            where: { id: vId },
            data: { quantity: { increment: restoreQty } }
          });
        }
      }

      await tx.order.delete({ where: { id } });
    });

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
