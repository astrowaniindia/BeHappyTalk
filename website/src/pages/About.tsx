import React, { useEffect } from 'react';

export default function About() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="about-section section-block" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '15rem' }}>
      <div className="container about-container" style={{ transform: 'translateX(-30px)' }}>
        <div className="about-image">
          <img src="/Screenshot 2026-06-04 182837.png" className="inline-sticker" alt="" />
          <img src="/Screenshot 2026-06-04 182849.png" className="inline-sticker offset-sticker-about" alt="" />
        </div>
        <div className="about-text">
          <h2>Talk to a relationship coach. Feel better.</h2>
          <p>BeHappyTalk was founded on a simple principle: everyone deserves a safe space to share their feelings without fear of judgment.</p>
          <p>Connect with mental health coaches and relationship coaches. We are committed to providing an accessible platform for mental wellbeing. Whether you are dealing with everyday stress or deeper emotional challenges, our community is here to listen.</p>
        </div>
      </div>
    </section>
  );
}
