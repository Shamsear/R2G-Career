"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchActiveSeason } from "@/utils/solo/serverActions";

export default function RwsDashboard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rwsYear, setRwsYear] = useState<number | null>(2026);
  const [soloSeasonNum, setSoloSeasonNum] = useState<number>(9);
  const [hasRws, setHasRws] = useState<boolean>(true);

  useEffect(() => {
    document.title = "R2G World Series - Main Hub";
    async function loadSeason() {
      try {
        const season = await fetchActiveSeason();
        if (season) {
          setHasRws(!!season.has_rws);
          setSoloSeasonNum(season.season_number);
          setRwsYear(season.rws_year || null);
        }
      } catch (e) {
        console.error("Failed to load active season:", e);
      }
    }
    loadSeason();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  if (!hasRws) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Portal
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>RWS Inactive</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              The R2G World Series (RWS) is not scheduled for Solo Tour Season {soloSeasonNum}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper" ref={containerRef}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-crown" />
            {rwsYear ? `RWS ${rwsYear}` : "RWS Season"}
          </div>
          <h1 className="rws-hero-title">
            R2G WORLD SERIES
          </h1>
          <p className="rws-hero-sub">
            The peak competition of the R2G universe. View selected candidate lists,
            track upcoming match calendars/results, and browse championship albums.
          </p>
        </div>

        {/* Sub-modules Grid */}
        <div className="rws-dashboard-grid">
          
          {/* Card 1: Selected Candidates */}
          <Link 
            href="/rws/selected-candidates" 
            className="portal-card"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/candidates_bg.png')" }}
              onError={(e) => {
                e.currentTarget.style.backgroundImage = "url('/assets/images/portal/solo_bg.png')";
              }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-user-check" />
                Nominees
              </span>
              <h2>SELECTED CANDIDATES</h2>
              <p>
                Inspect the elite managers and star players chosen to represent their teams in this season's world finals.
              </p>
              <div className="portal-card-action">
                Inspect Roster <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Card 2: Fixtures */}
          <Link 
            href="/rws/fixtures" 
            className="portal-card"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/fixtures_bg.png')" }}
              onError={(e) => {
                e.currentTarget.style.backgroundImage = "url('/assets/images/portal/solo_bg.png')";
              }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-calendar-days" />
                Calendar
              </span>
              <h2>SERIES FIXTURES</h2>
              <p>
                Track match schedules, kick-off times, knockout brackets, live scores, and final round standings.
              </p>
              <div className="portal-card-action">
                View Schedule <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Card 3: Album */}
          <Link 
            href="/rws/album" 
            className="portal-card"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/album_bg.png')" }}
              onError={(e) => {
                e.currentTarget.style.backgroundImage = "url('/assets/images/portal/solo_bg.png')";
              }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-images" />
                Gallery
              </span>
              <h2>TROPHY ALBUM</h2>
              <p>
                Browse historical moments, tournament memories, team group photos, and trophy celebrations.
              </p>
              <div className="portal-card-action">
                Open Gallery <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Card 4: Admin Panel */}
          <Link 
            href="/solo-tour/admin" 
            className="portal-card"
            onMouseMove={handleMouseMove}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/portal/guide_bg.png')" }}
              onError={(e) => {
                e.currentTarget.style.backgroundImage = "url('/assets/images/portal/solo_bg.png')";
              }}
            />
            <div className="portal-card-shimmer" />
            <div className="portal-card-glow" />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-lock-open" />
                Admin
              </span>
              <h2>ADMIN PANEL</h2>
              <p>
                Configure RWS settings, nominees, match calendars, result entries, and photo cards.
              </p>
              <div className="portal-card-action">
                Enter Hub <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
