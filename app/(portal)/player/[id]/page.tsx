"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchPlayerCombinedStats } from "@/utils/solo/serverActions";
import PortalNavbar from "@/components/portal/PortalNavbar";
import PortalFooter from "@/components/portal/PortalFooter";
import "../../../portal.css";

function generateStarRating(rating: any) {
  if (!rating) rating = 0;
  const stars = [];
  const parsed = parseInt(rating, 10);
  for (let i = 1; i <= 5; i++) {
    if (i === 3 && parsed >= 6) {
      stars.push(<i key={i} className="fas fa-sun" style={{ color: "gold" }} />);
    } else if (i <= parsed) {
      stars.push(<i key={i} className="fas fa-star" />);
    } else {
      stars.push(<i key={i} className="fas fa-star empty" />);
    }
  }
  return stars;
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function loadStats() {
      try {
        const res = await fetchPlayerCombinedStats(decodeURIComponent(id));
        if (!res) {
          setError(`Player Profile for "${decodeURIComponent(id)}" not found`);
        } else {
          setData(res);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load player combined stats");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [id]);

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ position: 'relative', zIndex: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#c084fc", borderRightColor: "#a855f7", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Compiling Profile Statistics...</p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Profile Not Found</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
              <button onClick={() => router.back()} className="portal-btn btn-secondary">
                <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Go Back
              </button>
            </div>
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  const { manager, stats } = data;

  // Calculate combined stats
  const combined = {
    matches_played: (stats.solo?.matches_played || 0) + (stats.special?.matches_played || 0) + (stats.rws?.matches_played || 0),
    wins: (stats.solo?.wins || 0) + (stats.special?.wins || 0) + (stats.rws?.wins || 0),
    draws: (stats.solo?.draws || 0) + (stats.special?.draws || 0) + (stats.rws?.draws || 0),
    losses: (stats.solo?.losses || 0) + (stats.special?.losses || 0) + (stats.rws?.losses || 0),
    goals_scored: (stats.solo?.goals_scored || 0) + (stats.special?.goals_scored || 0) + (stats.rws?.goals_scored || 0),
    goals_conceded: (stats.solo?.goals_conceded || 0) + (stats.special?.goals_conceded || 0) + (stats.rws?.goals_conceded || 0),
    clean_sheets: (stats.solo?.clean_sheets || 0) + (stats.special?.clean_sheets || 0) + (stats.rws?.clean_sheets || 0),
  };

  const winRate = combined.matches_played > 0 
    ? Math.round((combined.wins / combined.matches_played) * 100) 
    : 0;

  const goalDiff = combined.goals_scored - combined.goals_conceded;

  const managerPhoto = manager.avatar_path 
    ? manager.avatar_path 
    : `/assets/images/managers/${manager.name.toLowerCase().replace(/\s+/g, "-")}.webp`;

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PortalNavbar />

      <main style={{ position: 'relative', zIndex: 2, flex: 1, paddingTop: "80px" }}>
        <div className="portal-container" style={{ maxWidth: "1200px", padding: "0.5rem 1rem" }}>
          
          {/* Navigation Breadcrumb */}
          <div className="portal-breadcrumb" style={{ marginBottom: "0.75rem" }}>
            <button onClick={() => router.back()} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back
            </button>
          </div>

          {/* CSS Styles */}
          <style>{`
            .profile-grid-layout {
              display: grid;
              grid-template-columns: 320px 1fr;
              gap: 2rem;
              margin-top: 1rem;
            }
            .profile-sidebar-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 1.5rem 2rem;
              backdrop-filter: blur(20px);
              text-align: center;
            }
            .profile-main-content {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
            }
            .profile-avatar-wrap {
              width: 140px;
              height: 140px;
              border-radius: 50%;
              margin: 0 auto 1.25rem;
              background-size: cover;
              background-position: center;
              border: 3px solid rgba(168, 85, 247, 0.3);
              box-shadow: 0 0 25px rgba(168, 85, 247, 0.15);
            }
            .manager-profile-name {
              font-family: var(--font-display);
              font-size: 1.5rem;
              font-weight: 800;
              color: #fff;
              margin: 0 0 0.5rem;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .manager-profile-id {
              display: inline-block;
              font-size: 0.72rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(168, 85, 247, 0.1);
              border: 1px solid rgba(168, 85, 247, 0.2);
              color: #c084fc;
              margin-bottom: 1rem;
            }
            .sidebar-stat-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 10px 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.03);
              font-size: 0.85rem;
            }
            .sidebar-stat-row:last-child {
              border-bottom: none;
            }
            .sidebar-stat-label {
              color: rgba(255, 255, 255, 0.45);
            }
            .sidebar-stat-value {
              color: #fff;
              font-weight: 600;
            }
            .overview-stats-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1rem;
            }
            .overview-stat-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 1rem;
              backdrop-filter: blur(20px);
              text-align: center;
            }
            .overview-val {
              font-family: var(--font-display);
              font-size: 2rem;
              font-weight: 800;
              color: #fff;
              margin-bottom: 0.25rem;
            }
            .overview-lbl {
              font-size: 0.7rem;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.4);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .tournaments-breakdown-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1.25rem;
            }
            .tourney-breakdown-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 1.25rem;
              backdrop-filter: blur(20px);
            }
            .tourney-header-icon {
              width: 38px;
              height: 38px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.1rem;
              margin-bottom: 0.75rem;
            }
            .tourney-breakdown-title {
              font-family: var(--font-display);
              font-size: 1.05rem;
              font-weight: 800;
              color: #fff;
              margin: 0 0 0.75rem;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }
            .breakdown-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 8px 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.03);
              font-size: 0.82rem;
            }
            .breakdown-row:last-child {
              border-bottom: none;
            }
            .breakdown-lbl {
              color: rgba(255, 255, 255, 0.5);
            }
            .breakdown-val {
              color: #fff;
              font-weight: 600;
            }
            .wallet-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
              margin-top: 0.75rem;
            }
            .wallet-pill {
              display: flex;
              align-items: center;
              gap: 0.75rem;
              padding: 12px 16px;
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 8px;
            }
            .wallet-icon {
              font-size: 1.1rem;
            }
            .wallet-pill-label {
              font-size: 0.65rem;
              color: rgba(255, 255, 255, 0.4);
              text-transform: uppercase;
            }
            .wallet-pill-val {
              font-size: 0.95rem;
              font-weight: 700;
              color: #fff;
            }

            /* Responsive Tweaks */
            @media (max-width: 992px) {
              .profile-grid-layout {
                grid-template-columns: 1fr;
              }
              .tournaments-breakdown-grid {
                grid-template-columns: 1fr;
              }
            }
            @media (max-width: 576px) {
              .overview-stats-grid {
                grid-template-columns: repeat(2, 1fr);
              }
              .wallet-grid {
                grid-template-columns: 1fr;
                gap: 0.75rem;
              }
            }
          `}</style>

          {/* Hero Banner Header */}
          <div style={{ textAlign: "center", padding: "0 0 0.5rem", animation: "rwsFadeUp 0.5s ease-out both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "4px 14px", borderRadius: "20px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: "0.72rem", fontWeight: 600, color: "#c084fc", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <i className="fa-solid fa-user-circle" /> Player Profile
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800, color: "#fff", margin: "0 0 0.25rem", letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              UNIFIED PLAYER PROFILE
            </h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", maxWidth: "550px", margin: "0 auto", lineHeight: 1.4 }}>
              Comprehensive performance ledger across Solo Tour, Special Tour, and R2G World Series.
            </p>
          </div>

          {/* Layout Grid */}
          <div className="profile-grid-layout" style={{ animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both", animationDelay: "100ms" }}>
            
            {/* Sidebar */}
            <div className="profile-sidebar-card">
              <div 
                className="profile-avatar-wrap"
                style={{
                  backgroundImage: `url('${managerPhoto}'), url('/assets/images/default-manager.webp')`
                }}
              />
              <h2 className="manager-profile-name">{manager.name}</h2>
              {manager.r2g_id && <span className="manager-profile-id">{manager.r2g_id}</span>}

              <div style={{ marginTop: "1rem" }}>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Tactical Star Rating</span>
                  <span className="sidebar-stat-value" style={{ display: "flex", gap: "2px", color: "#fbbf24" }}>
                    {generateStarRating(manager.star_rating)}
                  </span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Overall Rating</span>
                  <span className="sidebar-stat-value" style={{ color: "#c084fc" }}>{manager.overall_rating || 80} OVR</span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Active Club</span>
                  <span className="sidebar-stat-value">{manager.club_name || "FREE AGENT"}</span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Status</span>
                  <span className="sidebar-stat-value" style={{ color: manager.is_active !== false ? "#22c55e" : "#ef4444" }}>
                    {manager.is_active !== false ? "Active Tactician" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="profile-main-content">
              
              {/* Combined Career Totals */}
              <div>
                <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  <i className="fa-solid fa-chart-pie" style={{ color: "#c084fc", marginRight: "8px" }} /> Combined Career Record
                </h3>
                <div className="overview-stats-grid">
                  <div className="overview-stat-card">
                    <div className="overview-val">{combined.matches_played}</div>
                    <div className="overview-lbl">Matches</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #22c55e" }}>
                    <div className="overview-val" style={{ color: "#22c55e" }}>{combined.wins}</div>
                    <div className="overview-lbl">Wins</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #a855f7" }}>
                    <div className="overview-val" style={{ color: "#c084fc" }}>{winRate}%</div>
                    <div className="overview-lbl">Win Rate</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #f43f5e" }}>
                    <div className="overview-val" style={{ color: goalDiff >= 0 ? "#22c55e" : "#f43f5e" }}>
                      {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                    </div>
                    <div className="overview-lbl">Goal Diff</div>
                  </div>
                </div>
              </div>

              {/* Tournaments Breakdown */}
              <div>
                <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  <i className="fa-solid fa-sitemap" style={{ color: "#c084fc", marginRight: "8px" }} /> Tournament Category Breakdown
                </h3>
                <div className="tournaments-breakdown-grid">
                  
                  {/* Solo Tour */}
                  <div className="tourney-breakdown-card" style={{ borderTop: "3px solid #3b82f6" }}>
                    <div className="tourney-header-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                      <i className="fa-solid fa-bolt" />
                    </div>
                    <h4 className="tourney-breakdown-title">Solo Tour (Career)</h4>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Matches Played</span>
                      <span className="breakdown-val">{stats.solo?.matches_played || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Record (W-D-L)</span>
                      <span className="breakdown-val">
                        {stats.solo?.wins || 0} - {stats.solo?.draws || 0} - {stats.solo?.losses || 0}
                      </span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Scored</span>
                      <span className="breakdown-val">{stats.solo?.goals_scored || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Conceded</span>
                      <span className="breakdown-val">{stats.solo?.goals_conceded || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Clean Sheets</span>
                      <span className="breakdown-val">{stats.solo?.clean_sheets || 0}</span>
                    </div>
                  </div>

                  {/* Special Tour */}
                  <div className="tourney-breakdown-card" style={{ borderTop: "3px solid #c084fc" }}>
                    <div className="tourney-header-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#c084fc" }}>
                      <i className="fa-solid fa-wand-magic-sparkles" />
                    </div>
                    <h4 className="tourney-breakdown-title">Special Tour</h4>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Matches Played</span>
                      <span className="breakdown-val">{stats.special?.matches_played || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Record (W-D-L)</span>
                      <span className="breakdown-val">
                        {stats.special?.wins || 0} - {stats.special?.draws || 0} - {stats.special?.losses || 0}
                      </span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Scored</span>
                      <span className="breakdown-val">{stats.special?.goals_scored || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Conceded</span>
                      <span className="breakdown-val">{stats.special?.goals_conceded || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Clean Sheets</span>
                      <span className="breakdown-val">{stats.special?.clean_sheets || 0}</span>
                    </div>
                  </div>

                  {/* R2G World Series */}
                  <div className="tourney-breakdown-card" style={{ borderTop: "3px solid #fbbf24" }}>
                    <div className="tourney-header-icon" style={{ background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24" }}>
                      <i className="fa-solid fa-crown" />
                    </div>
                    <h4 className="tourney-breakdown-title">World Series (RWS)</h4>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Matches Played</span>
                      <span className="breakdown-val">{stats.rws?.matches_played || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Record (W-D-L)</span>
                      <span className="breakdown-val">
                        {stats.rws?.wins || 0} - {stats.rws?.draws || 0} - {stats.rws?.losses || 0}
                      </span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Scored</span>
                      <span className="breakdown-val">{stats.rws?.goals_scored || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Goals Conceded</span>
                      <span className="breakdown-val">{stats.rws?.goals_conceded || 0}</span>
                    </div>
                    <div className="breakdown-row">
                      <span className="breakdown-lbl">Clean Sheets</span>
                      <span className="breakdown-val">{stats.rws?.clean_sheets || 0}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Wallet Details (if career wallet is active) */}
              {manager.overall_rating !== undefined && (
                <div>
                  <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                    <i className="fa-solid fa-wallet" style={{ color: "#c084fc", marginRight: "8px" }} /> Career Wallet Status
                  </h3>
                  <div className="wallet-grid">
                    <div className="wallet-pill">
                      <div className="wallet-icon" style={{ color: "#fbbf24" }}><i className="fas fa-coins" /></div>
                      <div>
                        <div className="wallet-pill-label">R2G Coins</div>
                        <div className="wallet-pill-val">{manager.r2g_coin_balance || 0}</div>
                      </div>
                    </div>
                    <div className="wallet-pill">
                      <div className="wallet-icon" style={{ color: "#38bdf8" }}><i className="fas fa-gem" /></div>
                      <div>
                        <div className="wallet-pill-label">R2G Tokens</div>
                        <div className="wallet-pill-val">{manager.r2g_token_balance || 0}</div>
                      </div>
                    </div>
                    <div className="wallet-pill">
                      <div className="wallet-icon" style={{ color: "#c084fc" }}><i className="fas fa-ticket-simple" /></div>
                      <div>
                        <div className="wallet-pill-label">R2G Vouchers</div>
                        <div className="wallet-pill-val">{manager.r2g_voucher_balance || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
