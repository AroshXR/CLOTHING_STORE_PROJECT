import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../../Components/pasindu/owner/Sidebar';
export default function Layout() {
  return (
    <div className="ui-owner-layout">
      <Sidebar />
      <div className="ui-owner-content">
        <Suspense fallback={<div className="ui-state"><p>Loading…</p></div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
