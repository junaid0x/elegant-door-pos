const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    // Optional, because it could be a custom manual item
  },
  customName: {
    type: String,
    // Custom name is required if there is no linked product
    required: function () {
      return !this.product;
    },
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: [true, 'Unit price is required'],
    min: [0, 'Unit price cannot be negative'],
  },
  lineTotal: {
    type: Number,
    required: [true, 'Line total is required'],
  },
  location: { type: String, trim: true },
  size: { type: String, trim: true },
  jamb: { type: String, trim: true }, // Legacy field, keeping for backward compatibility
  jambProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  jambQuantity: { type: Number, min: 0, default: 0 },
  jambCustom: { type: String, trim: true },
  hingeProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  },
  hingeQuantity: { type: Number, min: 0, default: 0 },
  hingeCustom: { type: String, trim: true },
  leftHand: { type: Number, min: 0 },
  rightHand: { type: Number, min: 0 },
  description: { type: String, trim: true },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      trim: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: [true, 'Subtotal is required'],
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    gst: {
      type: Number,
      default: 0,
      min: 0,
    },
    pst: {
      type: Number,
      default: 0,
      min: 0,
    },
    delivery: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: [true, 'Total is required'],
      min: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'in_processed',
        'payment_pending',
        'shipped',
        'completed',
        'cancelled',
      ],
      default: 'draft',
    },
    paymentMethod: {
      type: String,
      trim: true,
    },
    customerInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
      address: { type: String, trim: true },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', orderSchema);
