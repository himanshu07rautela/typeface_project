import { useEffect, useState } from 'react';
import API from '../services/api';

const initialForm = {
  type: 'expense',
  amount: '',
  description: '',
  category: '',
  date: '',
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await API.get('/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data.transactions);
    } catch (err) {
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const token = localStorage.getItem('token');
      // Always send a valid date
      const payload = {
        ...form,
        date: form.date ? form.date : new Date().toISOString().slice(0, 10)
      };
      const res = await API.post('/transactions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions([res.data, ...transactions]);
      setForm(initialForm);
    } catch (err) {
      setFormError(err.response?.data?.errors?.[0]?.msg || 'Failed to add transaction');
    } finally {
      setFormLoading(false);
    }
  }

  return (
    <div className="page-card">
      <h2>Your Transactions</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.7em', alignItems: 'center', marginBottom: '1.5em', flexWrap: 'wrap' }}>
        <select name="type" value={form.type} onChange={handleChange} style={{ padding: '0.5em', borderRadius: 6, border: '1px solid #ccc' }}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input name="amount" type="number" min="0" step="0.01" placeholder="Amount" value={form.amount} onChange={handleChange} required style={{ padding: '0.5em', borderRadius: 6, border: '1px solid #ccc', width: 90 }} />
        <input name="category" placeholder="Category" value={form.category} onChange={handleChange} required style={{ padding: '0.5em', borderRadius: 6, border: '1px solid #ccc', width: 120 }} />
        <input name="description" placeholder="Description" value={form.description} onChange={handleChange} required style={{ padding: '0.5em', borderRadius: 6, border: '1px solid #ccc', width: 160 }} />
        <input name="date" type="date" value={form.date} onChange={handleChange} style={{ padding: '0.5em', borderRadius: 6, border: '1px solid #ccc' }} />
        <button type="submit" disabled={formLoading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1em', fontWeight: 600, cursor: 'pointer' }}>{formLoading ? 'Adding...' : 'Add'}</button>
        {formError && <span style={{ color: 'crimson', marginLeft: 8 }}>{formError}</span>}
      </form>
      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!loading && !error && (
        <table style={{ width: '100%', marginTop: '1.5rem', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>Date</th>
              <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>Type</th>
              <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>Category</th>
              <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
              <th style={{ padding: '0.5em', borderBottom: '1px solid #e2e8f0' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>No transactions found.</td></tr>
            )}
            {transactions.map(tx => (
              <tr key={tx._id}>
                <td style={{ padding: '0.5em', borderBottom: '1px solid #f1f5f9' }}>{tx.date ? new Date(tx.date).toLocaleDateString() : ''}</td>
                <td style={{ padding: '0.5em', borderBottom: '1px solid #f1f5f9', textTransform: 'capitalize' }}>{tx.type}</td>
                <td style={{ padding: '0.5em', borderBottom: '1px solid #f1f5f9' }}>{tx.category}</td>
                <td style={{ padding: '0.5em', borderBottom: '1px solid #f1f5f9' }}>{tx.amount}</td>
                <td style={{ padding: '0.5em', borderBottom: '1px solid #f1f5f9' }}>{tx.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 