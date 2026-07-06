"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchSelectedCandidates } from "@/utils/solo/serverActions";

interface Candidate {
  id: number;
  name: string;
  club: string;
  role: string;
  status: string;
  rating: number;
  avatar: string;
  stat1: { label: string; value: string };
  stat2: { label: string; value: string };
  stat3: { label: string; value: string };
}

export default function SelectedCandidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "RWS - Selected Candidates";

    async function loadCandidates() {
      try {
        const data = await fetchSelectedCandidates("R2G World Series");
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
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
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
            SELECTED CANDIDATES
          </h1>
          <p className="rws-hero-sub">
            Meet the nominated and selected club managers participating in the prestigious R2G World Series tournament.
          </p>
        </div>

        {/* Candidates Roster Grid */}
        {loading ? (
          <div className="candidates-grid">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="candidate-card skeleton" style={{ minHeight: "220px" }}>
                  <div className="skeleton-header" style={{ display: "flex", gap: "1rem", padding: "1.25rem" }}>
                    <div className="skeleton-photo" style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
                    <div className="skeleton-info" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <div className="skeleton-name" style={{ height: "16px", background: "rgba(255,255,255,0.05)", width: "60%" }} />
                      <div className="skeleton-club" style={{ height: "12px", background: "rgba(255,255,255,0.05)", width: "40%" }} />
                    </div>
                  </div>
                  <div className="skeleton-stats" style={{ display: "flex", justifyContent: "space-between", padding: "1.25rem", background: "rgba(255,255,255,0.02)" }}>
                    <div className="skeleton-stat" style={{ height: "14px", width: "20%", background: "rgba(255,255,255,0.05)" }} />
                    <div className="skeleton-stat" style={{ height: "14px", width: "20%", background: "rgba(255,255,255,0.05)" }} />
                    <div className="skeleton-stat" style={{ height: "14px", width: "20%", background: "rgba(255,255,255,0.05)" }} />
                  </div>
                </div>
              ))}
          </div>
        ) : error ? (
          <div className="no-results-message" style={{ borderStyle: "solid", borderColor: "rgba(239, 68, 68, 0.2)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: "#ef4444" }} />
            <h3>Error loading selected candidates</h3>
            <p>{error}</p>
            <button className="portal-btn btn-secondary reset-btn" onClick={() => window.location.reload()}>
              Try Again
            </button>
          </div>
        ) : candidates.length === 0 ? (
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

                  <div className="candidate-footer">
                    <span className="candidate-club">{candidate.club}</span>
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
