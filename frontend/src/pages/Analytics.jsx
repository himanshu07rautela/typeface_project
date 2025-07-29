import { useEffect, useState, useRef } from 'react';
import API from '../services/api';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Chart, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, TimeScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend, PointElement, LineElement, TimeScale);

export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [transactionsByDate, setTransactionsByDate] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const eventSourceRef = useRef(null);

  // Set up SSE connection for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in to view analytics');
      return;
    }

    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create a new EventSource connection with token as query parameter
    const baseUrl = API.defaults.baseURL || '';
    const url = `${baseUrl}/sse?token=${token}`;
    console.log('Connecting to SSE endpoint:', url);
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Set up event listeners
    eventSource.onopen = () => {
      console.log('SSE connection opened');
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('SSE update received:', data);
        
        if (data.event === 'connected') {
          console.log('SSE connection established:', data.message);
        } else if (data.event === 'update') {
          // Update state with the latest data
          setLastUpdate(new Date(data.timestamp));
          setRecentTransactions(data.latestTransactions);
          
          // Refresh analytics data when new transactions are detected
          fetchAnalytics();
        } else if (data.event === 'error') {
          console.error('SSE error:', data.message);
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      setConnected(false);
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }, 5000);
    };

    // Clean up on unmount
    return () => {
      console.log('Closing SSE connection');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  // Function to fetch analytics data
  async function fetchAnalytics() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view analytics');
        setLoading(false);
        return;
      }
      
      console.log('Fetching all transactions data with token');
      
      try {
        // Fetch all transactions for the user
        const allTransactionsRes = await API.get('/analytics/all-transactions', {
          headers: { Authorization: `Bearer ${token}` },
          params: { limit: 1000 } // Get a large number of transactions
        });
        
        if (allTransactionsRes?.data?.transactions) {
          const transactions = allTransactionsRes.data.transactions;
          setAllTransactions(transactions);
          
          // Process transactions for analytics
          processTransactionsData(transactions);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token'); // Clear invalid token
          setError('Your session has expired. Please log in again.');
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Analytics error:', err);
      console.error('Error stack:', err.stack);
      setError('Failed to load analytics: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }
  
  // Process transactions data to generate analytics
  function processTransactionsData(transactions) {
    if (!transactions || transactions.length === 0) {
      console.warn('No transactions data available');
      return;
    }
    
    // Calculate summary data
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const incomeTotal = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const expenseTotal = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const netIncome = incomeTotal - expenseTotal;
    const savingsRate = incomeTotal > 0 ? (netIncome / incomeTotal) * 100 : 0;
    
    // Set summary data
    setSummary({
      income: {
        total: incomeTotal,
        count: incomeTransactions.length,
        average: incomeTransactions.length > 0 ? incomeTotal / incomeTransactions.length : 0
      },
      expense: {
        total: expenseTotal,
        count: expenseTransactions.length,
        average: expenseTransactions.length > 0 ? expenseTotal / expenseTransactions.length : 0
      },
      netIncome,
      savingsRate: Math.round(savingsRate * 100) / 100,
      totalTransactions: transactions.length
    });
    
    // Calculate expenses by category
    const categoryMap = {};
    expenseTransactions.forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = {
          _id: t.category,
          total: 0,
          count: 0
        };
      }
      categoryMap[t.category].total += t.amount;
      categoryMap[t.category].count += 1;
    });
    
    const categoriesData = Object.values(categoryMap).sort((a, b) => b.total - a.total);
    setCategories(categoriesData);
    
    // Group transactions by date
    const byDate = {};
    const byMonth = {};
    const byDayOfWeek = Array(7).fill(0).map(() => ({ income: 0, expense: 0 }));
    
    transactions.forEach(t => {
      // For daily data
      const txDate = new Date(t.date);
      const date = txDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      if (!byDate[date]) {
        byDate[date] = {
          income: 0,
          expense: 0,
          transactions: []
        };
      }
      byDate[date][t.type] += t.amount;
      byDate[date].transactions.push(t);
      
      // For day of week data (0 = Sunday, 6 = Saturday)
      const dayOfWeek = txDate.getDay();
      byDayOfWeek[dayOfWeek][t.type] += t.amount;
      
      // For monthly data
      const monthKey = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          income: 0,
          expense: 0,
          byCategory: {}
        };
      }
      
      byMonth[monthKey][t.type] += t.amount;
      
      // Track expenses by category per month
      if (t.type === 'expense') {
        if (!byMonth[monthKey].byCategory[t.category]) {
          byMonth[monthKey].byCategory[t.category] = 0;
        }
        byMonth[monthKey].byCategory[t.category] += t.amount;
      }
    });
    
    // Calculate monthly spending trends
    const monthlyData = Object.keys(byMonth).sort().map(month => {
      const monthData = byMonth[month];
      const topCategories = Object.entries(monthData.byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .reduce((acc, [category, amount]) => {
          acc[category] = amount;
          return acc;
        }, {});
      
      return {
        month,
        income: monthData.income,
        expense: monthData.expense,
        netIncome: monthData.income - monthData.expense,
        topCategories
      };
    });
    
    // Format day of week data for chart
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekData = {
      labels: dayNames,
      income: dayNames.map((_, i) => byDayOfWeek[i].income),
      expense: dayNames.map((_, i) => byDayOfWeek[i].expense)
    };
    
    // Store the processed data
    setTransactionsByDate(byDate);
    setMonthlyData(monthlyData);
    
    // Add day of week data to window for debugging
    window.dayOfWeekData = dayOfWeekData;
    
    // Set recent transactions
    const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecentTransactions(sortedTransactions.slice(0, 10)); // Show 10 most recent transactions
    
    return { dayOfWeekData };
  }

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="page-card">
      <h2>Analytics</h2>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: connected ? '#4fd1c5' : '#f56565',
          marginRight: 8
        }}></div>
        <span style={{ fontSize: '0.9em', color: connected ? '#4fd1c5' : '#f56565' }}>
          {connected ? 'Live updates connected' : 'Live updates disconnected'}
        </span>
        {lastUpdate && (
          <span style={{ fontSize: '0.9em', marginLeft: 16, color: '#718096' }}>
            Last update: {formatDate(lastUpdate)}
          </span>
        )}
      </div>
      
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!loading && !error && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2em' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2em', justifyContent: 'center' }}>
            <div style={{ minWidth: 260, flex: 1 }}>
              <h3 style={{ fontSize: '1.1em', marginBottom: 8 }}>Income vs Expense</h3>
              <Pie
                data={{
                  labels: ['Income', 'Expense'],
                  datasets: [{
                    data: [summary.income.total, summary.expense.total],
                    backgroundColor: ['#4fd1c5', '#f56565'],
                  }]
                }}
                options={{ plugins: { legend: { position: 'bottom' } } }}
              />
              <div style={{ marginTop: 12, fontSize: '0.98em' }}>
                <div>Net Income: <b>{summary.netIncome.toFixed(2)}</b></div>
                <div>Savings Rate: <b>{summary.savingsRate}%</b></div>
                <div>Total Transactions: <b>{summary.totalTransactions}</b></div>
              </div>
            </div>
            <div style={{ minWidth: 320, flex: 2 }}>
              <h3 style={{ fontSize: '1.1em', marginBottom: 8 }}>Expenses by Category</h3>
              <Bar
                data={{
                  labels: categories.map(c => c._id),
                  datasets: [{
                    label: 'Total Spent',
                    data: categories.map(c => c.total),
                    backgroundColor: '#f56565',
                  }]
                }}
                options={{
                  plugins: { legend: { display: false } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>
          
          {/* Transactions Over Time Chart */}
          {Object.keys(transactionsByDate).length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1.1em', marginBottom: 8 }}>Transactions Over Time</h3>
              <Line
                data={{
                  labels: Object.keys(transactionsByDate).sort(),
                  datasets: [
                    {
                      label: 'Income',
                      data: Object.keys(transactionsByDate).sort().map(date => ({
                        x: date,
                        y: transactionsByDate[date].income
                      })),
                      borderColor: '#4fd1c5',
                      backgroundColor: 'rgba(79, 209, 197, 0.2)',
                      fill: true,
                      tension: 0.1
                    },
                    {
                      label: 'Expense',
                      data: Object.keys(transactionsByDate).sort().map(date => ({
                        x: date,
                        y: transactionsByDate[date].expense
                      })),
                      borderColor: '#f56565',
                      backgroundColor: 'rgba(245, 101, 101, 0.2)',
                      fill: true,
                      tension: 0.1
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  scales: {
                    x: {
                      type: 'category',
                      title: {
                        display: true,
                        text: 'Date'
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Amount'
                      }
                    }
                  }
                }}
              />
            </div>
          )}
          
          {/* Monthly Spending Trends */}
          {monthlyData.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1.1em', marginBottom: 8 }}>Monthly Spending Trends</h3>
              <Bar
                data={{
                  labels: monthlyData.map(m => {
                    const [year, month] = m.month.split('-');
                    return `${month}/${year}`;
                  }),
                  datasets: [
                    {
                      label: 'Income',
                      data: monthlyData.map(m => m.income),
                      backgroundColor: '#4fd1c5',
                    },
                    {
                      label: 'Expense',
                      data: monthlyData.map(m => m.expense),
                      backgroundColor: '#f56565',
                    },
                    {
                      label: 'Net Income',
                      data: monthlyData.map(m => m.netIncome),
                      backgroundColor: '#9f7aea',
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Month'
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Amount'
                      }
                    }
                  }
                }}
              />
              
              {/* Monthly Top Categories Table */}
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1em', marginBottom: 8 }}>Top Spending Categories by Month</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Month</th>
                      <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Top Categories</th>
                      <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Total Expense</th>
                      <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Net Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(month => (
                      <tr key={month.month}>
                        <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>
                          {month.month.split('-')[1]}/{month.month.split('-')[0]}
                        </td>
                        <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>
                          {Object.keys(month.topCategories).map((cat, i) => (
                            <span key={cat}>
                              {cat} (${month.topCategories[cat].toFixed(2)})
                              {i < Object.keys(month.topCategories).length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </td>
                        <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#f56565' }}>
                          ${month.expense.toFixed(2)}
                        </td>
                        <td style={{ 
                          padding: '0.5em', 
                          borderBottom: '1px solid #e2e8f0', 
                          textAlign: 'right',
                          color: month.netIncome >= 0 ? '#4fd1c5' : '#f56565'
                        }}>
                          ${month.netIncome.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Recent Transactions Section */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: 8 }}>Recent Transactions</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map(tx => (
                <tr key={tx._id}>
                  <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>{new Date(tx.date).toLocaleDateString()}</td>
                  <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{
                      color: tx.type === 'income' ? '#4fd1c5' : '#f56565',
                      fontWeight: 500
                    }}>
                      {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                    </span>
                  </td>
                  <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>{tx.category}</td>
                  <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 500 }}>{tx.amount}</td>
                  <td style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>{tx.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}