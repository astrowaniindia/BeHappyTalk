import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const IMAGES = [
  "Screenshot 2026-06-04 181453.png", "Screenshot 2026-06-04 181507.png", "Screenshot 2026-06-04 181516.png",
  "Screenshot 2026-06-04 181542.png", "Screenshot 2026-06-04 181557.png", "Screenshot 2026-06-04 192223.png",
  "Screenshot 2026-06-04 192238.png", "Screenshot 2026-06-04 192253.png", "Screenshot 2026-06-04 192410.png",
  "Screenshot 2026-06-05 130538.png", "Screenshot 2026-06-05 130548.png", "Screenshot 2026-06-05 130559.png",
  "Screenshot 2026-06-05 130607.png", "Screenshot 2026-06-05 130617.png", "Screenshot 2026-06-05 130635.png",
  "Screenshot 2026-06-05 130644.png", "Screenshot 2026-06-05 130702.png", "Screenshot 2026-06-05 133513.png",
  "Screenshot 2026-06-05 133528.png", "Screenshot 2026-06-05 133538.png", "Screenshot 2026-06-05 133551.png",
  "Screenshot 2026-06-05 133608.png", "Screenshot 2026-06-05 133633.png", "Screenshot 2026-06-05 145423.png",
  "Screenshot 2026-06-05 145436.png", "Screenshot 2026-06-05 145444.png", "Screenshot 2026-06-05 145456.png",
  "Screenshot 2026-06-05 145508.png", "Screenshot 2026-06-05 145519.png", "Screenshot 2026-06-05 145748.png",
  "Screenshot 2026-06-05 145756.png", "Screenshot 2026-06-05 145804.png", "Screenshot 2026-06-05 145814.png",
  "Screenshot 2026-06-05 145830.png", "Screenshot 2026-06-05 145904.png", "Screenshot 2026-06-05 145924.png"
];

export default function Home() {
  const { hash } = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollYRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const updateDOM = () => {
      const scrollY = scrollYRef.current;
      
      const bg = document.getElementById('hero-bg');
      if (bg) bg.style.opacity = String(Math.min(0.6, Math.max(0, (scrollY - 50) / 300)));

      const content = document.getElementById('hero-content');
      if (content) {
        content.style.opacity = String(Math.min(1, Math.max(0, (scrollY - 100) / 400)));
        content.style.pointerEvents = scrollY > 200 ? 'auto' : 'none';
      }

      const stack = document.getElementById('card-stack-container');
      if (stack) stack.style.pointerEvents = scrollY > 100 ? 'none' : 'auto';

      const reveal = document.getElementById('scroll-reveal');
      if (reveal) reveal.style.opacity = String(Math.max(0, 1 - scrollY / 150));

      if (containerRef.current) {
        const layers = containerRef.current.getElementsByClassName('scroll-layer');
        for (let i = 0; i < layers.length; i++) {
          const total = IMAGES.length;
          const angle = (i / total) * Math.PI * 2;
          const distanceMultiplier = 1.2 + (i % 3) * 0.8;
          const scrollX = Math.cos(angle) * scrollY * distanceMultiplier;
          const scrollYAxis = Math.sin(angle) * scrollY * distanceMultiplier;
          (layers[i] as HTMLElement).style.transform = `translate3d(${scrollX}px, ${scrollYAxis}px, 0)`;
        }
      }
      ticking = false;
    };

    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(updateDOM);
        ticking = true;
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger initial state
    updateDOM();
    
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
          
          <div id="hero-bg" style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('/main.png') no-repeat top center",
            backgroundSize: 'cover',
            opacity: 0,
            zIndex: -1,
            pointerEvents: 'none'
          }}></div>

          <div id="hero-content" className="hero-content" style={{ position: 'relative', zIndex: 30, opacity: 0, pointerEvents: 'none', transition: 'opacity 0.1s ease-out' }}>
            <h1 className="hero-title">
            Talk anonymously.<br/>
            <span>Feel better.</span>
          </h1>
          <p className="hero-desc">
            We understand, and you're not alone. Try BeHappyTalk, a completely anonymous platform for mental wellbeing. Connect with volunteers or certified providers securely via chat, voice, or video.
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

        <div id="card-stack-container" className="card-stack-container" ref={containerRef} style={{ pointerEvents: 'auto' }}>
          {IMAGES.map((src, index) => {
            return (
              <div 
                key={index} 
                className="scroll-layer"
                style={{ transform: `translate(0px, 0px)` }}
              >
                <div className={`fan-layer fan-${index + 1}`}>
                  <img src={`/${src}`} className="stacked-card" alt="" loading="lazy" />
                </div>
              </div>
            );
          })}
        </div>
        
        <div id="scroll-reveal" style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 1,
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
