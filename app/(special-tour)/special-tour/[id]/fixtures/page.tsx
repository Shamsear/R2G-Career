"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchFixtures } from "@/utils/solo/serverActions";

export default function SpecialTourFixtures() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
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

        const data = await fetchFixtures(tourneyId);
        setFixtures(data || []);
      } catch (e) {
        console.error("Error loading fixtures:", e);
        setError("Error loading fixtures details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tourneyId]);

  // Group fixtures by round
  const fixturesByRound = fixtures.reduce((acc: Record<number, any[]>, fix) => {
    const round = fix.roundNumber || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(fix);
    return acc;
  }, {});

  const rounds = Object.keys(fixturesByRound).map(Number).sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading tournament fixtures...</p>
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
            <i className="fa-solid fa-calendar-days" />
            Tournament Calendar
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} FIXTURES
          </h1>
          <p className="rws-hero-sub">
            Track kickoff times, live matchday scores, and final round results for Season {tournament.season_number}.
          </p>
        </div>

        {/* Grouped rounds */}
        {rounds.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "3rem", marginBottom: "1rem", display: "block" }} />
            No matches scheduled for this stage yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {rounds.map((round) => (
              <div key={round} className="rws-round-section" style={{ background: "rgba(15, 23, 42, 0.4)", borderRadius: "16px", padding: "1.5rem", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h2 style={{ fontSize: "1.15rem", color: "#fff", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="fa-solid fa-circle-play" style={{ color: "var(--solo-primary)", fontSize: "0.95rem" }} />
                  Round {round}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {fixturesByRound[round].map((match) => {
                    const isFinished = match.homeScore !== null && match.awayScore !== null;
                    return (
                      <div 
                        key={match.id} 
                        style={{ 
                          display: "flex", 
                          justifyContent: "space-between", 
                          alignItems: "center", 
                          padding: "1rem 1.5rem", 
                          background: "rgba(255,255,255,0.02)", 
                          borderRadius: "10px", 
                          border: "1px solid rgba(255,255,255,0.03)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1 }}>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{match.homeClub}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", justifyContent: "center", minWidth: "120px" }}>
                          {isFinished ? (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.2rem", fontWeight: 800, color: "var(--solo-primary)", letterSpacing: "1px" }}>
                              {match.homeScore} - {match.awayScore}
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.75rem", padding: "2px 8px", borderRadius: "4px", background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)", fontWeight: "bold" }}>
                              VS
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, justifyContent: "flex-end" }}>
                          <span style={{ fontWeight: 600, color: "#fff" }}>{match.awayClub}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
