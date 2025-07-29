import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', firstName: '', lastName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await register(form);
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>Register</h2>
      <div style={{
        background: '#f1f5f9',
        color: '#444',
        borderRadius: 6,
        padding: '0.8em 1em',
        marginBottom: '1.2em',
        fontSize: '0.98em',
        textAlign: 'left',
        border: '1px solid #e2e8f0'
      }}>
        <strong>Registration Rules:</strong>
        <ul style={{ margin: '0.5em 0 0 1.2em', padding: 0 }}>
          <li>Username: 3-30 characters, only letters, numbers, and underscores</li>
          <li>Email: must be a valid email address</li>
          <li>Password: at least 6 characters</li>
        </ul>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          name="firstName"
          placeholder="First Name (optional)"
          value={form.firstName}
          onChange={handleChange}
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          name="lastName"
          placeholder="Last Name (optional)"
          value={form.lastName}
          onChange={handleChange}
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7em', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        {error && <div style={{ color: 'crimson', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  );
} 