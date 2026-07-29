const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// Map lowercase roles to Prisma Enum
const mapRoleToPrisma = (role) => {
  const map = {
    'super_admin': 'SUPER_ADMIN',
    'admin': 'ADMIN',
    'manager': 'MANAGER'
  };
  return map[role] || 'MANAGER';
};

// Map Prisma Enum back to frontend lowercase role
const mapRoleToFrontend = (role) => {
  if (!role) return 'manager';
  return role.toLowerCase();
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (first user) / Protected (admin only after that)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // First user becomes super_admin automatically
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Public registration is closed. Please ask an administrator to create an account.',
      });
    }

    const assignedRole = mapRoleToPrisma('super_admin');
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: assignedRole,
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user.id, // Mapped for frontend compatibility
          name: user.name,
          email: user.email,
          role: mapRoleToFrontend(user.role),
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user (Prisma returns all scalar fields including password by default)
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Contact an administrator.',
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user.id, // Mapped for frontend compatibility
          name: user.name,
          email: user.email,
          role: mapRoleToFrontend(user.role),
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Protected
const getMe = async (req, res, next) => {
  try {
    // req.user.id is available from the protect middleware
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Compatibility mappings
    const formattedUser = {
      ...user,
      _id: user.id,
      role: mapRoleToFrontend(user.role)
    };

    res.json({
      success: true,
      data: { user: formattedUser },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile (name, email)
// @route   PUT /api/auth/profile
// @access  Protected
const updateProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (user) {
      const updateData = {};
      updateData.name = req.body.name || user.name;
      
      // If email is changing, check if it's already taken
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await prisma.user.findUnique({ where: { email: req.body.email } });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: 'Email is already in use by another account',
          });
        }
        updateData.email = req.body.email;
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: updateData
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            _id: updatedUser.id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: mapRoleToFrontend(updatedUser.role),
          },
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update user password
// @route   PUT /api/auth/password
// @access  Protected
const updatePassword = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Check current password
    const isMatch = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);

    // Update password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, updatePassword };
