"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchSelectedCandidates } from "@/utils/solo/serverActions";
import "../../../../(rws)/rws.css";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

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

export default function SpecialTourNominees() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadNominees() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          setLoading(false);
          return;
        }

        const t = await fetchTournamentById(tourneyId);
        if (!t) {
          setError(`No Special Tournament details for ID ${tourneyId}`);
          setLoading(false);
          return;
        }
        setTournament(t);
        document.title = `${t.name} - Confirmed Nominees`;

        const list = await fetchSelectedCandidates(t.name);
        setCandidates(list || []);
      } catch (err: any) {
        console.error("Error loading nominees:", err);
        setError(err.message || "Failed to load nominees.");
      } finally {
        setLoading(false);
      }
    }

    loadNominees();
  }, [tourneyId]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading participating teams" />
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
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-user-check" />
            Tournament Roster
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} NOMINEES
          </h1>
          <p className="rws-hero-sub">
            Meet the nominated and confirmed managers and representing clubs competing in {tournament.name}.
          </p>
        </div>

        {/* Candidates Roster Grid */}
        {candidates.length === 0 ? (
          <div className="no-results-message">
            <i className="fa-solid fa-user-slash" />
            <h3>No participating teams found</h3>
            <p>No teams have been added or nominated for this tournament yet.</p>
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
                    <span className="candidate-badge selected">
                      Confirmed
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
