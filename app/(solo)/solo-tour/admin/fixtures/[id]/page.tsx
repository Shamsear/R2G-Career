"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import "../../../../../portal.css";
import "../../admin.css";
import { fetchFixtureById, updateFixture } from "@/utils/solo/serverActions";

interface Fixture {
  id: number;
  tournamentId: number;
  tournamentName: string;
  tournamentType: string;
  homeClub: string;
  homeLogo: string;
  awayClub: string;
  awayLogo: string;
  homeScore: number | null;
  awayScore: number | null;
  roundNumber: number;
  matchStatus: string;
  matchStatusReason: string | null;
}

function AdminFixtureDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fixtureId = parseInt(params.id as string, 10);
  const tParam = searchParams.get("t") || "";
  const rParam = searchParams.get("r") || "";

  const backHref = tParam 
    ? `/solo-tour/admin/fixtures?t=${tParam}&r=${rParam}`
    : "/solo-tour/admin/fixtures";

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [matchStatus, setMatchStatus] = useState<string>("played");
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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
        setMatchStatus(data.matchStatus || "played");
        setHomeScore(data.homeScore !== null ? data.homeScore.toString() : "");
        setAwayScore(data.awayScore !== null ? data.awayScore.toString() : "");
        setNotes(data.matchStatusReason || "");
        document.title = `Admin Match Center - ${data.homeClub} vs ${data.awayClub}`;
      } catch (err: any) {
        console.error("Error loading fixture details:", err);
        setError("Failed to load match details.");
      } finally {
        setLoading(false);
      }
    }

    loadFixture();
  }, [fixtureId]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    let finalHome: number | null = null;
    let finalAway: number | null = null;
    let finalStatus = matchStatus;

    if (matchStatus === "played" || matchStatus === "extended_full" || matchStatus === "extended_half" || matchStatus === "scheduled") {
      if (homeScore !== "" && awayScore !== "") {
        finalHome = parseInt(homeScore);
        finalAway = parseInt(awayScore);
        if (matchStatus === "scheduled") {
          finalStatus = "played"; // Automatically switch to played when scores are provided!
        }
      } else if (matchStatus === "played" || matchStatus === "extended_full" || matchStatus === "extended_half") {
        showToast("⚠️ Score digits are required for played/extended matches!");
        return;
      }
    }

    startTransition(async () => {
      try {
        await updateFixture(
          fixtureId,
          finalHome,
          finalAway,
          finalStatus,
          notes === "" ? null : notes
        );
        showToast(
          fixture.tournamentType === 'rws' || fixture.tournamentType === 'special'
            ? "✅ Match result saved! Standings updated."
            : "✅ Match results and payouts saved successfully!"
        );
        
        setTimeout(() => {
          router.push(backHref);
        }, 800);
      } catch (err: any) {
        showToast("❌ Error saving match results: " + err.message);
      }
    });
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px" }}>
          <div className="portal-breadcrumb">
            <Link href={backHref} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Fixture Manager
            </Link>
          </div>
          <div className="admin-card" style={{ padding: "2rem", marginTop: "1.5rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" }}>
            <div className="skeleton" style={{ width: "40%", height: "24px", borderRadius: "4px", marginBottom: "2rem", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", gap: "1rem" }}>
                <div className="skeleton" style={{ flex: 1, height: "40px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }} />
                <div className="skeleton" style={{ flex: 1, height: "40px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }} />
              </div>
              <div className="skeleton" style={{ width: "100%", height: "40px", borderRadius: "6px", background: "rgba(255,255,255,0.04)" }} />
              <div className="skeleton" style={{ width: "130px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }} />
            </div>
          </div>
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
        <div className="portal-container" style={{ maxWidth: "800px" }}>
          <div className="portal-breadcrumb">
            <Link href={backHref} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Fixture Manager
            </Link>
          </div>
          <div className="admin-card" style={{ padding: "3rem", textAlign: "center", border: "1px solid rgba(239,68,68,0.2)", marginTop: "1.5rem" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1rem" }} />
            <h3 style={{ fontSize: "1.25rem", color: "#fff", margin: "0 0 0.5rem" }}>Fixture Error</h3>
            <p style={{ color: "var(--text-secondary)" }}>{error || "Fixture details not found."}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentScoreDisplay = fixture.homeScore !== null && fixture.awayScore !== null 
    ? `${fixture.homeScore} - ${fixture.awayScore}`
    : "VS";

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          zIndex: 99999,
          background: toast.startsWith("❌") 
            ? "rgba(239, 68, 68, 0.25)" 
            : toast.startsWith("⚠️") 
            ? "rgba(245, 158, 11, 0.25)" 
            : "rgba(34, 197, 94, 0.25)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: toast.startsWith("❌") 
            ? "1px solid rgba(239, 68, 68, 0.5)" 
            : toast.startsWith("⚠️") 
            ? "1px solid rgba(245, 158, 11, 0.5)" 
            : "1px solid rgba(34, 197, 94, 0.5)",
          color: "#ffffff",
          padding: "1rem 1.5rem",
          borderRadius: "12px",
          boxShadow: toast.startsWith("❌") 
            ? "0 8px 32px rgba(239, 68, 68, 0.3)" 
            : toast.startsWith("⚠️") 
            ? "0 8px 32px rgba(245, 158, 11, 0.3)" 
            : "0 8px 32px rgba(34, 197, 94, 0.3)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontWeight: "600",
          fontSize: "0.9rem"
        }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: toast.startsWith("❌") ? "rgba(239, 68, 68, 0.35)" : toast.startsWith("⚠️") ? "rgba(245, 158, 11, 0.35)" : "rgba(34, 197, 94, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1rem"
          }}>
            {toast.startsWith("❌") ? <i className="fa-solid fa-xmark" style={{ color: "#ef4444" }} /> : toast.startsWith("⚠️") ? <i className="fa-solid fa-triangle-exclamation" style={{ color: "#f59e0b" }} /> : <i className="fa-solid fa-check" style={{ color: "#22c55e" }} />}
          </div>
          <span>{toast.replace(/^[✅❌⚠️]\s*/, "")}</span>
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "800px" }}>
        <div className="portal-breadcrumb">
          <Link href={backHref} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Fixture Manager
          </Link>
        </div>

        <div className="portal-header" style={{ marginBottom: "1.5rem" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-scale-balanced" /> {fixture.tournamentName} // ROUND {fixture.roundNumber}
          </div>
          <h1 className="portal-title">MANAGE MATCH RESULT</h1>
          <p className="portal-subtitle">
            {fixture.tournamentType === 'rws' || fixture.tournamentType === 'special'
              ? "Submit match scores or declare walkovers. Standings and stats will update automatically — no financial payouts apply for this tournament."
              : "Submit match scores or declare walkovers. Win/loss/draw bonuses and walkover fines are computed and paid out instantly."}
          </p>
        </div>

        {/* Hero Scoreboard View */}
        <div className="admin-card" style={{ padding: "2rem", textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1.5rem" }}>
            {/* Home Club */}
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              {fixture.homeLogo ? (
                <img 
                  src={fixture.homeLogo} 
                  alt={fixture.homeClub} 
                  style={{ width: "64px", height: "64px", objectFit: "contain" }} 
                />
              ) : (
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "2px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--solo-primary)", fontWeight: "800" }}>
                  {fixture.homeClub.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 style={{ fontSize: "1.1rem", color: "#ffffff", fontWeight: "700", margin: "0" }}>{fixture.homeClub}</h2>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>HOME</span>
            </div>

            {/* Score */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                background: "rgba(8, 11, 17, 0.6)",
                border: "2px solid var(--border-soft)",
                borderRadius: "8px",
                padding: "0.5rem 1.5rem",
                fontFamily: "var(--font-mono)",
                fontSize: "2rem",
                fontWeight: "900",
                color: "#ffffff"
              }}>
                {currentScoreDisplay}
              </div>
              <span style={{
                fontSize: "0.65rem",
                marginTop: "0.4rem",
                textTransform: "uppercase",
                color: fixture.matchStatus === 'played' && fixture.homeScore !== null ? "#22c55e" : "var(--solo-primary)",
                fontWeight: "bold"
              }}>
                {fixture.matchStatus === 'played' && fixture.homeScore !== null ? "played" : fixture.matchStatus.replace('_', ' ')}
              </span>
            </div>

            {/* Away Club */}
            <div style={{ flex: "1 1 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
              {fixture.awayLogo ? (
                <img 
                  src={fixture.awayLogo} 
                  alt={fixture.awayClub} 
                  style={{ width: "64px", height: "64px", objectFit: "contain" }} 
                />
              ) : (
                <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(255,255,255,0.03)", border: "2px solid var(--border-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", color: "var(--solo-primary)", fontWeight: "800" }}>
                  {fixture.awayClub.substring(0, 2).toUpperCase()}
                </div>
              )}
              <h2 style={{ fontSize: "1.1rem", color: "#ffffff", fontWeight: "700", margin: "0" }}>{fixture.awayClub}</h2>
              <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)" }}>AWAY</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="admin-card" style={{ marginTop: 0 }}>
          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Match Status</label>
                <select 
                  className="admin-select" 
                  value={matchStatus} 
                  onChange={(e) => setMatchStatus(e.target.value)}
                >
                  <option value="scheduled">Scheduled / Unplayed</option>
                  <option value="played">Played (Scores)</option>
                  <option value="extended_full">Full Match Extension (Scores + Fee)</option>
                  <option value="extended_half">Half Match Extension (Scores + Half Fee)</option>
                  <option value="wo_home">Walkover (Home Win: 3 - 0)</option>
                  <option value="wo_away">Walkover (Away Win: 0 - 3)</option>
                  <option value="void">Void / Nulled</option>
                </select>
              </div>

              {(matchStatus === "played" || matchStatus === "extended_full" || matchStatus === "extended_half" || matchStatus === "scheduled") ? (
                <div className="admin-form-group">
                  <label>Enter Score (Home - Away)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="number"
                      className="admin-input"
                      style={{ textAlign: "center", fontWeight: "bold", width: "80px" }}
                      value={homeScore}
                      placeholder="Home"
                      min="0"
                      onChange={(e) => setHomeScore(e.target.value)}
                      required={matchStatus === "played" || matchStatus === "extended_full" || matchStatus === "extended_half"}
                    />
                    <span style={{ color: "#fff", fontWeight: "bold" }}>-</span>
                    <input
                      type="number"
                      className="admin-input"
                      style={{ textAlign: "center", fontWeight: "bold", width: "80px" }}
                      value={awayScore}
                      placeholder="Away"
                      min="0"
                      onChange={(e) => setAwayScore(e.target.value)}
                      required={matchStatus === "played" || matchStatus === "extended_full" || matchStatus === "extended_half"}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", color: "var(--text-secondary)", fontSize: "0.85rem", padding: "0.5rem" }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "var(--solo-primary)" }} />
                  Scores are determined automatically for this status.
                </div>
              )}
            </div>

            <div className="admin-form-group">
              <label>Match Notes / Status Reason</label>
              <input
                type="text"
                className="admin-input"
                placeholder="e.g., Walkover due to Neo Tokyo FC being absent; Nulled due to restart."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", gap: "10px", marginTop: "1rem" }}>
              <button
                type="submit"
                className="portal-btn btn-primary"
                style={{ height: "42px", flex: 1, justifyContent: "center" }}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }} />
                    Saving Results...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" style={{ marginRight: "6px" }} />
                    Save Match Result
                  </>
                )}
              </button>
              <Link 
                href={backHref} 
                className="portal-btn btn-secondary" 
                style={{ height: "42px", padding: "0 20px", display: "inline-flex", alignItems: "center" }}
              >
                Back
              </Link>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

export default function AdminFixtureDetail() {
  return (
    <Suspense fallback={
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-container" style={{ textAlign: "center", paddingTop: "5rem", color: "var(--text-secondary)" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "2rem", color: "var(--solo-primary)" }} />
        </div>
      </div>
    }>
      <AdminFixtureDetailContent />
    </Suspense>
  );
}
