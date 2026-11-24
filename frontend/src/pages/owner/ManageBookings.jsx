import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import Title from '../../Components/pasindu/owner/Title';
import MediaImage from '../../Components/MediaImage';
import { apiUrl, downloadFile } from '../../config/api';
export default function ManageBookings() {
  const [bookings, setBookings] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const currency = process.env.REACT_APP_CURRENCY || '$';
  const load = useCallback(async () => {
    try { const { data } = await axios.get(apiUrl('/api/booking/owner')); setBookings(data.bookings || []); }
    catch (err) { setError(err.response?.data?.message || 'Unable to load bookings.'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  async function action(booking, type) {
    if (type === 'cash' && !window.confirm('Confirm that you have received ' + currency + Number(booking.collectionAmount || booking.price).toFixed(2) + ' in cash.')) return;
    setBusy(booking._id); setError('');
    try {
      if (type === 'cash') await axios.post(apiUrl('/api/booking/' + booking._id + '/record-payment'));
      else await axios.post(apiUrl('/api/booking/change-status'), { bookingId: booking._id, status: type });
      await load();
    } catch (err) { setError(err.response?.data?.message || 'Unable to update this booking.'); }
    finally { setBusy(''); }
  }
  return <div className="w-full">
    <Title title="Manage Bookings" subTitle="Review bookings and record cash received at collection." />
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <div className="overflow-x-auto"><div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table"><table className="w-full text-left text-sm bg-white">
      <thead><tr>{['Outfit', 'Customer', 'Dates', 'Amount', 'Payment', 'Actions'].map(name => <th key={name} className="p-3">{name}</th>)}</tr></thead>
      <tbody>{bookings.map(booking => <tr key={booking._id} className="border-t">
        <td className="p-3"><MediaImage src={booking.outfit?.image} alt="" style={{ width: 64, height: 64, objectFit: 'cover' }} />{booking.outfit?.brand} {booking.outfit?.model}</td>
        <td className="p-3">{booking.user?.username}</td>
        <td className="p-3">{booking.reservationDate.slice(0, 10)} – {booking.returnDate.slice(0, 10)}</td>
        <td className="p-3">{currency}{Number(booking.collectionAmount || booking.price).toFixed(2)}</td>
        <td className="p-3">{booking.paymentStatus === 'paid' ? 'Cash received' : booking.paymentStatus === 'pending' ? 'Cash due on collection' : 'Not arranged'}</td>
        <td className="p-3"><p>{booking.status}</p>
          {booking.status === 'pending' && <><button disabled={busy === booking._id} onClick={() => action(booking, 'confirmed')}>Confirm</button>{' '}
            <button disabled={busy === booking._id} onClick={() => action(booking, 'cancelled')}>Decline</button></>}
          {booking.status === 'confirmed' && booking.paymentStatus === 'pending' &&
            <button disabled={busy === booking._id} onClick={() => action(booking, 'cash')}>Record cash received</button>}
          <button onClick={() => downloadFile(apiUrl('/api/booking/' + booking._id + '/document'), 'booking-document').catch(() => setError('Document is not available.'))}>Download document</button>
        </td>
      </tr>)}</tbody>
    </table></div>{!bookings.length && <p className="p-4">No bookings yet.</p>}</div>
  </div>;
}
