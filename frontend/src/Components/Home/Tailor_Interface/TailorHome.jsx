import React, { Suspense, useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Canvas } from '@react-three/fiber';
import { Bounds, OrbitControls } from '@react-three/drei';
import { apiUrl } from '../../../config/api';
import { TShirtModel } from '../../clothing-customizer/components/TShirtModel';


import './TailorHome.css';

const nextStatus = { assigned: 'accepted', accepted: 'in_progress', in_progress: 'completed', completed: 'delivered' };
const label = { accepted: 'Accept order', in_progress: 'Start production', completed: 'Mark completed', delivered: 'Mark delivered' };
export default function TailorHome() {
  const [orders, setOrders] = useState([]), [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setError('');
      const { data } = await axios.get(apiUrl('/api/custom-orders/assigned'));
      setOrders(data.data);
      setSelectedId(id => data.data.some(order => order._id === id) ? id : data.data[0]?._id || '');
    } catch (err) { setError(err.response?.data?.message || 'Unable to load assigned orders.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const selected = orders.find(order => order._id === selectedId);
  async function update(order) {
    setBusy(true);
    try { await axios.patch(apiUrl('/api/custom-orders/' + order._id + '/status'), { status: nextStatus[order.status] }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unable to update this order.'); }
    finally { setBusy(false); }
  }
  return <div className="tailor-container">
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px', minHeight: '70vh' }}>
      <h1>Your production orders</h1><p>Review the saved design and update your assigned work.</p>
      {error && <p role="alert" style={{ color: '#a32020' }}>{error}</p>}
      {loading ? <p role="status">Loading orders…</p> : !orders.length ? <p>No orders have been assigned to you yet.</p> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginTop: 24 }}>
          <section aria-label="Assigned orders">{orders.map(order => <article key={order._id}
            style={{ border: '1px solid #d8dfeb', borderRadius: 8, padding: 18, marginBottom: 14, background: '#fff' }}>
            <h2 style={{ fontSize: 18 }}>{order.config.notes || 'Custom T-shirt'}</h2>
            <p>{order.customerId?.username} · Size {order.config.size} · Quantity {order.config.quantity}</p>
            <p>Status: <strong>{order.status.replace('_', ' ')}</strong></p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => setSelectedId(order._id)} aria-pressed={selectedId === order._id}>View design</button>
              {nextStatus[order.status] && <button disabled={busy} onClick={() => update(order)}>{busy ? 'Updating…' : label[nextStatus[order.status]]}</button>}
            </div>
          </article>)}</section>
          {selected && <section aria-label="Saved order design" style={{ background: '#fff', borderRadius: 8, padding: 20 }}>
            <h2 style={{ fontSize: 20 }}>{selected.config.notes || 'Saved design'}</h2>
            <div style={{ height: 360 }}><Canvas camera={{ position: [5, 0, 5], fov: 45 }}>
              <ambientLight intensity={0.7} /><directionalLight position={[5, 5, 5]} intensity={0.6} />
              <Suspense fallback={null}><Bounds fit clip observe margin={1.2}>
                <TShirtModel selectedColor={selected.config.color} chestDesignUrl={selected.design?.designImageUrl || null} scale={2} position={[0, 0, 0]} />
              </Bounds></Suspense><OrbitControls enablePan={false} />
            </Canvas></div>
            <p>Color: {selected.config.color} · Size: {selected.config.size}</p>
            {selected.design?.designMeta?.selectedDesign && <p>
              Saved artwork: {selected.design.designMeta.selectedDesign.name}<br />
              Size setting: {selected.design.designMeta.selectedDesign.size} · Position: {selected.design.designMeta.selectedDesign.position?.x ?? 0}, {selected.design.designMeta.selectedDesign.position?.y ?? 0}
            </p>}
          </section>}
        </div>}
    </section></div>;
}
