const prisma = require('../config/prisma');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Protected
const getCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Map Prisma id to Mongoose _id for frontend compatibility
    const formattedCategories = categories.map((cat) => ({
      ...cat,
      _id: cat.id,
    }));

    res.json({
      success: true,
      count: formattedCategories.length,
      data: formattedCategories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Protected
const getCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Map Prisma id to Mongoose _id for frontend compatibility
    category._id = category.id;

    res.json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Protected
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Validate required field
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check for duplicate name (MySQL default collation is case-insensitive)
    const existing = await prisma.category.findFirst({
      where: { name: name.trim() },
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
      },
    });

    // Map Prisma id to Mongoose _id for frontend compatibility
    category._id = category.id;

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Protected
const updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Validate required field
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }

    // Check category exists
    const categoryExists = await prisma.category.findUnique({
      where: { id: Number(req.params.id) },
    });
    
    if (!categoryExists) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check for duplicate name (exclude current category)
    const duplicate = await prisma.category.findFirst({
      where: {
        name: name.trim(),
        id: { not: Number(req.params.id) },
      },
    });
    
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await prisma.category.update({
      where: { id: Number(req.params.id) },
      data: {
        name: name.trim(),
        description: description?.trim() || '',
      },
    });

    // Map Prisma id to Mongoose _id for frontend compatibility
    category._id = category.id;

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Protected
const deleteCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: Number(req.params.id) },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if any products are using this category (Hybrid Mode check)
    let Product;
    try {
      Product = require('../models/Product');
      
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(String(req.params.id));
      if (isObjectId) {
        const productCount = await Product.countDocuments({
          category: req.params.id,
        });
        if (productCount > 0) {
          return res.status(400).json({
            success: false,
            message: `Cannot delete — ${productCount} product(s) are using this category`,
          });
        }
      } else {
        try {
          const productCount = await Product.countDocuments({
            category: req.params.id,
          });
          if (productCount > 0) {
            return res.status(400).json({
              success: false,
              message: `Cannot delete — ${productCount} product(s) are using this category`,
            });
          }
        } catch (innerError) {
           // Safely ignore Mongoose CastError. A MySQL integer ID cannot be referenced by a Mongo Product ObjectId.
        }
      }
    } catch (e) {
      // Product model may not be fully wired yet — allow delete
    }

    await prisma.category.delete({
      where: { id: Number(req.params.id) },
    });

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
