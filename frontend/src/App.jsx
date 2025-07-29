import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Register from './pages/Register';
import RequireAuth from './components/RequireAuth';
import Navbar from './components/Navbar';
import Transactions from './pages/Transactions';
import Receipts from './pages/Receipts';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<div className="page-card"><h2>Welcome to Typeface Project</h2><p style={{marginTop: '1rem', color: '#555'}}>A minimal, modern finance dashboard.</p></div>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
        <Route path="/receipts" element={<RequireAuth><Receipts /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
