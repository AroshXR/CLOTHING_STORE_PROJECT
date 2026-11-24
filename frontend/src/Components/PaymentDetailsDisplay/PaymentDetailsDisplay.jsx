import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/api';


import './PaymentDetailsDisplay.css';

const statusLabel = status => ({ pending: 'Cash due', processing: 'Collection in progress', completed: 'Cash received', cancelled: 'Cancelled' }[status] || status);
const methodLabel = method => ({ cash_on_delivery: 'Cash on delivery', cash_on_collection: 'Cash on collection' }[method] || 'Legacy payment');
const currency = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
const date = value => new Date(value).toLocaleString();
export default function PaymentDetailsDisplay() {
  const [payments, setPayments] = useState([]), [statistics, setStatistics] = useState(null);
  const [page, setPage] = useState(1), [pagination, setPagination] = useState({});
  const [status, setStatus] = useState(''), [search, setSearch] = useState(''), [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [selected, setSelected] = useState(null), [revision, setRevision] = useState(0);
  const load = useCallback(async signal => {
    setLoading(true); setError('');
    try {
      const [list, stats] = await Promise.all([
        axios.get(apiUrl('/payment'), { params: { page, limit: 10, status, search: query }, signal }),
        axios.get(apiUrl('/payment/statistics'), { signal })
      ]);
      if (signal.aborted) return;
      setPayments(list.data.data); setPagination(list.data.pagination); setStatistics(stats.data.data);
    } catch (err) {
      if (!signal.aborted) setError(err.response?.data?.message || 'Unable to load payments.');
    } finally { if (!signal.aborted) setLoading(false); }
  }, [page, status, query]);
  useEffect(() => {
    const controller = new AbortController(); load(controller.signal);
    return () => controller.abort();
  }, [load, revision]);
  async function update(payment, nextStatus) {
    const prompt = nextStatus === 'completed'
      ? 'Confirm that the full cash amount has been received?'
      : nextStatus === 'cancelled'
        ? 'Cancel this entire unpaid order? Reserved stock will be released and history retained. Orders already in production cannot be cancelled.'
        : 'Mark this order as collection in progress?';
    if (!window.confirm(prompt)) return;
    setBusy(true); setError('');
    try {
      await axios.patch(apiUrl('/payment/' + payment._id + '/status'), { status: nextStatus });
      setSelected(null); setRevision(value => value + 1);
    } catch (err) { setError(err.response?.data?.message || 'Unable to update payment.'); }
    finally { setBusy(false); }
  }
  const canUpdate = payment => ['pending', 'processing'].includes(payment.status);
  const actions = payment => canUpdate(payment) && <>
    {payment.status === 'pending' && <button disabled={busy} onClick={() => update(payment, 'processing')}>Start collection</button>}
    <button disabled={busy} onClick={() => update(payment, 'completed')}>Record cash received</button>
    <button className="btn-delete" disabled={busy} onClick={() => update(payment, 'cancelled')}>Cancel order</button>
  </>;
  return <div>
    <header className="payment-header"><h1>Cash Payment Management</h1>
      <p>Track cash due, record received payments, and manage unpaid orders.</p></header>
    <section className="payment-details-container">
      {statistics && <div className="statistics-cards">
        <div className="stat-card"><h3>Total orders</h3><p className="stat-number">{statistics.totalPayments}</p></div>
        <div className="stat-card"><h3>Settled cash orders</h3><p className="stat-number">{currency(statistics.totalRevenue)}</p></div>
        <div className="stat-card"><h3>Average settled order</h3><p className="stat-number">{currency(statistics.averageOrderValue)}</p></div>
        <div className="stat-card"><h3>Status distribution</h3>{Object.entries(statistics.statusDistribution || {}).map(([key, count]) =>
          <p key={key}>{statusLabel(key)}: {count}</p>)}</div>
      </div>}
      <div className="filters-section"><div className="filters-row">
        <label>Status <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">All statuses</option>{['pending', 'processing', 'completed', 'cancelled', 'failed'].map(value =>
            <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select></label>
        <form className="search-form" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
          <input aria-label="Search customer" placeholder="Search by customer name or email" value={search} onChange={event => setSearch(event.target.value)} />
          <button type="submit">Search</button>
        </form>
      </div></div>
      {error && <p role="alert" className="error-message">{error}</p>}
      {loading ? <p>Loading payments…</p> : <div className="payments-table-container"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table className="payments-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Total due</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>{payments.map(payment => <tr key={payment._id}>
          <td>{payment._id.slice(-8)}</td><td>{payment.deliveryDetails.firstName} {payment.deliveryDetails.lastName}<br />{payment.deliveryDetails.email}</td>
          <td>{currency(payment.orderDetails.total)}</td><td>{methodLabel(payment.paymentDetails.method)}</td>
          <td><span className={'status-badge status-' + payment.status}>{statusLabel(payment.status)}</span></td>
          <td>{date(payment.createdAt)}</td><td className="actions"><button className="btn-view" onClick={() => setSelected(payment)}>View</button>{actions(payment)}</td>
        </tr>)}</tbody>
      </table></div>{payments.length === 0 && <p className="no-data">No payment records found.</p>}</div>}
      {pagination.totalPages > 1 && <div className="pagination">
        <button disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span>Page {page} of {pagination.totalPages} ({pagination.totalItems} orders)</span>
        <button disabled={page >= pagination.totalPages || loading} onClick={() => setPage(value => value + 1)}>Next</button>
      </div>}
      {selected && <div className="modal-overlay" onClick={() => !busy && setSelected(null)}>
        <section role="dialog" aria-modal="true" aria-labelledby="payment-title" className="modal-content" onClick={event => event.stopPropagation()}>
          <div className="modal-header"><h2 id="payment-title">Order {selected._id.slice(-8)}</h2>
            <button className="modal-close" aria-label="Close" disabled={busy} onClick={() => setSelected(null)}>×</button></div>
          <div className="modal-body">
            <div className="details-section"><h3>Customer</h3><p>{selected.deliveryDetails.firstName} {selected.deliveryDetails.lastName}</p>
              <p>{selected.deliveryDetails.email} · {selected.deliveryDetails.phone}</p>
              <p>{[selected.deliveryDetails.address, selected.deliveryDetails.city, selected.deliveryDetails.state, selected.deliveryDetails.zipCode, selected.deliveryDetails.country].filter(Boolean).join(', ')}</p>
            </div>
            <div className="details-section"><h3>Order items</h3>{selected.orderDetails.cartItems?.map((item, index) =>
              <p key={index}>{item.name || item.kind} × {item.quantity} — {currency(item.totalPrice)}</p>)}
              <p>Subtotal: {currency(selected.orderDetails.subtotal)}</p><p>Tax: {currency(selected.orderDetails.tax)}</p>
              <p>Delivery: {currency(selected.shippingDetails.cost)} ({selected.shippingDetails.method})</p>
              {selected.orderDetails.giftWrap && <p>Gift wrapping: {currency(selected.orderDetails.giftWrapFee)}</p>}
              <p><strong>Total: {currency(selected.orderDetails.total)}</strong></p>
            </div>
            <div className="details-section"><h3>Payment</h3><p>{methodLabel(selected.paymentDetails.method)} · {statusLabel(selected.status)}</p>
              <p>Created: {date(selected.createdAt)}<br />Updated: {date(selected.updatedAt)}</p>
            </div>
            {error && <p role="alert" className="error-message">{error}</p>}
          </div>
          <div className="modal-footer">{actions(selected)}<button className="btn-close" disabled={busy} onClick={() => setSelected(null)}>Close</button></div>
        </section>
      </div>}
    </section></div>;
}
