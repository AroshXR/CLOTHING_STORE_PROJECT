import React from 'react';
import BookingReportView from '../../Components/BookingReportView';
import Title from '../../Components/pasindu/owner/Title';

const Reports = () => (
  <BookingReportView
    reportEndpoint="/api/booking/owner/report"
    pdfEndpoint="/api/booking/owner/report/pdf"
    roleLabel="Owner"
    accentColor="#000000"
    header={<Title title="Booking Reports" subTitle="Generate, preview, and download booking and revenue reports." />}
  />
);

export default Reports;
