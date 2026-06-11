import React, { useEffect } from 'react';

export default function ShippingPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="section-block legal-page" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '15rem' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="legal-content-wrapper">
          <div className="legal-header">
            <h1>Shipping & Delivery Policy</h1>
            <p>Last updated: June 12, 2026</p>
          </div>
          <div className="legal-content">
            <h2>1. Digital Delivery</h2>
            <p>BeHappyTalk provides online software services, digital subscriptions, and virtual consulting. We do not sell or ship any physical goods or products.</p>

            <h2>2. Instant Activation</h2>
            <p>Upon successful processing of your payment, your digital services (such as wallet top-ups or subscription unlocks) are delivered and activated <strong>instantly</strong> to your BeHappyTalk account.</p>

            <h2>3. Delivery Confirmation</h2>
            <p>Once a transaction is successfully completed, you will receive a confirmation email or an in-app notification confirming your purchase. This serves as your proof of delivery.</p>

            <h2>4. Issues with Delivery</h2>
            <p>If your payment was successfully deducted from your bank account but your services or wallet balance were not updated instantly, it may be due to a network delay. In such cases, the system usually reconciles within 24 hours. If the issue persists, please contact our support team immediately at <strong>care@BeHappyTalk.com</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
