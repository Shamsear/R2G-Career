"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear } from "@/utils/solo/serverActions";
import "../rws.css";

export default function RwsYearDashboard() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);

  const containerRef = useRef<HTMLDivElement>(null);
  const [season, setSeason] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `R2G World Series - RWS ${yearStr}`;
    async function loadSeason() {
      try {
        if (isNaN(year)) {
          setError("Invalid RWS Year");
          return;
        }
        const data = await fetchSeasonByRwsYear(year);
        if (!data) {
          setError(`No R2G World Series scheduled for year ${yearStr}`);
          return;
        }
        setSeason(data);
      } catch (e: any) {
        console.error("Failed to load RWS season:", e);
        setError("Error loading RWS season details.");
      } finally {
        setLoading(false);
      }
    }
    loadSeason();
  }, [year, yearStr]);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Resolving RWS {yearStr} details...</p>
        </div>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to RWS Archives
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Edition Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
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
          <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to RWS Archives
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-crown" />
            RWS {yearStr}
          </div>
          <h1 className="rws-hero-title">
            R2G WORLD SERIES {yearStr}
          </h1>
          <p className="rws-hero-sub">
            Championship hub for Solo Tour Season {season.season_number}. View selected candidate lists,
            track upcoming match calendars/results, and browse the gallery.
          </p>
        </div>

        {/* Sub-modules Grid */}
        <div className="rws-dashboard-grid">
          
          {/* Card 1: Selected Candidates */}
          <Link 
            href={`/rws/${yearStr}/selected-candidates`} 
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
            href={`/rws/${yearStr}/fixtures`} 
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
            href={`/rws/${yearStr}/album`} 
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
