import React from 'react';
import BookingReportView from '../../Components/BookingReportView';

const BookingReport = () => (
  <BookingReportView
    reportEndpoint="/api/booking/admin/report"
    roleLabel="Admin"
    accentColor="#4F46E5"
    header={<h1 className="text-2xl font-bold mb-6">Admin Booking Reports</h1>}
  />
);

export default BookingReport;
