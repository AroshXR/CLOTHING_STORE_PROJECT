import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import MediaImage from '../MediaImage';
import Reveal from './Reveal';
export default function CollectionPreview() {
  const [items, setItems] = useState([]), [category, setCategory] = useState('All'), [state, setState] = useState('loading');
  useEffect(() => {
    const controller = new AbortController();
    axios.get(apiUrl('/clothing'), { signal: controller.signal }).then(({ data }) => { const list = Array.isArray(data) ? data : data.data; setItems(Array.isArray(list) ? list.filter(item => item._id && item.status !== 'archived') : []); setState('ready'); }).catch(error => { if (error.code !== 'ERR_CANCELED') setState('error'); });
    return () => controller.abort();
  }, []);
  const categories = ['All', ...new Set(items.map(item => item.category).filter(Boolean))];
  const visible = (category === 'All' ? items : items.filter(item => item.category === category)).slice(0, 4);
  return <section className="ed-collection ed-pad"><Reveal className="ed-section-heading"><div><span className="ed-kicker">THE CURRENT EDIT</span><h2>GOOD PIECES.<br />YOUR WAY.</h2></div><Link className="ed-text-link" to="/outlet">Shop the collection <ArrowUpRight size={19} /></Link></Reveal>
    {items.length > 0 && <div className="ed-categories" aria-label="Collection categories">{categories.map(value => <button key={value} aria-pressed={value === category} onClick={() => setCategory(value)}>{value}</button>)}</div>}
    {state === 'loading' ? <p role="status" className="ed-empty">Loading the collection…</p> : visible.length ? <div className="ed-product-grid">{visible.map((item, index) => <Reveal key={item._id} delay={index * .06}><Link className="ed-product" to={'/outlet/' + item._id}><div className="ed-product-image"><MediaImage src={item.imageUrl} alt={item.name} /><span><ArrowUpRight size={19} /></span></div><div className="ed-product-caption"><h3>{item.name}</h3><span>{process.env.REACT_APP_CURRENCY || '$'}{Number(item.price).toFixed(2)}</span></div><p>{item.category || item.brand}</p></Link></Reveal>)}</div> : <div className="ed-empty"><p>{state === 'error' ? 'The collection is taking a moment to load.' : 'The next collection is on its way.'}</p><Link className="ed-text-link" to="/customizer">Make something of your own <ArrowUpRight size={18} /></Link></div>}
  </section>;
}
