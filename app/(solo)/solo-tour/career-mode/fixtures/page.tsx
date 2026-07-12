"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import { fetchTournaments, fetchFixtures } from "@/utils/solo/serverActions";

interface Fixture {
  id: number;
  tournamentId: number;
  tournamentName: string;
  homeClub: string;
  homeLogo: string;
  awayClub: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  matchEvents: any[];
  roundNumber?: number;
  groupName?: string | null;
}

interface Tournament {
  id: number;
  name: string;
  format_type: string;
  season_number: number;
}

export default function FixturesPage() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Solo Tour - Career Fixtures";

    async function loadData() {
      try {
        const [tourneysData, fixturesData] = await Promise.all([
          fetchTournaments(),
          fetchFixtures()
        ]);

        if ((tourneysData as any).error) throw new Error((tourneysData as any).error);
        if ((fixturesData as any).error) throw new Error((fixturesData as any).error);

        setTournaments(tourneysData);
        setFixtures(fixturesData);
      } catch (err: any) {
        console.error("Error loading fixtures data:", err);
        setError(err.message || "Failed to load fixtures.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const filteredFixtures = useMemo(() => {
    if (selectedTournament === "all") return fixtures;
    return fixtures.filter(f => f.tournamentId === parseInt(selectedTournament));
  }, [fixtures, selectedTournament]);

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
            <i className="fa-solid fa-calendar-days" />
            Fixtures Schedule
          </div>
          <h1 className="portal-title">CAREER FIXTURES</h1>
          <p className="portal-subtitle">
            Browse and inspect active matches, schedules, and live scorecards across all active tournaments.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="tabs-filter" style={{ marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <button
            className={`tab-btn ${selectedTournament === "all" ? "active" : ""}`}
            onClick={() => setSelectedTournament("all")}
          >
            All Tours ({fixtures.length})
          </button>
          {tournaments.map((t) => (
            <button
              key={t.id}
              className={`tab-btn ${selectedTournament === String(t.id) ? "active" : ""}`}
              onClick={() => setSelectedTournament(String(t.id))}
            >
              {t.name} ({fixtures.filter(f => f.tournamentId === t.id).length})
            </button>
          ))}
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div className="portal-grid cols-2">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="glass-panel skeleton" style={{ height: "140px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                    <div style={{ height: "12px", width: "30%", background: "rgba(255,255,255,0.05)" }} />
                    <div style={{ height: "12px", width: "15%", background: "rgba(255,255,255,0.05)" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                    <div style={{ height: "24px", width: "20%", background: "rgba(255,255,255,0.05)" }} />
                    <div style={{ height: "30px", width: "15%", background: "rgba(255,255,255,0.05)" }} />
                    <div style={{ height: "24px", width: "20%", background: "rgba(255,255,255,0.05)" }} />
                  </div>
                </div>
              ))}
          </div>
        ) : error ? (
          <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
            <h3>Error loading fixtures</h3>
            <p>{error}</p>
            <button className="portal-btn btn-secondary reset-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : filteredFixtures.length === 0 ? (
          <div className="no-results-message">
            <i className="fa-solid fa-calendar-xmark" />
            <h3>No fixtures scheduled</h3>
            <p>There are no active matches for the selected tournament.</p>
          </div>
        ) : (
          <div className="portal-grid cols-2" style={{ gap: "1.25rem" }}>
            {filteredFixtures.map((fixture) => {
              const isFinished = fixture.homeScore !== null && fixture.awayScore !== null;
              
              return (
                <div key={fixture.id} className="glass-panel" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    <span>{fixture.tournamentName} • ROUND {fixture.roundNumber || 1}{fixture.groupName ? ` • GROUP ${fixture.groupName}` : ""}</span>
                    <span style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: "4px",
                      fontSize: "0.65rem",
                      fontWeight: "700",
                      background: isFinished ? "rgba(255,255,255,0.05)" : "rgba(244, 63, 94, 0.15)",
                      color: isFinished ? "var(--text-muted)" : "var(--rose-light)"
                    }}>
                      {isFinished ? "FINISHED" : "UPCOMING"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 0" }}>
                    {/* Home Club */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "0.75rem", textAlign: "right" }}>
                      <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.95rem" }}>{fixture.homeClub}</span>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--rose-light)", fontWeight: "700" }}>
                        {fixture.homeClub.substring(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Score Box */}
                    <div style={{
                      margin: "0 1.25rem",
                      background: "rgba(8, 11, 17, 0.5)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.35rem 0.85rem",
                      fontFamily: "var(--font-mono)",
                      fontSize: "1.1rem",
                      fontWeight: "800",
                      color: "#ffffff",
                      minWidth: "75px",
                      textAlign: "center"
                    }}>
                      {isFinished ? `${fixture.homeScore} - ${fixture.awayScore}` : "VS"}
                    </div>

                    {/* Away Club */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.75rem", textAlign: "left" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", color: "var(--rose-light)", fontWeight: "700" }}>
                        {fixture.awayClub.substring(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.95rem" }}>{fixture.awayClub}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.75rem" }}>
                    <Link
                      href={`/solo-tour/career-mode/fixtures/${fixture.id}`}
                      className="portal-btn btn-secondary"
                      style={{ fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                    >
                      Match Center <i className="fas fa-arrow-right" style={{ marginLeft: "0.25rem" }} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
