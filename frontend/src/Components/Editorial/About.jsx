import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Asterisk } from 'lucide-react';
import { useBranding } from '../../config/branding';
import EditorialPhoto from './EditorialPhoto';
import Reveal from './Reveal';
import './Editorial.css';
export default function About() {
  const { branding } = useBranding();
  return <div className="ed-page ed-about">
    <section className="ed-about-hero ed-pad"><span className="ed-kicker">ABOUT {branding.name}</span><Reveal><h1>ROOM FOR<br />YOUR OWN<br />EXPRESSION.</h1></Reveal><div className="ed-about-hero-grid"><Reveal className="ed-about-portrait ed-fold-left"><EditorialPhoto panel={0} eager alt="An individual take on classic black tailoring" /></Reveal><Reveal className="ed-about-statement" delay={.12}><Asterisk size={64} strokeWidth={1.2} /><p>{branding.aboutText}</p><span className="ed-kicker">OUR POINT OF VIEW</span><p>Personal style should have room to change. Discover a piece, create a T-shirt with your own artwork, or find an outfit for an occasion. Choose the way that feels like you.</p></Reveal></div></section>
    <section className="ed-process ed-pad"><Reveal><span className="ed-kicker">FROM AN IDEA TO YOUR WARDROBE</span><h2>MAKE YOUR<br />OWN MARK.</h2></Reveal><div className="ed-process-list">{[['01','Find your starting point','Explore the collection, rental outfits, or a blank T-shirt in the design studio.'],['02','Put yourself in the details','Choose garment colours, place artwork across the panels, and add your message.'],['03','See it from every angle','Review the 3D preview, check the size and quantity, and save the design to your cart.'],['04','Make it yours','Review your order at checkout. Payment is by cash on delivery or collection.']].map(([number,title,copy]) => <Reveal key={number}><article><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article></Reveal>)}</div></section>
    <section className="ed-about-last ed-pad"><Reveal><EditorialPhoto panel={2} alt="A white shirt and black skirt with expressive movement" className="ed-fold-right" /></Reveal><Reveal><span className="ed-kicker">A LITTLE MORE YOU</span><h2>NO SINGLE<br />WAY TO<br />WEAR IT.</h2><p>{branding.tagline}</p><Link to="/customizer" className="ed-button">Create something personal <ArrowUpRight size={20} /></Link><Link to="/contact" className="ed-text-link">Let’s talk <ArrowUpRight size={20} /></Link></Reveal></section>
  </div>;
}
