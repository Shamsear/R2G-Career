"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActiveSeason, fetchTournamentsByType } from "@/utils/solo/serverActions";
import "../../portal.css";
import "../../(rws)/rws/rws.css";

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

export default function SpecialTourYearSelection() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Special Tour Archives | R2G";
    async function loadData() {
      try {
        const [season, tourneys] = await Promise.all([
          fetchActiveSeason(),
          fetchTournamentsByType("special")
        ]);
        setActiveSeason(season);
        setTournaments(tourneys || []);
      } catch (e) {
        console.error("Failed to load special tournaments archives:", e);
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
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1000px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
          <Link href="/solo-tour/admin?from=special" className="portal-btn btn-secondary back-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.25)", color: "#10b981" }}>
            <i className="fa-solid fa-user-gear" /> Admin Console
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-star" />
            Special Tour Archives
          </div>
          <h1 className="rws-hero-title">
            SPECIAL TOUR SERIES
          </h1>
          <p className="rws-hero-sub">
            Browse active special tournaments, cup invitational clashes, exhibition series, and historical records.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <SpecialLoadingState text="Loading special tournaments" />
        ) : tournaments.length === 0 ? (
          <div className="portal-card" style={{ padding: "3rem", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-folder-closed" style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>No Special Tournaments Scheduled</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              There are currently no tournaments classified under the "Special Tour" type.
            </p>
            <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} /> Register Special Stage
            </Link>
          </div>
        ) : (
          /* Tournaments Grid */
          <div className="rws-dashboard-grid">
            {tournaments.map((t) => (
              <Link 
                key={t.id} 
                href={`/special-tour/${t.id}`} 
                className="portal-card" 
                onMouseMove={handleMouseMove}
                style={{ minHeight: "180px", cursor: "pointer" }}
              >
                <div className="portal-card-bg" style={{ backgroundImage: "url('/assets/images/portal/tournament_bg.png')" }} />
                <div className="portal-card-shimmer" />
                <div className="portal-card-glow" />
                <div className="portal-card-overlay" />
                <div className="portal-card-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "var(--solo-primary)" }} />
                      <span style={{
                        fontSize: "0.65rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: activeSeason && t.season_number === activeSeason.season_number ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: activeSeason && t.season_number === activeSeason.season_number ? "#22c55e" : "#94a3b8",
                        fontWeight: "bold",
                        textTransform: "uppercase"
                      }}>
                        {activeSeason && t.season_number === activeSeason.season_number ? "Active" : "Archived"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem 0", color: "#fff", fontWeight: "800" }}>{t.name}</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                      Format: {t.format_type === "round_robin" ? "Round Robin" : t.format_type || "Tournament"}
                    </p>
                  </div>
                  <div className="portal-card-action" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
                    Open Hub <i className="fas fa-arrow-right" style={{ marginLeft: "4px" }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
