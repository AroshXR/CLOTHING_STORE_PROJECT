import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import MediaImage from '../MediaImage';
import { priceLabel } from '../Editorial/CommerceParts';
export default function OutletCard({ item }) {
  return <Link className="ed-shop-card" to={'/outlet/' + item._id}>
    <div className="ed-shop-card__image"><MediaImage src={item.imageUrl} alt={item.name} loading="lazy" />{item.stock === 0 && <span className="ed-shop-card__badge">Sold out</span>}<span className="ed-shop-card__arrow"><ArrowUpRight size={18} /></span></div>
    <div className="ed-shop-card__caption"><h3>{item.name}</h3><span>{priceLabel(item.price)}</span></div><p>{[item.brand, item.category].filter(Boolean).join(' · ')}</p>
    {typeof item.rating === 'number' && item.numReviews > 0 && <span className="ed-shop-card__rating">★ {item.rating.toFixed(1)} · {item.numReviews} reviews</span>}
  </Link>;
}

