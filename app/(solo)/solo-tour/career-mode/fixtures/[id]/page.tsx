"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import "../../../../../portal.css";
import { fetchFixtureById } from "@/utils/solo/serverActions";

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
}

export default function FixtureDetailPage() {
  const params = useParams();
  const fixtureId = parseInt(params.id as string, 10);

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFixture() {
      try {
        if (isNaN(fixtureId)) {
          setError("Invalid Match ID");
          return;
        }

        const data = await fetchFixtureById(fixtureId);
        if (!data) {
          setError(`Match #${fixtureId} not found`);
          return;
        }

        setFixture(data);
        document.title = `Match Center - ${data.homeClub} vs ${data.awayClub}`;
      } catch (err: any) {
        console.error("Error loading fixture details:", err);
        setError("Failed to load match details.");
      } finally {
        setLoading(false);
      }
    }

    loadFixture();
  }, [fixtureId]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <Link href="/solo-tour/career-mode/fixtures" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Fixtures
            </Link>
          </div>
          <div className="glass-panel skeleton" style={{ height: "250px", width: "100%", marginTop: "1rem" }} />
        </div>
      </div>
    );
  }

  if (error || !fixture) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container">
          <div className="portal-breadcrumb">
            <Link href="/solo-tour/career-mode/fixtures" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Fixtures
            </Link>
          </div>
          <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)", marginTop: "1rem" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
            <h3>Error Loading Match</h3>
            <p>{error || "Match details could not be found."}</p>
            <Link href="/solo-tour/career-mode/fixtures" className="portal-btn btn-secondary" style={{ marginTop: "1rem" }}>
              Return to Fixtures List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFinished = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode/fixtures" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Fixtures
          </Link>
        </div>

        {/* Hero Section — Scoreboard */}
        <div className="glass-panel" style={{ width: "100%", padding: "2rem", marginTop: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-secondary)", letterSpacing: "1px", marginBottom: "1rem", fontFamily: "var(--font-mono)" }}>
            {fixture.tournamentName} // MATCH ID: #{fixture.id}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1.5rem" }}>
            {/* Home Club */}
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "2px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", color: "var(--rose-light)", fontWeight: "800", textShadow: "0 0 10px rgba(244,63,94,0.3)" }}>
                {fixture.homeClub.substring(0, 2).toUpperCase()}
              </div>
              <h2 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: "800", margin: "0" }}>{fixture.homeClub}</h2>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>HOME CLUB</span>
            </div>

            {/* Score / Status */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              <div style={{
                background: "rgba(8, 11, 17, 0.6)",
                border: "2px solid var(--border-soft)",
                borderRadius: "12px",
                padding: "0.75rem 2rem",
                fontFamily: "var(--font-mono)",
                fontSize: "2.5rem",
                fontWeight: "900",
                color: "#ffffff",
                letterSpacing: "2px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
              }}>
                {isFinished ? `${fixture.homeScore} - ${fixture.awayScore}` : "VS"}
              </div>
              <span style={{
                fontSize: "0.65rem",
                fontFamily: "var(--font-mono)",
                fontWeight: "800",
                letterSpacing: "1px",
                padding: "0.25rem 0.75rem",
                borderRadius: "6px",
                background: isFinished ? "rgba(255, 255, 255, 0.05)" : "rgba(244, 63, 94, 0.2)",
                color: isFinished ? "var(--text-muted)" : "var(--rose-light)"
              }}>
                {isFinished ? "FINISHED" : "UPCOMING"}
              </span>
            </div>

            {/* Away Club */}
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "2px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem", color: "var(--rose-light)", fontWeight: "800", textShadow: "0 0 10px rgba(244,63,94,0.3)" }}>
                {fixture.awayClub.substring(0, 2).toUpperCase()}
              </div>
              <h2 style={{ fontSize: "1.25rem", color: "#ffffff", fontWeight: "800", margin: "0" }}>{fixture.awayClub}</h2>
              <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>AWAY CLUB</span>
            </div>
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="portal-grid cols-2" style={{ marginTop: "1.5rem", gap: "1.5rem" }}>
          {/* Match Events Column */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h2 className="section-heading" style={{ fontSize: "1.1rem", marginBottom: "1.25rem", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
              <i className="fa-solid fa-list-check" style={{ marginRight: "0.5rem", color: "var(--rose-light)" }} />
              MATCH TIMELINE
            </h2>

            {!isFinished ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <i className="fa-regular fa-clock" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block" }} />
                <p>This match is upcoming. Live events will appear once the game kicks off.</p>
              </div>
            ) : !fixture.matchEvents || fixture.matchEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-muted)" }}>
                <p>No key events recorded for this match.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {fixture.matchEvents.map((evt: any, i: number) => {
                  let icon = "fa-solid fa-futbol";
                  let iconColor = "#ffffff";
                  if (evt.type === 'yellow_card') {
                    icon = "fa-solid fa-square";
                    iconColor = "#fbbf24";
                  } else if (evt.type === 'red_card') {
                    icon = "fa-solid fa-square";
                    iconColor = "#ef4444";
                  }

                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--rose-light)", minWidth: "30px" }}>
                        {evt.minute}&apos;
                      </span>
                      <i className={icon} style={{ color: iconColor, fontSize: "0.95rem" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem" }}>{evt.player}</div>
                        {evt.detail && <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{evt.detail}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sandbox for features on the go */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h2 className="section-heading" style={{ fontSize: "1.1rem", marginBottom: "1.25rem", borderBottom: "1px dashed rgba(255,255,255,0.08)", paddingBottom: "0.5rem" }}>
              <i className="fa-solid fa-gears" style={{ marginRight: "0.5rem", color: "var(--rose-light)" }} />
              TACTICAL ANALYTICS
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ padding: "1rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", opacity: 0.6 }}>
                <i className="fa-solid fa-users-line" style={{ fontSize: "1.5rem", color: "var(--rose-light)" }} />
                <div>
                  <h3 style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: "700", margin: "0" }}>STARTING LINEUPS</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>View playing squads, bench rosters, and tactical formats. [COMING SOON]</p>
                </div>
              </div>

              <div style={{ padding: "1rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", opacity: 0.6 }}>
                <i className="fa-solid fa-chart-pie" style={{ fontSize: "1.5rem", color: "var(--rose-light)" }} />
                <div>
                  <h3 style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: "700", margin: "0" }}>MATCH STATS</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>Track possession percentages, shots on target, passes, and fouls. [COMING SOON]</p>
                </div>
              </div>

              <div style={{ padding: "1rem", background: "rgba(255,255,255,0.01)", border: "1px dashed rgba(255,255,255,0.05)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "1rem", opacity: 0.6 }}>
                <i className="fa-solid fa-user-pen" style={{ fontSize: "1.5rem", color: "var(--rose-light)" }} />
                <div>
                  <h3 style={{ fontSize: "0.9rem", color: "#ffffff", fontWeight: "700", margin: "0" }}>TACTICIAN LOGS</h3>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>Read post-match press briefings and notes from team managers. [COMING SOON]</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
