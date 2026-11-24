import UIIcon from '../Layout/UIIcon';
import React from 'react';
import { useNavigate } from 'react-router-dom';


import './AdminHub.css';

export default function AdminHub() {
  const navigate = useNavigate();

  return (
    <div className="admin-hub-page">
      
      <section className="admin-hub">
        <header className="admin-hub__header">
          <h1>Admin Hub</h1>
          <p>Select an area to manage.</p>
        </header>

        <section className="admin-hub__grid">
          <button className="hub-card" onClick={() => navigate('/admin/site-settings')}>
            <UIIcon className='bx bx-palette'></UIIcon>
            <h3>Site Settings</h3>
            <p>Customize your name, logo, colors, homepage, and contact details.</p>
          </button>
          <button className="hub-card" onClick={() => navigate('/admin')}>
            <UIIcon className='bx bx-briefcase'></UIIcon>
            <h3>Career Management</h3>
            <p>Manage applicants, jobs and reports.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/admin/users')}>
            <UIIcon className='bx bx-user'></UIIcon>
            <h3>User Management</h3>
            <p>Manage users and roles.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/inventoryManagement')}>
            <UIIcon className='bx bx-package'></UIIcon>
            <h3>Material Inventory Management</h3>
            <p>Track materials and stock levels.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/clothing-inventory')}>
            <UIIcon className='bx bx-store'></UIIcon>
            <h3>Clothing Inventory</h3>
            <p>Manage clothing items, stock, and inventory.</p>
          </button>

          <button className="hub-card supplier-card" onClick={() => navigate('/supplierManagement')}>
            <UIIcon className='bx bxs-truck'></UIIcon>
            <h3>Supplier Management</h3>
            <p>Manage suppliers and orders.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/paymentDetails')}>
            <UIIcon className='bx bx-credit-card'></UIIcon>
            <h3>Payment Details</h3>
            <p>View and analyze payment transactions.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/orderSummary')}>
            <UIIcon className='bx bx-receipt'></UIIcon>
            <h3>Order Summary</h3>
            <p>Review and manage order summaries and invoices.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/owner')}>
            <UIIcon className='bx bx-home-alt'></UIIcon>
            <h3>Rental Management</h3>
            <p>Manage rental listings, bookings, and dashboards.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/admin-jobs')}>
            <UIIcon className='bx bx-cog'></UIIcon>
            <h3>Job Management</h3>
            <p>Create and manage job postings.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/admin/custom-orders')}>
            <UIIcon className='bx bx-t-shirt'></UIIcon>
            <h3>Tailor Management</h3>
            <p>Assign tailors and track order statuses.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/admin-cloth-customizer')}>
            <UIIcon className='bx bx-customize'></UIIcon>
            <h3>Admin Cloth Customizer</h3>
            <p>Manage customizer assets and presets.</p>
          </button>

          <button className="hub-card" onClick={() => navigate('/admin-applicants')}>
            <UIIcon className='bx bx-id-card'></UIIcon>
            <h3>Applicants</h3>
            <p>Review, shortlist, and schedule interviews.</p>
          </button>
        </section>
      </section>
      
    </div>
  );
}
