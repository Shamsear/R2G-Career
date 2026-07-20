"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "../portal.css";
import { fetchActiveSeason, fetchAllPlayersDirectory } from "@/utils/solo/serverActions";

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [seasonNum, setSeasonNum] = useState<number | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [season, members] = await Promise.all([
          fetchActiveSeason(),
          fetchAllPlayersDirectory()
        ]);
        if (season && season.season_number) {
          setSeasonNum(season.season_number);
        }
        if (members) {
          setMemberCount(members.length);
        }
      } catch (e) {
        console.error("Failed to load active portal stats:", e);
      }
    }
    loadData();
  }, []);

  // Mouse parallax on cards
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  // Staggered entrance animations
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll(".animate-entrance").forEach((el) => {
        el.classList.add("animate-entrance-active");
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="portal-root-wrapper">
      {/* Ambient background */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Floating particles */}
      <div className="portal-particles" aria-hidden="true">
        {[8, 20, 36, 52, 68, 82].map((left, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${left}%`,
              animationDuration: `${18 + i * 4}s`,
              animationDelay: `${i * 2.5}s`,
            }}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="portal-container main-portal-page" ref={containerRef}>

        {/* Hero Header */}
        <div className="portal-header">
          <div
            className="portal-logo-container animate-entrance"
            style={{ animationDelay: "0ms" }}
          >
            <div className="portal-logo-glow" />
            <Image
              src="/assets/images/logo11.webp"
              alt="Road to Glory Logo"
              width={130}
              height={130}
              className="portal-logo"
              priority
            />
          </div>

          <div
            className="portal-page-badge animate-entrance"
            style={{ animationDelay: "100ms" }}
          >
            <i className="fa-solid fa-futbol" />
            {seasonNum !== null ? `Season ${seasonNum} — Now Live` : "Active Season — Now Live"}
          </div>

          <h1
            className="portal-title animate-entrance"
            style={{ animationDelay: "200ms" }}
          >
            ROAD TO GLORY
          </h1>
          <p
            className="portal-subtitle animate-entrance"
            style={{ animationDelay: "300ms" }}
          >
            The ultimate virtual football manager simulator. Scout real players,
            outbid rivals in live auctions, and lead your squad to glory.
          </p>
        </div>

        {/* Stats ribbon */}
        <div
          className="portal-stats-ribbon animate-entrance"
          style={{ animationDelay: "400ms" }}
        >
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
          <Link
            href="/members"
            className="stat-pill clickable-pill"
            style={{ textDecoration: "none" }}
          >
            <i className="fa-solid fa-users" style={{ color: "#c084fc" }} />
            <span style={{ color: "#c084fc", fontWeight: 600 }}>{memberCount > 0 ? `${memberCount} Members Directory` : "Members Directory"}</span>
          </Link>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Live Now</span>
          </div>
        </div>

        {/* Portal cards */}
        <style>{`
          .stat-pill.clickable-pill {
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 4px;
            border: 1px solid rgba(168, 85, 247, 0.15);
            background: rgba(168, 85, 247, 0.05);
          }
          .stat-pill.clickable-pill:hover {
            background: rgba(168, 85, 247, 0.12);
            border-color: rgba(168, 85, 247, 0.4);
            transform: scale(1.03);
          }
          .portal-grid.cols-5 {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }
          .portal-grid.cols-5 > *:nth-child(5) {
            grid-column: span 2;
          }
          @media (max-width: 768px) {
            .portal-grid.cols-5 {
              grid-template-columns: 1fr;
              gap: 1.5rem;
            }
            .portal-grid.cols-5 > *:nth-child(5) {
              grid-column: span 1;
            }
          }
        `}</style>
        <div className="portal-grid cols-5 animate-entrance" style={{ animationDelay: "520ms" }}>

          {/* Solo Tour */}
          <Link
            href="/solo-tour"
            className="portal-card solo-tour"
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
                <i className="fa-solid fa-bolt" />
                Career Mode
              </span>
              <h2>CAREER TOUR</h2>
              <p>
                Build your legacy as an individual manager. Scout world-class
                players, outbid rivals in live auctions, and conquer the league.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-magnifying-glass" />
                  Scout &amp; Recruit Real Players
                </li>
                <li>
                  <i className="fa-solid fa-gavel" />
                  Live Bidding &amp; Auctions
                </li>
                <li>
                  <i className="fa-solid fa-trophy" />
                  Individual Manager Standings
                </li>
              </ul>
              <div className="portal-card-action">
                Enter Portal <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Special Tour */}
          <Link
            href="/special-tour"
            className="portal-card special-tour"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/tournament_bg.png')" }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge" style={{ backgroundColor: "rgba(168, 85, 247, 0.15)", color: "#c084fc", borderColor: "rgba(168, 85, 247, 0.3)" }}>
                <i className="fa-solid fa-wand-magic-sparkles" />
                Special Tour
              </span>
              <h2>SPECIAL TOUR</h2>
              <p>
                Exclusive invitational tournaments for guest clubs. Track participated teams roster, combined standings table, and match fixtures calendar.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-users" />
                  Participating Guest Clubs
                </li>
                <li>
                  <i className="fa-solid fa-calendar-days" />
                  Combined Series Portal
                </li>
                <li>
                  <i className="fa-solid fa-ranking-star" />
                  Invitational Standings
                </li>
              </ul>
              <div className="portal-card-action">
                Enter Special Tour <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Team Tournament — Coming Soon */}
          <div
            className="portal-card team-tour coming-soon-card"
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
                <i className="fa-solid fa-clock" />
                Coming Soon
              </span>
              <h2>TEAM TOURNAMENT</h2>
              <p>
                Unite with your squad. Coordinate strategies, compete in massive
                multi-team knockout stages, and claim the ultimate trophy.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-users" />
                  Multi-player Squads
                </li>
                <li>
                  <i className="fa-solid fa-shield-halved" />
                  Team vs Team Matchups
                </li>
                <li>
                  <i className="fa-solid fa-sitemap" />
                  Knockout Bracket Stages
                </li>
              </ul>
              <div className="portal-card-action disabled">
                Coming Soon <i className="fas fa-lock" />
              </div>
            </div>
          </div>

          {/* Master of Prediction — Coming Soon */}
          <div
            className="portal-card prediction-tour coming-soon-card"
            aria-disabled="true"
            tabIndex={-1}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/ranking_bg.png')" }}
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
                <i className="fa-solid fa-clock" />
                Coming Soon
              </span>
              <h2>MASTER OF PREDICTION</h2>
              <p>
                Forecast match outcomes, predict tournament champions, and compete with other managers on the prediction leaderboard.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-square-poll-vertical" />
                  Matchday Forecasts
                </li>
                <li>
                  <i className="fa-solid fa-award" />
                  Leaderboard Rankings
                </li>
                <li>
                  <i className="fa-solid fa-coins" />
                  Exclusive Rewards
                </li>
              </ul>
              <div className="portal-card-action disabled">
                Coming Soon <i className="fas fa-lock" />
              </div>
            </div>
          </div>

          {/* R2G World Series (RWS) */}
          <Link
            href="/rws"
            className="portal-card rws-tour"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/rws_bg.png')" }}
              onError={(e) => {
                e.currentTarget.style.backgroundImage = "url('/assets/images/portal/solo_bg.png')";
              }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-crown" />
                World Series
              </span>
              <h2>R2G WORLD SERIES</h2>
              <p>
                The ultimate championship arena. Inspect nominated candidates,
                track matches/brackets, and browse the trophy highlights album.
              </p>
              <ul className="portal-card-highlights">
                <li>
                  <i className="fa-solid fa-user-check" />
                  Selected Candidates
                </li>
                <li>
                  <i className="fa-solid fa-calendar-days" />
                  Series Fixtures &amp; Brackets
                </li>
                <li>
                  <i className="fa-solid fa-images" />
                  Trophy &amp; Moments Album
                </li>
              </ul>
              <div className="portal-card-action">
                Enter RWS Portal <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>
        </div>

        {/* Features panel */}
        <div className="glass-panel animate-entrance" style={{ animationDelay: "650ms" }}>
          <h2 className="section-heading">Why Road to Glory?</h2>
          <p className="section-text">
            The most immersive virtual football management experience — built for
            real strategy, real competition, and real glory. Every decision matters.
          </p>
          <div className="portal-features-grid">
            <div className="portal-feature-card">
              <i className="fa-solid fa-gavel" />
              <h3>Live Auctions</h3>
              <p>Compete in real-time blind bidding windows to secure top talent before your rivals.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-chart-line" />
              <h3>Manager Progression</h3>
              <p>Build your reputation from rookie to legend with a deep rating and ranking system.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-trophy" />
              <h3>Multi-Season Legacy</h3>
              <p>Compete across 7 seasons of trophies, records, and historical achievements.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-users" />
              <h3>Real Players</h3>
              <p>Draft, trade, and manage real football stars with accurate valuations and stats.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="portal-footer">
        <div className="portal-footer-brand">
          <Image
            src="/assets/images/logo11.webp"
            alt="R2G"
            width={28}
            height={28}
            className="portal-footer-logo"
          />
          <span className="portal-footer-name">Road to Glory</span>
        </div>
        <div className="portal-status-bar">
          <div className="status-item">
            <span className="status-indicator online" />
            Server: Online
          </div>
          <div className="status-item">
            {seasonNum !== null ? `Season ${seasonNum}: Active` : "Season: Active"}
          </div>
        </div>
        <div className="portal-footer-social">
          <a href="#" aria-label="Instagram"><i className="fab fa-instagram" /></a>
          <a href="#" aria-label="Twitter"><i className="fab fa-twitter" /></a>
          <a href="#" aria-label="Discord"><i className="fab fa-discord" /></a>
        </div>
        <div className="portal-copyright">
          &copy; 2026 Road to Glory. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
