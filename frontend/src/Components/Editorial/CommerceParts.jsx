import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import MediaImage from '../MediaImage';
import './Editorial.css';
import './Commerce.css';

export const priceLabel = (value, currency = process.env.REACT_APP_CURRENCY || '$') => currency + ' ' + Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function CommerceState({ title, message, backTo, backLabel, onRetry }) {
  return <div className="ed-page ed-commerce"><section className="ed-commerce-state ed-pad"><span className="ed-kicker">A MOMENT FOR THE DETAILS</span><h1>{title}</h1><p role="status">{message}</p><div className="ed-commerce-actions">{onRetry && <button className="ed-button" onClick={onRetry}>Try again <ArrowRight size={18} /></button>}<Link className="ed-text-link" to={backTo}>{backLabel} <ArrowRight size={18} /></Link></div></section></div>;
}
export function CommerceGallery({ images, name }) {
  const [selected, setSelected] = useState(0), reduced = useReducedMotion(), imageKey = JSON.stringify(images);
  useEffect(() => setSelected(0), [imageKey]);
  const index = Math.min(selected, Math.max(images.length - 1, 0));
  return <div className="ed-gallery">
    <div className="ed-gallery__stage">{images.length ? <AnimatePresence mode="wait" initial={false}><motion.div key={images[index]} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} exit={{ opacity: reduced ? 1 : 0 }} transition={{ duration: reduced ? 0 : .2 }}><MediaImage src={images[index]} alt={name + ' — image ' + (index + 1)} /></motion.div></AnimatePresence> : <p>Photograph unavailable</p>}</div>
    <div className="ed-gallery__bar"><span>{images.length ? String(index + 1).padStart(2, '0') + ' / ' + String(images.length).padStart(2, '0') : 'NO PHOTOGRAPH'}</span><span>THE DETAILS MAKE THE DIFFERENCE.</span>{images.length > 1 && <div><button type="button" aria-label="Previous photograph" onClick={() => setSelected((index - 1 + images.length) % images.length)}><ArrowLeft size={17} /></button><button type="button" aria-label="Next photograph" onClick={() => setSelected((index + 1) % images.length)}><ArrowRight size={17} /></button></div>}</div>
    {images.length > 1 && <div className="ed-gallery__thumbs" aria-label="Choose a photograph">{images.map((image, position) => <button type="button" key={image + position} aria-label={'View photograph ' + (position + 1)} aria-pressed={position === index} onClick={() => setSelected(position)}><MediaImage src={image} alt="" /></button>)}</div>}
  </div>;
}
