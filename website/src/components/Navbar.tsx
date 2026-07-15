import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0' }} onClick={() => setIsOpen(false)}>
          <img src="/icon.png" alt="BeHappyTalk Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ marginLeft: '-5px' }}>BeHappy<span>Talk</span></div>
        </Link>
      </div>

      <button className="mobile-menu-btn" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        )}
      </button>

      <div className={`nav-links ${isOpen ? 'active' : ''}`}>
        <Link to="/" className="nav-item" onClick={() => setIsOpen(false)}>Home</Link>
        <Link to="/#features" className="nav-item" onClick={() => setIsOpen(false)}>Features</Link>
        <Link to="/provider" className="nav-item" onClick={() => setIsOpen(false)}>Join Us</Link>
        <Link to="/about" className="nav-item" onClick={() => setIsOpen(false)}>About Us</Link>
        
        <a href="https://play.google.com/store/apps/details?id=com.behappytalk.app" target="_blank" rel="noopener noreferrer" className="btn-primary mobile-only-btn" onClick={() => setIsOpen(false)}>
          <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor">
            <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
          </svg>
          Get App
        </a>
      </div>

      <a href="https://play.google.com/store/apps/details?id=com.behappytalk.app" target="_blank" rel="noopener noreferrer" className="btn-primary desktop-only-btn">
        <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor">
          <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
        </svg>
        Get App
      </a>
    </nav>
  );
}
