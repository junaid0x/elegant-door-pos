const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

// Protect routes — verify JWT token
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — no token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized — user not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Map Prisma id to Mongoose _id for backwards compatibility
    user._id = user.id;
    // Map Prisma uppercase roles to lowercase for frontend/middleware compatibility
    user.role = user.role.toLowerCase();

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — invalid token',
    });
  }
};

// Authorize by role — restrict to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    // Both sides are lowercase since we mapped user.role to lowercase
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
