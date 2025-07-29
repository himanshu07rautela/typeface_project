import { NavLink, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const isLoggedIn = !!localStorage.getItem('token');

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  // Common link style function
  const linkStyle = ({ isActive }) => ({
    fontWeight: isActive ? 700 : 500,
    color: isActive ? 'var(--accent)' : 'var(--primary)',
    textDecoration: 'none',
    padding: '0.3em 0.8em',
    borderRadius: 5
  });

  // Button style
  const buttonStyle = {
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '0.5em 1em',
    fontWeight: 600,
    cursor: 'pointer'
  };

  return (
    <nav style={{
      background: '#fff',
      borderBottom: '1px solid #e2e8f0',
      padding: '1rem 0.5rem',
      marginBottom: '2.5rem',
      display: 'flex',
      gap: '1rem',
      borderRadius: '8px 8px 0 0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
    }}>
      <NavLink to="/" style={linkStyle}>Dashboard</NavLink>
      {isLoggedIn && <NavLink to="/transactions" style={linkStyle}>Transactions</NavLink>}
      {isLoggedIn && <NavLink to="/receipts" style={linkStyle}>Receipts</NavLink>}
      {isLoggedIn && <NavLink to="/analytics" style={linkStyle}>Analytics</NavLink>}
      <div style={{ flex: 1 }} />
      
      {isLoggedIn ? (
        <button onClick={handleLogout} style={buttonStyle}>Logout</button>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <NavLink to="/login" style={{ ...buttonStyle, textDecoration: 'none', display: 'block' }}>Login</NavLink>
          <NavLink to="/register" style={{ ...buttonStyle, textDecoration: 'none', display: 'block', background: 'var(--accent)' }}>Register</NavLink>
        </div>
      )}
    </nav>
  );
}