const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
// Load env vars
dotenv.config();

const app = express();

// Middleware
app.use(cors({
    origin: true, // Temporarily allow all origins for debugging
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Handle root requests to prevent unnecessary 500s
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'POS API is running on Vercel Serverless' });
});

app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// Routes (will be added feature by feature)
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/dashboard', require('../routes/dashboardRoutes'));
app.use('/api/categories', require('../routes/categoryRoutes'));
app.use('/api/products', require('../routes/productRoutes'));
app.use('/api/orders', require('../routes/orderRoutes'));
app.use('/api/quotations', require('../routes/quotationRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'POS API is running' });
});

// Error handling middleware (fixed relative path)
app.use(require('../middleware/errorHandler'));

// Export app for Vercel Serverless
module.exports = app;
