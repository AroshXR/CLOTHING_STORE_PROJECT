import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import { apiUrl } from '../../config/api';
import { useBranding } from '../../config/branding';
import OutletCard from './outletCard';
import Reveal from '../Editorial/Reveal';
import EditorialPhoto from '../Editorial/EditorialPhoto';
import '../Editorial/Editorial.css';
import '../Editorial/Commerce.css';

const EMPTY = { q: '', category: '', brand: '', material: '', color: '', size: '', minPrice: '', maxPrice: '' };
const options = {
  category: ['T-Shirts','Shirts','Pants','Jeans','Shorts','Dresses','Skirts','Jackets','Coats','Sweaters','Hoodies','Suits','Accessories'],
  material: ['Cotton','Linen','Silk','Wool','Polyester','Denim','Leather','Rayon','Nylon','Viscose'],
  color: ['Black','White','Grey','Blue','Navy','Red','Green','Yellow','Pink','Purple','Brown','Beige','Maroon','Orange'],
  size: ['S','M','L','XL','XXL']
};
export default function Outlet() {
  const { branding } = useBranding(), reduced = useReducedMotion(), request = useRef(null);
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [filters, setFilters] = useState(EMPTY), [expanded, setExpanded] = useState(false);
  async function fetchItems(values) {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError('');
    try {
      const params = Object.fromEntries(Object.entries(values).filter(([, value]) => value !== ''));
      const { data } = await axios.get(apiUrl('/clothing'), { params, signal: controller.signal });
      if (!controller.signal.aborted) setItems(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (failure) { if (failure.code !== 'ERR_CANCELED' && !controller.signal.aborted) setError('The collection could not be loaded. Please try again.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => { fetchItems(EMPTY); return () => request.current?.abort(); }, []);
  const change = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  function apply(event) {
    event.preventDefault();
    const min = Number(filters.minPrice), max = Number(filters.maxPrice);
    if ((filters.minPrice !== '' && (!Number.isFinite(min) || min < 0)) || (filters.maxPrice !== '' && (!Number.isFinite(max) || max < 0)) || (filters.minPrice !== '' && filters.maxPrice !== '' && min > max)) { setError('Enter a valid price range, with the minimum no greater than the maximum.'); return; }
    fetchItems(filters);
  }
  const select = (name, label) => <label>{label}<select name={name} value={filters[name]} onChange={change}><option value="">All {label.toLowerCase()}</option>{options[name].map(value => <option key={value} value={value}>{value}</option>)}</select></label>;
  return <div className="ed-page ed-commerce ed-shop">
    <section className="ed-shop-hero ed-pad"><div className="ed-hero-meta"><span>{branding.name} / SHOP</span><span>PIECES FOR YOUR EVERYDAY.</span></div><div className="ed-shop-hero__grid"><Reveal><span className="ed-kicker">THE READY-TO-WEAR COLLECTION</span><h1>THE<br />EDIT.</h1><p>Find your fit, discover a favourite, and make it part of your own story.</p><Link to="/customizer" className="ed-text-link">Or make something your own <ArrowUpRight size={18} /></Link></Reveal><Reveal className="ed-shop-hero__photo ed-fold-right" delay={.15}><EditorialPhoto panel={2} eager alt="An oversized white shirt and black skirt — editorial style inspiration" /></Reveal></div></section>
    <section className="ed-shop-filters ed-pad" aria-label="Filter the collection"><form onSubmit={apply}><div className="ed-shop-filters__main"><label>Search the collection<input name="q" type="search" placeholder="Find your next favourite" value={filters.q} onChange={change} /></label>{select('category', 'Categories')}<button type="submit" className="ed-button ed-button--light">Apply filters <ArrowUpRight size={18} /></button><button type="button" className="ed-filter-toggle" aria-expanded={expanded} aria-controls="shop-extra-filters" onClick={() => setExpanded(value => !value)}>More filters <Plus size={16} /></button><button type="button" className="ed-filter-reset" onClick={() => { setFilters(EMPTY); fetchItems(EMPTY); }}>Reset filters</button></div>
      <AnimatePresence initial={false}>{expanded && <motion.div id="shop-extra-filters" className="ed-shop-filters__extra" initial={{ height: reduced ? 'auto' : 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: reduced ? 'auto' : 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .25 }}><div><label>Brand<input name="brand" value={filters.brand} onChange={change} /></label>{select('material', 'Materials')}{select('color', 'Colours')}{select('size', 'Sizes')}<label>Minimum price<input name="minPrice" type="number" step="any" min="0" value={filters.minPrice} onChange={change} /></label><label>Maximum price<input name="maxPrice" type="number" step="any" min="0" value={filters.maxPrice} onChange={change} /></label></div></motion.div>}</AnimatePresence>
    </form></section>
    <section className="ed-shop-results ed-pad" aria-busy={loading}><Reveal className="ed-section-heading"><div><span className="ed-kicker">THE CURRENT COLLECTION</span><h2>YOUR NEXT<br />FAVOURITE.</h2></div><span className="ed-kicker" aria-live="polite">{loading ? 'Loading collection…' : items.length + (items.length === 1 ? ' PIECE' : ' PIECES')}</span></Reveal>
      {error && <div className="ed-commerce-feedback" role="alert">{error}<button type="button" onClick={apply}>Try again</button></div>}
      {loading ? <p className="ed-empty" role="status">Loading the collection…</p> : items.length ? <div className="ed-shop-grid">{items.map((item, index) => <Reveal key={item._id} delay={Math.min(index, 5) * .05}><OutletCard item={item} /></Reveal>)}</div> : !error && <div className="ed-empty"><p>No pieces match these filters.</p><button className="ed-button" onClick={() => { setFilters(EMPTY); fetchItems(EMPTY); }}>View the full collection <ArrowUpRight size={18} /></button></div>}
    </section>
  </div>;
}
