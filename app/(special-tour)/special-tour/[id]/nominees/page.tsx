"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchSelectedCandidates } from "@/utils/solo/serverActions";
import "../../../../(rws)/rws/rws.css";
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
          <div className="rws-teams-grid">
            {candidates.map((candidate) => {
              const teamLogo = candidate.customLogoPath || "/assets/images/default-club-logo.png";
              return (
                <div key={candidate.id} className="rws-team-card">
                  <div className="rws-team-logo-wrap">
                    <img 
                      src={teamLogo} 
                      alt={candidate.club}
                      onError={(e) => { e.currentTarget.src = "/assets/images/default-club-logo.png"; }}
                    />
                  </div>
                  <h3 className="rws-team-name">{candidate.club}</h3>
                  <div className="rws-team-manager">Manager: {candidate.name}</div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
