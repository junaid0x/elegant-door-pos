const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173',
            'https://elegant-door-pos.vercel.app',
            'http://elegant-door-pos.vercel.app'
        ];
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes (will be added feature by feature)
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/dashboard', require('../routes/dashboardRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/categories', require('../routes/categoryRoutes'));
app.use('/api/products', require('../routes/productRoutes'));
app.use('/api/orders', require('../routes/orderRoutes'));
app.use('/api/quotations', require('../routes/quotationRoutes'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'POS API is running' });
});

// Error handling middleware
app.use(require('./middleware/errorHandler'));

const PORT = process.env.PORT || 5000;


