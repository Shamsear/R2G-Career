"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import "../../../portal.css";

const NAV_CARDS = [
  {
    href: "/solo-tour/registered-clubs",
    bgImg: "/assets/images/careerhome/C1.png",
    badge: "Clubs",
    badgeIcon: "fa-solid fa-shield-halved",
    title: "REGISTERED CLUBS",
    desc: "View all registered clubs, current squads, and active roster statistics competing this season.",
    highlights: [
      { icon: "fa-solid fa-shield-halved", label: "Squad Lists" },
      { icon: "fa-solid fa-users", label: "Roster Size" },
      { icon: "fa-solid fa-circle-info", label: "Team Details" },
    ],
    action: "View Clubs",
    target: "_self",
    delay: 0,
  },
  {
    href: "/solo-tour/player-signing",
    bgImg: "/assets/images/careerhome/C2.png",
    badge: "Transfers",
    badgeIcon: "fa-solid fa-handshake",
    title: "PLAYER SIGNINGS",
    desc: "Bid on active transfer windows, sign free agents, and scout professional talent.",
    highlights: [
      { icon: "fa-solid fa-handshake", label: "Bidding Window" },
      { icon: "fa-solid fa-user-plus", label: "Sign Players" },
      { icon: "fa-solid fa-gavel", label: "Live Auctions" },
    ],
    action: "Scout Talent",
    target: "_self",
    delay: 80,
  },
  {
    href: "/solo-tour/managers",
    bgImg: "/assets/images/careerhome/C3.png",
    badge: "Tacticians",
    badgeIcon: "fa-solid fa-user-tie",
    title: "MANAGERS DIRECTORY",
    desc: "Inspect tactical sheets, manager win/loss ratios, and active career points.",
    highlights: [
      { icon: "fa-solid fa-user-tie", label: "Active Managers" },
      { icon: "fa-solid fa-file-invoice", label: "Tactical Sheets" },
      { icon: "fa-solid fa-chart-line", label: "Win Records" },
    ],
    action: "View Managers",
    target: "_self",
    delay: 160,
  },
  {
    href: "/solo-tour/player-database",
    bgImg: "/assets/images/careerhome/C4.png",
    badge: "Database",
    badgeIcon: "fa-solid fa-database",
    title: "PLAYERS DATABASE",
    desc: "Inspect player attributes, contract values, levels, and valuation histories league-wide.",
    highlights: [
      { icon: "fa-solid fa-users", label: "All Players" },
      { icon: "fa-solid fa-star", label: "Card Tiers" },
      { icon: "fa-solid fa-chart-line", label: "Valuation History" },
    ],
    action: "Open Database",
    target: "_self",
    delay: 240,
  },
  {
    href: "https://1drv.ms/x/s!Al82cgGcN1PEgoYarazC3YrU44dUUA?e=y8of4J",
    bgImg: "/assets/images/careerhome/C5.png",
    badge: "Finance",
    badgeIcon: "fa-solid fa-file-invoice-dollar",
    title: "SALARY LEDGER",
    desc: "Monitor team payrolls, contract values, wage balances, and salary caps.",
    highlights: [
      { icon: "fa-solid fa-file-invoice-dollar", label: "Budget Sheets" },
      { icon: "fa-solid fa-wallet", label: "Salary Balances" },
      { icon: "fa-solid fa-check-double", label: "Caps Verification" },
    ],
    action: "Open Ledger",
    target: "_blank",
    delay: 320,
  },
];

export default function CareerMode() {
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      document.querySelectorAll(".animate-entrance").forEach((el) =>
        el.classList.add("animate-entrance-active")
      );
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb animate-entrance" style={{ animationDelay: "0ms" }}>
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge animate-entrance" style={{ animationDelay: "80ms" }}>
            <i className="fa-solid fa-briefcase" />
            Career Mode
          </div>
          <h1 className="portal-title animate-entrance" style={{ animationDelay: "160ms" }}>
            CAREER MODE
          </h1>
          <p className="portal-subtitle animate-entrance" style={{ animationDelay: "240ms" }}>
            Manage your squad list, sign new players, negotiate contracts, and scout top talent.
          </p>
        </div>

        {/* Nav cards */}
        <div className="portal-grid cols-3">
          {NAV_CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="portal-card solo-tour animate-entrance"
              style={{ animationDelay: `${350 + card.delay}ms` }}
              onMouseMove={handleMouseMove}
              target={card.target}
              rel={card.target === "_blank" ? "noopener noreferrer" : undefined}
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

        {/* Info panel */}
        <div className="glass-panel animate-entrance" style={{ animationDelay: "800ms" }}>
          <h2 className="section-heading">Your Career Journey</h2>
          <p className="section-text">
            Embark on an immersive career experience in our football management simulation. Choose
            your path, develop your skills, and lead your team to glory through strategic decisions,
            player management, and tactical brilliance.
          </p>
          <div className="portal-features-grid">
            <div className="portal-feature-card">
              <i className="fa-solid fa-trophy" />
              <h3>Managerial Excellence</h3>
              <p>Unlock trophies, raise your rating, and secure individual honors in the Hall of Fame.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-chart-line" />
              <h3>Real-Time Progression</h3>
              <p>Track your club finances, player availability, and match performance stats dynamically.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="portal-cta-banner animate-entrance" style={{ animationDelay: "940ms" }}>
          <div className="portal-cta-banner-content">
            <h3>Ready to Manage Your Club?</h3>
            <p>Scout active players, manage rosters, check health status, and lead your team to glory.</p>
            <Link href="/solo-tour" className="portal-btn btn-secondary">
              <i className="fa-solid fa-arrow-left" /> Return to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <footer className="portal-footer">
        <div className="portal-status-bar">
          <div className="status-item">
            <span className="status-indicator online" />
            Career Mode: Active
          </div>
          <div className="status-item">Current Season: Active</div>
        </div>
        <div className="portal-copyright">&copy; 2026 Road to Glory. All rights reserved.</div>
      </footer>
    </div>
  );
}
