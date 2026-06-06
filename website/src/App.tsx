import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import ProviderInfo from './pages/ProviderInfo';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
import Safety from './pages/Safety';
import ChildSafety from './pages/ChildSafety';
import ReportVulnerability from './pages/ReportVulnerability';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/provider" element={<ProviderInfo />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/child-safety" element={<ChildSafety />} />
            <Route path="/report-vulnerability" element={<ReportVulnerability />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
