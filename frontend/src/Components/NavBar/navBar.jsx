import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../AuthGuard/AuthGuard';
import './navBar.css';

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isLoggedIn = isAuthenticated();
  const userType = currentUser?.type;

  const isHomePage = location.pathname === '/';
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isCustomizerPage = location.pathname === '/customizer';

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => document.head.removeChild(link);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
      closeMenu();
    }
  };

  const handleLogoClick = () => {
    navigate('/');
    closeMenu();
  };

  const showLogout = isLoggedIn && !(isHomePage || isLoginPage || isRegisterPage || isCustomizerPage);
<<<<<<< HEAD
  const isCustomerOrApplicant = userType === 'Customer' || userType === 'Applicant';
  const showAuthLinks = !isLoggedIn && !isLoginPage && !isRegisterPage;

  return (
    <nav className="main-navbar">
      <div className="navbar-scroll">
        <div className="navbar-content">
          <h2 className="logo" onClick={handleLogoClick}>Klassy T Shirts</h2>
=======

  return (
    <nav className="navbar">
      <h2 className="logo" onClick={handleLogoClick}>
        Klassy T Shirts
      </h2>
>>>>>>> 5b77134b53745c3759d5a08c9c2e35a3c49fcc9d

          <div className="menu-icon" onClick={() => setMenuOpen(!menuOpen)}>
            <i className={menuOpen ? 'bx bx-x' : 'bx bx-menu'}></i>
          </div>

<<<<<<< HEAD
          <div className={`nav-buttons ${menuOpen ? 'active' : ''}`}>
            <Link to="/customizer" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-info-circle'></i> Customizer
              </button>
            </Link>
            <Link to="/career" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-briefcase'></i> Career
              </button>
            </Link>
            <Link to="/rentalhome" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-home'></i> Rental Home
              </button>
            </Link>
            <Link to="/color-guide" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-palette'></i> Color Guide
              </button>
            </Link>
            <Link to="/outlet" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-store'></i> Outlet
              </button>
            </Link>
            <Link to="/orderManagement" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-cart'></i> Cart
              </button>
            </Link>
            {userType === 'Applicant' && (
              <Link to="/applicant-dashboard" onClick={closeMenu}>
                <button className="nav-btn">
                  <i className='bx bx-user-check'></i> My Applications
                </button>
              </Link>
            )}
            {userType === 'Tailor' && (
              <Link to="/tailorHome" onClick={closeMenu}>
                <button className="nav-btn">
                  <i className='bx bx-scissors'></i> Tailor Home
                </button>
              </Link>
            )}
            {userType === 'Admin' && (
              <>
                <Link to="/admin-hub" onClick={closeMenu}>
                  <button className="nav-btn">
                    <i className='bx bx-shield'></i> Admin
                  </button>
                </Link>
                <Link to="/admin/custom-orders" onClick={closeMenu}>
                  <button className="nav-btn">
                    <i className='bx bx-t-shirt'></i> Tailor Management
                  </button>
                </Link>
              </>
            )}

            <Link to="/contact" onClick={closeMenu}>
              <button className="nav-btn">
                <i className='bx bx-phone'></i> Contact Us
              </button>
            </Link>
            {isLoggedIn && userType === 'Customer' && (
              <Link to="/orderManagement" onClick={closeMenu}>
                <button className="nav-btn">
                  <i className='bx bx-cart'></i> Cart
                </button>
              </Link>
            )}

            {isLoggedIn && (
              <Link to="/user/account" onClick={closeMenu}>
                <button className="nav-btn">
                  <i className='bx bx-user-circle'></i> My Account
                </button>
              </Link>
            )}

            {showAuthLinks && (
              <>
                <Link to="/login" onClick={closeMenu}>
                  <button className="nav-btn">
                    <i className='bx bx-log-in'></i> Login
                  </button>
                </Link>
                <Link to="/register" onClick={closeMenu}>
                  <button className="nav-btn">
                    <i className='bx bx-user-plus'></i> Register
                  </button>
                </Link>
              </>
            )}
            {isLoggedIn && showLogout && (
              <button onClick={handleLogout} className="nav-btn">
                <i className='bx bx-log-out'></i> Logout
              </button>
            )}
          </div>
        </div>
=======
      <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
        <Link to="/customizer" onClick={closeMenu}><i className='bx bx-t-shirt'></i> Customizer</Link>
        <Link to="/career" onClick={closeMenu}><i className='bx bx-briefcase'></i> Career</Link>
        <Link to="/rentalhome" onClick={closeMenu}><i className='bx bx-home'></i> Rental Home</Link>
        <Link to="/color-guide" onClick={closeMenu}><i className='bx bx-palette'></i> Colors</Link>
        <Link to="/outlet" onClick={closeMenu}><i className='bx bx-store'></i> Outlet</Link>

        {userType === 'Applicant' && (
          <Link to="/applicant-dashboard" onClick={closeMenu}><i className='bx bx-user-check'></i> My Applications</Link>
        )}
        {userType === 'Tailor' && (
          <Link to="/tailorHome" onClick={closeMenu}><i className='bx bx-scissors'></i> Tailor</Link>
        )}
        {userType === 'Admin' && (
          <>
            <Link to="/admin-hub" onClick={closeMenu}><i className='bx bx-shield'></i> Admin</Link>
            <Link to="/admin/custom-orders" onClick={closeMenu}><i className='bx bx-cog'></i> Management</Link>
          </>
        )}

        <Link to="/contact" onClick={closeMenu}><i className='bx bx-phone'></i> Contact</Link>

        {isLoggedIn && (
          <Link to="/user/account" onClick={closeMenu}><i className='bx bx-user-circle'></i> Account</Link>
        )}

        {showAuthLinks && (
          <>
            <Link to="/login" onClick={closeMenu}><i className='bx bx-log-in'></i> Login</Link>
            <Link to="/register" onClick={closeMenu}><i className='bx bx-user-plus'></i> Register</Link>
          </>
        )}

        {isLoggedIn && showLogout && (
          <span className="logout" onClick={handleLogout}><i className='bx bx-log-out'></i> Logout</span>
        )}
>>>>>>> 5b77134b53745c3759d5a08c9c2e35a3c49fcc9d
      </div>
    </nav>
  );
}

export default NavBar;
