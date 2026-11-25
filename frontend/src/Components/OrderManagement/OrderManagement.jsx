import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, CalendarDays, Minus, Plus, RefreshCw, Shirt, ShoppingBag, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../AuthGuard/authGuard';
import { apiUrl } from '../../config/api';
import MediaImage from '../MediaImage';
import Reveal from '../Editorial/Reveal';
import { priceLabel } from '../Editorial/CommerceParts';
import { checkoutItems, customItem, lineKey, readBrowserCart, writeBrowserLine } from './cartItems';
import './OrderManagement.css';

const groups = [{ kind: 'product', title: 'Shop items', copy: 'Ready-to-wear pieces from the collection.' }, { kind: 'custom', title: 'Custom designs', copy: 'Your personalised garments and artwork.' }, { kind: 'booking', title: 'Rental bookings', copy: 'Confirmed bookings to arrange cash collection.' }];
const date = value => value ? String(value).split('T')[0] : 'Not set';
export default function OrderManagement() {
  const navigate = useNavigate(), { token, getToken, logout } = useAuth();
  const [items, setItems] = useState([]), [loading, setLoading] = useState(true), [warnings, setWarnings] = useState([]), [notice, setNotice] = useState(''), [actionError, setActionError] = useState(''), [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(''), [category, setCategory] = useState('all');
  const request = useRef(null), auth = useRef({ getToken, logout, token });
  auth.current = { getToken, logout, token };
  const load = useCallback(async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    const browser = readBrowserCart(); setItems(browser.items); setLoading(true); setWarnings(browser.error ? [browser.error] : []); setActionError('');
    const headers = { Authorization: 'Bearer ' + (auth.current.getToken?.() || auth.current.token || '') };
    const results = await Promise.allSettled([
      axios.get(apiUrl('/cloth-customizer'), { headers, signal: controller.signal }),
      browser.items.some(item => item.kind === 'booking') ? axios.get(apiUrl('/api/booking/user'), { headers, signal: controller.signal }) : Promise.resolve(null)
    ]);
    if (controller.signal.aborted) return;
    if (results.some(result => result.status === 'rejected' && result.reason.response?.status === 401)) { auth.current.logout(); navigate('/login'); return; }
    const messages = browser.error ? [browser.error] : [];
    let designs = [], local = browser.items;
    const custom = results[0];
    if (custom.status === 'fulfilled' && custom.value.data?.status === 'ok' && Array.isArray(custom.value.data.data)) designs = custom.value.data.data.filter(item => item._id && item.inCart !== false).map(customItem);
    else messages.push('Custom designs could not be loaded. Checkout will include only the items shown. Refresh to try again.');
    if (browser.items.some(item => item.kind === 'booking')) {
      const rentals = results[1];
      const bookings = rentals.status === 'fulfilled' && rentals.value?.data?.success && Array.isArray(rentals.value.data.bookings) ? rentals.value.data.bookings : null;
      local = local.map(item => {
        if (item.kind !== 'booking') return item;
        const booking = bookings?.find(entry => entry._id === item.sourceId);
        if (!bookings) return { ...item, blocked: 'Booking details could not be verified. Refresh to try again.' };
        if (!booking) return { ...item, blocked: 'This booking is no longer available.' };
        const blocked = booking.status !== 'confirmed' ? 'This booking is awaiting confirmation or is no longer active.' : ['pending', 'paid'].includes(booking.paymentStatus) ? 'Payment has already been arranged for this booking.' : '';
        return { ...item, name: [booking.outfit?.brand, booking.outfit?.model].filter(Boolean).join(' ') || item.name, imageUrl: booking.outfit?.image || item.imageUrl, price: Number(booking.price) || 0, totalPrice: Number(booking.price) || 0, size: booking.outfit?.size || item.size, color: booking.outfit?.color || item.color, reservationDate: booking.reservationDate, returnDate: booking.returnDate, location: booking.outfit?.location, blocked };
      });
    }
    setItems([...local, ...designs]); setWarnings(messages); setLoading(false);
  }, [navigate]);
  useEffect(() => { load(); return () => request.current?.abort(); }, [load, token]);
  useEffect(() => { const refresh = event => { if (event.key === 'outletCart') load(); }; window.addEventListener('storage', refresh); return () => window.removeEventListener('storage', refresh); }, [load]);
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter(item => (category === 'all' || item.kind === category) && (!query || [item.name, item.size, item.color, item.clothingType, item.reservationDate, item.returnDate, item.selectedDesign?.name, ...(item.lettering || []).map(layer => layer.text)].filter(Boolean).join(' ').toLowerCase().includes(query)));
  }, [items, category, search]);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0), units = items.reduce((sum, item) => sum + item.quantity, 0);
  async function quantity(item, value) {
    if (value < 1 || value > 100 || busy || item.kind === 'booking') return;
    setBusy(true); setActionError(''); request.current?.abort();
    try {
      let updated;
      if (item.kind === 'product') { writeBrowserLine(item, value); updated = { ...item, quantity: value, totalPrice: item.price * value }; }
      else {
        const { data } = await axios.put(apiUrl('/cloth-customizer/' + item.sourceId), { quantity: value }, { headers: { Authorization: 'Bearer ' + auth.current.getToken() } });
        if (data?.status !== 'ok' || !data.data) throw new Error('Unable to update this design.');
        updated = customItem(data.data);
      }
      setItems(current => current.map(entry => lineKey(entry) === lineKey(item) ? updated : entry)); setNotice('Quantity updated.');
    } catch (failure) { if (failure.response?.status === 401) { auth.current.logout(); navigate('/login'); } else setActionError(failure.response?.data?.message || failure.message || 'Quantity could not be updated.'); }
    finally { setBusy(false); }
  }
  async function remove(item) {
    if (busy) return;
    if (item.kind === 'custom' && !window.confirm('Remove this saved design? This deletes the saved design from your cart.')) return;
    setBusy(true); setActionError(''); request.current?.abort();
    try {
      if (item.kind === 'custom') await axios.delete(apiUrl('/cloth-customizer/' + item.sourceId), { headers: { Authorization: 'Bearer ' + auth.current.getToken() } });
      else writeBrowserLine(item, 0);
      setItems(current => current.filter(entry => lineKey(entry) !== lineKey(item))); setNotice(item.kind === 'booking' ? 'Removed from cart. Your booking has not been cancelled.' : 'Item removed from cart.');
    } catch (failure) { if (failure.response?.status === 401) { auth.current.logout(); navigate('/login'); } else setActionError(failure.response?.data?.message || failure.message || 'This item could not be removed.'); }
    finally { setBusy(false); }
  }
  function edit(item) { try { localStorage.setItem('editItemData', JSON.stringify({ _id: item.sourceId })); navigate('/customizer?edit=true'); } catch (_) { setActionError('The design editor could not be opened. Please try again.'); } }
  function checkout() {
    if (!items.length || busy || loading || items.some(item => item.blocked)) return;
    sessionStorage.removeItem('directPurchase');
    navigate('/paymentManagement', { state: { cartItems: checkoutItems(items) } });
  }
  return <div className="ed-page ed-commerce cart-page">
    <section className="cart-heading ed-pad"><Reveal><span className="ed-kicker">A FEW GOOD CHOICES</span><h1>YOUR BAG.</h1><p>Shop pieces, personal designs, and rental bookings. Review everything in one place.</p></Reveal><nav aria-label="Continue exploring"><Link to="/outlet">Shop clothing <ArrowUpRight size={16} /></Link><Link to="/customizer">Design studio <ArrowUpRight size={16} /></Link><Link to="/rentalHome">Rental outfits <ArrowUpRight size={16} /></Link></nav></section>
    <section className="cart-body ed-pad"><div className="cart-toolbar"><div className="cart-filters" role="group" aria-label="Cart item type">{[{ kind: 'all', title: 'All items' }, ...groups].map(group => <button type="button" key={group.kind} aria-pressed={category === group.kind} onClick={() => setCategory(group.kind)}>{group.title} <span>{group.kind === 'all' ? items.length : items.filter(item => item.kind === group.kind).length}</span></button>)}</div><div className="cart-search"><label className="cart-search-label">Search your bag<input type="search" placeholder="Find a piece, design, or booking" value={search} onChange={event => setSearch(event.target.value)} /></label><button type="button" onClick={load} disabled={loading || busy} aria-label="Refresh cart"><RefreshCw size={17} /></button></div></div>
      {warnings.map(message => <p className="cart-message" role="alert" key={message}>{message}</p>)}{actionError && <p className="cart-message" role="alert">{actionError}</p>}{notice && <p className="cart-notice" role="status">{notice}</p>}
      {loading ? <p className="cart-loading" role="status">Loading your bag…</p> : !items.length ? <div className="cart-empty"><ShoppingBag size={40} strokeWidth={1} /><h2>{warnings.length ? 'YOUR BAG NEEDS A MOMENT.' : 'ROOM FOR SOMETHING YOU.'}</h2><p>{warnings.length ? 'Some items could not be loaded. Refresh your cart to try again, or keep exploring the store.' : 'Your bag is empty. Browse the collection, create a design, or explore outfits to rent.'}</p><div><Link className="ed-button" to="/outlet">Browse the shop <ArrowUpRight size={18} /></Link><Link className="ed-text-link" to="/customizer">Create a design <ArrowUpRight size={17} /></Link><Link className="ed-text-link" to="/rentalHome">Explore rentals <ArrowUpRight size={17} /></Link></div></div> : <div className="cart-layout"><div className="cart-groups">
        {!visible.length && <div className="cart-empty cart-empty--filtered"><h2>NO MATCHES THIS TIME.</h2><p>Your other items are still in the bag.</p><button type="button" onClick={() => { setSearch(''); setCategory('all'); }}>Clear filters</button></div>}
        {groups.map(group => {
          const lines = visible.filter(item => item.kind === group.kind); if (!lines.length) return null;
          return <section className="cart-group" aria-label={group.title} key={group.kind}><div className="cart-group-heading"><div><h2>{group.title}</h2><p>{group.copy}</p></div><span>{lines.length} {lines.length === 1 ? 'item' : 'items'}</span></div>
            {lines.map(item => <article className="bag-line" key={lineKey(item)} aria-label={item.name}>
              <div className="bag-line-image">{item.kind === 'custom' ? <div className="bag-custom-preview" style={{ '--garment-colour': /^#[a-f\d]{6}$/i.test(item.color || '') ? item.color : '#ddd' }}><Shirt size={54} strokeWidth={1} /></div> : item.imageUrl ? <MediaImage src={item.imageUrl} alt={item.name} /> : <ShoppingBag size={30} />}</div>
              <div className="bag-line-copy"><span className="ed-kicker">{item.kind === 'product' ? 'SHOP COLLECTION' : item.kind === 'custom' ? 'MADE BY YOU' : 'RENTAL BOOKING'}</span><h3>{item.name}</h3><p>{[item.size && 'Size ' + item.size, item.color && 'Colour ' + item.color].filter(Boolean).join(' · ')}</p>
                {item.kind === 'custom' && <p>{(item.placedDesigns || []).length || (item.selectedDesign ? 1 : 0)} artwork layers{item.lettering?.length ? ' · ' + item.lettering.length + ' messages' : ''}</p>}
                {item.kind === 'booking' && <><p className="bag-rental-dates"><CalendarDays size={13} /> {date(item.reservationDate)} — {date(item.returnDate)}</p>{item.location && <p>Collection: {item.location}</p>}<p>One confirmed booking · cash on collection</p></>}
                {item.blocked && <p className="bag-line-issue">{item.blocked}</p>}
                <div className="bag-line-links">{item.kind === 'custom' ? <button type="button" disabled={busy} onClick={() => edit(item)}>Edit design</button> : <Link to={item.kind === 'booking' ? '/my-bookings' : '/outlet/' + item.sourceId}>{item.kind === 'booking' ? 'Manage booking' : 'View item'}</Link>}<button type="button" disabled={busy} aria-label={'Remove ' + item.name + ' from cart'} onClick={() => remove(item)}><Trash2 size={12} /> Remove from cart</button></div>
              </div><div className="bag-line-pricing"><strong>{priceLabel(item.totalPrice)}</strong><span>{item.kind === 'booking' ? 'Rental subtotal' : priceLabel(item.price) + ' each'}</span>{item.kind !== 'booking' && <div className="bag-quantity" aria-label={'Quantity for ' + item.name}><button type="button" aria-label={'Decrease ' + item.name + ' quantity'} disabled={busy || item.quantity <= 1} onClick={() => quantity(item, item.quantity - 1)}><Minus size={13} /></button><span aria-live="polite">{item.quantity}</span><button type="button" aria-label={'Increase ' + item.name + ' quantity'} disabled={busy || item.quantity >= 100} onClick={() => quantity(item, item.quantity + 1)}><Plus size={13} /></button></div>}</div>
            </article>)}
          </section>;
        })}
      </div><aside className="bag-summary" aria-label="Bag summary"><span className="ed-kicker">EVERYTHING, TOGETHER</span><h2>YOUR SUMMARY.</h2><p>{units} {units === 1 ? 'item' : 'items'} in your bag</p><dl>{groups.map(group => { const matching = items.filter(item => item.kind === group.kind); return matching.length ? <div key={group.kind}><dt>{group.title}</dt><dd>{priceLabel(matching.reduce((sum, item) => sum + item.totalPrice, 0))}</dd></div> : null; })}<div className="bag-summary-total"><dt>Items subtotal</dt><dd>{priceLabel(subtotal)}</dd></div></dl><p>Prices and availability are checked at checkout. Delivery and tax are added there.</p>{(search || category !== 'all') && <p>Summary includes all items, including those hidden by your filters.</p>}{items.some(item => item.blocked) && <p className="bag-summary-warning">Resolve or remove the booking marked above before checkout.</p>}<button className="ed-button ed-button--light" type="button" disabled={busy || items.some(item => item.blocked)} onClick={checkout}>Continue to checkout <ArrowRight size={18} /></button><p className="bag-cash-note">Cash on delivery or collection.<br />Rental fees are due at collection.</p><Link to="/outlet">Continue shopping <ArrowUpRight size={14} /></Link></aside></div>}
    </section>
  </div>;
}