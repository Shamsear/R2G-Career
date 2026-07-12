"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById } from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

export default function SpecialTourHub() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTournament() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          return;
        }
        const data = await fetchTournamentById(tourneyId);
        if (!data) {
          setError(`No Special Tournament details for ID ${tourneyId}`);
          return;
        }
        setTournament(data);
        document.title = `${data.name} Hub | R2G`;
      } catch (e: any) {
        console.error("Failed to load special tournament:", e);
        setError("Error loading tournament details.");
      } finally {
        setLoading(false);
      }
    }
    loadTournament();
  }, [tourneyId]);

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
        <RwsFullPageLoading text="Loading tournament hub" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/special-tour" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Special Tours
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Tournament Not Found</h2>
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
          <Link href="/special-tour" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Special Tours
          </Link>
          <Link href={`/solo-tour/admin?from=special&id=${tourneyId}`} className="portal-btn btn-secondary back-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.25)", color: "#10b981" }}>
            <i className="fa-solid fa-user-gear" /> Admin Console
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-trophy" />
            Season {tournament.season_number} Invitational
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()}
          </h1>
          <p className="rws-hero-sub">
            Welcome to the {tournament.name} Hub. Inspect current standings, view fixtures, and track knockout stages.
          </p>
        </div>

        {/* Sub-modules Grid */}
        <div className="rws-dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
          
          {/* Card 1: Standings */}
          <Link 
            href={`/special-tour/${tourneyId}/standings`} 
            className="portal-card"
            onMouseMove={handleMouseMove}
            style={{ minHeight: "220px" }}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/candidates_bg.png')" }}
            />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-list-ol" />
                Table
              </span>
              <h2>STANDINGS TABLE</h2>
              <p>
                Inspect current tournament points, goal differences, wins, draws, and matches played.
              </p>
              <div className="portal-card-action">
                View Standings <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Card 2: Fixtures */}
          <Link 
            href={`/special-tour/${tourneyId}/fixtures`} 
            className="portal-card"
            onMouseMove={handleMouseMove}
            style={{ minHeight: "220px" }}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/fixtures_bg.png')" }}
            />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-calendar-days" />
                Calendar
              </span>
              <h2>MATCH SCHEDULE</h2>
              <p>
                Track match kickoff times, score results, upcoming fixtures, and round-by-round pairings.
              </p>
              <div className="portal-card-action">
                View Fixtures <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

          {/* Card 3: Nominees */}
          <Link 
            href={`/special-tour/${tourneyId}/nominees`} 
            className="portal-card"
            onMouseMove={handleMouseMove}
            style={{ minHeight: "220px" }}
          >
            <div
              className="portal-card-bg"
              style={{ backgroundImage: "url('/assets/images/rws/candidates_bg.png')" }}
            />
            <div className="portal-card-overlay" />
            <div className="portal-card-content">
              <span className="portal-card-badge">
                <i className="fa-solid fa-user-check" />
                Nominees
              </span>
              <h2>PARTICIPATING TEAMS</h2>
              <p>
                View all confirmed participants, representative managers, custom team logos, and manager statistics.
              </p>
              <div className="portal-card-action">
                View Confirmed Teams <i className="fas fa-arrow-right" />
              </div>
            </div>
          </Link>

        </div>

      </div>
    </div>
  );
}
