"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear, fetchSelectedCandidates } from "@/utils/solo/serverActions";
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
  stat1: { label: string; value: string };
  stat2: { label: string; value: string };
  stat3: { label: string; value: string };
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
    document.title = `RWS ${yearStr} - Selected Candidates`;

    async function loadCandidates() {
      try {
        if (isNaN(year)) {
          setError("Invalid RWS Year");
          setLoading(false);
          return;
        }

        const s = await fetchSeasonByRwsYear(year);
        if (!s) {
          setError(`No R2G World Series scheduled for year ${yearStr}`);
          setLoading(false);
          return;
        }

        setSeason(s);

        const data = await fetchSelectedCandidates("R2G World Series", s.id);
        if (data && (data as any).error) {
          throw new Error((data as any).error);
        }
        setCandidates(data);
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
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading selected candidates...</p>
        </div>
      </div>
    );
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

      <div className="portal-container">
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to RWS Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-user-check" />
            RWS Roster
          </div>
          <h1 className="rws-hero-title">
            SELECTED CANDIDATES {yearStr}
          </h1>
          <p className="rws-hero-sub">
            Meet the nominated and selected club managers participating in RWS {yearStr} for Solo Tour Season {season.season_number}.
          </p>
        </div>

        {/* Candidates Roster Grid */}
        {candidates.length === 0 ? (
          <div className="no-results-message">
            <i className="fa-solid fa-user-slash" />
            <h3>No candidates selected</h3>
            <p>There are no managers selected for the R2G World Series yet.</p>
          </div>
        ) : (
          <div className="candidates-grid">
            {candidates.map((candidate) => {
              const avatarSrc = candidate.avatar || `/assets/images/managers/${candidate.name.toLowerCase().replace(/\s+/g, "-")}.webp`;
              return (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-header">
                    <img 
                      src={avatarSrc} 
                      alt={candidate.name} 
                      className="candidate-avatar"
                      onError={(e) => {
                        e.currentTarget.src = "/assets/images/default-manager.webp";
                      }}
                    />
                    <div className="candidate-info">
                      <h3 className="candidate-name">{candidate.name}</h3>
                      <span className="candidate-role">{candidate.role}</span>
                    </div>
                    <span className={`candidate-badge ${candidate.status}`}>
                      {candidate.status}
                    </span>
                  </div>

                  <div className="candidate-stats">
                    <div className="cand-stat-item">
                      <span className="cand-stat-val">{candidate.stat1.value}</span>
                      <span className="cand-stat-lbl">{candidate.stat1.label}</span>
                    </div>
                    <div className="cand-stat-item">
                      <span className="cand-stat-val">{candidate.stat2.value}</span>
                      <span className="cand-stat-lbl">{candidate.stat2.label}</span>
                    </div>
                    <div className="cand-stat-item">
                      <span className="cand-stat-val">{candidate.stat3.value}</span>
                      <span className="cand-stat-lbl">{candidate.stat3.label}</span>
                    </div>
                  </div>

                  <div className="candidate-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div 
                        style={{ 
                          width: "18px", 
                          height: "18px", 
                          backgroundSize: "contain", 
                          backgroundPosition: "center", 
                          backgroundRepeat: "no-repeat", 
                          backgroundImage: `url('${candidate.customLogoPath || `/assets/images/club-logos/${encodeURIComponent(candidate.club.replace(/\s+/g, '-'))}.webp`}'), url('/assets/images/default-club-logo.png')`
                        }}
                      />
                      <span className="candidate-club">{candidate.club}</span>
                    </div>
                    <span className="candidate-rating">OVR {candidate.rating}</span>
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
