import { API_BASE_URL } from '../../config/api';
import MediaImage from '../../Components/MediaImage';
import DesignSummary from '../../Components/clothing-customizer/studio/DesignSummary';
import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthGuard/authGuard';
import { nextProductionState, productionLabel } from '../../utils/production';

export default function AdminCustomOrderDetail() {
  const { id } = useParams();
  const { getToken } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/custom-orders/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.data?.data) throw new Error('Order not found');
      setOrder(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load order.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const updateStatus = async status => {
    setUpdating(true);
    setError('');
    try {
      await axios.patch(`${API_BASE_URL}/api/custom-orders/${id}/status`, { status }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      await fetchOrder();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update production status.');
    } finally {
      setUpdating(false);
    }
  };

  const next = nextProductionState[order?.status];
  return <div className="admin-custom-order-detail">
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Order Detail</h1><Link to="/admin/custom-orders">Back to List</Link>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? <p role="status">Loading order…</p> : order && <div style={{ display: 'grid', gap: 16 }}>
        <section className="ui-card">
          <h2>Order</h2>
          <div><strong>ID:</strong> {order._id}</div>
          <div><strong>Status:</strong> {productionLabel(order.status)}</div>
          <div><strong>Customer:</strong> {order.customerId?.username} ({order.customerId?.email})</div>
        </section>
        <section className="ui-card">
          <h2>Configuration</h2>
          <div><strong>Type:</strong> {order.config?.clothingType}</div>
          <div><strong>Size:</strong> {order.config?.size}</div>
          <div><strong>Color:</strong> {order.config?.color}</div>
          <div><strong>Quantity:</strong> {order.config?.quantity}</div>
          {order.config?.notes && <div><strong>Notes:</strong> {order.config.notes}</div>}
        </section>
        {order.design?.designMeta?.designVersion === 2 && <section className="ui-card">
          <h2>Complete garment design</h2><DesignSummary design={order.design.designMeta} />
        </section>}
        {order.design?.designImageUrl && <section className="ui-card">
          <h2>Design</h2>
          <MediaImage alt="Customer design" src={order.design.designImageUrl} style={{ maxWidth: 240, borderRadius: 8, border: '1px solid #ddd' }} />
        </section>}
        {next && <section className="ui-card">
          <h2>Update Production Status</h2>
          <button type="button" disabled={updating} onClick={() => updateStatus(next)}>
            {updating ? 'Updating…' : productionLabel(next, true)}
          </button>
        </section>}
      </div>}
    </section>
  </div>;
}
