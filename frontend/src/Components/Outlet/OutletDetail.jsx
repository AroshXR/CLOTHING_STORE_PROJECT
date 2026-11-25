import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../../config/api';
import { CommerceGallery, CommerceState, priceLabel } from '../Editorial/CommerceParts';
import Reveal from '../Editorial/Reveal';

export default function OutletDetail() {
  const { id } = useParams(), navigate = useNavigate();
  const [item, setItem] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [selectedSize, setSelectedSize] = useState(''), [selectedColor, setSelectedColor] = useState(''), [actionError, setActionError] = useState('');
  const [review, setReview] = useState({ rating: 5, comment: '', username: '' }), [submitting, setSubmitting] = useState(false), [reviewMessage, setReviewMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setActionError(''); setReviewMessage('');
    axios.get(apiUrl('/clothing/' + id), { signal: controller.signal }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setItem(data); setSelectedSize(data?.sizes?.[0] || ''); setSelectedColor(data?.colors?.[0] || '');
    }).catch(failure => { if (failure.code !== 'ERR_CANCELED') setError('This piece could not be loaded. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  async function submitReview(event) {
    event.preventDefault(); setSubmitting(true); setReviewMessage('');
    try {
      await axios.post(apiUrl('/clothing/' + id + '/reviews'), { rating: Number(review.rating), comment: review.comment, username: review.username || 'Anonymous' });
      setReview({ rating: 5, comment: '', username: '' }); setReviewMessage('Your review has been added.');
      try { const { data } = await axios.get(apiUrl('/clothing/' + id)); setItem(data); }
      catch (_) { setReviewMessage('Your review was added. Refresh the page to see it.'); }
    } catch (_) { setReviewMessage('Your review could not be submitted. Please try again.'); }
    finally { setSubmitting(false); }
  }
  function addToCart() {
    setActionError('');
    try {
      const cart = JSON.parse(localStorage.getItem('outletCart') || '[]');
      if (!Array.isArray(cart)) throw new Error('Invalid cart');
      const existing = cart.find(line => line._id === item._id);
      if (existing) { existing.quantity = (existing.quantity || 1) + 1; existing.totalPrice = existing.quantity * (existing.price || 0); if (!existing.size) existing.size = selectedSize; if (!existing.color) existing.color = selectedColor; }
      else cart.push({ _id: item._id, name: item.name, price: item.price, quantity: 1, imageUrl: item.imageUrl, totalPrice: item.price, size: selectedSize || null, color: selectedColor || null });
      localStorage.setItem('outletCart', JSON.stringify(cart)); navigate('/orderManagement');
    } catch (_) { setActionError('This piece could not be added to your cart. Please try again.'); }
  }
  function buyNow() {
    setActionError('');
    try { sessionStorage.setItem('directPurchase', JSON.stringify({ id: item._id, name: item.name, price: item.price, quantity: 1, imageUrl: item.imageUrl, totalPrice: item.price, size: selectedSize || null, color: selectedColor || null })); navigate('/paymentManagement'); }
    catch (_) { setActionError('Checkout could not be opened. Please try again.'); }
  }
  if (loading) return <CommerceState title="THE DETAILS." message="Loading this piece…" backTo="/outlet" backLabel="Back to the collection" />;
  if (error || !item) return <CommerceState title={error ? 'ONE MOMENT.' : 'PIECE NOT FOUND.'} message={error || 'This piece is no longer in the collection.'} backTo="/outlet" backLabel="Back to the collection" onRetry={error ? () => setAttempt(value => value + 1) : undefined} />;
  const gallery = [...new Set([item.imageUrl, ...(item.gallery || [])].filter(Boolean))], soldOut = item.stock <= 0;
  return <div className="ed-page ed-commerce ed-product">
    <section className="ed-pad ed-detail"><nav className="ed-commerce-breadcrumb" aria-label="Product navigation"><Link to="/outlet"><ArrowLeft size={14} /> THE COLLECTION</Link><span>THE DETAILS / {item.category || 'READY TO WEAR'}</span></nav><div className="ed-detail-grid">
      <Reveal className="ed-detail-media"><CommerceGallery key={id} images={gallery} name={item.name} /></Reveal>
      <Reveal className="ed-detail-copy" delay={.1} viewport={{ once: true, amount: 0 }}><span className="ed-kicker">{item.brand || 'THE COLLECTION'} / {soldOut ? 'SOLD OUT' : 'READY TO WEAR'}</span><h1>{item.name}</h1><div className="ed-detail-price">{priceLabel(item.price)}</div>{typeof item.rating === 'number' && item.numReviews > 0 && <p className="ed-detail-rating">★ {item.rating.toFixed(1)} · {item.numReviews} reviews</p>}<p>{item.description || 'Explore the photographs and details to find your fit.'}</p>
        <dl className="ed-detail-facts">{[['Category', item.category], ['Material', item.material], ['In stock', item.stock]].filter(([, value]) => value != null && value !== '').map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className="ed-detail-selectors">{item.sizes?.length > 0 && <label>Size<select value={selectedSize} onChange={event => setSelectedSize(event.target.value)}>{item.sizes.map(size => <option key={size}>{size}</option>)}</select></label>}{item.colors?.length > 0 && <label>Colour<select value={selectedColor} onChange={event => setSelectedColor(event.target.value)}>{item.colors.map(colour => <option key={colour}>{colour}</option>)}</select></label>}</div>
        {actionError && <p className="ed-commerce-feedback" role="alert">{actionError}</p>}<div className="ed-commerce-actions"><button className="ed-button" type="button" disabled={soldOut} onClick={addToCart}>Add to cart <ShoppingBag size={18} /></button><button className="ed-button ed-button--outline" type="button" disabled={soldOut} onClick={buyNow}>Buy now <ArrowUpRight size={18} /></button></div><p className="ed-commerce-note">{soldOut ? 'This piece is currently out of stock.' : 'Cash on delivery or collection. Your final total is confirmed at checkout.'}</p>
      </Reveal></div></section>
    <section className="ed-reviews ed-pad"><Reveal viewport={{ once: true, amount: 0 }}><span className="ed-kicker">THE WORD ON THIS PIECE</span><h2>YOUR<br />POINT OF VIEW.</h2>{item.reviews?.length ? <div className="ed-review-list">{item.reviews.slice().reverse().map((entry, index) => <article key={entry._id || index}><div><strong>{entry.username || 'Anonymous'}</strong><span>{entry.rating} / 5</span></div>{entry.createdAt && <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString()}</time>}{entry.comment && <p>{entry.comment}</p>}</article>)}</div> : <p>No reviews yet. Be the first to share your thoughts.</p>}</Reveal><Reveal className="ed-review-form" delay={.1}><span className="ed-kicker">ADD YOUR VOICE</span><h3>Leave a review</h3><form onSubmit={submitReview}><label>Your name (optional)<input value={review.username} onChange={event => setReview(current => ({ ...current, username: event.target.value }))} /></label><label>Rating<select value={review.rating} onChange={event => setReview(current => ({ ...current, rating: event.target.value }))}>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} stars</option>)}</select></label><label>Your comment (optional)<textarea rows={4} value={review.comment} onChange={event => setReview(current => ({ ...current, comment: event.target.value }))} /></label><button className="ed-button ed-button--light" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit review'} <ArrowUpRight size={18} /></button>{reviewMessage && <p role="status">{reviewMessage}</p>}</form></Reveal></section>
  </div>;
}


