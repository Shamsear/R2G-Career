"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear } from "@/utils/solo/serverActions";
import "../rws.css";

function RwsFullPageLoading({ text }: { text: string }) {
  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <div className="portal-container" style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "3rem",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          maxWidth: "320px",
          width: "100%",
          animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both"
        }}>
          <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#a855f7", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#c084fc", fontSize: "1rem" }} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              R2G // WORLD SERIES
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.5px" }}>
              {text}...
            </div>
          </div>
          <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, #a855f7, #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

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
    return <RwsFullPageLoading text={`Resolving RWS ${yearStr} details`} />;
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
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to RWS Archives
          </Link>
          <Link href={`/solo-tour/admin?from=rws&year=${yearStr}`} className="portal-btn btn-secondary back-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.25)", color: "#10b981" }}>
            <i className="fa-solid fa-user-gear" /> Admin Console
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

          {/* Card 2: Tournament */}
          <Link 
            href={`/rws/${yearStr}/tournament`} 
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
                <i className="fa-solid fa-trophy" />
                Tournament
              </span>
              <h2>SERIES PORTAL</h2>
              <p>
                Track standings tables, upcoming match schedules, and computed leaderboards stats for RWS {yearStr}.
              </p>
              <div className="portal-card-action">
                Open Portal <i className="fas fa-arrow-right" />
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


        </div>

      </div>
    </div>
  );
}
