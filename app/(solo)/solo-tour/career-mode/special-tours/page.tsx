"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../../../../(rws)/rws/rws.css";
import { fetchTournaments } from "@/utils/solo/serverActions";

interface Tournament {
  id: number;
  name: string;
  format_type: string;
  tournament_type: string;
  season_number: number;
}

function SpecialLoadingState({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "4rem 2rem", width: "100%", animation: "rwsFadeUp 0.5s ease-out both" }}>
      <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "var(--solo-primary)", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
        <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
          <i className="fa-solid fa-star" style={{ color: "#c084fc", fontSize: "1rem" }} />
        </div>
      </div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.75rem" }}>
        {text}
      </div>
      <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, var(--solo-primary), #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
      </div>
    </div>
  );
}

export default function SpecialToursPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Solo Tour - Special Tournaments";

    async function loadData() {
      try {
        const data = await fetchTournaments();
        if ((data as any).error) throw new Error((data as any).error);
        
        // Filter out default 'solo' and 'rws' tournaments to show only special & custom ones
        const specialTourneys = data.filter((t: any) => t.tournament_type !== "solo" && t.tournament_type !== "rws" && t.tournament_type);
        setTournaments(specialTourneys);
      } catch (err: any) {
        console.error("Error loading special tours:", err);
        setError(err.message || "Failed to load special tournaments.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1000px" }}>
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Hub
          </Link>
        </div>

        {/* Header */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-star" />
            Special Tours
          </div>
          <h1 className="rws-hero-title">SPECIAL TOURS</h1>
          <p className="rws-hero-sub">
            Inspect active special tournaments, cup clashes, and exhibition matches for the current season.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <SpecialLoadingState text="Loading active special tournaments" />
        ) : error ? (
          <div className="portal-card" style={{ padding: "3rem", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h3 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.5rem" }}>Error loading special tournaments</h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{error}</p>
            <button className="portal-btn btn-secondary" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="portal-card" style={{ padding: "3rem", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-star" style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }} />
            <h3 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "0.5rem" }}>No Special Tours Active</h3>
            <p style={{ color: "var(--text-secondary)" }}>There are no active special or custom tournaments scheduled for this season yet.</p>
          </div>
        ) : (
          <div className="rws-dashboard-grid">
            {tournaments.map((t) => {
              return (
                <Link 
                  key={t.id} 
                  href={`/special-tour/${t.id}`}
                  className="portal-card" 
                  onMouseMove={handleMouseMove}
                  style={{ minHeight: "180px", cursor: "pointer" }}
                >
                  <div className="portal-card-bg" style={{ backgroundImage: "url('/assets/images/portal/ranking_bg.png')" }} />
                  <div className="portal-card-shimmer" />
                  <div className="portal-card-glow" />
                  <div className="portal-card-overlay" />
                  <div className="portal-card-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                        <i className="fa-solid fa-trophy" style={{ fontSize: "2.2rem", color: "var(--solo-primary)" }} />
                        <span style={{
                          fontSize: "0.65rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: "rgba(168, 85, 247, 0.15)",
                          color: "#c084fc",
                          fontWeight: "bold",
                          textTransform: "uppercase"
                        }}>
                          SEASON {t.season_number}
                        </span>
                      </div>

                      <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", margin: "0 0 0.25rem", fontFamily: "var(--font-display)" }}>
                        {t.name}
                      </h2>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0" }}>
                        Format: {t.format_type === "round_robin" ? "Round Robin" : t.format_type || "Knockout"}
                      </p>
                    </div>

                    <div className="portal-card-action" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
                      Open Tournament Hub <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
