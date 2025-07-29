const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all transactions for a user
router.get('/all-transactions', auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 100, skip = 0, sort = '-date' } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { user: userId };
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const transactions = await Transaction.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await Transaction.countDocuments(query);
    
    res.json({
      transactions,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip)
      }
    });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expenses by category for a date range
router.get('/expenses-by-category', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { 
      user: userId, 
      type: 'expense' 
    };
    
    console.log('Expenses by category query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const categoryData = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    res.json(categoryData);
  } catch (error) {
    console.error('Error fetching expenses by category:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get expenses by date (daily, weekly, monthly)
router.get('/expenses-by-date', auth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { 
      user: userId, 
      type: 'expense' 
    };
    
    console.log('Expenses by date query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    let dateFormat;
    let groupId;

    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-%U';
        groupId = {
          year: { $year: '$date' },
          week: { $week: '$date' }
        };
        break;
      case 'month':
        dateFormat = '%Y-%m';
        groupId = {
          year: { $year: '$date' },
          month: { $month: '$date' }
        };
        break;
      default: // day
        dateFormat = '%Y-%m-%d';
        groupId = {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        };
    }

    const dateData = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupId,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Format the data for charts
    const formattedData = dateData.map(item => {
      let dateStr;
      if (groupBy === 'week') {
        dateStr = `${item._id.year}-W${item._id.week.toString().padStart(2, '0')}`;
      } else if (groupBy === 'month') {
        dateStr = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      } else {
        dateStr = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      }
      
      return {
        date: dateStr,
        total: item.total,
        count: item.count
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching expenses by date:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get income vs expenses comparison
router.get('/income-vs-expenses', auth, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { user: userId };
    
    console.log('Income vs expenses query:', JSON.stringify(query));

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    let groupId;
    switch (groupBy) {
      case 'week':
        groupId = {
          year: { $year: '$date' },
          week: { $week: '$date' }
        };
        break;
      case 'month':
        groupId = {
          year: { $year: '$date' },
          month: { $month: '$date' }
        };
        break;
      default:
        groupId = {
          year: { $year: '$date' },
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        };
    }

    const comparisonData = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            ...groupId,
            type: '$type'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Format the data for comparison charts
    const formattedData = {};
    
    comparisonData.forEach(item => {
      let dateStr;
      if (groupBy === 'week') {
        dateStr = `${item._id.year}-W${item._id.week.toString().padStart(2, '0')}`;
      } else if (groupBy === 'month') {
        dateStr = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      } else {
        dateStr = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      }

      if (!formattedData[dateStr]) {
        formattedData[dateStr] = { date: dateStr, income: 0, expense: 0 };
      }
      
      formattedData[dateStr][item._id.type] = item.total;
    });

    res.json(Object.values(formattedData));
  } catch (error) {
    console.error('Error fetching income vs expenses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get spending trends
router.get('/spending-trends', auth, async (req, res) => {
  try {
    const { months = 6 } = req.query;
    
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));

    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    console.log('Spending trends query for user:', userId);

    const trends = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          type: 'expense',
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            category: '$category'
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Group by category and calculate trends
    const categoryTrends = {};
    
    trends.forEach(item => {
      const category = item._id.category;
      const monthKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`;
      
      if (!categoryTrends[category]) {
        categoryTrends[category] = {};
      }
      
      categoryTrends[category][monthKey] = item.total;
    });

    res.json(categoryTrends);
  } catch (error) {
    console.error('Error fetching spending trends:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get top spending categories
router.get('/top-categories', auth, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { 
      user: userId, 
      type: 'expense' 
    };
    
    console.log('Top categories query for user:', userId);

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const topCategories = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(topCategories);
  } catch (error) {
    console.error('Error fetching top categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get financial summary dashboard
router.get('/dashboard-summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Ensure we have a valid user ID
    let userId;
    try {
      userId = new mongoose.Types.ObjectId(req.user.id);
    } catch (err) {
      console.error('Error converting user ID to ObjectId:', err);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }
    
    const query = { user: userId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    console.log('Dashboard summary query:', JSON.stringify(query));
    console.log('User ID type:', typeof req.user.id, 'Value:', req.user.id);
    console.log('Converted userId type:', typeof userId, 'Value:', userId);

    const summary = await Transaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          average: { $avg: '$amount' }
        }
      }
    ]);
    
    console.log('Summary results:', JSON.stringify(summary));

    // Calculate net income
    const income = summary.find(s => s._id === 'income') || { total: 0, count: 0, average: 0 };
    const expense = summary.find(s => s._id === 'expense') || { total: 0, count: 0, average: 0 };
    
    const netIncome = income.total - expense.total;
    const savingsRate = income.total > 0 ? (netIncome / income.total) * 100 : 0;

    res.json({
      income,
      expense,
      netIncome,
      savingsRate: Math.round(savingsRate * 100) / 100,
      totalTransactions: income.count + expense.count
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;