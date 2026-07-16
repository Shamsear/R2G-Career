"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../../../portal.css";
import { fetchTournaments } from "@/utils/solo/serverActions";

interface Tournament {
  id: number;
  name: string;
  format_type: string;
  tournament_type: string;
  season_number: number;
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

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-star" />
            Special Tours
          </div>
          <h1 className="portal-title">SPECIAL TOURS</h1>
          <p className="portal-subtitle">
            Inspect active special tournaments, cup clashes, and exhibition matches for the current season.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="portal-grid cols-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="glass-panel skeleton" style={{ height: "200px", padding: "1.5rem" }}>
                  <div style={{ height: "12px", width: "30%", background: "rgba(255,255,255,0.05)", marginBottom: "1rem" }} />
                  <div style={{ height: "22px", width: "80%", background: "rgba(255,255,255,0.05)", marginBottom: "0.5rem" }} />
                  <div style={{ height: "14px", width: "50%", background: "rgba(255,255,255,0.05)", marginBottom: "2rem" }} />
                  <div style={{ height: "30px", width: "40%", background: "rgba(255,255,255,0.05)" }} />
                </div>
              ))}
          </div>
        ) : error ? (
          <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
            <h3>Error loading special tournaments</h3>
            <p>{error}</p>
            <button className="portal-btn btn-secondary reset-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="no-results-message">
            <i className="fa-solid fa-star" />
            <h3>No special tours active</h3>
            <p>There are no active special or custom tournaments scheduled for this season yet.</p>
          </div>
        ) : (
          <div className="portal-grid cols-3" style={{ gap: "1.5rem" }}>
            {tournaments.map((t) => {
              let icon = "fa-solid fa-star";
              if (t.format_type === 'League') {
                icon = "fa-solid fa-list-ol";
              } else if (t.format_type === 'Knockout') {
                icon = "fa-solid fa-award";
              }

              return (
                <Link 
                  key={t.id} 
                  href={`/solo-tour/career-mode/tournaments/${t.id}`}
                  className="portal-card solo-tour" 
                  style={{ minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none" }}
                >
                  <div className="portal-card-bg" style={{ backgroundImage: "url('/assets/images/portal/ranking_bg.png')" }} />
                  <div className="portal-card-shimmer" />
                  <div className="portal-card-glow" />
                  <div className="portal-card-overlay" />
                  <div className="portal-card-content" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between", position: "relative", zIndex: 2, width: "100%", padding: "0" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <span className="portal-card-badge" style={{ margin: "0", display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.25rem 0.5rem" }}>
                          <i className={icon} />
                          {t.format_type.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                          SEASON {t.season_number}
                        </span>
                      </div>

                      <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", margin: "0.5rem 0 0.25rem", fontFamily: "var(--font-display)" }}>
                        {t.name}
                      </h2>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0" }}>
                        Special tournament match schedules, brackets, ratings, and statistics.
                      </p>
                    </div>

                    <div className="portal-card-action" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem", marginTop: "1rem" }}>
                      Open Tournament Hub <i className="fas fa-arrow-right" style={{ marginLeft: "0.35rem" }} />
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
