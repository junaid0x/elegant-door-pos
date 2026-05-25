const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getQuotations,
  getQuotation,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  convertToOrder,
} = require('../controllers/quotationController');

router.route('/')
  .get(protect, getQuotations)
  .post(protect, createQuotation);

router.route('/:id')
  .get(protect, getQuotation)
  .put(protect, updateQuotation)
  .delete(protect, deleteQuotation);

router.route('/:id/convert')
  .post(protect, convertToOrder);

module.exports = router;
