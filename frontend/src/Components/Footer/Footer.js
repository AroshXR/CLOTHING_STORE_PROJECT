import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useBranding } from '../../config/branding';
import SiteBrand from '../SiteBrand';
import Reveal from '../Editorial/Reveal';
import model from '../../assets/editorial/contact-model.png';
import developerLogo from '../../assets/developer-logo.png';
import './Footer.css';
export default function Footer() {
  const { branding } = useBranding(), { pathname } = useLocation();
  const expanded = ['/', '/home', '/userHome', '/about', '/contact', '/rentalHome', '/outlet'].includes(pathname) || pathname.startsWith('/outlet/') || pathname.startsWith('/outfit-details/');
  const social = Object.entries(branding.socialLinks || {}).filter(([, url]) => url);
  return <footer className={'site-footer' + (expanded ? ' site-footer--editorial' : '')}>
    {expanded && <div className="site-footer__campaign"><img src={model} alt="" aria-hidden="true" className="site-footer__model" /><Reveal><span className="ed-kicker">INDIVIDUAL BY DESIGN</span><h2>WEAR YOUR<br />OWN STORY.</h2><Link to="/customizer">Make your mark <ArrowUpRight size={23} /></Link></Reveal><span className="site-footer__campaign-note">A LITTLE MORE YOU.<br />EVERY SINGLE DAY.</span></div>}
    <div className="site-footer__inner"><div className="site-footer__top"><div className="site-footer__identity"><Link className="site-footer__brand" to="/home"><SiteBrand /></Link>{branding.tagline && <p>{branding.tagline}</p>}</div>
      <nav className="site-footer__columns" aria-label="Explore the store"><div><h3>DISCOVER</h3><Link to="/home">Home page</Link><Link to="/outlet">Shop collection</Link><Link to="/customizer">Design studio</Link><Link to="/rentalHome">Rental collection</Link></div><div><h3>OUR WORLD</h3><Link to="/about">About us</Link><Link to="/career">Careers</Link><Link to="/color-guide">Colour guide</Link></div><div><h3>LET’S TALK</h3><Link to="/contact">Get in touch <ArrowUpRight size={13} /></Link>{branding.contactEmail && <a href={'mailto:' + branding.contactEmail}>{branding.contactEmail}</a>}{branding.contactPhone && <a href={'tel:' + branding.contactPhone.replace(/[^\d+]/g, '')}>{branding.contactPhone}</a>}{branding.address && <p className="site-footer__address">{branding.address}</p>}</div></nav></div>
      <div className="site-footer__bottom"><p>© {new Date().getFullYear()} {branding.name}</p><div className="site-footer__social">{social.map(([name,url]) => <a key={name} href={url} target="_blank" rel="noopener noreferrer">{name === 'twitter' ? 'X / Twitter' : name}<ArrowUpRight size={12} /></a>)}</div><nav className="site-footer__legal" aria-label="Footer navigation"><Link to="/contact">Contact</Link><Link to="/privacy">Privacy policy</Link><Link to="/terms">Terms and conditions</Link></nav></div>
      <div className="site-footer__credit"><span>Designed and Developed by</span><span className="site-footer__developer-logo"><img src={developerLogo} alt="Developer logo" /></span></div>
    </div>
  </footer>;
}
