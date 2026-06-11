import React, { useEffect } from 'react';

export default function ContactUs() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="about-section section-block" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '15rem' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '16px', padding: '40px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontSize: '24px' }}>
          📍 Get in Touch
        </h2>
        
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#111' }}>Office Address</h3>
          <p style={{ color: '#444', lineHeight: '1.6', margin: 0 }}>
            NEXETERN<br/>
            BeHappyTalk.com<br/>
            267/500, Pratap Nagar,<br/>
            Jaipur - 302033,<br/>
            Rajasthan, India
          </p>
        </div>

        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>📞</span>
          <p style={{ margin: 0, color: '#444' }}><strong>Phone:</strong> +91-7414858885</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>✉️</span>
          <p style={{ margin: 0, color: '#444' }}><strong>Email:</strong> info@behappytalk.com</p>
        </div>
      </div>
    </section>
  );
}
