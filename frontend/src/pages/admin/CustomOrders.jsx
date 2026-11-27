import { API_BASE_URL } from '../../config/api';
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../AuthGuard/authGuard';
import { productionStates, nextProductionState, productionLabel } from '../../utils/production';

export default function AdminCustomOrders() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const idFilter = searchParams.get('id') || '';

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (idFilter) params.id = idFilter;
      const res = await axios.get(`${API_BASE_URL}/api/custom-orders`, {
        headers: { Authorization: `Bearer ${getToken()}` }, params
      });
      if (!Array.isArray(res.data?.data)) throw new Error('Invalid response format');
      setOrders(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load custom orders.');
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter, idFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    setUpdatingStatusId(orderId);
    setError('');
    try {
      await axios.patch(`${API_BASE_URL}/api/custom-orders/${orderId}/status`, { status }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      await fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update production status.');
    } finally {
      setUpdatingStatusId('');
    }
  };

  const updateFilter = (key, value) => {
    const next = new URLSearchParams();
    if (statusFilter) next.set('status', statusFilter);
    if (idFilter) next.set('id', idFilter);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next);
  };

  return <div className="admin-custom-orders">
    <section>
      <h1>Custom Orders</h1>
      <p>Review customer designs and manage production.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0' }}>
        <label>Status <select value={statusFilter} onChange={event => updateFilter('status', event.target.value)}>
          <option value="">All statuses</option>
          {productionStates.map(status => <option key={status} value={status}>{productionLabel(status)}</option>)}
        </select></label>
        <label>Order ID <input type="text" placeholder="Search by Order ID" value={idFilter}
          onChange={event => updateFilter('id', event.target.value.trim())} /></label>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading orders…</p> : <div style={{ display: 'grid', gap: 12 }}>
        {orders.map(order => {
          const next = nextProductionState[order.status];
          return <article key={order._id} className="ui-card">
            <div><strong>ID:</strong> <Link to={`/admin/custom-orders/${order._id}`}>{order._id}</Link></div>
            <div><strong>Customer:</strong> {order.customerId ? `${order.customerId.username} (${order.customerId.email})` : '—'}</div>
            <div><strong>Type/Color/Size:</strong> {order.config?.clothingType || '—'} / {order.config?.color || '—'} / {order.config?.size || '—'}</div>
            <div><strong>Quantity:</strong> {order.config?.quantity ?? '—'}</div>
            <div><strong>Status:</strong> {productionLabel(order.status)}</div>
            <div><strong>Price:</strong> {typeof order.price === 'number' ? `$${order.price.toFixed(2)}` : '—'}</div>
            <div><strong>Created:</strong> {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</div>
            {next && <button type="button" disabled={Boolean(updatingStatusId)} onClick={() => updateStatus(order._id, next)}>
              {updatingStatusId === order._id ? 'Updating…' : productionLabel(next, true)}
            </button>}
          </article>;
        })}
        {!orders.length && <p>No orders found.</p>}
      </div>}
    </section>
  </div>;
}
