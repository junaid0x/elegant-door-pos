const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');

// @desc    Server health check
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'POS API is running' });
});

// @desc    Database health check
// @route   GET /api/health/db
// @access  Public
router.get('/db', async (req, res) => {
  try {
    // Simple query to test the database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Database connection is healthy',
      database: 'MySQL',
      orm: 'Prisma'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

module.exports = router;
