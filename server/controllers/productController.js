const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .populate('bundles.product', 'name sku price quantity')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch products',
      error: error.message,
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('bundles.product', 'name sku price quantity');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not fetch product',
      error: error.message,
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private
const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      category,
      quantity,
      price,
      lowStockThreshold,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !sku || !category || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected',
      });
    }

    // Check if SKU exists (case insensitive)
    const existingProduct = await Product.findOne({
      sku: { $regex: new RegExp(`^${sku}$`, 'i') },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }

    const product = await Product.create(req.body);
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name')
      .populate('bundles.product', 'name sku price quantity');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not create product',
      error: error.message,
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = async (req, res) => {
  try {
    const { sku, category } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // If SKU is being updated, check if new SKU exists for another product
    if (sku && sku.toLowerCase() !== product.sku.toLowerCase()) {
      const existingProduct = await Product.findOne({
        sku: { $regex: new RegExp(`^${sku}$`, 'i') },
      });

      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'A product with this SKU already exists',
        });
      }
    }

    // If category is being updated, check if valid
    if (category && category !== product.category.toString()) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category selected',
        });
      }
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('category', 'name')
      .populate('bundles.product', 'name sku price quantity');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not update product',
      error: error.message,
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Protect against deleting a product that is currently in an order
    const Order = require('../models/Order');
    const isProductInOrders = await Order.exists({ 'items.product': req.params.id });
    if (isProductInOrders) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product: it is currently referenced in existing orders.',
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server Error: Could not delete product',
      error: error.message,
    });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
