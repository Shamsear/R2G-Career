"use client";

import Link from "next/link";
import Image from "next/image";
import "../../portal.css";

export default function Home() {
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className="portal-root-wrapper">
      {/* Background Grids and Glow Orbs */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Main Content Container */}
      <div className="portal-container">
        {/* Header Section */}
        <header className="portal-header">
          <div className="portal-logo-container">
            <div className="portal-logo-glow" />
            <Image 
              src="/assets/images/logo11.webp" 
              alt="Road to Glory Logo" 
              className="portal-logo" 
              width={140} 
              height={140} 
              priority
            />
          </div>
          <h1 className="portal-title">ROAD TO GLORY</h1>
          <p className="portal-subtitle">
            Welcome to the Solo Tour portal. Manage your squad, outbid your rivals, and build your legacy.
          </p>
        </header>

        {/* Reusable Navigation Grid (3 Columns on Desktop) */}
        <div className="portal-grid cols-3">
          {/* Card 1: Tournament Guide */}
          <Link 
            href="/solo-tour/tournament-guide" 
            className="portal-card solo-tour"
            onMouseMove={handleMouseMove}
          >
            <div 
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/guide_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">Guides</span>
              <h2>TOURNAMENT GUIDE</h2>
              <p>
                Learn the rules, match structures, salary caps, and guidelines for the Solo Tour.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-circle-info"></i> Official Regulations
                </li>
                <li>
                  <i className="fa-solid fa-coins"></i> Salary Cap Details
                </li>
                <li>
                  <i className="fa-solid fa-shield"></i> Rules of Conduct
                </li>
              </ul>
              <div className="portal-card-action">
                View Guide <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>

          {/* Card 2: Career Mode */}
          <Link 
            href="/solo-tour/career-mode" 
            className="portal-card solo-tour"
            onMouseMove={handleMouseMove}
          >
            <div 
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/career_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">Market</span>
              <h2>CAREER MODE</h2>
              <p>
                Manage your squad list, sign new players, negotiate contracts, and scout top talent.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-users-gear"></i> Squad Management
                </li>
                <li>
                  <i className="fa-solid fa-handshake"></i> Transfer Window
                </li>
                <li>
                  <i className="fa-solid fa-address-card"></i> Player Profiles
                </li>
              </ul>
              <div className="portal-card-action">
                Enter Market <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>

          {/* Card 3: Manager Ranking */}
          <Link 
            href="/solo-tour/manager-ranking" 
            className="portal-card solo-tour"
            onMouseMove={handleMouseMove}
          >
            <div 
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/ranking_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">Ranks</span>
              <h2>MANAGER RANKINGS</h2>
              <p>
                Compare your ratings, active career points, and standings against other managers.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-list-ol"></i> Global Leaderboard
                </li>
                <li>
                  <i className="fa-solid fa-star"></i> Points Breakdown
                </li>
                <li>
                  <i className="fa-solid fa-chart-simple"></i> Career Statistics
                </li>
              </ul>
              <div className="portal-card-action">
                View Rankings <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>

          {/* Card 4: Trophy Cabinet */}
          <Link 
            href="/solo-tour/trophy-cabinet" 
            className="portal-card solo-tour"
            onMouseMove={handleMouseMove}
          >
            <div 
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/trophy_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">Legacy</span>
              <h2>TROPHY CABINET</h2>
              <p>
                Showcase your achievements, league trophies, and accolades earned across the seasons.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-medal"></i> Championship Awards
                </li>
                <li>
                  <i className="fa-solid fa-history"></i> Season Records
                </li>
                <li>
                  <i className="fa-solid fa-crown"></i> Special Accolades
                </li>
              </ul>
              <div className="portal-card-action">
                View Cabinet <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>

          {/* Card 5: Career Tournament */}
          <Link 
            href="/solo-tour/career-tournament" 
            className="portal-card solo-tour"
            onMouseMove={handleMouseMove}
          >
            <div 
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/tournament_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">Championship</span>
              <h2>CAREER TOURNAMENT</h2>
              <p>
                Enter active tournaments, check matches, submit starting lineups, and update scores.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-calendar-days"></i> Match Fixtures
                </li>
                <li>
                  <i className="fa-solid fa-people-group"></i> Active Lineups
                </li>
                <li>
                  <i className="fa-solid fa-circle-check"></i> Submit Scores
                </li>
              </ul>
              <div className="portal-card-action">
                Enter Arena <i className="fas fa-arrow-right"></i>
              </div>
            </div>
          </Link>
        </div>

        {/* Reusable Glass Panel Description */}
        <div className="glass-panel">
          <h2 className="section-heading">Your Road to Glory Journey</h2>
          <p className="section-text">
            Welcome to Road to Glory, the ultimate virtual football manager simulator. Scout real players, compete in live auctions, and manage your budget to lead your squad to the top tier of competitive leagues.
          </p>
          <div className="portal-features-grid">
            <div className="portal-feature-card">
              <i className="fa-solid fa-trophy"></i>
              <h3>Tournaments</h3>
              <p>Compete in regular tournaments with various formats. Test your strategic skills against other managers and claim rewards.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-chart-line"></i>
              <h3>Progression</h3>
              <p>Track your manager profile with detailed statistics, win percentages, and progression from rookie to hall-of-fame status.</p>
            </div>
          </div>
        </div>

        {/* Reusable Glowing CTA Banner */}
        <div className="portal-cta-banner">
          <div className="portal-cta-banner-content">
            <h3>Ready to Begin Your Journey?</h3>
            <p>Join other active managers competing in tournaments and building elite clubs today.</p>
            <Link href="#" className="portal-btn btn-primary">JOIN NOW</Link>
            <Link href="/" className="portal-btn btn-secondary">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.5rem' }}></i> RETURN TO PORTAL
            </Link>
          </div>
        </div>
      </div>

      {/* Cohesive Footer */}
      <footer className="portal-footer">
        <div className="portal-status-bar">
          <div className="status-item">
            <span className="status-indicator online"></span>
            Solo Tour: Active
          </div>
          <div className="status-item">
            Current Season: Active
          </div>
        </div>
        <div className="portal-copyright">
          &copy; 2026 Road to Glory. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
