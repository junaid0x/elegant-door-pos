const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Protected
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: categories.length,
      data: categories,
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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

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

    // Check for duplicate name (case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || '',
    });

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
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check for duplicate name (exclude current category)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: req.params.id },
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    category.name = name.trim();
    category.description = description?.trim() || '';
    await category.save();

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
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Check if any products are using this category
    let Product;
    try {
      Product = require('../models/Product');
      const productCount = await Product.countDocuments({
        category: req.params.id,
      });
      if (productCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete — ${productCount} product(s) are using this category`,
        });
      }
    } catch {
      // Product model may not be fully wired yet — allow delete
    }

    await Category.findByIdAndDelete(req.params.id);

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
