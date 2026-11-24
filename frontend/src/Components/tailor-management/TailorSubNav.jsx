import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function TailorSubNav() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav style={{
      borderBottom: '1px solid #eee',
      background: '#fafafa',
      padding: '8px 16px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/admin/custom-orders">
          <button >
            Orders
          </button>
        </Link>
        <Link to="/admin/custom-orders/new" style={{ display: 'none' }}>
          {/* Reserved for future: create custom order */}
        </Link>
        <Link to="/admin/tailors">
          <button >
            Tailors
          </button>
        </Link>
      </div>
    </nav>
  );
}
