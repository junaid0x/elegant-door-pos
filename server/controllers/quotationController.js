const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to map Prisma Quotation to frontend-compatible legacy shape
const mapQuotationForFrontend = (q) => {
  if (!q) return null;
  return {
    ...q,
    _id: q.id,
    quotationNumber: q.quotationNum,
    convertedToOrder: q.convertedToOrderId ? { orderNumber: 'Legacy-Mongo-Order' } : null,
    customerInfo: {
      name: q.customerName || '',
      email: q.customerEmail || '',
      phone: q.customerPhone || '',
      address: q.customerAddress || ''
    },
    items: q.items ? q.items.map(item => ({
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
    })) : []
  };
};

const resolveVariant = async (productId, size) => {
  if (!productId) return null;
  const pId = parseInt(productId);
  if (isNaN(pId)) return null;

  // We find the variant that strictly matches the provided size, or falls back to size: null
  let variant = await prisma.productVariant.findFirst({
    where: { 
      productId: pId,
      size: size ? size.trim() : null
    }
  });

  // If a specific size was requested but not found, check if a generic sizeless variant exists
  if (!variant && size) {
    variant = await prisma.productVariant.findFirst({
      where: { productId: pId, size: null }
    });
  }

  return variant ? variant.id : null;
};

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
const getQuotations = async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      include: {
        items: {
          include: {
            product: {
              include: {
                bundlesAsParent: {
                  include: { childProduct: true }
                }
              }
            },
            variant: true,
            jambProduct: true,
            hingeProduct: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedData = quotations.map(mapQuotationForFrontend);

    res.status(200).json({
      success: true,
      count: mappedData.length,
      data: mappedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch quotations',
      error: error.message,
    });
  }
};

// @desc    Get single quotation
// @route   GET /api/quotations/:id
// @access  Private
const getQuotation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                bundlesAsParent: {
                  include: { childProduct: true }
                }
              }
            },
            variant: true,
            jambProduct: true,
            hingeProduct: true
          }
        }
      }
    });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    res.status(200).json({
      success: true,
      data: mapQuotationForFrontend(quotation),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch quotation',
      error: error.message,
    });
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
const createQuotation = async (req, res) => {
  try {
    const { items, quotationNumber, subtotal, tax, gst, pst, delivery, discount, total, customerInfo, notes } = req.body;

    const qNum = quotationNumber || `QUT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation must contain at least one item',
      });
    }

    // Resolve all variants asynchronously
    const resolvedItems = await Promise.all(items.map(async (item) => {
      const variantId = await resolveVariant(item.product, item.size);
      const jambVariantId = await resolveVariant(item.jambProduct, null);
      const hingeVariantId = await resolveVariant(item.hingeProduct, null);

      return {
        productId: item.product ? parseInt(item.product) : null,
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
        jambProductId: item.jambProduct ? parseInt(item.jambProduct) : null,
        jambQuantity: parseInt(item.jambQuantity) || 0,
        hingeProductId: item.hingeProduct ? parseInt(item.hingeProduct) : null,
        hingeQuantity: parseInt(item.hingeQuantity) || 0
      };
    }));

    const quotation = await prisma.quotation.create({
      data: {
        quotationNum: qNum,
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

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: mapQuotationForFrontend(quotation),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create quotation',
      error: error.message,
    });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
const updateQuotation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
    }

    const { items, subtotal, tax, gst, pst, delivery, discount, total, customerInfo, notes } = req.body;

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (existing.status === 'CONVERTED') {
      return res.status(400).json({ success: false, message: 'Cannot edit a converted quotation' });
    }

    // Resolve all variants
    const resolvedItems = await Promise.all((items || []).map(async (item) => {
      const variantId = await resolveVariant(item.product, item.size);
      return {
        productId: item.product ? parseInt(item.product) : null,
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
        jambProductId: item.jambProduct ? parseInt(item.jambProduct) : null,
        jambQuantity: parseInt(item.jambQuantity) || 0,
        hingeProductId: item.hingeProduct ? parseInt(item.hingeProduct) : null,
        hingeQuantity: parseInt(item.hingeQuantity) || 0
      };
    }));

    const quotation = await prisma.$transaction(async (tx) => {
      // Flush old items
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });

      // Update parent and recreate items
      return await tx.quotation.update({
        where: { id },
        data: {
          subtotal: parseFloat(subtotal) || existing.subtotal,
          tax: parseFloat(tax) || existing.tax,
          gst: parseFloat(gst) || existing.gst,
          pst: parseFloat(pst) || existing.pst,
          delivery: parseFloat(delivery) || existing.delivery,
          discount: parseFloat(discount) || existing.discount,
          total: parseFloat(total) || existing.total,
          customerName: customerInfo?.name !== undefined ? customerInfo.name : existing.customerName,
          customerEmail: customerInfo?.email !== undefined ? customerInfo.email : existing.customerEmail,
          customerPhone: customerInfo?.phone !== undefined ? customerInfo.phone : existing.customerPhone,
          customerAddress: customerInfo?.address !== undefined ? customerInfo.address : existing.customerAddress,
          notes: notes !== undefined ? notes : existing.notes,
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

    res.status(200).json({
      success: true,
      message: 'Quotation updated successfully',
      data: mapQuotationForFrontend(quotation),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not update quotation',
      error: error.message,
    });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
const deleteQuotation = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    await prisma.quotation.delete({ where: { id } });

    res.status(200).json({
      success: true,
      message: 'Quotation deleted successfully',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete quotation',
      error: error.message,
    });
  }
};

// @desc    Convert quotation to order
// @route   POST /api/quotations/:id/convert
// @access  Private
const convertToOrder = async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    if (isNaN(quotationId)) {
      return res.status(400).json({ success: false, message: 'Invalid quotation ID format' });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        items: {
          include: { product: true }
        }
      }
    });

    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (quotation.status === 'CONVERTED') {
      return res.status(400).json({ success: false, message: 'Quotation has already been converted to an order' });
    }

    // HYBRID MODE BRIDGE:
    // Orders are still in MongoDB. Mongoose expects `product` to be a 24-character ObjectId.
    // If we pass an integer Prisma ID, Mongoose throws a CastError and crashes the conversion.
    // Solution: Temporarily convert the items to "custom items" to bypass Mongoose ID validation
    // and bypass Mongoose stock deduction (since the Prisma products don't exist in Mongo anyway).
    
    req.body = {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      items: quotation.items.map(item => ({
        // We INTENTIONALLY omit `product: item.productId` to avoid Mongoose CastErrors
        customName: item.product ? `${item.product.name} (Prisma ID: ${item.productId})` : (item.customName || 'Legacy Converted Item'),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        location: item.location,
        size: item.size,
        jamb: item.jamb,
        leftHand: item.leftHand,
        rightHand: item.rightHand,
        description: item.description,
      })),
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      gst: quotation.gst,
      pst: quotation.pst,
      delivery: quotation.delivery,
      discount: quotation.discount,
      total: quotation.total,
      status: 'draft', // Force draft to definitively skip Mongo inventory deductions
      customerInfo: {
        name: quotation.customerName,
        email: quotation.customerEmail,
        phone: quotation.customerPhone,
        address: quotation.customerAddress,
      },
      notes: quotation.notes ? `Converted from Quotation ${quotation.quotationNum}. ${quotation.notes}` : `Converted from Quotation ${quotation.quotationNum}.`,
    };

    const { createOrder } = require('./orderController');
    
    let orderData = null;
    let orderError = null;
    let orderStatusCode = 500;
    
    const fakeRes = {
      status: (code) => {
        orderStatusCode = code;
        return {
          json: (data) => {
            if (code >= 200 && code < 300) {
              orderData = data;
            } else {
              orderError = data;
            }
          }
        };
      }
    };
    
    await createOrder(req, fakeRes);
    
    if (orderError) {
      return res.status(orderStatusCode).json(orderError);
    }
    
    // If successful, mark Prisma quotation as converted
    await prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'CONVERTED' } // We cannot store the Mongo ObjectId in convertedToOrderId since it's an Int constraint
    });
    
    res.status(200).json({
      success: true,
      message: 'Quotation converted to order successfully',
      data: {
        quotation: await prisma.quotation.findUnique({ where: { id: quotationId } }),
        order: orderData.data
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not convert quotation',
      error: error.message,
    });
  }
};

module.exports = {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToOrder,
};
