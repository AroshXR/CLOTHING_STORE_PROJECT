import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Asterisk } from 'lucide-react';
import { useBranding } from '../../config/branding';
import EditorialPhoto from './EditorialPhoto';
import CollectionPreview from './CollectionPreview';
import Reveal from './Reveal';
import './Editorial.css';
export default function HomeLanding() {
  const { branding } = useBranding();
  return <div className="ed-page ed-home">
    <section className="ed-home-hero ed-pad"><div className="ed-hero-meta"><span>{branding.name}</span><span>YOUR WARDROBE. YOUR POINT OF VIEW.</span></div><div className="ed-home-hero-grid"><Reveal className="ed-home-title"><span className="ed-kicker">WEAR WHAT FEELS LIKE YOU</span><h1>{branding.heroTitle}</h1><p>{branding.heroDescription}</p><Link className="ed-button" to="/outlet">Explore the collection <ArrowUpRight size={20} /></Link></Reveal><div className="ed-home-collage"><Reveal className="ed-home-photo ed-fold-left" delay={.12}><EditorialPhoto panel={0} eager alt="Relaxed black tailoring — style inspiration" /></Reveal><Reveal className="ed-home-photo ed-fold-right" delay={.24}><EditorialPhoto panel={2} eager alt="An oversized white shirt with a black skirt — style inspiration" /></Reveal><span className="ed-image-note">STYLE IS PERSONAL.</span></div></div></section>
    <CollectionPreview />
    <section className="ed-match ed-pad"><Reveal className="ed-match-photo"><EditorialPhoto panel={1} alt="Cotton T-shirt and charcoal tailoring" /></Reveal><Reveal className="ed-match-copy"><Asterisk className="ed-asterisk" size={72} strokeWidth={1.2} /><span className="ed-kicker">A DIFFERENT KIND OF FIT</span><h2>THE ONE<br />YOU MAKE.</h2><p>A favourite piece starts with a personal touch. Choose a colour, place your artwork, add a message, and see it from every angle.</p><Link to="/customizer" className="ed-button ed-button--light">Enter the 3D studio <ArrowUpRight size={20} /></Link><div className="ed-feature-notes"><span>FRONT &amp; BACK</span><span>SLEEVE DETAILS</span><span>YOUR OWN ART</span></div></Reveal></section>
    <section className="ed-about-teaser ed-pad"><Reveal><span className="ed-kicker">MORE THAN WHAT YOU WEAR</span><h2>ROOM FOR<br />EXPRESSION.</h2></Reveal><Reveal delay={.12}><p>{branding.aboutText}</p><Link to="/about" className="ed-text-link">Our point of view <ArrowUpRight size={20} /></Link><Link to="/rentalHome" className="ed-text-link">Something for the occasion <ArrowUpRight size={20} /></Link></Reveal></section>
  </div>;
}
