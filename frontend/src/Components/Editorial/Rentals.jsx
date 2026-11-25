import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Asterisk } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { useBranding } from '../../config/branding';
import EditorialPhoto from './EditorialPhoto';
import Reveal from './Reveal';
import OutfitCard from '../pasindu/OutfitCard';
import './Editorial.css';
import './Rentals.css';

export default function Rentals() {
  const { branding } = useBranding(), navigate = useNavigate();
  const [outfits, setOutfits] = useState([]), [category, setCategory] = useState(''), [state, setState] = useState('loading'), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    axios.get(apiUrl('/api/owner/all-outfits'), { signal: controller.signal }).then(({ data }) => {
      if (!data?.success || !Array.isArray(data.outfits)) throw new Error('Unable to load outfits');
      setOutfits(data.outfits.filter(item => item._id)); setState('ready');
    }).catch(error => { if (error.code !== 'ERR_CANCELED') setState('error'); });
    return () => controller.abort();
  }, [attempt]);
  const categories = [...new Set(outfits.map(item => item.category).filter(Boolean))];
  function browse(event) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (category) query.set('category', category);
    const params = query.toString();
    navigate('/outfits' + (params ? '?' + params : ''));
  }
  return <div className="ed-page ed-rentals">
    <section className="ed-rentals-hero ed-pad">
      <div className="ed-hero-meta"><span>{branding.name} / RENTALS</span><span>A DIFFERENT LOOK. THE SAME YOU.</span></div>
      <div className="ed-rentals-hero-grid">
        <Reveal className="ed-rentals-intro"><span className="ed-kicker">SOMETHING FOR THE OCCASION</span><h1>FOR THE<br />MOMENT.</h1><p>A celebration, an evening out, a reason to dress up. Find an outfit to rent and make the occasion your own.</p><Link className="ed-button" to="/outfits">Explore rental outfits <ArrowUpRight size={20} /></Link><Link className="ed-text-link" to="/my-bookings">Your bookings <ArrowUpRight size={17} /></Link></Reveal>
        <div className="ed-rentals-collage"><Reveal className="ed-rentals-photo ed-fold-right" delay={.1}><EditorialPhoto panel={0} eager alt="Black tailoring — rental style inspiration" /></Reveal><Reveal className="ed-rentals-inset ed-fold-left" delay={.22}><EditorialPhoto panel={2} eager alt="White shirt and flowing skirt — rental style inspiration" /></Reveal><span className="ed-image-note">STYLE FOR THE OCCASION.</span></div>
      </div>
    </section>
    <section className="ed-rental-search ed-pad" aria-label="Find rental outfits"><Reveal><span className="ed-kicker">FIND YOUR NEXT LOOK</span><h2>MAKE AN<br />ENTRANCE.</h2></Reveal><Reveal delay={.1}><form onSubmit={browse}><label htmlFor="rental-category">What are you looking for?</label><div className="ed-rental-search-fields"><select id="rental-category" value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value} value={value}>{value}</option>)}</select><button className="ed-button ed-button--light" type="submit">Find an outfit <ArrowUpRight size={19} /></button></div><p>Choose your reservation and return dates on the outfit page.</p></form></Reveal></section>
    <section className="ed-rental-edit ed-pad"><Reveal className="ed-section-heading"><div><span className="ed-kicker">THE RENTAL EDIT</span><h2>GOOD STYLE.<br />ON YOUR TERMS.</h2></div><Link to="/outfits" className="ed-text-link">View all outfits <ArrowUpRight size={19} /></Link></Reveal>
      {state === 'loading' ? <p className="ed-empty" role="status">Loading rental outfits…</p> : state === 'error' ? <div className="ed-empty"><p>The rental collection could not be loaded.</p><button className="ed-button" onClick={() => setAttempt(value => value + 1)}>Try again <ArrowUpRight size={17} /></button></div> : outfits.length ? <div className="ed-rental-grid">{outfits.slice(0, 4).map((outfit, index) => <Reveal key={outfit._id} delay={index * .06}><OutfitCard outfit={outfit} /></Reveal>)}</div> : <div className="ed-empty"><p>The next rental edit is on its way.</p><Link to="/contact" className="ed-text-link">Ask about an outfit <ArrowUpRight size={18} /></Link></div>}
    </section>
    <section className="ed-rental-process ed-pad"><Reveal><Asterisk size={55} strokeWidth={1.3} /><span className="ed-kicker">A LITTLE PLANNING. A GREAT LOOK.</span><h2>FIND IT.<br />WEAR IT.<br />RETURN IT.</h2><Link to="/outfits" className="ed-button ed-button--light">Find your next outfit <ArrowUpRight size={19} /></Link></Reveal><Reveal className="ed-process-list" delay={.1}>{[['01','Find your fit','Explore the collection by style, location, and daily rental price. Check the size, condition, and details of your chosen outfit.'],['02','Choose your dates','Select your reservation and return dates on the outfit page, then submit your booking request. Sign in to keep track of your booking.'],['03','Keep it all together','Follow your booking status in My Bookings. Review the confirmed details and cash payment information before your occasion.']].map(([number,title,copy]) => <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div></article>)}</Reveal></section>
    <section className="ed-rental-close ed-pad"><Reveal><span className="ed-kicker">MAKE ROOM FOR YOUR OWN STYLE</span><h2>THE OCCASION<br />IS YOURS.</h2></Reveal><Reveal delay={.1}><p>Need help choosing a look or understanding a booking? Start a conversation with the store.</p><Link className="ed-text-link" to="/contact">Get in touch <ArrowUpRight size={19} /></Link></Reveal></section>
  </div>;
}
