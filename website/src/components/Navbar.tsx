import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          <img src="/icon.png" alt="BeHappyTalk Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ marginLeft: '-5px' }}>BeHappy<span>Talk</span></div>
        </Link>
      </div>
      <div className="nav-links">
        <Link to="/" className="nav-item">Home</Link>
        <Link to="/#features" className="nav-item">Features</Link>
        <Link to="/provider" className="nav-item">For Providers</Link>
        <Link to="/about" className="nav-item">About Us</Link>
      </div>
      <a href="https://play.google.com/store/apps/details?id=com.behappytalk" target="_blank" rel="noopener noreferrer" className="btn-primary">
        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        Get App
      </a>
    </nav>
  );
}
