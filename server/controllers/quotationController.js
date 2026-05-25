const Quotation = require('../models/Quotation');
const Order = require('../models/Order');

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
const getQuotations = async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate({
        path: 'items.product',
        select: 'name sku barcode bundles',
        populate: {
          path: 'bundles.product',
          select: 'name sku'
        }
      })
      .populate('convertedToOrder', 'orderNumber')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
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
    const quotation = await Quotation.findById(req.params.id)
      .populate({
        path: 'items.product',
        select: 'name sku barcode bundles',
        populate: {
          path: 'bundles.product',
          select: 'name sku'
        }
      })
      .populate('convertedToOrder', 'orderNumber');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    res.status(200).json({
      success: true,
      data: quotation,
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
    const { items } = req.body;

    // Generate Quotation Number if not provided
    if (!req.body.quotationNumber) {
      req.body.quotationNumber = `QUT-${Date.now().toString().slice(-6)}-${Math.floor(
        Math.random() * 1000
      )}`;
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation must contain at least one item',
      });
    }

    const quotation = await Quotation.create(req.body);
    const populatedQuotation = await Quotation.findById(quotation._id).populate({
      path: 'items.product',
      select: 'name sku barcode bundles',
      populate: {
        path: 'bundles.product',
        select: 'name sku'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: populatedQuotation,
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
    const quotationId = req.params.id;
    let quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit a converted quotation',
      });
    }

    quotation = await Quotation.findByIdAndUpdate(quotationId, req.body, {
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
      message: 'Quotation updated successfully',
      data: quotation,
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
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    await Quotation.findByIdAndDelete(req.params.id);

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
    const quotationId = req.params.id;
    const quotation = await Quotation.findById(quotationId);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found',
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation has already been converted to an order',
      });
    }

    // Call order creation logic by passing it to orderController's createOrder
    // Since createOrder expects req and res, we will mock them or call orderController directly if it was decoupled.
    // However, it's safer to just duplicate the necessary order creation logic here using the internal helpers if needed,
    // OR we can make an internal HTTP call, OR we can decouple createOrder logic.
    // Decoupling `deductStock` and `validateStockLevels` is not easily exported. We can just require orderController.
    // Wait, let's just assemble the body and pass it to orderController.createOrder.
    
    // Assemble order body
    req.body = {
      orderNumber: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      items: quotation.items.map(item => ({
        product: item.product,
        customName: item.customName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      subtotal: quotation.subtotal,
      tax: quotation.tax,
      total: quotation.total,
      status: 'in_processed',
      customerInfo: quotation.customerInfo,
      notes: quotation.notes ? `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes}` : `Converted from Quotation ${quotation.quotationNumber}.`,
    };

    // We need orderController logic. Let's just import it and use it.
    // But `orderController.createOrder(req, res)` will send the response itself!
    // So we can intercept the res.status().json() or just let it send the response, and then we update the quotation.
    // Better: let's do the DB operations here.
    
    const { createOrder } = require('./orderController');
    
    // Instead of intercepting res, let's decouple the stock logic from orderController, OR we can just use a fake response object to capture the result.
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
    
    // If order created successfully, update quotation
    quotation.status = 'converted';
    quotation.convertedToOrder = orderData.data._id;
    await quotation.save();
    
    res.status(200).json({
      success: true,
      message: 'Quotation converted to order successfully',
      data: {
        quotation,
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
