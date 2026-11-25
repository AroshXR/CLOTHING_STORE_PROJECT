import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, MapPin } from 'lucide-react';
import MediaImage from '../MediaImage';
import '../Editorial/Rentals.css';
export default function OutfitCard({ outfit }) {
  const name = [outfit.brand, outfit.model].filter(Boolean).join(' ') || 'Rental outfit';
  const currency = process.env.REACT_APP_CURRENCY || 'LKR';
  return <Link className="ed-rental-card" to={'/outfit-details/' + outfit._id}>
    <div className="ed-rental-card__image"><MediaImage src={outfit.image} alt={name} loading="lazy" /><span className="ed-rental-card__status">{outfit.isAvailable ? 'Available to request' : 'Currently unavailable'}</span><span className="ed-rental-card__arrow"><ArrowUpRight size={18} /></span></div>
    <div className="ed-rental-card__caption"><h3>{name}</h3><span className="ed-rental-card__price">{currency} {Number(outfit.pricePerDay || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small>per day</small></span></div>
    <p>{[outfit.category, outfit.condition].filter(Boolean).join(' · ')}</p>
    <div className="ed-rental-card__meta">{outfit.size && <span>Size {outfit.size}</span>}{outfit.location && <span><MapPin size={10} aria-hidden="true" /> {outfit.location}</span>}</div>
  </Link>;
}
