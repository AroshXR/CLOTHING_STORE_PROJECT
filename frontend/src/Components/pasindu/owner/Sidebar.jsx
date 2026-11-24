import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../../AuthGuard/authGuard';
const links = [['/owner', 'Overview'], ['/owner/add-outfit', 'Add outfit'], ['/owner/manage-outfits', 'Outfits'], ['/owner/manage-bookings', 'Bookings'], ['/owner/reports', 'Reports']];
export default function Sidebar() {
  const { currentUser } = useAuth();
  return <aside className="ui-owner-sidebar">
    <div className="ui-owner-identity"><span className="ui-owner-avatar" aria-hidden="true">{(currentUser?.username || 'O').slice(0, 1).toUpperCase()}</span>
      <div><strong>{currentUser?.username || 'Your workspace'}</strong><p>Rental management</p></div></div>
    <nav aria-label="Rental management">{links.map(([to, label]) =>
      <NavLink key={to} to={to} end={to === '/owner'}>{label}</NavLink>)}</nav>
    <Link className="ui-owner-account" to="/user/account">Account settings</Link>
  </aside>;
}
