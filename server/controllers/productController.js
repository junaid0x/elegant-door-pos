const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mongoose = require('mongoose');

// Helper to map Prisma Product to frontend-compatible legacy shape
const mapProductForFrontend = (p) => {
  if (!p) return null;
  return {
    ...p,
    _id: p.id,
    category: p.category ? { ...p.category, _id: p.category.id } : null,
    // Provide fallback quantity/price for legacy systems, though the new frontend will use `variants`
    quantity: p.variants ? p.variants.reduce((sum, v) => sum + v.quantity, 0) : 0,
    price: p.variants && p.variants.length > 0 ? p.variants[0].price : 0,
    bundles: p.bundlesAsParent ? p.bundlesAsParent.map(b => ({
      product: b.childProduct ? { ...b.childProduct, _id: b.childProduct.id } : b.childProductId,
      quantity: b.quantity
    })) : [],
    variants: p.variants ? p.variants.map(v => ({
      ...v,
      price: Number(v.price)
    })) : []
  };
};

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        variants: true,
        bundlesAsParent: {
          include: {
            childProduct: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const mappedProducts = products.map(mapProductForFrontend);

    res.status(200).json({
      success: true,
      count: mappedProducts.length,
      data: mappedProducts,
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: true,
        bundlesAsParent: {
          include: {
            childProduct: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: mapProductForFrontend(product),
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
      description,
      lowStockThreshold,
      variants,
      bundles
    } = req.body;

    // Validate required fields
    if (!name || !sku || !category || !variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields, including at least one product variant',
      });
    }

    const categoryId = parseInt(category);

    // Check if category exists
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category selected',
      });
    }

    // Check if SKU exists
    const existingProduct = await prisma.product.findFirst({
      where: { sku: sku.trim() },
    });

    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }

    // Ensure no duplicate variant sizes in payload
    const sizeSet = new Set();
    for (const v of variants) {
      const s = v.size ? v.size.trim() : null;
      if (sizeSet.has(s)) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate variant sizes are not allowed for the same product',
        });
      }
      sizeSet.add(s);
    }

    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode ? barcode.trim() : '',
        description: description || '',
        lowStockThreshold: parseInt(lowStockThreshold) || 5,
        categoryId: categoryId,
        variants: {
          create: variants.map(v => ({
            size: v.size ? v.size.trim() : null,
            price: parseFloat(v.price) || 0,
            quantity: parseInt(v.quantity) || 0
          }))
        },
        bundlesAsParent: {
          create: (bundles || []).map(b => ({
            childProductId: parseInt(b.product),
            quantity: parseInt(b.quantity) || 1
          }))
        }
      },
      include: {
        category: true,
        variants: true,
        bundlesAsParent: {
          include: {
            childProduct: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: mapProductForFrontend(product),
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const {
      name,
      sku,
      barcode,
      category,
      description,
      lowStockThreshold,
      variants,
      bundles
    } = req.body;

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if new SKU exists for another product
    if (sku && sku.trim() !== product.sku) {
      const existingProduct = await prisma.product.findFirst({
        where: { sku: sku.trim() },
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'A product with this SKU already exists',
        });
      }
    }

    const categoryId = parseInt(category);

    // Validate no duplicate sizes in payload
    if (variants) {
      const sizeSet = new Set();
      for (const v of variants) {
        const s = v.size ? v.size.trim() : null;
        if (sizeSet.has(s)) {
          return res.status(400).json({
            success: false,
            message: 'Duplicate variant sizes are not allowed for the same product',
          });
        }
        sizeSet.add(s);
      }
    }

    // Use transaction to completely replace variants and bundles
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Delete existing relationships
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.productBundle.deleteMany({ where: { parentProductId: id } });

      // 2. Update parent and recreate relationships
      return await tx.product.update({
        where: { id },
        data: {
          name: name ? name.trim() : product.name,
          sku: sku ? sku.trim() : product.sku,
          barcode: barcode !== undefined ? barcode.trim() : product.barcode,
          description: description !== undefined ? description : product.description,
          lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : product.lowStockThreshold,
          categoryId: categoryId || product.categoryId,
          variants: {
            create: variants.map(v => ({
              size: v.size ? v.size.trim() : null,
              price: parseFloat(v.price) || 0,
              quantity: parseInt(v.quantity) || 0
            }))
          },
          bundlesAsParent: {
            create: (bundles || []).map(b => ({
              childProductId: parseInt(b.product),
              quantity: parseInt(b.quantity) || 1
            }))
          }
        },
        include: {
          category: true,
          variants: true,
          bundlesAsParent: {
            include: {
              childProduct: true
            }
          }
        }
      });
    });

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: mapProductForFrontend(updatedProduct),
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
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid product ID format' });
    }

    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Hybrid Mode: Protect against deleting a product that is currently in a Mongo order
    const Order = require('../models/Order');
    try {
      const isProductInOrders = await Order.exists({ 'items.product': id });
      if (isProductInOrders) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete product: it is currently referenced in existing orders.',
        });
      }
    } catch (err) {
      // Safe to swallow. Mongoose throws CastError when `id` is a number instead of ObjectId.
      // This means the product is definitely not in the legacy MongoDB.
    }

    // Deleting the product will Cascade delete Variants and Bundles based on schema.prisma
    await prisma.product.delete({
      where: { id }
    });

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
