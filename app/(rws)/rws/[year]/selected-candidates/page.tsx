"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear, fetchSelectedCandidates, fetchTournaments } from "@/utils/solo/serverActions";
import "../../rws.css";

interface Candidate {
  id: number;
  name: string;
  club: string;
  role: string;
  status: string;
  rating: number;
  avatar: string;
  customLogoPath?: string | null;
  logoPath?: string | null;
  useExistingClub?: boolean;
  stat1: { label: string; value: string };
  stat2: { label: string; value: string };
  stat3: { label: string; value: string };
}

function RwsFullPageLoading({ text }: { text: string }) {
  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <div className="portal-container" style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "3rem",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          maxWidth: "320px",
          width: "100%",
          animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both"
        }}>
          <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#a855f7", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#c084fc", fontSize: "1rem" }} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              R2G // WORLD SERIES
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.5px" }}>
              {text}...
            </div>
          </div>
          <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, #a855f7, #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RwsYearSelectedCandidates() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);

  const [season, setSeason] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCandidates() {
      try {
        if (isNaN(year)) {
          setError("Invalid RWS Year");
          return;
        }

        const s = await fetchSeasonByRwsYear(year);
        if (!s) {
          setError(`No R2G World Series scheduled for year ${yearStr}`);
          return;
        }
        setSeason(s);

        const tournaments = await fetchTournaments();
        const rwsTourney = tournaments.find((t: any) => 
          t.tournament_type === "rws" && t.season_number === s.season_number
        );

        if (rwsTourney) {
          const data = await fetchSelectedCandidates(rwsTourney.name);
          if (data && (data as any).error) {
            throw new Error((data as any).error);
          }
          setCandidates(data || []);
        } else {
          setCandidates([]);
        }
      } catch (err: any) {
        console.error("Error loading selected candidates:", err);
        setError(err.message || "Failed to load candidates.");
      } finally {
        setLoading(false);
      }
    }

    loadCandidates();
  }, [year, yearStr]);

  if (loading) {
    return <RwsFullPageLoading text="Loading selected candidates" />;
  }

  if (error || !season) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to RWS Hub
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Edition Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to RWS Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div style={{ textAlign: "center", padding: "2rem 0 1.5rem", animation: "rwsFadeUp 0.5s ease-out both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "4px 14px", borderRadius: "20px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: "0.72rem", fontWeight: 600, color: "#c084fc", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "0.75rem" }}>
            <i className="fa-solid fa-user-check" /> RWS Roster
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.4rem", fontWeight: 800, color: "#fff", margin: "0 0 0.5rem", letterSpacing: "3px", textTransform: "uppercase", background: "linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PARTICIPATING TEAMS
          </h1>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", maxWidth: "550px", margin: "0 auto", lineHeight: 1.5 }}>
            Meet the elite teams and tactical managers competing in the R2G World Series {yearStr} for Solo Tour Season {season.season_number}.
          </p>
        </div>

        {/* Teams Grid */}
        {candidates.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <i className="fa-solid fa-user-slash" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.3 }} />
            <h3 style={{ color: "#fff", fontSize: "1.1rem", margin: "0 0 0.5rem 0" }}>No teams selected</h3>
            <p style={{ fontSize: "0.82rem", margin: 0 }}>There are no participating teams configured for the R2G World Series yet.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem", animation: "rwsFadeUp 0.5s ease-out both" }}>
            {candidates.map((candidate) => {
              const teamLogo = (!candidate.useExistingClub && candidate.customLogoPath) 
                ? candidate.customLogoPath 
                : (candidate.logoPath || "/assets/images/default-club-logo.png");
              return (
                <div key={candidate.id} className="candidate-card" style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "18px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  transition: "all 0.25s ease",
                  position: "relative"
                }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.25)"; e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.3)"; e.currentTarget.style.transform = "translateY(-4px)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                  
                  {/* Status Badge & Rating Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.62rem", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", padding: "2px 8px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.1)", color: "#c084fc" }}>
                      {candidate.status}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", background: "rgba(251, 191, 36, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                      OVR {candidate.rating}
                    </span>
                  </div>

                  {/* Prominent Team Logo */}
                  <div style={{
                    width: "90px",
                    height: "90px",
                    borderRadius: "20px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                    overflow: "hidden",
                    padding: "0.5rem",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.2)"
                  }}>
                    <img 
                      src={teamLogo} 
                      alt="" 
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => {
                        e.currentTarget.src = "/assets/images/default-club-logo.png";
                      }}
                    />
                  </div>

                  {/* Custom Name */}
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", fontWeight: 700, color: "#fff", margin: "0 0 0.25rem" }}>
                    {candidate.club}
                  </h3>

                  {/* Manager Name */}
                  <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.4)", marginBottom: "1.25rem", fontWeight: 500 }}>
                    Manager: {candidate.name}
                  </div>

                  {/* Stats Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.5rem",
                    width: "100%",
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    border: "1px solid rgba(255,255,255,0.02)"
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{candidate.stat1.value}</span>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", marginTop: "1px" }}>{candidate.stat1.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", borderLeft: "1px solid rgba(255, 255, 255, 0.05)", borderRight: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{candidate.stat2.value}</span>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", marginTop: "1px" }}>{candidate.stat2.label}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>{candidate.stat3.value}</span>
                      <span style={{ fontSize: "0.6rem", color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", marginTop: "1px" }}>{candidate.stat3.label}</span>
                    </div>
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
