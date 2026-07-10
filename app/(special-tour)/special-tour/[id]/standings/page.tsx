"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchTournamentStandings } from "@/utils/solo/serverActions";

export default function SpecialTourStandings() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          return;
        }

        const t = await fetchTournamentById(tourneyId);
        if (!t) {
          setError("Tournament details could not be found.");
          return;
        }
        setTournament(t);

        const data = await fetchTournamentStandings(tourneyId);
        setStandings(data || []);
      } catch (e) {
        console.error("Error loading standings:", e);
        setError("Error loading standings details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tourneyId]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading tournament standings...</p>
        </div>
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
            <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Tournament Hub
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
    <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ paddingBottom: "4rem" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb">
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-list-ol" />
            Standings Table
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} STANDINGS
          </h1>
          <p className="rws-hero-sub">
            Track points, matches played, goal differences, and leading team standings in Season {tournament.season_number}.
          </p>
        </div>

        {/* Standings Table Card */}
        {standings.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }} />
            No standings generated. Check back once fixtures kick off!
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: "2rem" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.15)", color: "var(--text-secondary)" }}>
                    <th style={{ padding: "0.75rem", width: "50px" }}>Pos</th>
                    <th style={{ padding: "0.75rem" }}>Club</th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>P</th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>PTS</th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>GD</th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>GF</th>
                    <th style={{ padding: "0.75rem", textAlign: "center" }}>GA</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, index) => (
                    <tr 
                      key={row.club_id} 
                      style={{ 
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        backgroundColor: index < 1 ? "rgba(45, 212, 191, 0.03)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "1rem 0.75rem", fontWeight: 700, color: index === 0 ? "var(--solo-primary)" : "var(--text-secondary)" }}>
                        {index + 1}
                      </td>
                      <td style={{ padding: "1rem 0.75rem", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div 
                            style={{ 
                              width: "24px", 
                              height: "24px", 
                              backgroundSize: "contain", 
                              backgroundPosition: "center", 
                              backgroundRepeat: "no-repeat", 
                              backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(row.club_name.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` 
                            }}
                          />
                          {row.club_name}
                        </div>
                      </td>
                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 500 }}>{row.matches_played}</td>
                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 700, color: "var(--solo-primary)" }}>{row.points}</td>
                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", fontWeight: 500, color: row.goal_difference >= 0 ? "#10b981" : "#ef4444" }}>
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", color: "var(--text-secondary)" }}>{row.goals_scored}</td>
                      <td style={{ padding: "1rem 0.75rem", textAlign: "center", color: "var(--text-secondary)" }}>{row.goals_against}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
