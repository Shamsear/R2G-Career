"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear, fetchSelectedCandidates, fetchTournaments } from "@/utils/solo/serverActions";
import "../../rws.css";

interface Candidate {
  id: number;
  name: string;
  r2g_id?: string;
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
          <div className="rws-teams-grid">
            {candidates.map((candidate) => {
              const teamLogo = (!candidate.useExistingClub && candidate.customLogoPath) 
                ? candidate.customLogoPath 
                : (candidate.logoPath || "/assets/images/default-club-logo.png");
              return (
                <Link key={candidate.id} href={`/members/${encodeURIComponent(candidate.r2g_id || candidate.id)}`} className="rws-team-card" style={{ textDecoration: "none" }}>
                  <div className="rws-team-logo-wrap">
                    <img 
                      src={teamLogo} 
                      alt={candidate.club}
                      onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }}
                    />
                  </div>
                  <h3 className="rws-team-name">{candidate.club}</h3>
                  <div className="rws-team-manager">Manager: {candidate.name} {candidate.r2g_id && `(${candidate.r2g_id})`}</div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
