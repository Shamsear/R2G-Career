"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { fetchActiveSeason } from "@/utils/solo/serverActions";
import "../../portal.css";

const NAV_CARDS = [
  {
    href: "/solo-tour/tournament-guide",
    bgImg: "/assets/images/portal/guide_bg.png",
    badge: "Guides",
    badgeIcon: "fa-solid fa-book-open",
    title: "TOURNAMENT GUIDE",
    desc: "Learn the rules, match structures, salary caps, and guidelines for the Career Tour.",
    highlights: [
      { icon: "fa-solid fa-circle-info", label: "Official Regulations" },
      { icon: "fa-solid fa-coins", label: "Salary Cap Details" },
      { icon: "fa-solid fa-shield", label: "Rules of Conduct" },
    ],
    action: "View Guide",
    delay: 0,
  },
  {
    href: "/solo-tour/career-mode",
    bgImg: "/assets/images/portal/career_bg.png",
    badge: "Market",
    badgeIcon: "fa-solid fa-briefcase",
    title: "CAREER MODE",
    desc: "Manage your squad list, sign new players, negotiate contracts, and scout top talent.",
    highlights: [
      { icon: "fa-solid fa-users-gear", label: "Squad Management" },
      { icon: "fa-solid fa-handshake", label: "Transfer Window" },
      { icon: "fa-solid fa-address-card", label: "Player Profiles" },
    ],
    action: "Enter Market",
    delay: 80,
  },
  {
    href: "/solo-tour/manager-ranking",
    bgImg: "/assets/images/portal/ranking_bg.png",
    badge: "Ranks",
    badgeIcon: "fa-solid fa-ranking-star",
    title: "MANAGER RANKINGS",
    desc: "Compare your ratings, active career points, and standings against other managers.",
    highlights: [
      { icon: "fa-solid fa-list-ol", label: "Global Leaderboard" },
      { icon: "fa-solid fa-star", label: "Points Breakdown" },
      { icon: "fa-solid fa-chart-simple", label: "Career Statistics" },
    ],
    action: "View Rankings",
    delay: 160,
  },
  {
    href: "/solo-tour/trophy-cabinet",
    bgImg: "/assets/images/portal/trophy_bg.png",
    badge: "Legacy",
    badgeIcon: "fa-solid fa-trophy",
    title: "TROPHY CABINET",
    desc: "Showcase your achievements, league trophies, and accolades earned across the seasons.",
    highlights: [
      { icon: "fa-solid fa-medal", label: "Championship Awards" },
      { icon: "fa-solid fa-history", label: "Season Records" },
      { icon: "fa-solid fa-crown", label: "Special Accolades" },
    ],
    action: "View Cabinet",
    delay: 240,
  },
  {
    href: "/solo-tour/career-tournament",
    bgImg: "/assets/images/portal/tournament_bg.png",
    badge: "Championship",
    badgeIcon: "fa-solid fa-sitemap",
    title: "CAREER TOURNAMENT",
    desc: "Enter active tournaments, check matches, submit starting lineups, and update scores.",
    highlights: [
      { icon: "fa-solid fa-calendar-days", label: "Match Fixtures" },
      { icon: "fa-solid fa-people-group", label: "Active Lineups" },
      { icon: "fa-solid fa-circle-check", label: "Submit Scores" },
    ],
    action: "Enter Arena",
    delay: 320,
  },
];

export default function SoloTourDashboard() {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  const [seasonNum, setSeasonNum] = useState<number>(7);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll(".animate-entrance").forEach((el) =>
        el.classList.add("animate-entrance-active")
      );
    });

    async function loadSeason() {
      try {
        const season = await fetchActiveSeason();
        if (season && season.season_number) {
          setSeasonNum(season.season_number);
        }
      } catch (e) {
        console.error("Failed to load active season:", e);
      }
    }
    loadSeason();

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-particles" aria-hidden="true">
        {[10, 30, 55, 75, 90].map((left, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${left}%`,
              animationDuration: `${20 + i * 3}s`,
              animationDelay: `${i * 2}s`,
            }}
          />
        ))}
      </div>

      <div className="portal-container">
        {/* Back breadcrumb */}
        <div className="portal-breadcrumb animate-entrance" style={{ animationDelay: "0ms", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.25)", color: "#10b981" }}>
            <i className="fa-solid fa-user-gear" /> Admin Console
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-logo-container animate-entrance" style={{ animationDelay: "30ms" }}>
            <div className="portal-logo-glow" />
            <Image
              src="/assets/images/logo11.webp"
              alt="Road to Glory Logo"
              className="portal-logo"
              width={110}
              height={110}
              priority
            />
          </div>
          <div className="portal-page-badge animate-entrance" style={{ animationDelay: "60ms" }}>
            <i className="fa-solid fa-bolt" />
            Career Tour Mode
          </div>
          <h1 className="portal-title animate-entrance" style={{ animationDelay: "90ms" }}>
            ROAD TO GLORY
          </h1>
          <p className="portal-subtitle animate-entrance" style={{ animationDelay: "120ms" }}>
            Manage your squad, outbid your rivals, and build your legacy across every season.
          </p>
        </div>

        {/* Stats ribbon */}
        <div className="portal-stats-ribbon animate-entrance" style={{ animationDelay: "150ms" }}>
          <div className="stat-pill">
            <i className="fa-solid fa-trophy" />
            <span>Season {seasonNum}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-users" />
            <span>28 Managers</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-futbol" />
            <span>500+ Players</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Season Active</span>
          </div>
        </div>

        {/* Navigation cards */}
        <div className="portal-grid cols-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className={`portal-card solo-tour animate-entrance`}
              style={{ animationDelay: `${180 + card.delay / 2}ms` }}
              onMouseMove={handleMouseMove}
            >
              <div
                className="portal-card-bg"
                style={{ backgroundImage: `url('${card.bgImg}')` }}
              />
              <div className="portal-card-shimmer" />
              <div className="portal-card-glow" />
              <div className="portal-card-overlay" />
              <div className="portal-card-content">
                <span className="portal-card-badge">
                  <i className={card.badgeIcon} />
                  {card.badge}
                </span>
                <h2>{card.title}</h2>
                <p>{card.desc}</p>
                <ul className="portal-card-highlights">
                  {card.highlights.map((hl) => (
                    <li key={hl.label}>
                      <i className={hl.icon} />
                      {hl.label}
                    </li>
                  ))}
                </ul>
                <div className="portal-card-action">
                  {card.action} <i className="fas fa-arrow-right" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Features panel */}
        <div className="glass-panel animate-entrance" style={{ animationDelay: "300ms" }}>
          <h2 className="section-heading">Your Road to Glory Journey</h2>
          <p className="section-text">
            Welcome to Road to Glory — the ultimate virtual football manager simulator. Scout real
            players, compete in live auctions, and manage your budget to lead your squad to the top
            tier of competitive leagues.
          </p>
          <div className="portal-features-grid">
            <div className="portal-feature-card">
              <i className="fa-solid fa-trophy" />
              <h3>Tournaments</h3>
              <p>Compete in regular tournaments with various formats and claim rewards.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-chart-line" />
              <h3>Progression</h3>
              <p>Track your manager profile with detailed statistics and progression metrics.</p>
            </div>
          </div>
        </div>

        {/* CTA banner */}
        <div className="portal-cta-banner animate-entrance" style={{ animationDelay: "350ms" }}>
          <div className="portal-cta-banner-content">
            <h3>Ready to Begin Your Journey?</h3>
            <p>Join active managers competing in tournaments and building elite clubs today.</p>
            <div className="portal-cta-banner-actions">
              <Link href="/solo-tour/career-mode" className="portal-btn btn-primary">
                <i className="fa-solid fa-rocket" /> Start Now
              </Link>
              <Link href="/" className="portal-btn btn-secondary">
                <i className="fa-solid fa-arrow-left" /> Return to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
