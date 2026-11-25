import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight, Asterisk } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useBranding } from '../../config/branding';
import EditorialPhoto from './EditorialPhoto';
import Reveal, { editorialEase } from './Reveal';
import './Editorial.css';
export default function Splash() {
  const { branding } = useBranding(), reduced = useReducedMotion();
  return <div className="ed-page ed-splash">
    <section className="ed-splash-hero ed-pad"><div className="ed-hero-meta"><span>INDIVIDUAL BY DESIGN</span><span>THE EVERYDAY / REIMAGINED</span></div>
      <motion.h1 initial={reduced ? false : { opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, ease: editorialEase }}>NOT MADE<br />TO BLEND IN<span className="ed-full-stop">.</span></motion.h1>
      <div className="ed-splash-visual"><motion.div className="ed-splash-photo ed-fold-left" initial={reduced ? false : { opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .1, ease: editorialEase }}><EditorialPhoto panel={0} eager alt="Black blazer and relaxed tailoring — editorial style inspiration" /></motion.div><motion.div className="ed-splash-photo ed-splash-photo--main" initial={reduced ? false : { opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .22, ease: editorialEase }}><EditorialPhoto panel={1} eager alt="A simple cotton T-shirt with an individual point of view" /></motion.div><motion.div className="ed-splash-photo ed-fold-right" initial={reduced ? false : { opacity: 0, y: 70 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .34, ease: editorialEase }}><EditorialPhoto panel={2} eager alt="White shirt and flowing black skirt — editorial style inspiration" /></motion.div></div>
      <div className="ed-splash-bottom"><p>{branding.tagline}<br />Discover pieces. Make your mark.</p><Link to="/home" className="ed-button ed-button--light">Step inside <ArrowUpRight size={20} /></Link><a href="#your-way" className="ed-scroll-link">SCROLL TO DISCOVER <ArrowDown size={15} /></a></div>
    </section>
    <section id="your-way" className="ed-intro ed-pad"><Reveal><span className="ed-kicker">A WARDROBE WITH A POINT OF VIEW</span><h2>LESS FOLLOWING.<br />MORE FEELING<br /><span className="ed-outline-word">LIKE YOU.</span></h2></Reveal><Reveal delay={.12} className="ed-intro-copy"><Asterisk size={62} strokeWidth={1.3} /><p>{branding.heroDescription}</p><Link to="/about" className="ed-text-link">Meet {branding.name} <ArrowUpRight size={20} /></Link></Reveal></section>
    <section className="ed-studio-story ed-pad"><Reveal className="ed-studio-story-photo"><EditorialPhoto panel={1} alt="A cotton T-shirt styled with charcoal trousers" /></Reveal><Reveal className="ed-studio-story-copy"><span className="ed-kicker">THE DESIGN STUDIO</span><h2>START WITH<br />A TEE.<br />MAKE IT YOU.</h2><p>Front, back, sleeves. Your colours, your artwork, your message. Bring your idea into view in the 3D customizer.</p><Link to="/customizer" className="ed-button ed-button--light">Create your T-shirt <ArrowUpRight size={20} /></Link></Reveal></section>
    <section className="ed-paths ed-pad"><Reveal><span className="ed-kicker">FIND YOUR OWN DIRECTION</span></Reveal>{[['01','The collection','Pieces for your everyday.','/outlet'],['02','The studio','A blank canvas for your ideas.','/customizer'],['03','The occasion','Discover outfits to rent.','/rentalHome']].map(([number,title,copy,to]) => <Reveal key={to}><Link className="ed-path" to={to}><span>{number}</span><h2>{title}</h2><p>{copy}</p><ArrowUpRight size={28} /></Link></Reveal>)}</section>
  </div>;
}
