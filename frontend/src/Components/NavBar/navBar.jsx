import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthGuard/authGuard';
import SiteBrand from '../SiteBrand';
import './navBar.css';

const links = [['/outlet', 'Shop'], ['/customizer', 'Customizer'], ['/rentalHome', 'Rentals'], ['/career', 'Careers'], ['/color-guide', 'Color guide'], ['/contact', 'Contact']];
export default function NavBar() {
  const { currentUser, logout, isAuthenticated } = useAuth();
  const { pathname } = useLocation(), navigate = useNavigate();
  const [open, setOpen] = useState(false), workspace = useRef(null), nav = useRef(null);
  const loggedIn = isAuthenticated(), admin = currentUser?.type === 'Admin' || currentUser?.role === 'admin';
  useEffect(() => { setOpen(false); if (workspace.current) workspace.current.open = false; }, [pathname]);
  useEffect(() => {
    const close = event => {
      if (event.key === 'Escape') { setOpen(false); if (workspace.current) workspace.current.open = false; }
      if (event.type === 'pointerdown' && !nav.current?.contains(event.target) && workspace.current) workspace.current.open = false;
    };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); };
  }, []);
  const signOut = () => { logout(); setOpen(false); navigate('/login'); };
  return <header className="site-navigation" ref={nav}>
    <div className="site-navigation__inner">
      <Link to="/" className="site-navigation__brand" aria-label="Home"><SiteBrand /></Link>
      <button type="button" className="site-navigation__toggle" aria-expanded={open} aria-controls="site-navigation-panel" onClick={() => setOpen(value => !value)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d={open ? 'M6 6l12 12M6 18L18 6' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
        <span>{open ? 'Close menu' : 'Menu'}</span>
      </button>
      <div id="site-navigation-panel" className={'site-navigation__panel' + (open ? ' is-open' : '')}>
        <nav aria-label="Main navigation" className="site-navigation__links">
          {links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
        <div className="site-navigation__actions">
          {loggedIn ? <>
            {['Customer', 'Applicant'].includes(currentUser?.type) && <Link className="site-navigation__cart" to="/orderManagement">Cart</Link>}
            <details className="site-workspace" ref={workspace}>
              <summary>Workspace <span aria-hidden="true">⌄</span></summary>
              <nav className="site-workspace__menu" aria-label="Your workspace">
                <p>{currentUser?.username || 'Your account'}</p>
                {admin && <><Link to="/admin-hub">Admin Hub</Link><Link to="/admin/custom-orders">Production orders</Link><Link to="/admin/site-settings">Site settings</Link></>}
                {(currentUser?.role === 'owner' || admin) && <Link to="/owner">Rental management</Link>}
                {currentUser?.type === 'Tailor' && <Link to="/tailorHome">My production orders</Link>}
                {currentUser?.type === 'Applicant' && <Link to="/applicant-dashboard">My applications</Link>}
                {['Customer', 'Applicant'].includes(currentUser?.type) && <Link to="/my-bookings">My bookings</Link>}
                <Link to="/user/account">Account settings</Link>
                <button type="button" onClick={signOut}>Sign out</button>
              </nav>
            </details>
          </> : <><Link to="/login" className="site-navigation__signin">Sign in</Link><Link to="/register" className="site-navigation__register">Create account</Link></>}
        </div>
      </div>
    </div>
  </header>;
}
