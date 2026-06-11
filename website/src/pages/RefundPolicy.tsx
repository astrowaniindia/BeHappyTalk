import React, { useEffect } from 'react';

export default function RefundPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="section-block legal-page" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '15rem' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="legal-content-wrapper">
          <div className="legal-header">
            <h1>Cancellation & Refund Policy</h1>
            <p>Last updated: June 12, 2026</p>
          </div>
          <div className="legal-content">
            <h2>1. Digital Services</h2>
            <p>BeHappyTalk operates as a digital platform connecting users with consultants and coaches. All services, subscriptions, and wallet top-ups provided through the BeHappyTalk application are purely digital in nature.</p>

            <h2>2. No Refund Policy</h2>
            <p>Due to the immediate access and digital nature of our services, all payments made on BeHappyTalk are <strong>final and non-refundable</strong>. We do not offer refunds, partial refunds, or credits for any used or unused subscription periods, wallet balances, or completed consultation sessions.</p>

            <h2>3. Cancellations</h2>
            <p>You may cancel your ongoing subscription or delete your account at any time through the app settings. However, cancelling a subscription will only prevent future recurring charges. It will not initiate a refund for any previous charges. You will continue to have access to the service until the end of your current billing period.</p>

            <h2>4. Exceptions</h2>
            <p>In the rare event of a technical failure resulting in a duplicate charge, please contact our support team within 48 hours of the transaction. Such cases will be reviewed on an individual basis and processed within 5-7 business days if verified.</p>

            <h2>5. Contact Us</h2>
            <p>For any billing inquiries, please reach out to us at <strong>care@BeHappyTalk.com</strong>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
