"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPlayerCombinedStats } from "@/utils/solo/serverActions";
import PortalNavbar from "@/components/portal/PortalNavbar";
import PortalFooter from "@/components/portal/PortalFooter";
import "../../../portal.css";

const MEDAL_LEVEL_COLORS: Record<number, string> = {
  1: '#ef4444', // Red
  2: '#3b82f6', // Blue
  3: '#10b981', // Green
  4: '#c084fc', // Purple
  5: '#fbbf24'  // Gold
};

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V'
};

export default function MemberProfilePage() {
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
          setError(`Tactician Profile for "${decodeURIComponent(id)}" not found`);
        } else {
          setData(res);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load tactician profile stats");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#a855f7", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading Tactician Profile...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <div className="portal-card" style={{ padding: "3rem" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Error Loading Profile</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
              <button onClick={() => router.back()} className="portal-btn btn-secondary">
                Go Back
              </button>
            </div>
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  const { manager, stats, medalStats } = data;
  const combined = stats.solo;

  const totalPlayed = combined.matches_played || 0;
  const totalWins = combined.wins || 0;
  const winRate = totalPlayed > 0 ? Math.round((totalWins / totalPlayed) * 100) : 0;
  const csRate = totalPlayed > 0 ? Math.round(((combined.clean_sheets || 0) / totalPlayed) * 100) : 0;
  const goalDiff = (combined.goals_scored || 0) - (combined.goals_conceded || 0);

  const managerPhoto = manager.avatar_path || "/assets/images/default-manager.webp";

  const medalInfo = medalStats || {
    level: 1,
    league: "Amateur",
    normalExp: 0,
    medalExp: 0,
    totalExp: 0,
    progressPercent: 0,
    claimedCount: 0,
    medals: [],
    trophiesList: [],
    awardsList: [],
    awardsCount: { goldenBoot: 0, goldenGlove: 0, goldenBall: 0, bestDefender: 0 }
  };

  const progressPercent = medalInfo.progressPercent || 0;

  // Filter top claimed medals for showcase
  const topClaimedMedals = (medalInfo.medals || [])
    .filter((m: any) => m.level > 0)
    .sort((a: any, b: any) => b.level - a.level)
    .slice(0, 5);

  return (
    <div className="app-container">
      <PortalNavbar />

      <main className="main-content">
        <div className="portal-container" style={{ maxWidth: "100%", width: "100%", padding: "1.5rem 1.5rem" }}>
          
          {/* Navigation Breadcrumb */}
          <div className="portal-breadcrumb" style={{ marginBottom: "0.75rem" }}>
            <button onClick={() => router.back()} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back
            </button>
          </div>

          {/* CSS Styles for Fluid Responsive Layout */}
          <style>{`
            .profile-grid-layout {
              display: grid;
              grid-template-columns: minmax(280px, 320px) 1fr;
              gap: 1.5rem;
              margin-top: 1rem;
            }
            .profile-sidebar-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 1.5rem 1.5rem;
              backdrop-filter: blur(20px);
              text-align: center;
              height: fit-content;
            }
            .profile-main-content {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
              min-width: 0;
            }
            .profile-avatar-wrap {
              width: 130px;
              height: 130px;
              border-radius: 12px;
              margin: 0 auto 1.25rem;
              background-size: cover;
              background-position: center;
              border: 3px solid rgba(168, 85, 247, 0.3);
              box-shadow: 0 0 25px rgba(168, 85, 247, 0.15);
            }
            .manager-profile-name {
              font-family: var(--font-display);
              font-size: 1.4rem;
              font-weight: 800;
              color: #fff;
              margin: 0 0 0.5rem;
              letter-spacing: 1px;
              text-transform: uppercase;
              word-break: break-word;
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
            
            /* Responsive 10 Stats Grids (5 x 2) */
            .overview-stats-grid-10 {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 0.75rem;
            }
            .overview-stat-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 0.85rem 0.5rem;
              backdrop-filter: blur(20px);
              text-align: center;
              min-width: 0;
            }
            .overview-val {
              font-family: var(--font-display);
              font-size: 1.6rem;
              font-weight: 800;
              color: #fff;
              margin-bottom: 0.2rem;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .overview-lbl {
              font-size: 0.65rem;
              font-weight: 700;
              color: rgba(255, 255, 255, 0.4);
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .awards-showcase-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
              gap: 1.5rem;
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
              font-size: 1rem;
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

            .medal-showcase-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 1rem;
              margin-top: 0.75rem;
            }
            .medal-card {
              background: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 0.85rem;
              display: flex;
              align-items: center;
              gap: 10px;
              transition: all 0.2s ease;
            }
            .medal-card:hover {
              transform: translateY(-2px);
              background: rgba(255, 255, 255, 0.04);
            }
            .medal-icon-wrap {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.1rem;
              flex-shrink: 0;
            }
            .level-progress-wrap {
              width: 100%;
              height: 8px;
              border-radius: 4px;
              background: rgba(255, 255, 255, 0.08);
              margin-top: 6px;
              overflow: hidden;
            }
            .level-progress-bar {
              height: 100%;
              border-radius: 4px;
              background: linear-gradient(90deg, #c084fc, #a855f7);
              transition: width 0.5s ease-out;
            }

            /* Responsive Layout Media Queries */
            @media (max-width: 1100px) {
              .profile-grid-layout {
                grid-template-columns: 1fr;
              }
              .tournaments-breakdown-grid {
                grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              }
            }
            @media (max-width: 768px) {
              .overview-stats-grid-10 {
                grid-template-columns: repeat(3, 1fr);
              }
            }
            @media (max-width: 480px) {
              .overview-stats-grid-10 {
                grid-template-columns: repeat(2, 1fr);
              }
            }
          `}</style>

          {/* Layout Grid */}
          <div className="profile-grid-layout" style={{ animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}>
            
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
                  <span className="sidebar-stat-label">Active Club</span>
                  <span className="sidebar-stat-value">{manager.club_name || "FREE AGENT"}</span>
                </div>
                {manager.mob_no && (
                  <div className="sidebar-stat-row">
                    <span className="sidebar-stat-label">Mobile No</span>
                    <span className="sidebar-stat-value">{manager.mob_no}</span>
                  </div>
                )}
                {manager.place && (
                  <div className="sidebar-stat-row">
                    <span className="sidebar-stat-label">Place</span>
                    <span className="sidebar-stat-value">{manager.place}</span>
                  </div>
                )}
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Status</span>
                  <span className="sidebar-stat-value" style={{ color: manager.is_active !== false ? "#22c55e" : "#ef4444" }}>
                    {manager.is_active !== false ? "Active Tactician" : "Inactive"}
                  </span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Member Level</span>
                  <span className="sidebar-stat-value" style={{ fontWeight: 800, color: '#c084fc' }}>Lvl {medalInfo.level}</span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">League Tier</span>
                  <span className="sidebar-stat-value" style={{ fontWeight: 800, color: '#3b82f6' }}>{medalInfo.league || "Amateur"}</span>
                </div>
                <div className="sidebar-stat-row">
                  <span className="sidebar-stat-label">Total EXP</span>
                  <span className="sidebar-stat-value" style={{ color: '#fff' }}>{medalInfo.totalExp} EXP</span>
                </div>
                <div style={{ marginTop: '0.75rem', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                    <span>Next Level Progress</span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="level-progress-wrap">
                    <div className="level-progress-bar" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="profile-main-content">
              
              {/* Combined Career Record - 10 STATS GRID */}
              <div>
                <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  <i className="fa-solid fa-chart-pie" style={{ color: "#c084fc", marginRight: "8px" }} /> Combined Career Record
                </h3>
                
                {/* 10 Stats Grid (5 x 2) */}
                <div className="overview-stats-grid-10">
                  {/* Row 1: Match Performance */}
                  <div className="overview-stat-card">
                    <div className="overview-val">{combined.matches_played}</div>
                    <div className="overview-lbl">Matches</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #22c55e" }}>
                    <div className="overview-val" style={{ color: "#22c55e" }}>{combined.wins}</div>
                    <div className="overview-lbl">Wins</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #a855f7" }}>
                    <div className="overview-val" style={{ color: "#c084fc" }}>{combined.draws}</div>
                    <div className="overview-lbl">Draws</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #ef4444" }}>
                    <div className="overview-val" style={{ color: "#ef4444" }}>{combined.losses}</div>
                    <div className="overview-lbl">Losses</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #eab308" }}>
                    <div className="overview-val" style={{ color: "#fbbf24" }}>{winRate}%</div>
                    <div className="overview-lbl">Win %</div>
                  </div>

                  {/* Row 2: Goals & Defensive Records */}
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #3b82f6" }}>
                    <div className="overview-val" style={{ color: "#60a5fa" }}>{combined.goals_scored}</div>
                    <div className="overview-lbl">Goals Scored</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #f43f5e" }}>
                    <div className="overview-val" style={{ color: "#f43f5e" }}>{combined.goals_conceded}</div>
                    <div className="overview-lbl">GA (Conceded)</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #c084fc" }}>
                    <div className="overview-val" style={{ color: goalDiff >= 0 ? "#22c55e" : "#ef4444" }}>
                      {goalDiff > 0 ? `+${goalDiff}` : goalDiff}
                    </div>
                    <div className="overview-lbl">GD (Goal Diff)</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #10b981" }}>
                    <div className="overview-val" style={{ color: "#10b981" }}>{combined.clean_sheets}</div>
                    <div className="overview-lbl">CS (Clean Sheets)</div>
                  </div>
                  <div className="overview-stat-card" style={{ borderLeft: "3px solid #06b6d4" }}>
                    <div className="overview-val" style={{ color: "#06b6d4" }}>{csRate}%</div>
                    <div className="overview-lbl">CS % (Clean Sheet)</div>
                  </div>
                </div>
              </div>

              {/* Trophies & Awards Showcase */}
              <div className="awards-showcase-grid">
                {/* Trophies Card */}
                <div style={{ background: 'rgba(13, 18, 24, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.25rem', backdropFilter: 'blur(20px)' }}>
                  <h3 style={{ fontSize: "0.9rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px", borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <i className="fa-solid fa-trophy" style={{ color: "#fbbf24", marginRight: "8px" }} /> Trophies Won
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fbbf24' }}>{medalInfo.trophiesList?.length || 0}</span>
                  </h3>
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {(!medalStats.trophiesList || medalStats.trophiesList.length === 0) ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '1rem 0' }}>No trophies won yet.</div>
                    ) : (
                      medalStats.trophiesList.map((t: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <i className="fa-solid fa-trophy" style={{ color: '#fbbf24', fontSize: '0.85rem' }} />
                          <span style={{ color: '#fff', fontWeight: 600 }}>{t}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Awards Card */}
                <div style={{ background: 'rgba(13, 18, 24, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.25rem', backdropFilter: 'blur(20px)' }}>
                  <h3 style={{ fontSize: "0.9rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "1px", borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <i className="fa-solid fa-award" style={{ color: "#c084fc", marginRight: "8px" }} /> Individual Awards
                    </span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c084fc' }}>{medalInfo.awardsList?.length || 0}</span>
                  </h3>
                  
                  {/* Category counts grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', color: '#fbbf24', fontWeight: 'bold' }}>{medalStats.awardsCount?.goldenBoot || 0}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Boot</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', color: '#60a5fa', fontWeight: 'bold' }}>{medalStats.awardsCount?.goldenGlove || 0}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Glove</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', color: '#a855f7', fontWeight: 'bold' }}>{medalStats.awardsCount?.goldenBall || 0}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Ball</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.95rem', color: '#f43f5e', fontWeight: 'bold' }}>{medalStats.awardsCount?.bestDefender || 0}</div>
                      <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Def</div>
                    </div>
                  </div>

                  <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {(!medalStats.awardsList || medalStats.awardsList.length === 0) ? (
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>No individual awards won.</div>
                    ) : (
                      medalStats.awardsList.map((a: string, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <i className="fa-solid fa-award" style={{ color: '#c084fc', fontSize: '0.85rem' }} />
                          <span style={{ color: '#fff', fontWeight: 600 }}>{a}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Levels & EXP Breakdown */}
              <div style={{ background: 'rgba(13, 18, 24, 0.45)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '16px', padding: '1.5rem', backdropFilter: 'blur(20px)' }}>
                <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                  <i className="fa-solid fa-trophy" style={{ color: "#c084fc", marginRight: "8px" }} /> Level & Experience (EXP) Breakdown
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700 }}>EXP SUMMARY</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Normal Gameplay EXP</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>+{medalInfo.normalExp} EXP</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>Medal Achievements EXP</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>+{medalInfo.medalExp} EXP</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', paddingTop: '4px' }}>
                        <span style={{ color: '#c084fc', fontWeight: 700 }}>Total Career EXP</span>
                        <span style={{ color: '#c084fc', fontWeight: 800 }}>{medalInfo.totalExp} EXP</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700 }}>NORMAL EXP FORMULA</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                      <div>Matches: <span style={{ color: '#fff' }}>{combined.matches_played} &times; 25</span></div>
                      <div>Wins: <span style={{ color: '#fff' }}>{combined.wins} &times; 40</span></div>
                      <div>Draws: <span style={{ color: '#fff' }}>{combined.draws} &times; 20</span></div>
                      <div>Losses: <span style={{ color: '#fff' }}>{combined.losses} &times; 10</span></div>
                      <div>Goals: <span style={{ color: '#fff' }}>{combined.goals_scored} &times; 5</span></div>
                      <div>Clean Sheets: <span style={{ color: '#fff' }}>{combined.clean_sheets} &times; 10</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medal Showcase (Top 5 Claimed) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: "1rem", fontFamily: "var(--font-display)", color: "#fff", margin: 0, textTransform: "uppercase", letterSpacing: "1px" }}>
                    <i className="fa-solid fa-medal" style={{ color: "#c084fc", marginRight: "8px" }} /> Medals Showcase (Top Claimed)
                  </h3>
                  <Link href={`/members/${id}/medals`} className="portal-btn btn-secondary" style={{ fontSize: '0.72rem', padding: '5px 12px', textTransform: 'uppercase', fontWeight: 700 }}>
                    <i className="fa-solid fa-list-check" style={{ marginRight: '6px' }} /> View All Medals
                  </Link>
                </div>
                {topClaimedMedals.length === 0 ? (
                  <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }}>
                    No medals unlocked yet. Complete career matches, score goals, or win tournaments to earn medals!
                    <div style={{ marginTop: '12px' }}>
                      <Link href={`/members/${id}/medals`} className="portal-btn btn-primary" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
                        View Medal Requirements
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="medal-showcase-grid">
                    {topClaimedMedals.map((medal: any) => {
                      const medalColor = MEDAL_LEVEL_COLORS[medal.level] || '#fff';
                      const roman = ROMAN_NUMERALS[medal.level] || medal.level;
                      return (
                        <div key={medal.key} className="medal-card" style={{ border: `1px solid ${medalColor}`, boxShadow: `0 0 10px ${medalColor}22` }}>
                          <div className="medal-icon-wrap" style={{ background: `${medalColor}15`, color: medalColor }}>
                            <i className="fa-solid fa-medal" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{medal.name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.68rem' }}>
                              <span style={{ 
                                color: medalColor, 
                                fontWeight: 700, 
                                padding: '1px 5px', 
                                borderRadius: '3px', 
                                background: `${medalColor}15`,
                                textTransform: 'uppercase'
                              }}>
                                {medal.category} Tier {roman}
                              </span>
                              <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>+{medal.exp} EXP</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

            </div>

          </div>

        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
