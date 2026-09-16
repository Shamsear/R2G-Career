"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchPredictionSeasons, PredictionSeason } from "@/utils/solo/predictionServerActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../portal.css";
import "../../(rws)/rws/rws.css";

export default function PredictionSeasonSelection() {
  const [seasons, setSeasons] = useState<PredictionSeason[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Master of Prediction | R2G";
    async function loadData() {
      try {
        const seasonsList = await fetchPredictionSeasons();
        setSeasons(seasonsList);
      } catch (e) {
        console.error("Failed to load prediction seasons:", e);
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

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading Prediction Seasons..." />
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1100px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "2rem" }}>
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
          <Link
            href="/solo-tour/admin/prediction"
            className="portal-btn btn-secondary back-link-btn"
            style={{ borderColor: "rgba(234, 179, 8, 0.3)", color: "#fbbf24", background: "rgba(234, 179, 8, 0.05)" }}
          >
            <i className="fa-solid fa-user-gear" /> Admin Score Console
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ marginBottom: "2.5rem" }}>
          <div className="portal-page-badge" style={{ borderColor: "rgba(234, 179, 8, 0.35)", color: "#fbbf24" }}>
            <i className="fa-solid fa-crown" />
            Seasonal Prediction Arena
          </div>
          <h1 className="rws-hero-title">
            MASTER OF PREDICTION
          </h1>
          <p className="rws-hero-sub">
            The ultimate 36-day prediction championship divided across 6 competitive weeks. Browse active seasons and historical archives.
          </p>
        </div>

        {/* Season Statistics Ribbon */}
        <div className="portal-stats-ribbon" style={{ marginBottom: "2.5rem" }}>
          <div className="stat-pill">
            <i className="fa-solid fa-calendar-days" style={{ color: "#fbbf24" }} />
            <span>36 Matchdays / Season</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-layer-group" style={{ color: "#38bdf8" }} />
            <span>6 Weeks (6 Days/Week)</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <i className="fa-solid fa-medal" style={{ color: "#eab308" }} />
            <span>Weekly MOTW Honours</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Active Competition</span>
          </div>
        </div>

        {/* Season Folders Grid */}
        {seasons.length === 0 ? (
          <div className="portal-card" style={{ padding: "3.5rem", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-folder-closed" style={{ fontSize: "3.5rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.6rem", color: "#fff", marginBottom: "1rem" }}>No Prediction Seasons Initialized</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              Initialize Season 1 to start tracking predictions.
            </p>
            <Link href="/solo-tour/admin/prediction" className="portal-btn btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} /> Initialize Season 1
            </Link>
          </div>
        ) : (
          <div className="rws-dashboard-grid">
            {seasons.map((s) => {
              const isActive = s.status === 'active';
              const progressPct = Math.round(((s.completed_days || 0) / 36) * 100);

              return (
                <Link 
                  key={s.id} 
                  href={`/master-of-prediction/${s.id}`} 
                  className="portal-card" 
                  onMouseMove={handleMouseMove}
                  style={{ minHeight: "220px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  <div className="portal-card-bg" style={{ backgroundImage: "url('/assets/images/portal/ranking_bg.png')" }} />
                  <div className="portal-card-shimmer" />
                  <div className="portal-card-glow" />
                  <div className="portal-card-overlay" />
                  
                  <div className="portal-card-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", zIndex: 2 }}>
                    <div>
                      {/* Card Header: Icon & Status Badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: isActive ? "#fbbf24" : "var(--solo-primary)" }} />
                          <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#94a3b8", letterSpacing: "1px" }}>
                            SEASON 0{s.season_number}
                          </span>
                        </div>
                        <span style={{
                          fontSize: "0.65rem",
                          padding: "3px 10px",
                          borderRadius: "6px",
                          background: isActive ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                          color: isActive ? "#22c55e" : "#94a3b8",
                          border: isActive ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(148, 163, 184, 0.2)",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px"
                        }}>
                          {isActive ? "Active Season" : "Archived"}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.5rem 0", color: "#fff", fontWeight: "900" }}>
                        {s.name}
                      </h2>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0 0 1rem 0" }}>
                        {s.notes || "36 Matchdays • 6 Weeks • Crown Champion on Day 36"}
                      </p>

                      {/* Leader Highlight */}
                      {s.leader_name && s.leader_name !== 'TBD' && (
                        <div style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "rgba(234, 179, 8, 0.1)",
                          border: "1px solid rgba(234, 179, 8, 0.25)",
                          fontSize: "0.8rem",
                          color: "#fbbf24",
                          marginBottom: "1rem"
                        }}>
                          <i className="fa-solid fa-crown" style={{ fontSize: "0.75rem" }} />
                          <span>Leader: <strong>{s.leader_name}</strong> ({s.leader_points} pts)</span>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div style={{ marginTop: "0.5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                          <span>Campaign Progress</span>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{s.completed_days || 0} / 36 Days ({progressPct}%)</span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
                          <div style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            background: "linear-gradient(90deg, #eab308, #fbbf24)",
                            borderRadius: "10px",
                            transition: "width 0.5s ease"
                          }} />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="portal-card-action" style={{ marginTop: "1.5rem", fontSize: "0.8rem", fontWeight: 800, color: "#fbbf24" }}>
                      Open Season Hub <i className="fas fa-arrow-right" style={{ marginLeft: "6px" }} />
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
