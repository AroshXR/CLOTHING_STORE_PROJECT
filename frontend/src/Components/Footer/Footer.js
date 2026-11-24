import React from 'react';
import { Link } from 'react-router-dom';
import { useBranding } from '../../config/branding';
import SiteBrand from '../SiteBrand';
import './Footer.css';
export default function Footer() {
  const { branding } = useBranding();
  const links = Object.entries(branding.socialLinks).filter(([, url]) => url);
  return <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__top">
        <div className="site-footer__identity">
          <Link className="site-footer__brand" to="/"><SiteBrand /></Link>
          {branding.tagline && <p>{branding.tagline}</p>}
          {branding.address && <p className="site-footer__address">{branding.address}</p>}
          {branding.contactEmail && <p><a href={'mailto:' + branding.contactEmail}>{branding.contactEmail}</a></p>}
          {branding.contactPhone && <p><a href={'tel:' + branding.contactPhone.replace(/[^\d+]/g, '')}>{branding.contactPhone}</a></p>}
        </div>
        {links.length > 0 && <nav className="site-footer__social" aria-label="Social media">
          {links.map(([key, url]) => <a key={key} href={url} target="_blank" rel="noopener noreferrer">{key === 'twitter' ? 'X / Twitter' : key[0].toUpperCase() + key.slice(1)}</a>)}
        </nav>}
      </div>
      <div className="site-footer__bottom">
        <p>© {new Date().getFullYear()} {branding.name}. All rights reserved.</p>
        <nav className="site-footer__legal" aria-label="Footer navigation">
          <Link to="/contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms and conditions</Link>
        </nav>
      </div>
    </div>
  </footer>;
}
