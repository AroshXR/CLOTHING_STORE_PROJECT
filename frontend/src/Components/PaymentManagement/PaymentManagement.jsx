import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../AuthGuard/authGuard';
import { apiUrl } from '../../config/api';
import { cartRequest, clearPurchasedCart } from '../../utils/checkoutCart';
import MediaImage from '../MediaImage';


import './CashCheckout.css';

const amount = value => '$' + Number(value || 0).toFixed(2);
const contactFields = [['firstName', 'First name'], ['lastName', 'Last name'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel']];
const addressFields = [['address', 'Street address'], ['city', 'City'], ['state', 'Province / state'], ['zipCode', 'Postal code'], ['country', 'Country']];
export default function CheckoutPage() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const selectedItems = location.state?.cartItems;
  const [cart, setCart] = useState(null), [quote, setQuote] = useState(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [quoting, setQuoting] = useState(false);
  const [shippingMethod, setShippingMethod] = useState('standard'), [giftWrap, setGiftWrap] = useState(false);
  const [step, setStep] = useState(1), [submitting, setSubmitting] = useState(false), [result, setResult] = useState(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [details, setDetails] = useState({ firstName: '', lastName: '', email: currentUser?.email || '', phone: currentUser?.phoneNumber || '',
    address: currentUser?.address || '', city: '', state: '', zipCode: '', country: 'Sri Lanka' });
  const attempt = useRef(null);
  const collectionOnly = Boolean(cart?.items.length && cart.items.every(item => item.kind === 'booking'));
  const collection = collectionOnly || shippingMethod === 'collection';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fromBag = Array.isArray(selectedItems) && selectedItems.length > 0;
        let request = fromBag ? { direct: false, items: selectedItems } : cartRequest([]);
        if (!request.direct && !fromBag) {
          const { data } = await axios.get(apiUrl('/cloth-customizer'));
          request = cartRequest(data.data || []);
        }
        if (!cancelled) {
          setCart(request);
          if (!request.items.length) setError('Your cart is empty.');
        }
      } catch (err) { if (!cancelled) setError(err.response?.data?.message || 'Unable to load your cart. Please try again.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedItems]);

  useEffect(() => {
    if (!cart?.items.length || result) return undefined;
    const controller = new AbortController();
    setQuoting(true); setError(''); setQuote(null);
    axios.post(apiUrl('/payment/quote'), { items: cart.items, shippingMethod, giftWrap }, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setQuote(data.data); })
      .catch(err => { if (err.code !== 'ERR_CANCELED') setError(err.response?.data?.message || 'Unable to calculate your total.'); })
      .finally(() => { if (!controller.signal.aborted) setQuoting(false); });
    return () => controller.abort();
  }, [cart, shippingMethod, giftWrap, quoteRevision, result]);

  async function submit(event) {
    event.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    if (!quote || quoting || submitting) return;
    const body = { items: cart.items, deliveryDetails: details, shippingMethod, giftWrap, expectedTotal: quote.total };
    const signature = JSON.stringify(body);
    if (!attempt.current || attempt.current.signature !== signature) attempt.current = {
      signature, key: window.crypto?.randomUUID?.() || 'checkout-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2)
    };
    setSubmitting(true); setError('');
    try {
      const { data } = await axios.post(apiUrl('/payment'), body, { headers: { 'Idempotency-Key': attempt.current.key } });
      clearPurchasedCart(cart);
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'The order response was not received. Please retry; the same order will not be created twice.');
      if (err.response?.status === 409) setQuoteRevision(value => value + 1);
    } finally { setSubmitting(false); }
  }

  return <><section className="cash-checkout">
    <header><Link to="/orderManagement">Back to cart</Link><h1>{result ? 'Order placed' : 'Checkout'}</h1></header>
    {result ? <section className="cash-card" role="status">
      <h2>Thank you for your order</h2><p>Cash payment is due on delivery or collection.</p>
      <p>Order total: <strong>{amount(result.total)}</strong></p>
      <ul>{result.orders.map(order => <li key={order._id}>{order.itemName} — {order.orderId}</li>)}</ul>
      <Link className="cash-button" to="/user/account">View my orders</Link>
    </section> : <>
      <ol className="cash-steps">{['Contact', 'Delivery and payment', 'Review'].map((name, index) =>
        <li key={name} aria-current={step === index + 1 ? 'step' : undefined}>{index + 1}. {name}</li>)}</ol>
      {error && <p className="cash-error" role="alert">{error}</p>}
      {loading ? <p role="status">Loading your cart…</p> : cart?.items.length ? <div className="cash-layout">
        <form className="cash-card" onSubmit={submit}>
          {step === 1 && <><h2>Contact details</h2>
            <label>Delivery method<select value={collectionOnly ? 'collection' : shippingMethod} disabled={collectionOnly}
              onChange={event => setShippingMethod(event.target.value)}>
              <option value="standard">Standard delivery</option><option value="express">Express delivery</option>
              <option value="overnight">Overnight delivery</option><option value="collection">Collect in person</option>
            </select></label>
            <div className="cash-fields">
            {[...contactFields, ...(collection ? [] : addressFields)].map(([name, label, type]) => <label key={name}>{label}
              <input name={name} type={type || 'text'} required maxLength={name === 'address' ? 200 : name === 'email' ? 254 : 50}
                value={details[name]} onChange={event => setDetails({ ...details, [name]: event.target.value })} />
            </label>)}</div>
            {collection && <p>Your rental or order will be collected in person.</p>}
          </>}
          {step === 2 && <><h2>Delivery and payment</h2>
            <p>{collection ? 'Collect in person' : ({ standard: 'Standard delivery', express: 'Express delivery', overnight: 'Overnight delivery' }[shippingMethod])}</p>
            <p><strong>{collection ? 'Cash on collection' : 'Cash on delivery'}</strong></p>
            <p>Payment is due when you receive your items. Rental fees are payable at collection.</p>
            {!collectionOnly && <label className="cash-check"><input type="checkbox" checked={giftWrap} onChange={event => setGiftWrap(event.target.checked)} /> Add gift wrapping</label>}
          </>}
          {step === 3 && <><h2>Review your order</h2>
            <p>{details.firstName} {details.lastName}<br />{details.email}<br />{details.phone}</p>
            {!collection && <p>{details.address}, {details.city}, {details.state}, {details.zipCode}, {details.country}</p>}
            <p><strong>{collection ? 'Cash on collection' : 'Cash on delivery'}</strong></p>
            <label className="cash-check"><input type="checkbox" required /> I agree to the <Link to="/terms" target="_blank" rel="noreferrer">terms and conditions</Link>.</label>
          </>}
          <div className="cash-actions">
            {step > 1 && <button type="button" onClick={() => setStep(step - 1)} disabled={submitting}>Back</button>}
            <button className="cash-button" type="submit" disabled={submitting || quoting || !quote}>
              {submitting ? 'Placing order…' : step === 3 ? 'Place cash order' : 'Continue'}
            </button>
          </div>
        </form>
        <aside className="cash-card" aria-label="Order summary"><h2>Order summary</h2>
          {quoting && <p role="status">Updating total…</p>}
          {quote?.items.map(item => <article className="cash-line" key={[item.kind, item.sourceId, item.size, item.color].join(':')}>
            {item.imageUrl && <MediaImage src={item.imageUrl} alt="" />}
            <div><strong>{item.name}</strong><p>Quantity: {item.quantity}{item.size ? ' · ' + item.size : ''}</p></div><span>{amount(item.totalPrice)}</span>
          </article>)}
          {quote && <dl className="cash-totals">
            <div><dt>Subtotal</dt><dd>{amount(quote.subtotal)}</dd></div>
            <div><dt>Tax</dt><dd>{amount(quote.tax)}</dd></div>
            <div><dt>{quote.shippingMethod === 'collection' ? 'Collection' : 'Delivery'}</dt><dd>{amount(quote.shipping)}</dd></div>
            {quote.giftWrapFee > 0 && <div><dt>Gift wrapping</dt><dd>{amount(quote.giftWrapFee)}</dd></div>}
            <div className="cash-total"><dt>Total due</dt><dd>{amount(quote.total)}</dd></div>
          </dl>}
        </aside>
      </div> : <Link to="/outlet">Browse clothing</Link>}
    </>}
  </section></>;
}