import React from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '../../config/branding';
import './AboutUs.css';
export default function AboutUs() {
  const { branding } = useBranding();
  return <div className="about-content">
    <h2>About {branding.name}</h2>
    <div className="about-sections"><section className="about-section">
      <p style={{ whiteSpace: 'pre-line' }}>{branding.aboutText}</p>
    </section></div>
    <section className="about-sections"><section className="contact-section">
      <h2>Get in touch</h2><p>Tell us about your next clothing project.</p>
      <Link to="/contact"><button className="cta-button">Contact us</button></Link>
      {branding.contactEmail && <p><a href={'mailto:' + branding.contactEmail}>{branding.contactEmail}</a></p>}
    </section></section>
  </div>;
}
