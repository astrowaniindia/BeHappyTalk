import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo" style={{ display: 'flex', alignItems: 'center', gap: '0', marginLeft: '-20px' }}>
            <img src="/icon.png" alt="BeHappyTalk Logo" style={{ width: '84px', height: '84px', objectFit: 'contain' }} />
            <div style={{ marginLeft: '-5px' }}>BeHappy<span>Talk</span></div>
          </div>
          <p className="footer-desc">An initiative aimed at improving mental wellbeing through accessible, anonymous, and secure communication.</p>
        </div>
        <div className="footer-links">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/#features">Features</Link></li>
            <li><Link to="/provider">Provider Portal</Link></li>
            <li><Link to="/about">About Us</Link></li>
          </ul>
        </div>
        <div className="footer-links">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/safety">Safety & Guidelines</Link></li>
            <li><Link to="/child-safety">Child Safety</Link></li>
            <li><Link to="/report-vulnerability">Report Vulnerability</Link></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        &copy; {new Date().getFullYear()} BeHappyTalk. All rights reserved.
      </div>
    </footer>
  );
}
