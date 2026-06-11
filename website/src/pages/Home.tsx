import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function Home() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [hash]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
        }
      });
    }, { threshold: 0.15 });

    const elements = document.querySelectorAll('.slide-hidden-left, .slide-hidden-right, .slide-hidden-up');
    elements.forEach(el => observer.observe(el));

    return () => elements.forEach(el => observer.unobserve(el));
  }, []);

  return (
    <>
      <div className="hero-scroll-track">
        <header className="hero" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          
          <div id="hero-bg" style={{
            position: 'absolute',
            top: 0, left: 0, width: '100%', height: '100%',
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/main.png') no-repeat top center",
            backgroundSize: 'cover',
            opacity: 0.6,
            zIndex: -1,
            pointerEvents: 'none'
          }}></div>

          <div id="hero-content" className="hero-content" style={{ position: 'relative', zIndex: 30, opacity: 1, pointerEvents: 'auto', textAlign: 'center' }}>
            <h1 className="hero-title">
            Talk to a relationship coach.<br/>
            <span>Feel better.</span>
          </h1>
          <p className="hero-desc" style={{ margin: '0 auto 2.5rem' }}>
            We understand, and you're not alone. Try BeHappyTalk, a completely anonymous platform for mental wellbeing. Connect with a mental wellbeing coach and relationship coach securely via chat, voice, or video.
          </p>
          <div className="hero-actions" id="download">
            <a href="https://play.google.com/store/apps/details?id=com.behappytalk" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              <svg viewBox="0 0 512 512" width="24" height="24" fill="currentColor">
                <path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" />
              </svg>
              Download it from Google Play Store
            </a>
          </div>
        </div>
      </header>
      </div>

      <section className="features-section section-block" id="features">
        <div className="container">
          <div className="section-header slide-hidden-up">
            <h2 className="section-title">Support on your terms</h2>
            <p className="section-subtitle">Flexible and secure communication methods so you can get the help you need.</p>
          </div>
          
          <div className="feature-row">
            <div className="feature-text slide-hidden-left">
              <h3>Secure Text Chat</h3>
              <p>Connect instantly with providers through our encrypted messaging. Take your time to articulate your thoughts in a safe space.</p>
            </div>
            <div className="feature-image slide-hidden-right">
              <img src="/Screenshot 2026-06-04 182716.png" className="inline-sticker" alt="" />
              <img src="/Screenshot 2026-06-04 182728.png" className="inline-sticker offset-sticker" alt="" />
            </div>
          </div>

          <div className="feature-row reverse">
            <div className="feature-text slide-hidden-right">
              <h3>Voice Calling</h3>
              <p>Have a real-time conversation without revealing your identity. A comforting voice is just a tap away when you need it most.</p>
            </div>
            <div className="feature-image slide-hidden-left">
              <img src="/Screenshot 2026-06-04 182735.png" className="inline-sticker" alt="" />
            </div>
          </div>

          <div className="feature-row">
            <div className="feature-text slide-hidden-left">
              <h3>Video Consultations</h3>
              <p>For deeper connections, schedule a video session. Face-to-face interactions built on secure and private technology.</p>
            </div>
            <div className="feature-image slide-hidden-right">
              <img src="/Screenshot 2026-06-04 182744.png" className="inline-sticker" alt="" />
              <img src="/Screenshot 2026-06-04 182802.png" className="inline-sticker offset-sticker" alt="" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
