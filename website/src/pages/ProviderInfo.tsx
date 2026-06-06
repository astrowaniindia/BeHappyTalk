import React, { useEffect, useState } from 'react';

export default function ProviderInfo() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const benefits = [
    "Earn money by providing guidance",
    "Flexible scheduling",
    "Secure, anonymous connections",
    "Impactful community service"
  ];

  return (
    <section className="provider-section section-block dark-block" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '12rem' }}>
      <div className="container provider-container" style={{ transform: 'translateX(70px)' }}>
        <div className="provider-content">
          <h2>Join as a Provider</h2>
          <p>Make a real difference in people's lives. Join BeHappyTalk's network of certified providers and dedicated volunteers.</p>
          <ul className="provider-benefits" onMouseLeave={() => setActiveIndex(0)}>
            {benefits.map((benefit, index) => {
              const isActive = activeIndex === index;
              return (
                <li 
                  key={index}
                  onMouseEnter={() => setActiveIndex(index)}
                  style={{ 
                    marginBottom: isActive ? '1.2rem' : '0.8rem',
                    fontSize: isActive ? '1.8rem' : '1.3rem',
                    transition: 'all 0.3s ease',
                    cursor: 'default'
                  }}
                >
                  <span style={isActive ? {
                    color: 'var(--primary)', 
                    fontWeight: '800', 
                    letterSpacing: '0.5px', 
                    transition: 'all 0.3s ease'
                  } : {
                    color: 'inherit', 
                    fontWeight: 'normal',
                    transition: 'all 0.3s ease'
                  }}>
                    {benefit}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* This points to the portal webapp which will be hosted at /provider-app or sub-domain later, for now we will just use a hashtag to not break routing */}
          <a href="#portal" className="btn-primary" style={{ marginTop: '1.5rem' }}>Access Provider Portal</a>
        </div>
        <div className="provider-image">
          <img src="/Screenshot 2026-06-04 182811.png" className="stacked-sticker s1" alt="" />
          <img src="/Screenshot 2026-06-04 182827.png" className="stacked-sticker s2" alt="" />
          <img src="/Screenshot 2026-06-04 182802.png" className="stacked-sticker" style={{ width: '200px', transform: 'rotate(-10deg)', zIndex: 0, bottom: '-5%', left: '35%', position: 'absolute' }} alt="" />
        </div>
      </div>
    </section>
  );
}
