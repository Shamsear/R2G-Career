"use client";

import { Suspense, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import "../../../portal.css";
import "./admin.css";
import { logoutSoloAdmin } from "@/utils/solo/serverActions";

const ADMIN_MODULES = [
  {
    href: "/solo-tour/admin/financial-rules",
    icon: "fa-solid fa-scale-balanced",
    accent: "financial",
    title: "Financial Templates",
    desc: "Configure universal rules templates — match, tournament & season bonuses and fines.",
  },
  {
    href: "/solo-tour/admin/clubs",
    icon: "fa-solid fa-shield-halved",
    accent: "tournaments",
    title: "Clubs Database",
    desc: "Create and edit club franchises, customize club names, and upload club logos.",
  },
  {
    href: "/solo-tour/admin/managers",
    icon: "fa-solid fa-user-gear",
    accent: "clubs",
    title: "Managers & Wallets",
    desc: "Register managers, edit wallet balances, squad ratings, stats, and apply ban fines.",
  },
  {
    href: "/solo-tour/admin/medals",
    icon: "fa-solid fa-medal",
    accent: "players",
    title: "Medals & EXP Alignment",
    desc: "Cross-check members stats, align normal experience gameplay points, and backfill medals.",
  },
  {
    href: "/solo-tour/admin/tournaments",
    icon: "fa-solid fa-sitemap",
    accent: "tournaments",
    title: "Tournaments",
    desc: "Create tournament stages, link financial templates, and manage structures.",
  },
  {
    href: "/solo-tour/admin/fixtures",
    icon: "fa-solid fa-calendar-days",
    accent: "fixtures",
    title: "Fixtures Manager",
    desc: "Generate matchup calendars, edit live scores, and manage round schedules.",
  },
  {
    href: "/solo-tour/admin/players",
    icon: "fa-solid fa-people-group",
    accent: "players",
    title: "Players & Contracts",
    desc: "Manage rosters, toggle suspensions with fines, and sign player contracts.",
  },
  {
    href: "/solo-tour/admin/auction",
    icon: "fa-solid fa-gavel",
    accent: "nominees",
    title: "Player Auctions & Transfers",
    desc: "Auction free agents, execute transfers, swaps, releases — all squad management in one hub.",
  },
  {
    href: "/solo-tour/admin/nominees",
    icon: "fa-solid fa-user-check",
    accent: "nominees",
    title: "RWS Nominees",
    desc: "Nominate and confirm elite managers for the R2G World Series invitational.",
  },
  {
    href: "/solo-tour/admin/album",
    icon: "fa-solid fa-images",
    accent: "album",
    title: "RWS Photo Album",
    desc: "Upload ceremony snapshots and draft board photos to the RWS gallery.",
  },
  {
    href: "/solo-tour/admin/special-album",
    icon: "fa-solid fa-camera-retro",
    accent: "album",
    title: "Special Tour Album",
    desc: "Upload ceremony snapshots, matchday photos, and trophy highlights to Special Tournaments.",
  },
  {
    href: "/solo-tour/admin/awards",
    icon: "fa-solid fa-award",
    accent: "awards",
    title: "Player Awards",
    desc: "Disburse individual & category honors with automatic wallet rewards.",
  },
  {
    href: "/solo-tour/admin/financial-ops",
    icon: "fa-solid fa-wallet",
    accent: "finops",
    title: "Financial Operations",
    desc: "Execute salary payouts, apply templates, and run custom adjustments.",
  },
  {
    href: "/solo-tour/admin/seasons",
    icon: "fa-solid fa-calendar-plus",
    accent: "seasons",
    title: "Season Management",
    desc: "Create new seasons, activate/deactivate seasons, and carry over managers/wallets.",
  },
  {
    href: "/solo-tour/admin/logs",
    icon: "fa-solid fa-receipt",
    accent: "finops",
    title: "Admin Audit Logs",
    desc: "Inspect real-time system logs of administrative actions, edits, and database mutations.",
  },
  {
    href: "/solo-tour/admin/divisions",
    icon: "fa-solid fa-layer-group",
    accent: "tournaments",
    title: "Divisions & Relegations",
    desc: "Configure division tiers, promote/relegate teams, and review transition setups between seasons.",
  },
  {
    href: "/solo-tour/admin/rule-violations",
    icon: "fa-solid fa-gavel",
    accent: "nominees",
    title: "Rule Violations",
    desc: "Record rule violations for specific matches, apply fines, and view discipline ledger.",
  },
  {
    href: "/solo-tour/admin/appearances",
    icon: "fa-solid fa-shirt",
    accent: "players",
    title: "Appearances Ledger",
    desc: "Log matchday squad appearances, check matches played, and process/revert salary changes.",
  },
];

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const year = searchParams.get("year");
  const specialId = searchParams.get("id");

  let backHref = "/solo-tour";
  let backLabel = "Back to Solo Dashboard";

  if (from === "rws") {
    backHref = year ? `/rws/${year}` : "/rws";
    backLabel = year ? `Back to RWS ${year}` : "Back to RWS Hub";
  } else if (from === "special") {
    backHref = specialId ? `/special-tour/${specialId}` : "/special-tour";
    backLabel = "Back to Special Tour";
  }

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href={backHref} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> {backLabel}
          </Link>
          <button 
            onClick={async () => {
              await logoutSoloAdmin();
              window.location.href = "/solo-tour/admin/login";
            }}
            className="portal-btn btn-danger"
            style={{ padding: "4px 12px", fontSize: "0.8rem" }}
          >
            <i className="fa-solid fa-right-from-bracket" /> Logout
          </button>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-lock-open" />
            Admin Command Center
          </div>
          <h1 className="portal-title">ADMIN HUB</h1>
          <p className="portal-subtitle">
            Dedicated standalone managers to administer every segment of the Solo Tour and R2G World Series.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="admin-hub-grid">
          {ADMIN_MODULES.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className="admin-module-card"
              data-accent={mod.accent}
              onMouseMove={handleMouseMove}
            >
              <div className="module-icon">
                <i className={mod.icon} />
              </div>
              <div className="module-content">
                <h3>{mod.title}</h3>
                <p>{mod.desc}</p>
              </div>
              <div className="module-action">
                Manage <i className="fas fa-arrow-right" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-container" style={{ textAlign: "center", paddingTop: "5rem", color: "var(--text-secondary)" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2rem", color: "var(--solo-primary)" }} />
        </div>
      </div>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}
