const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all transactions for a user with filtering and pagination
router.get('/', auth, async (req, res) => {
  try {
    const { 
      type, 
      category, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Ensure we have a valid user ID
    let userId;
    try {
      const mongoose = require('mongoose');
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const query = { user: userId };
    
    console.log('Transactions query for user:', userId);
    
    // Apply filters
    if (type) query.type = type;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get transactions with pagination
    const transactions = await Transaction.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'username email');

    // Get total count for pagination
    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new transaction
router.post('/', [
  auth,
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('category').trim().isLength({ min: 1 }).withMessage('Category is required'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type, amount, description, category, date, tags, notes } = req.body;

    // Ensure we have a valid user ID
    let userId;
    try {
      const mongoose = require('mongoose');
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    console.log('Creating transaction for user:', userId);

    const transaction = new Transaction({
      user: userId,
      type,
      amount,
      description,
      category,
      date: date ? new Date(date) : new Date(),
      tags: tags || [],
      notes
    });

    await transaction.save();
    
    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific transaction
router.get('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('user', 'username email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a transaction
router.put('/:id', [
  auth,
  body('type').optional().isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('description').optional().trim().isLength({ min: 1 }).withMessage('Description cannot be empty'),
  body('category').optional().trim().isLength({ min: 1 }).withMessage('Category cannot be empty'),
  body('date').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a transaction
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get transaction statistics
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { user: req.user.id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const stats = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = {
      income: { total: 0, count: 0 },
      expense: { total: 0, count: 0 }
    };

    stats.forEach(stat => {
      summary[stat._id] = { total: stat.total, count: stat.count };
    });

    summary.net = summary.income.total - summary.expense.total;

    res.json(summary);
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;