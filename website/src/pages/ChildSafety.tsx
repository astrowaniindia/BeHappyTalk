import React, { useEffect } from 'react';

export default function ChildSafety() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="section-block legal-page" style={{ minHeight: 'calc(100vh - 88px)', paddingTop: '15rem', paddingBottom: '6rem' }}>
      <div className="container" style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px', letterSpacing: '-1px' }}>
            Child Safety Standards
          </h1>
          <p style={{ opacity: 0.6, marginBottom: '8px' }}>
            Published by BeHappyTalk &nbsp;|&nbsp; Effective Date: January 1, 2025 &nbsp;|&nbsp; Last Updated: June 27, 2026
          </p>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '100px', padding: '6px 16px', fontSize: '13px', opacity: 0.8
          }}>
            📱 Applies to: BeHappyTalk (com.behappytalk.app) on Google Play
          </span>
        </div>

        {/* Zero Tolerance Alert */}
        <div style={{
          background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.4)',
          borderRadius: '10px', padding: '20px 24px', marginBottom: '36px',
          display: 'flex', gap: '16px', alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: '22px', flexShrink: 0 }}>🚫</span>
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#f87171' }}>
              Zero Tolerance for CSAE
            </h4>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, opacity: 0.85 }}>
              <strong>BeHappyTalk</strong> maintains a strict, zero-tolerance policy against{' '}
              <strong>Child Sexual Abuse and Exploitation (CSAE)</strong> in any form. Any user found
              engaging in CSAE-related conduct will be immediately banned and reported to the appropriate
              law enforcement authorities.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '16px', lineHeight: 1.8, opacity: 0.85 }}>

          {/* Section 1 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            1. Scope and Purpose
          </h2>
          <p>
            This Child Safety Standards document applies to all users of <strong>BeHappyTalk</strong>{' '}
            (available on Google Play as <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.9em' }}>com.behappytalk.app</code>),
            its associated web platform at behappytalk.com, and any related services operated by BeHappyTalk.
          </p>
          <p>
            These standards are published to explicitly prohibit{' '}
            <strong style={{ background: 'rgba(234,179,8,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              Child Sexual Abuse and Exploitation (CSAE)
            </strong>{' '}
            and to outline the mechanisms we have in place to detect, prevent, and respond to such conduct.
            This document is globally accessible and publicly available.
          </p>

          {/* Section 2 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            2. Prohibition of CSAE
          </h2>
          <p>
            <strong>BeHappyTalk explicitly prohibits all forms of Child Sexual Abuse and Exploitation (CSAE)</strong>,
            including but not limited to:
          </p>
          <ul style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '10px' }}>
              Production, distribution, possession, or solicitation of{' '}
              <strong style={{ background: 'rgba(234,179,8,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                Child Sexual Abuse Material (CSAM)
              </strong>{' '}
              — including images, videos, text, or any other format.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Grooming of minors — any communication, gift-giving, or relationship-building intended to
              facilitate sexual access to a child.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Sexual solicitation of minors, or sharing of sexually explicit content with any individual
              under 18 years of age.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Trafficking of children for sexual purposes or any form of sexual exploitation.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Facilitating access to minors for the purpose of sexual abuse or exploitation by third parties.
            </li>
            <li style={{ marginBottom: '10px' }}>
              Any conduct, content, or communication that sexualizes individuals under 18 years of age.
            </li>
          </ul>
          <p>
            These prohibitions apply universally across all in-app features of BeHappyTalk including live
            video sessions, private messaging, profile content, and any user-generated material.
          </p>

          {/* Section 3 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            3. Platform Eligibility — Adults Only
          </h2>
          <ul style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>BeHappyTalk is strictly intended for users aged 18 and above.</strong> Minors are not
              permitted to register, access, or use the platform.
            </li>
            <li style={{ marginBottom: '10px' }}>Users must confirm they are 18 or older during account registration.</li>
            <li style={{ marginBottom: '10px' }}>
              Accounts suspected of being operated by minors are suspended immediately pending verification.
            </li>
            <li style={{ marginBottom: '10px' }}>
              BeHappyTalk reserves the right to terminate any account whose user is found to be under the
              age of 18, without notice.
            </li>
          </ul>

          {/* Section 4 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            4. In-App Mechanism for User Feedback and Reporting
          </h2>
          <p>
            <strong>BeHappyTalk provides multiple in-app mechanisms</strong> for users to report CSAE, CSAM,
            or any conduct they believe violates these Child Safety Standards:
          </p>
          <ul style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '10px' }}>
              <strong>In-App Report Button:</strong> Every user profile and live session has a visible "Report"
              button. Users can report any content or conduct violating child safety with a dedicated
              "Child Safety / CSAE" category.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>In-App Support Chat:</strong> Users can contact BeHappyTalk support directly within the
              app to escalate child safety concerns.
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Email Reporting:</strong> Reports can be submitted to{' '}
              <a href="mailto:childsafety@behappytalk.com" style={{ color: '#facc15' }}>
                childsafety@behappytalk.com
              </a>{' '}
              — this inbox is monitored by our dedicated Child Safety team.
            </li>
          </ul>
          <p>
            All reports related to child safety are treated as the highest priority and are reviewed within
            24 hours of receipt.
          </p>

          {/* Section 5 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            5. CSAM Detection and Handling Process
          </h2>
          <p>
            BeHappyTalk has established a clear process for identifying and addressing{' '}
            <strong style={{ background: 'rgba(234,179,8,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
              Child Sexual Abuse Material (CSAM)
            </strong>:
          </p>
          <ol style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '12px' }}>
              <strong>Detection:</strong> Automated content scanning tools are used to detect known CSAM
              using industry-standard hash-matching technology (including PhotoDNA or equivalent). All
              user-generated image and video content is scanned prior to or upon upload.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Immediate Removal:</strong> Any content identified as CSAM is immediately removed
              from the platform without prior notice to the user.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Account Suspension:</strong> The account associated with the CSAM is immediately
              suspended and permanently banned.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Mandatory Reporting:</strong> BeHappyTalk reports all confirmed CSAM incidents to
              the <strong>National Center for Missing &amp; Exploited Children (NCMEC)</strong> via the
              CyberTipline, as required by law (18 U.S.C. § 2258A), and to local law enforcement
              authorities as applicable.
            </li>
            <li style={{ marginBottom: '12px' }}>
              <strong>Preservation of Evidence:</strong> All relevant data, logs, and evidence are
              preserved and provided to law enforcement agencies upon lawful request.
            </li>
          </ol>

          {/* Section 6 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            6. Cooperation with Law Enforcement
          </h2>
          <ul style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '10px' }}>
              BeHappyTalk cooperates fully and promptly with all lawful law enforcement requests related
              to child safety investigations.
            </li>
            <li style={{ marginBottom: '10px' }}>
              We will disclose user data and evidence to appropriate authorities when required to do so by
              law, or when we believe disclosure is necessary to protect a child from imminent harm.
            </li>
            <li style={{ marginBottom: '10px' }}>
              BeHappyTalk maintains records sufficient to support law enforcement investigations for the
              legally required retention period.
            </li>
          </ul>

          {/* Section 7 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            7. Compliance with Applicable Laws
          </h2>
          <p>BeHappyTalk is committed to full compliance with all applicable child safety laws and regulations, including:</p>
          <ul style={{ paddingLeft: '24px' }}>
            <li style={{ marginBottom: '10px' }}>
              The <strong>PROTECTION OF CHILDREN FROM SEXUAL OFFENCES ACT, 2012 (POCSO Act)</strong> — India
            </li>
            <li style={{ marginBottom: '10px' }}>
              The <strong>Information Technology Act, 2000</strong> and its amendments relating to child
              protection — India
            </li>
            <li style={{ marginBottom: '10px' }}>
              The <strong>PROTECT Our Children Act</strong> and mandatory NCMEC reporting obligations
              (18 U.S.C. § 2258A) — United States
            </li>
            <li style={{ marginBottom: '10px' }}>
              <strong>Google Play's Child Safety Standards policy</strong> and all applicable platform policies.
            </li>
            <li style={{ marginBottom: '10px' }}>
              All other applicable national and international laws and regulations related to child sexual
              abuse and exploitation.
            </li>
          </ul>

          {/* Compliance Declaration */}
          <div style={{
            background: 'rgba(22,163,74,0.12)', border: '1px solid rgba(22,163,74,0.4)',
            borderRadius: '10px', padding: '20px 24px', margin: '32px 0',
            display: 'flex', gap: '16px', alignItems: 'flex-start'
          }}>
            <span style={{ fontSize: '22px', flexShrink: 0 }}>🛡️</span>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 700, color: '#4ade80' }}>
                Compliance Declaration
              </h4>
              <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.6, opacity: 0.85 }}>
                BeHappyTalk (com.behappytalk.app) declares that: (1) it has an in-app mechanism for user
                feedback and reporting of CSAE; (2) it has a defined method for addressing CSAM, including
                mandatory NCMEC reporting; and (3) it complies with all applicable child safety laws and
                regulations.
              </p>
            </div>
          </div>

          {/* Section 8 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            8. Child Safety Point of Contact
          </h2>
          <p>
            BeHappyTalk has designated a dedicated Child Safety contact for all matters related to child
            safety, CSAE, and CSAM. External parties, researchers, law enforcement agencies, and users may
            contact our Child Safety team directly:
          </p>
          <div style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px', padding: '24px 28px', margin: '20px 0'
          }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700 }}>Child Safety Team</h3>
            <p style={{ margin: '0 0 16px', fontSize: '13px', opacity: 0.5 }}>
              Designated Child Safety Point of Contact — BeHappyTalk
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '14px' }}>
              📧 <strong>Primary:</strong>{' '}
              <a href="mailto:childsafety@behappytalk.com" style={{ color: '#facc15' }}>
                childsafety@behappytalk.com
              </a>
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '14px' }}>
              📧 <strong>General:</strong>{' '}
              <a href="mailto:care@behappytalk.com" style={{ color: '#facc15' }}>
                care@behappytalk.com
              </a>
            </p>
            <p style={{ margin: '0 0 8px', fontSize: '14px' }}>🌐 BeHappyTalk — behappytalk.com</p>
            <p style={{ margin: 0, fontSize: '14px' }}>⏱️ Response Time: Within 24 hours for child safety matters</p>
          </div>
          <p>
            Law enforcement agencies requiring emergency assistance or preservation requests related to
            child safety may contact us at{' '}
            <a href="mailto:childsafety@behappytalk.com" style={{ color: '#facc15', fontWeight: 600 }}>
              childsafety@behappytalk.com
            </a>{' '}
            with "LAW ENFORCEMENT" in the subject line for expedited handling.
          </p>

          {/* Section 9 */}
          <h2 style={{ fontSize: '22px', fontWeight: 700, marginTop: '40px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
            9. Policy Updates
          </h2>
          <p>
            BeHappyTalk is committed to continuously improving our child safety practices. These standards
            will be reviewed and updated at least annually, or whenever required by changes in law, platform
            features, or Google Play policies. The effective date at the top of this document reflects the
            most recent update.
          </p>
          <p>
            <em>
              By using BeHappyTalk, all users agree to abide by these Child Safety Standards. Violations
              will be taken seriously and addressed with the utmost urgency.
            </em>
          </p>

        </div>
      </div>
    </section>
  );
}
