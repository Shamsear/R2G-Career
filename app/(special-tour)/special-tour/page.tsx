"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActiveSeason, fetchTournamentsByType } from "@/utils/solo/serverActions";

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

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ paddingBottom: "4rem", maxWidth: "1000px" }}>
        
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
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div className="portal-page-badge" style={{ margin: "0 auto 1rem auto" }}>
            <i className="fa-solid fa-wand-magic-sparkles" />
            Special Tour Archives
          </div>
          <h1 className="portal-title" style={{ fontSize: "2.5rem", letterSpacing: "3px" }}>SPECIAL TOURS</h1>
          <p className="portal-subtitle" style={{ fontSize: "0.95rem", maxWidth: "600px", margin: "0.5rem auto 0 auto" }}>
            Select an active or historical special tournament to view standings, check matches, and track payouts.
          </p>
        </div>

        {/* Loading state */}
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", marginBottom: "1rem" }} />
            <p>Loading tournaments list...</p>
          </div>
        ) : tournaments.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "3.5rem 2rem", maxWidth: "650px", margin: "0 auto" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "2.5rem", color: "#eab308", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.3rem", color: "#fff", marginBottom: "0.5rem" }}>No Special Tournaments Registered</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              There are currently no tournaments classified under the "Special Tour" type.
              Please navigate to the Admin Console to register a new tournament stage and select "Special Tour" as its type.
            </p>
            <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} /> Create Special Stage
            </Link>
          </div>
        ) : (
          /* Tournaments Grid */
          <div className="rws-dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {tournaments.map((t) => (
              <Link 
                key={t.id} 
                href={`/special-tour/${t.id}`} 
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
                        background: activeSeason && t.season_number === activeSeason.season_number ? "rgba(34, 197, 94, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: activeSeason && t.season_number === activeSeason.season_number ? "#22c55e" : "#94a3b8",
                        fontWeight: "bold",
                        textTransform: "uppercase"
                      }}>
                        {activeSeason && t.season_number === activeSeason.season_number ? "Active" : "Archived"}
                      </span>
                    </div>
                    <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.25rem 0", color: "#fff", fontWeight: "800" }}>{t.name}</h2>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                      Season {t.season_number} // Format: {t.format_type === "round_robin" ? "Round Robin" : "Knockout"}
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
