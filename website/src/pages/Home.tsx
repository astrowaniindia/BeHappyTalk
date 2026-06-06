import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';


export default function Home() {
  const { hash } = useLocation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      <div className="hero-scroll-track" style={{ height: '300vh' }}>
        <header className="hero" style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
          
          <div style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/main.png') no-repeat top center",
            backgroundSize: 'cover',
            opacity: Math.min(0.6, Math.max(0, (scrollY - 50) / 300)),
            zIndex: -1,
            pointerEvents: 'none'
          }}></div>

          <div className="hero-content" style={{ position: 'relative', zIndex: 30, opacity: Math.min(1, Math.max(0, (scrollY - 100) / 400)), pointerEvents: scrollY > 200 ? 'auto' : 'none', transition: 'opacity 0.1s ease-out' }}>
            <h1 className="hero-title">
            Talk anonymously.<br/>
            <span>Feel better.</span>
          </h1>
          <p className="hero-desc">
            We understand, and you're not alone. Try BeHappyTalk, a completely anonymous platform for mental wellbeing. Connect with volunteers or certified providers securely via chat, voice, or video.
          </p>
          <div className="hero-actions" id="download">
            <a href="https://play.google.com/store/apps/details?id=com.behappytalk" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Download it from Google Play Store
            </a>
          </div>
        </div>

        <div className="card-stack-container" style={{ pointerEvents: scrollY > 100 ? 'none' : 'auto' }}>
          {[
            "Screenshot 2026-06-04 181453.png",
            "Screenshot 2026-06-04 181507.png",
            "Screenshot 2026-06-04 181516.png",
            "Screenshot 2026-06-04 181542.png",
            "Screenshot 2026-06-04 181557.png",
            "Screenshot 2026-06-04 192223.png",
            "Screenshot 2026-06-04 192238.png",
            "Screenshot 2026-06-04 192253.png",
            "Screenshot 2026-06-04 192410.png",
            "Screenshot 2026-06-05 130538.png",
            "Screenshot 2026-06-05 130548.png",
            "Screenshot 2026-06-05 130559.png",
            "Screenshot 2026-06-05 130607.png",
            "Screenshot 2026-06-05 130617.png",
            "Screenshot 2026-06-05 130635.png",
            "Screenshot 2026-06-05 130644.png",
            "Screenshot 2026-06-05 130702.png",
            "Screenshot 2026-06-05 133513.png",
            "Screenshot 2026-06-05 133528.png",
            "Screenshot 2026-06-05 133538.png",
            "Screenshot 2026-06-05 133551.png",
            "Screenshot 2026-06-05 133608.png",
            "Screenshot 2026-06-05 133633.png",
            "Screenshot 2026-06-05 145423.png",
            "Screenshot 2026-06-05 145436.png",
            "Screenshot 2026-06-05 145444.png",
            "Screenshot 2026-06-05 145456.png",
            "Screenshot 2026-06-05 145508.png",
            "Screenshot 2026-06-05 145519.png",
            "Screenshot 2026-06-05 145748.png",
            "Screenshot 2026-06-05 145756.png",
            "Screenshot 2026-06-05 145804.png",
            "Screenshot 2026-06-05 145814.png",
            "Screenshot 2026-06-05 145830.png",
            "Screenshot 2026-06-05 145904.png",
            "Screenshot 2026-06-05 145924.png"
          ].map((src, index) => {
            const total = 36;
            const angle = (index / total) * Math.PI * 2;
            const distanceMultiplier = 1.2 + (index % 3) * 0.8;
            const scrollX = Math.cos(angle) * scrollY * distanceMultiplier;
            const scrollYAxis = Math.sin(angle) * scrollY * distanceMultiplier;

            return (
              <div 
                key={index} 
                className="scroll-layer"
                style={{ transform: `translate(${scrollX}px, ${scrollYAxis}px)` }}
              >
                <div className={`fan-layer fan-${index + 1}`}>
                  <img src={`/${src}`} className="stacked-card" alt="" />
                </div>
              </div>
            );
          })}
        </div>
        
        <div style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: Math.max(0, 1 - scrollY / 150),
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'rgba(20, 20, 20, 0.95)',
            border: '2px solid var(--primary)',
            padding: '12px 28px',
            borderRadius: '50px',
            color: 'var(--primary)'
          }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.5px' }}>Scroll to reveal</span>
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
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
              <p>For deeper connections, schedule a video session. Face-to-face interactions built on state-of-the-art secure WebRTC technology.</p>
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
