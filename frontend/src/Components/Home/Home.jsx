// src/Components/Home/Home.js
import React from 'react';
 // Make sure navBar.js uses capital 'N'
import './Home.css'; // Import CSS
import { Link, Outlet } from 'react-router-dom';
 // Import Footer component
import ContactUs from './ContactUs';
import AboutUs from './AboutUs';
import { useBranding } from '../../config/branding';

function Home() {
  const { branding } = useBranding();
  return (
    <div className="home-container" >
      
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-background fade-in">
          <div className="floating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
            <div className="shape shape-4"></div>
          </div>
        </div>
        
        <div className="hero-content fade-in">
          <div className="hero-text">
            <h1 className="hero-title">
              {branding.heroTitle}
            </h1>
            <p className="hero-description">
              {branding.heroDescription}
            </p>
            
            <div className="startButtons">
              <Link to="/login" className="startButtonsprimary">
                <span style={{ color: "#fff", }}>Get Started</span>
                <i className="arrow-icon">→</i>
              </Link>
              <Link to="/learn-more" className="startButtonssecondary">
                <span>Learn More</span>
              </Link>
            </div>
          
          </div>
          
          <div className="hero-visual fade-in">
            <div className="tshirt-showcase">
              <div className="tshirt-card">
                <span className="tshirt-label">Classic Fit</span>
              </div>
              <div className="tshirt-card">
                <span className="tshirt-label">Premium</span>
              </div>
              <div className="tshirt-card">
                <span className="tshirt-label">Custom Design</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section fade-in">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose {branding.name}?</h2>
            <p>Experience the perfect blend of quality, creativity, and style</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Custom Designs</h3>
              <p>Create unique designs with our intuitive design tools and premium templates.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💎</div>
              <h3>Premium Quality</h3>
              <p>High-quality materials and printing techniques for long-lasting, vibrant designs.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🌍</div>
              <h3>Eco-Friendly</h3>
              <p>Sustainable materials and environmentally conscious production processes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section-wrapper fade-in">
        <AboutUs />
      </section>

      <Outlet />
      
    </div>
  );
}

export default Home;
