import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TelesomLogo from './TelesomLogo';
import './Navbar.css';

/**
 * Navbar component matching the official Telesom Academy top navigation bar.
 * Provides direct navigation between Home/Portal, Courses, Test Centre,
 * and the green "Log in" and gold "Sign Up" buttons.
 */
export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const isLoginPage = location.pathname === '/login';
  const isSignupPage = location.pathname === '/signup';

  return (
    <header className="telesom-navbar-wrapper">
      <div className="telesom-navbar">
        {/* Left: Brand Logo */}
        <div className="nav-left">
          <Link to="/" className="brand-link" aria-label="Telesom Academy Home">
            <TelesomLogo size="md" />
          </Link>

          {/* Explore Button */}
          <button
            type="button"
            className="btn-explore"
            aria-label="Explore courses and services"
          >
            <svg
              className="explore-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="16" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <span>Explore</span>
          </button>
        </div>

        {/* Center: Navigation Links */}
        <nav className="nav-center" aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              <a href="#courses" className="nav-item">Courses</a>
            </li>
            <li className="dropdown-item">
              <a href="#test-centre" className="nav-item has-dropdown">
                Test Centre
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </a>
            </li>
            <li>
              <a href="#about-us" className="nav-item">About Us</a>
            </li>
            <li>
              <a href="#hackathon" className="nav-item">Hackathon</a>
            </li>
            <li>
              <a href="#contact" className="nav-item">Contact</a>
            </li>
          </ul>
        </nav>

        {/* Right: Search, Cart, Log in, Sign Up */}
        <div className="nav-right">
          {/* Search Trigger */}
          <button
            type="button"
            className="icon-btn search-trigger"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <svg
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>

          {/* Cart Icon with "0" green badge */}
          <div className="cart-badge-wrapper" title="Cart (0 items)">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <span className="cart-counter">0</span>
          </div>

          {/* Log in Button (Telesom Green) */}
          <Link
            to="/login"
            className={`btn-nav-login${isLoginPage ? ' current-page' : ''}`}
            aria-current={isLoginPage ? 'page' : undefined}
          >
            Log in
          </Link>

          {/* Sign Up Button (Telesom Gold) */}


          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            className="mobile-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="18" x2="20" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <ul className="mobile-nav-links">
            <li><a href="#courses" onClick={() => setMobileMenuOpen(false)}>Courses</a></li>
            <li><a href="#test-centre" onClick={() => setMobileMenuOpen(false)}>Test Centre</a></li>
            <li><a href="#about-us" onClick={() => setMobileMenuOpen(false)}>About Us</a></li>
            <li><a href="#hackathon" onClick={() => setMobileMenuOpen(false)}>Hackathon</a></li>
            <li><a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a></li>
          </ul>
          <div className="mobile-action-buttons">
            <Link
              to="/login"
              className="btn-nav-login"
              onClick={() => setMobileMenuOpen(false)}
            >
              Log in
            </Link>

          </div>
        </div>
      )}
    </header>
  );
}
