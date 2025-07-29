const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const jwt = require('jsonwebtoken');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const auth = require('./middleware/auth');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/finance-assistant', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// SSE endpoint for real-time analytics updates
// Using query parameter for token instead of Authorization header
app.get('/api/sse', async (req, res) => {
  try {
    // Get token from query parameter
    const token = req.query.token;
    console.log('SSE endpoint received token:', token ? 'Token received' : 'No token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Verify token and get user
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('Invalid token:', err);
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ event: 'connected', message: 'SSE connection established' })}\n\n`);
    
    console.log('SSE connection established for user:', user._id);
    
    // Function to send updates to the client
    const sendUpdate = async () => {
      try {
        // Ensure we have a valid user ID
        let userId;
        try {
          userId = new mongoose.Types.ObjectId(user._id);
        } catch (err) {
          console.error('Error converting user ID to ObjectId:', err);
          res.write(`data: ${JSON.stringify({ event: 'error', message: 'Invalid user ID format' })}\n\n`);
          return;
        }

        // Get latest transaction data
        const latestTransactions = await Transaction.find({ user: userId })
          .sort({ date: -1 })
          .limit(5);
        
        // Get transaction count
        const transactionCount = await Transaction.countDocuments({ user: userId });
        
        // Send the update
        res.write(`data: ${JSON.stringify({
          event: 'update',
          latestTransactions,
          transactionCount,
          timestamp: new Date()
        })}\n\n`);
        
      } catch (error) {
        console.error('Error sending SSE update:', error);
        res.write(`data: ${JSON.stringify({ event: 'error', message: error.message })}\n\n`);
      }
    };
    
    // Send updates every 10 seconds
    const intervalId = setInterval(sendUpdate, 10000);
    
    // Send initial update immediately
    sendUpdate();
    
    // Clean up on client disconnect
    req.on('close', () => {
      console.log('SSE connection closed for user:', user._id);
      clearInterval(intervalId);
      res.end();
    });
  } catch (error) {
    console.error('SSE setup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Routes
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/receipts', require('./routes/receipts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/analytics', require('./routes/analytics'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Personal Finance Assistant API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();