"use client";

import Link from "next/link";

export default function CareerMode() {
  // Track cursor movement on cards to render mouse reflection glow
  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  const navLinks = [
    {
      href: "/solo-tour/registered-clubs",
      bgImg: "/assets/images/careerhome/C1.png",
      badge: "Clubs",
      title: "REGISTERED CLUBS",
      desc: "View all registered clubs, current squads, and active roster statistics competing in this season.",
      highlights: [
        { icon: "fa-solid fa-shield-halved", label: "Squad Lists" },
        { icon: "fa-solid fa-users", label: "Roster Size" },
        { icon: "fa-solid fa-circle-info", label: "Team Details" }
      ],
      action: "View Clubs",
      target: "_self"
    },
    {
      href: "/solo-tour/player-signing",
      bgImg: "/assets/images/careerhome/C2.png",
      badge: "Transfers",
      title: "PLAYER SIGNINGS",
      desc: "Bid on active transfer windows, sign free agents, and scout professional talent.",
      highlights: [
        { icon: "fa-solid fa-handshake", label: "Bidding Window" },
        { icon: "fa-solid fa-user-plus", label: "Sign Players" },
        { icon: "fa-solid fa-gavel", label: "Live Auctions" }
      ],
      action: "Scout Talent",
      target: "_self"
    },
    {
      href: "/solo-tour/managers",
      bgImg: "/assets/images/careerhome/C3.png",
      badge: "Tacticians",
      title: "MANAGERS DIRECTORY",
      desc: "Inspect tactical sheets, manager win/loss ratios, and active career points.",
      highlights: [
        { icon: "fa-solid fa-user-tie", label: "Active Managers" },
        { icon: "fa-solid fa-file-invoice", label: "Tactical Sheets" },
        { icon: "fa-solid fa-chart-line", label: "Win Records" }
      ],
      action: "View Managers",
      target: "_self"
    },
    {
      href: "/solo-tour/player-database",
      bgImg: "/assets/images/careerhome/C4.png",
      badge: "Database",
      title: "PLAYERS DATABASE",
      desc: "Inspect player attributes, contract values, levels, and valuation histories league-wide.",
      highlights: [
        { icon: "fa-solid fa-users", label: "All Players" },
        { icon: "fa-solid fa-star", label: "Card Tiers" },
        { icon: "fa-solid fa-chart-line", label: "Valuation History" }
      ],
      action: "Open Database",
      target: "_self"
    },
    {
      href: "https://1drv.ms/x/s!Al82cgGcN1PEgoYarazC3YrU44dUUA?e=y8of4J",
      bgImg: "/assets/images/careerhome/C5.png",
      badge: "Finance",
      title: "SALARY LEDGER",
      desc: "Monitor team payrolls, contract values, wage balances, and salary caps.",
      highlights: [
        { icon: "fa-solid fa-file-invoice-dollar", label: "Budget Sheets" },
        { icon: "fa-solid fa-wallet", label: "Salary Balances" },
        { icon: "fa-solid fa-check-double", label: "Caps Verification" }
      ],
      action: "Open Ledger",
      target: "_blank"
    }
  ];

  return (
    <div className="portal-root-wrapper">
      {/* Background Grids and Glow Orbs */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Main Content Container */}
      <div className="portal-container">
        {/* Navigation / Back Button */}
        <div style={{ width: "100%" }}>
          <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
            <i className="fas fa-arrow-left"></i> Back to Dashboard
          </Link>
        </div>

        {/* Header Section */}
        <header className="portal-header">
          <h1 className="portal-title">CAREER MODE</h1>
          <p className="portal-subtitle">
            Welcome to the Career Mode dashboard. Manage your squad list, sign new players, negotiate contracts, and scout top talent.
          </p>
        </header>

        {/* Reusable Navigation Grid (3 Columns on Desktop) */}
        <div className="portal-grid cols-3" style={{ width: "100%" }}>
          {navLinks.map((item, index) => (
            <Link 
              key={index}
              href={item.href} 
              className="portal-card solo-tour"
              onMouseMove={handleMouseMove}
              target={item.target}
              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
            >
              <div 
                className="portal-card-bg"
                style={{ backgroundImage: `url('${item.bgImg}')` }}
              />
              <div className="portal-card-glow" />
              <div className="portal-card-overlay" />
              <div className="portal-card-content">
                <span className="portal-card-badge">{item.badge}</span>
                <h2>{item.title}</h2>
                <p>{item.desc}</p>
                <ul className="portal-card-highlights">
                  {item.highlights.map((hl, hlIdx) => (
                    <li key={hlIdx}>
                      <i className={hl.icon}></i> {hl.label}
                    </li>
                  ))}
                </ul>
                <div className="portal-card-action">
                  {item.action} <i className="fas fa-arrow-right"></i>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Reusable Glass Panel Description */}
        <div className="glass-panel">
          <h2 className="section-heading">Your Career Journey</h2>
          <p className="section-text">
            Embark on an immersive career experience in our football management simulation. Choose your path, develop your skills, and lead your team to glory through strategic decisions, player management, and tactical brilliance.
          </p>
          <div className="portal-features-grid">
            <div className="portal-feature-card">
              <i className="fa-solid fa-trophy"></i>
              <h3>Managerial Excellence</h3>
              <p>Unlock trophies, raise your rating, and secure individual honors in the Hall of Fame.</p>
            </div>
            <div className="portal-feature-card">
              <i className="fa-solid fa-chart-line"></i>
              <h3>Real-Time Progression</h3>
              <p>Track your club finances, player availability, and match performance stats dynamically.</p>
            </div>
          </div>
        </div>

        {/* Reusable Glowing CTA Banner */}
        <div className="portal-cta-banner">
          <div className="portal-cta-banner-content">
            <h3>Ready to Manage Your Club?</h3>
            <p>Scout active players, manage rosters, check health status, and lead your team to glory.</p>
            <Link href="/solo-tour" className="portal-btn btn-secondary">
              <i className="fa-solid fa-arrow-left" style={{ marginRight: '0.5rem' }}></i> RETURN TO DASHBOARD
            </Link>
          </div>
        </div>
      </div>

      {/* Cohesive Footer */}
      <footer className="portal-footer">
        <div className="portal-status-bar">
          <div className="status-item">
            <span className="status-indicator online"></span>
            Career Mode: Active
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
