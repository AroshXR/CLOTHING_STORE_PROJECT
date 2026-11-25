import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL as API_ORIGIN, apiFetch as fetch } from '../config/api';
import { useAuth } from '../AuthGuard/authGuard';
import MediaImage from './MediaImage';

const STATUS_BADGE = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800'
};

function buildBookingReportHtml({ bookings, summary, roleLabel, username, accentColor }) {
  const currency = process.env.REACT_APP_CURRENCY || 'Rs.';
  const rows = bookings.map((booking) => {
    const startDate = new Date(booking.reservationDate).toLocaleDateString();
    const endDate = new Date(booking.returnDate).toLocaleDateString();
    const duration = Math.ceil((new Date(booking.returnDate) - new Date(booking.reservationDate)) / (1000 * 60 * 60 * 24));
    return `
      <tr>
        <td>#${booking._id.slice(-6)}</td>
        <td>
          <div class="outfit-info">
            <img src="${booking.outfit?.image || ''}" alt="Outfit" class="outfit-img" onerror="this.style.display='none'">
            <div>
              <strong>${booking.outfit?.brand || 'N/A'} - ${booking.outfit?.model || 'N/A'}</strong><br>
              <small>${booking.outfit?.category || 'N/A'} | ${booking.outfit?.location || 'N/A'}</small>
            </div>
          </div>
        </td>
        <td>
          <strong>${booking.user?.username || 'N/A'}</strong><br>
          <small>${booking.user?.email || 'N/A'}</small>
        </td>
        <td>
          <strong>Start:</strong> ${startDate}<br>
          <strong>End:</strong> ${endDate}
        </td>
        <td>${duration} day${duration !== 1 ? 's' : ''}</td>
        <td><span class="status ${booking.status}">${booking.status.toUpperCase()}</span></td>
        <td><strong>${currency}${booking.price.toFixed(2)}</strong></td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <title>Booking Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid ${accentColor}; padding-bottom: 20px; }
    .header h1 { color: ${accentColor}; margin: 0; }
    .header p { margin: 5px 0; color: #666; }
    .summary { background: #F8FAFC; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #E5E7EB; }
    .summary h2 { color: ${accentColor}; margin-top: 0; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .summary-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${accentColor}; }
    .summary-item h3 { margin: 0 0 5px 0; color: ${accentColor}; }
    .summary-item p { margin: 0; font-size: 18px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
    th { background: ${accentColor}; color: white; font-weight: bold; }
    tr:nth-child(even) { background: #F9FAFB; }
    .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .status.pending { background: #FEF3C7; color: #92400E; }
    .status.confirmed { background: #D1FAE5; color: #065F46; }
    .status.cancelled { background: #FEE2E2; color: #991B1B; }
    .outfit-info { display: flex; align-items: center; gap: 10px; }
    .outfit-img { width: 40px; height: 40px; object-fit: cover; border-radius: 4px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Booking Report</h1>
    <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
    <p><strong>${roleLabel}:</strong> ${username || roleLabel}</p>
    <p><strong>Report Period:</strong> ${summary.reportPeriod.startDate} to ${summary.reportPeriod.endDate}</p>
  </div>
  <div class="summary">
    <h2>Summary &amp; Analytics</h2>
    <div class="summary-grid">
      <div class="summary-item"><h3>Total Bookings</h3><p>${summary.totalBookings}</p></div>
      <div class="summary-item"><h3>Total Revenue</h3><p>${currency}${summary.totalRevenue.toFixed(2)}</p></div>
      <div class="summary-item"><h3>Confirmed Bookings</h3><p>${summary.statusCounts.confirmed || 0}</p></div>
      <div class="summary-item"><h3>Pending Bookings</h3><p>${summary.statusCounts.pending || 0}</p></div>
    </div>
  </div>
  <h2>Detailed Booking Information</h2>
  <table>
    <thead>
      <tr>
        <th>Booking ID</th><th>Outfit Details</th><th>Customer</th>
        <th>Booking Period</th><th>Duration</th><th>Status</th><th>Total Price</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

export default function BookingReportView({
  reportEndpoint,
  pdfEndpoint = '',
  roleLabel = 'Admin',
  accentColor = '#4F46E5',
  header = null
}) {
  const { getToken, currentUser } = useAuth();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', status: 'all', location: 'all' });

  const buildParams = () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.status !== 'all') params.append('status', filters.status);
    if (filters.location !== 'all') params.append('location', filters.location);
    return params;
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const { data } = await axios.get(`${API_ORIGIN}${reportEndpoint}?${buildParams()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data?.success) setReportData(data.reportData);
      else alert(data?.message || 'Failed to generate report');
    } catch (err) {
      console.error(err);
      alert('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDFReport = async () => {
    if (!reportData || !pdfEndpoint) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_ORIGIN}${pdfEndpoint}?${buildParams()}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/pdf' }
      });
      if (!response.ok) {
        alert('Failed to download PDF report');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `booking-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error downloading PDF report');
    }
  };

  const generateHTMLReport = () => {
    if (!reportData) return;
    const htmlContent = buildBookingReportHtml({
      bookings: reportData.bookings,
      summary: reportData.summary,
      roleLabel,
      username: currentUser?.username,
      accentColor
    });
    const reportWindow = window.open('', '_blank');
    if (reportWindow) {
      reportWindow.document.write(htmlContent);
      reportWindow.document.close();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {header}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <select
            value={filters.location}
            onChange={(e) => setFilters((prev) => ({ ...prev, location: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Locations</option>
            <option value="Colombo">Colombo</option>
            <option value="Gampaha">Gampaha</option>
            <option value="Kadawatha">Kadawatha</option>
            <option value="Rajagiriya">Rajagiriya</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={fetchReport}
          disabled={loading}
          className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>

        {reportData && (
          <>
            <button
              onClick={generateHTMLReport}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium"
            >
              View HTML Report
            </button>
            {pdfEndpoint && (
              <button
                onClick={downloadPDFReport}
                className="bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-md font-medium"
              >
                Download PDF
              </button>
            )}
          </>
        )}
      </div>

      {reportData && (
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">Report Preview</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
              <h3 className="text-blue-700 font-medium">Total Bookings</h3>
              <p className="text-2xl font-bold text-blue-800">{reportData.summary.totalBookings}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
              <h3 className="text-green-700 font-medium">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-800">Rs.{reportData.summary.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-500">
              <h3 className="text-yellow-700 font-medium">Confirmed</h3>
              <p className="text-2xl font-bold text-yellow-800">{reportData.summary.statusCounts.confirmed || 0}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
              <h3 className="text-purple-700 font-medium">Pending</h3>
              <p className="text-2xl font-bold text-purple-800">{reportData.summary.statusCounts.pending || 0}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="ui-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outfit</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reportData.bookings.slice(0, 10).map((booking) => (
                    <tr key={booking._id}>
                      <td className="px-4 py-4 text-sm">#{booking._id.slice(-6)}</td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <MediaImage src={booking.outfit?.image} alt="" className="w-8 h-8 object-cover rounded" />
                          <div>
                            <div className="font-medium">{booking.outfit?.brand} - {booking.outfit?.model}</div>
                            <div className="text-gray-500 text-xs">{booking.outfit?.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>{booking.user?.username}</div>
                        <div className="text-gray-500 text-xs">{booking.user?.email}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>{new Date(booking.reservationDate).toLocaleDateString()}</div>
                        <div className="text-gray-500 text-xs">to {new Date(booking.returnDate).toLocaleDateString()}</div>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`px-2 py-1 text-xs rounded-full ${STATUS_BADGE[booking.status] || 'bg-red-100 text-red-800'}`}>
                          {booking.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">Rs.{booking.price.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {reportData.bookings.length > 10 && (
              <p className="text-center text-gray-500 py-4">
                Showing first 10 of {reportData.bookings.length} bookings. View full report for complete data.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
