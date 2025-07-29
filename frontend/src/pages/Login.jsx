import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-card">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: '0.7em', borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button type="submit" disabled={loading} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.7em', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {error && <div style={{ color: 'crimson', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  );
} 