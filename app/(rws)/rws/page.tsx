"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSeasonsList } from "@/utils/solo/serverActions";
import "./rws.css";

export default function RwsYearSelection() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "R2G World Series Archives";
    async function loadSeasons() {
      try {
        const data = await fetchSeasonsList();
        // Filter only seasons that host RWS
        const rwsSeasons = (data || []).filter((s: any) => s.has_rws && s.rws_year);
        setSeasons(rwsSeasons);
      } catch (e) {
        console.error("Failed to load seasons:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1000px" }}>
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href="/" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Portal
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-crown" />
            RWS Archives
          </div>
          <h1 className="rws-hero-title" style={{ fontSize: "2.5rem" }}>
            R2G WORLD SERIES ARCHIVES
          </h1>
          <p className="rws-hero-sub" style={{ margin: "1rem auto 0", maxWidth: "600px" }}>
            Browse the active world championship hub or explore past R2G tournament records, rosters, schedules, and galleries by year.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--solo-primary)" }} />
            <p>Loading world series editions...</p>
          </div>
        ) : seasons.length === 0 ? (
          <div className="portal-card" style={{ padding: "3rem", textAlign: "center", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-folder-closed" style={{ fontSize: "3rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>No RWS Editions Scheduled</h2>
            <p style={{ color: "var(--text-secondary)" }}>
              No seasons have been configured to host the R2G World Series yet.
            </p>
          </div>
        ) : (
          /* Folders Grid */
          <div className="rws-dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {seasons.map((s) => (
              <Link 
                key={s.id} 
                href={`/rws/${s.rws_year}`} 
                className="portal-card" 
                style={{ minHeight: "180px", cursor: "pointer" }}
              >
                <div className="portal-card-overlay" />
                <div className="portal-card-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                      <i className="fa-solid fa-folder-open" style={{ fontSize: "2.5rem", color: "var(--solo-primary)" }} />
                      <span style={{
                        fontSize: "0.65rem",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: s.is_active ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: s.is_active ? "#22c55e" : "#94a3b8",
                        fontWeight: "bold",
                        textTransform: "uppercase"
                      }}>
                        {s.is_active ? "Active" : "Archived"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem 0", color: "#fff", fontWeight: "800" }}>RWS {s.rws_year}</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                      Solo Tour Season {s.season_number}
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
