"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import "../portal.css";

export default function Home() {
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  // Trigger staggered entrance animations on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll(".animate-entrance").forEach((el) => {
        el.classList.add("animate-entrance-active");
      });
    });
  }, []);

  return (
    <div className="portal-root-wrapper">
      {/* Floating Particles */}
      <div className="portal-particles" aria-hidden="true">
        <div className="particle" style={{ left: "8%", animationDuration: "25s", animationDelay: "0s" }} />
        <div className="particle" style={{ left: "22%", animationDuration: "32s", animationDelay: "2s" }} />
        <div className="particle" style={{ left: "40%", animationDuration: "22s", animationDelay: "5s" }} />
        <div className="particle" style={{ left: "58%", animationDuration: "28s", animationDelay: "1s" }} />
        <div className="particle" style={{ left: "75%", animationDuration: "35s", animationDelay: "4s" }} />
        <div className="particle" style={{ left: "90%", animationDuration: "20s", animationDelay: "7s" }} />
      </div>

      {/* Background Grids and Glow Orbs */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Main Content Container */}
      <div className="portal-container">
        {/* Portal Header */}
        <div className="portal-header">
          <div className="portal-logo-container animate-entrance" style={{ animationDelay: "0ms" }}>
            <div className="portal-logo-glow" />
            <Image
              src="/assets/images/logo11.webp"
              alt="R2G Logo"
              width={140}
              height={140}
              className="portal-logo"
              priority
            />
          </div>
          <h1 className="portal-title animate-entrance" style={{ animationDelay: "150ms" }}>
            ROAD TO GLORY
          </h1>
          <p className="portal-subtitle animate-entrance" style={{ animationDelay: "300ms" }}>
            Choose your path to football immortality. Select a portal to begin.
          </p>
        </div>

        {/* Stats Ribbon */}
        <div className="portal-stats-ribbon animate-entrance" style={{ animationDelay: "420ms" }}>
          <div className="stat-pill">
            <i className="fa-solid fa-trophy" />
            <span>12 Seasons</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-futbol" />
            <span>500+ Players</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Live Now</span>
          </div>
        </div>

        {/* Portal Cards Grid */}
        <div className="portal-grid">
          {/* Solo Tour Card */}
          <Link
            href="/solo-tour"
            className="portal-card solo-tour animate-entrance"
            style={{ animationDelay: "550ms" }}
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/solo_bg.png')" }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-bolt" style={{ marginRight: "0.4rem", fontSize: "0.65rem" }} />
                Solo Mode
              </span>
              <h2>SOLO TOUR</h2>
              <p>
                Build your legacy as an individual manager. Scout world-class players, outbid rivals in live auctions, and conquer the league.
              </p>
              <ul className="portal-card-highlights">
                <li><i className="fa-solid fa-magnifying-glass" /> Scout &amp; Recruit Real Players</li>
                <li><i className="fa-solid fa-gavel" /> Live Bidding &amp; Auctions</li>
                <li><i className="fa-solid fa-trophy" /> Individual Manager Standings</li>
              </ul>
              <div className="portal-card-action">
                Enter Portal <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Team Tournament Card — Coming Soon */}
          <div
            className="portal-card team-tour coming-soon-card animate-entrance"
            style={{ animationDelay: "700ms" }}
            aria-disabled="true"
            tabIndex={-1}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/team_bg.png')" }}
            />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="coming-soon-lock-overlay">
              <div className="lock-icon-wrapper">
                <i className="fa-solid fa-lock" />
              </div>
            </div>
            <div className="portal-card-content">
              <span className="portal-card-badge coming-soon-badge">
                <i className="fa-solid fa-clock" style={{ marginRight: "0.4rem", fontSize: "0.65rem" }} />
                Coming Soon
              </span>
              <h2>TEAM TOURNAMENT</h2>
              <p>
                Unite with your squad. Coordinate strategies, compete in massive multi-team knockout stages, and claim the ultimate trophy.
              </p>
              <ul className="portal-card-highlights">
                <li><i className="fa-solid fa-users" /> Multi-player Squads</li>
                <li><i className="fa-solid fa-shield-halved" /> Team vs Team Matchups</li>
                <li><i className="fa-solid fa-sitemap" /> Knockout Bracket Stages</li>
              </ul>
              <div className="portal-card-action disabled">
                Coming Soon <i className="fas fa-lock" style={{ marginLeft: "0.5rem" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Portal Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-brand animate-entrance" style={{ animationDelay: "850ms" }}>
          <Image
            src="/assets/images/logo11.webp"
            alt="R2G"
            width={28}
            height={28}
            className="portal-footer-logo"
          />
          <span className="portal-footer-name">Road to Glory</span>
        </div>
        <div className="portal-status-bar animate-entrance" style={{ animationDelay: "900ms" }}>
          <div className="status-item">
            <span className="status-indicator online" />
            Server: Online
          </div>
          <div className="status-item">
            Season: Active
          </div>
        </div>
        <div className="portal-footer-social animate-entrance" style={{ animationDelay: "950ms" }}>
          <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
          <a href="#" aria-label="Twitter"><i className="fab fa-twitter" /></a>
          <a href="#" aria-label="Discord"><i className="fab fa-discord" /></a>
        </div>
        <div className="portal-copyright animate-entrance" style={{ animationDelay: "1000ms" }}>
          &copy; 2026 Road to Glory. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
