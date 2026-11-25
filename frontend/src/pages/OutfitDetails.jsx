import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '../config/api';
import { useAuth } from '../AuthGuard/authGuard';
import { CommerceGallery, CommerceState, priceLabel } from '../Components/Editorial/CommerceParts';
import Reveal from '../Components/Editorial/Reveal';

export default function OutfitDetails() {
  const { id } = useParams(), navigate = useNavigate(), { isAuthenticated, getToken } = useAuth();
  const [outfit, setOutfit] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [reservationDate, setReservationDate] = useState(''), [returnDate, setReturnDate] = useState(''), [phone, setPhone] = useState(''), [email, setEmail] = useState(''), [document, setDocument] = useState(null), [isBooking, setIsBooking] = useState(false), [bookingError, setBookingError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setBookingError(''); setReservationDate(''); setReturnDate('');
    axios.get(apiUrl('/api/owner/all-outfits'), { signal: controller.signal }).then(({ data }) => {
      if (!data?.success || !Array.isArray(data.outfits)) throw new Error('Unavailable');
      if (!controller.signal.aborted) setOutfit(data.outfits.find(item => item._id === id) || null);
    }).catch(failure => { if (failure.code !== 'ERR_CANCELED') setError('This outfit could not be loaded. Please try again.'); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  async function book(event) {
    event.preventDefault(); setBookingError('');
    if (!isAuthenticated()) { navigate('/login'); return; }
    if (!outfit.isAvailable) { setBookingError('This outfit is currently unavailable.'); return; }
    if (!reservationDate || !returnDate || returnDate <= reservationDate) { setBookingError('Choose a return date after your reservation date.'); return; }
    if (!phone || !email || !document) { setBookingError('Add your contact details and ID document to continue.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\+?[\d\s()-]{10,25}$/.test(phone)) { setBookingError('Enter a valid email address and phone number.'); return; }
    setIsBooking(true);
    try {
      const form = new FormData(); form.append('outfit', outfit._id); form.append('reservationDate', reservationDate); form.append('returnDate', returnDate); form.append('phone', phone); form.append('email', email); form.append('document', document);
      const { data } = await axios.post(apiUrl('/api/booking/create'), form, { headers: { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'multipart/form-data' } });
      if (!data?.success) throw new Error(data?.message || 'The booking could not be created. Please try again.');
      navigate('/my-bookings');
    } catch (failure) { setBookingError(failure.response?.data?.message || failure.message || 'The booking could not be created. Please try again.'); }
    finally { setIsBooking(false); }
  }
  if (loading) return <CommerceState title="THE DETAILS." message="Loading your next look…" backTo="/outfits" backLabel="Back to rental outfits" />;
  if (error || !outfit) return <CommerceState title={error ? 'ONE MOMENT.' : 'OUTFIT NOT FOUND.'} message={error || 'This outfit is no longer in the collection.'} backTo="/outfits" backLabel="Back to rental outfits" onRetry={error ? () => setAttempt(value => value + 1) : undefined} />;
  const name = [outfit.brand, outfit.model].filter(Boolean).join(' ') || 'Rental outfit', images = [...new Set([outfit.image, ...(outfit.images || [])].filter(Boolean))], today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return <div className="ed-page ed-commerce ed-outfit">
    <section className="ed-pad ed-detail"><nav className="ed-commerce-breadcrumb" aria-label="Rental navigation"><Link to="/outfits"><ArrowLeft size={14} /> THE RENTAL COLLECTION</Link><Link to="/my-bookings">YOUR BOOKINGS <ArrowUpRight size={14} /></Link></nav><div className="ed-detail-grid">
      <Reveal className="ed-detail-media"><CommerceGallery key={id} images={images} name={name} /></Reveal>
      <Reveal className="ed-detail-copy" delay={.1} viewport={{ once: true, amount: 0 }}><span className="ed-kicker">{outfit.category || 'THE RENTAL EDIT'} / {outfit.isAvailable ? 'AVAILABLE TO REQUEST' : 'CURRENTLY UNAVAILABLE'}</span><h1>{name}</h1><div className="ed-detail-price">{priceLabel(outfit.pricePerDay, process.env.REACT_APP_CURRENCY || 'LKR')}<small>per day</small></div><p>{outfit.description || 'Explore the photographs and outfit details before choosing your dates.'}</p>
        <dl className="ed-detail-facts">{[['Size', outfit.size], ['Colour', outfit.color], ['Material', outfit.material], ['Condition', outfit.condition], ['Location', outfit.location]].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {Array.isArray(outfit.features) && outfit.features.length > 0 && <div className="ed-detail-features"><h2>THE DETAILS.</h2><ul>{outfit.features.map(feature => <li key={feature}>{feature}</li>)}</ul></div>}
        <div className="ed-booking-panel"><span className="ed-kicker">A LOOK FOR YOUR OCCASION</span><h2>RESERVE<br />YOUR LOOK.</h2><p>Choose your dates and add the details for your booking request.</p><form onSubmit={book}><fieldset disabled={isBooking || !outfit.isAvailable}><legend>Booking details</legend><div className="ed-detail-selectors"><label>Reservation date<input type="date" required min={today} value={reservationDate} onChange={event => setReservationDate(event.target.value)} /></label><label>Return date<input type="date" required min={reservationDate || today} value={returnDate} onChange={event => setReturnDate(event.target.value)} /></label></div><label>Phone number<input type="tel" required autoComplete="tel" placeholder="Your contact number" value={phone} onChange={event => setPhone(event.target.value)} /></label><label>Email address<input type="email" required autoComplete="email" placeholder="Your email address" value={email} onChange={event => setEmail(event.target.value)} /></label><label>ID document<input type="file" required accept="image/*,.pdf" onChange={event => setDocument(event.target.files[0] || null)} /></label><p className="ed-commerce-note">Upload your NIC, passport, or driver's licence.</p><button type="submit" className="ed-button ed-button--light" disabled={isBooking || !outfit.isAvailable}>{isBooking ? 'Sending request…' : outfit.isAvailable ? 'Request booking' : 'Currently unavailable'} <ArrowUpRight size={18} /></button></fieldset>{bookingError && <p className="ed-commerce-feedback" role="alert">{bookingError}</p>}<p className="ed-commerce-note">No card payment is taken here. Availability and the final amount are confirmed by the store.</p></form></div>
      </Reveal></div></section>
    <section className="ed-commerce-close ed-pad"><Reveal><span className="ed-kicker">A LITTLE HELP WITH THE DETAILS?</span><h2>MAKE IT<br />YOUR OCCASION.</h2></Reveal><Reveal delay={.1}><p>Questions about fit, collection, or your reservation? Get in touch with the store before your event.</p><Link className="ed-text-link" to="/contact">Start a conversation <ArrowUpRight size={18} /></Link></Reveal></section>
  </div>;
}
