"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchSelectedCandidates } from "@/utils/solo/serverActions";
import "../../../../(rws)/rws/rws.css";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

interface Candidate {
  id: number;
  name: string;
  r2g_id?: string;
  club: string;
  role: string;
  status: string;
  avatar: string;
  customLogoPath?: string | null;
  logoPath?: string | null;
  stat1: { label: string; value: string };
  stat2: { label: string; value: string };
  stat3: { label: string; value: string };
}

export default function SpecialTourNominees() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredCandidates = useMemo(() => {
    if (!searchQuery.trim()) return candidates;
    const q = searchQuery.toLowerCase();
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.r2g_id && c.r2g_id.toLowerCase().includes(q)) ||
        (c.club && c.club.toLowerCase().includes(q))
    );
  }, [candidates, searchQuery]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading tournament roster..." />
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
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Tournament Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isSpecial = tournament.tournament_type === "special";

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div style={{ maxWidth: "1400px", width: "95%", margin: "0 auto", padding: "1.5rem 1rem 4rem", position: "relative", zIndex: 2 }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ marginBottom: "1rem" }}>
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Banner Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-user-check" />
            Tournament Roster
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} NOMINEES
          </h1>
        </div>

        {/* Search bar below hero section */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: "420px" }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "0.85rem" }} />
            <input
              type="text"
              placeholder={isSpecial ? "Search manager name or ID..." : "Search manager or club..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 16px 10px 40px",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none"
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Candidates Roster Grid */}
        {filteredCandidates.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "4rem 2rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "16px",
            color: "var(--text-secondary)"
          }}>
            <i className="fa-solid fa-user-slash" style={{ fontSize: "3rem", marginBottom: "1rem", color: "var(--text-secondary)" }} />
            <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>
              {searchQuery ? "No matching managers found" : "No nominees added yet"}
            </h3>
            <p style={{ fontSize: "0.85rem", maxWidth: "400px", margin: "0 auto 1.5rem" }}>
              {searchQuery ? `No candidates matched "${searchQuery}". Try searching for another name or ID.` : "No managers or teams have been assigned to this tournament."}
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="portal-btn btn-secondary"
                style={{ padding: "8px 20px", fontSize: "0.85rem" }}
              >
                Reset Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="candidates-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filteredCandidates.map((candidate) => {
              const displayLogo = isSpecial
                ? (candidate.avatar || candidate.customLogoPath || "/assets/images/default-avatar.png")
                : (candidate.customLogoPath || candidate.logoPath || "/assets/images/default-club-logo.png");

              return (
                <div key={candidate.id} className="candidate-card">
                  <div className="candidate-header">
                    <img
                      src={displayLogo}
                      alt={isSpecial ? candidate.name : candidate.club}
                      className="candidate-avatar"
                      style={isSpecial ? { borderRadius: "50%", objectFit: "cover" } : { borderRadius: "8px", objectFit: "contain" }}
                      onError={(e) => {
                        e.currentTarget.src = isSpecial ? "/assets/images/default-avatar.png" : "/assets/images/default-club-logo.png";
                      }}
                    />
                    <div className="candidate-info">
                      <div className="candidate-name" title={isSpecial ? candidate.name : candidate.club}>
                        {isSpecial ? candidate.name : candidate.club}
                      </div>
                      {!isSpecial && (
                        <div className="candidate-role">
                          Manager: {candidate.name}
                        </div>
                      )}
                    </div>
                    {candidate.r2g_id && (
                      <span className="candidate-badge nominated">
                        {candidate.r2g_id}
                      </span>
                    )}
                  </div>

                  <div className="candidate-stats">
                    <div className="cand-stat-item">
                      <div className="cand-stat-val" style={{ color: "#10b981" }}>{candidate.stat1?.value || "0%"}</div>
                      <div className="cand-stat-lbl">{candidate.stat1?.label || "Win Rate"}</div>
                    </div>
                    <div className="cand-stat-item">
                      <div className="cand-stat-val" style={{ color: "#38bdf8" }}>{candidate.stat2?.value || "0"}</div>
                      <div className="cand-stat-lbl">{candidate.stat2?.label || "Matches"}</div>
                    </div>
                    <div className="cand-stat-item">
                      <div className="cand-stat-val" style={{ color: "var(--gold)" }}>{candidate.stat3?.value || "0"}</div>
                      <div className="cand-stat-lbl">{candidate.stat3?.label || "Cups"}</div>
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
