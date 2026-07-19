"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPlayerCombinedStats } from "@/utils/solo/serverActions";
import PortalNavbar from "@/components/portal/PortalNavbar";
import PortalFooter from "@/components/portal/PortalFooter";
import "../../../../portal.css";

const MEDAL_LEVEL_COLORS: Record<number, string> = {
  1: "#ef4444", // Devils Red
  2: "#f59e0b", // Yellowish Gold
  3: "#ec4899", // Shining Pink
  4: "#0ea5e9", // Shining Sky Blue
  5: "#94a3b8"  // Shining Silver
};

const EXP_RATES: Record<string, number[]> = {
  MYTHIC: [0, 400, 800, 1500, 2500, 4000],
  RARE:   [0, 250, 500, 1000, 1750, 2500],
  COMMON: [0, 100, 200, 400,  800,  1500],
};

function getExpForLevel(category: string, level: number): number {
  return EXP_RATES[category]?.[level] ?? 0;
}

function StarDots({ level, color }: { level: number; color: string }) {
  const lvl = Math.min(5, Math.max(0, Number(level) || 0));
  return (
    <div className="star-dots" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="star-dot"
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: i < lvl ? color : "rgba(255,255,255,0.15)",
            boxShadow: i < lvl ? `0 0 6px ${color}` : "none"
          }}
        />
      ))}
      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginLeft: '4px' }}>Lvl {lvl}</span>
    </div>
  );
}

function MedalCard({ med, dimmed }: { med: any; dimmed?: boolean }) {
  const isMythic = med.category === 'MYTHIC';
  const isRare = med.category === 'RARE';
  const color = isMythic ? '#fbbf24' : isRare ? '#60a5fa' : '#22c55e';
  const bg = isMythic ? 'rgba(251,191,36,0.02)' : isRare ? 'rgba(59,130,246,0.02)' : 'rgba(34,197,94,0.02)';
  const border = isMythic ? 'rgba(251,191,36,0.12)' : isRare ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.12)';
  
  const earnedExp = med.achievedLevels
    ? med.achievedLevels.reduce((sum: number, achieved: boolean, idx: number) => {
        return sum + (achieved ? getExpForLevel(med.category, idx + 1) : 0);
      }, 0)
    : Number(med.exp) || 0;

  const lvl = Math.min(5, Math.max(0, Number(med.level) || 0));
  const isMax = lvl === 5;

  const SPECIAL_LEVEL_LABELS: Record<string, string[]> = {
    single_match_draw:   ['Draw 1-1', 'Draw 2-2', 'Draw 0-0', 'Draw 3-3', 'Draw 5-5'],
    single_match_cs_win: ['Win 1-0',  'Win 2-0',  'Win 3-0',  'Win 5-0',  'Win 7-0'],
    champion_rws:              ['—', '—', '—', '—', 'Admin grant'],
    runner_up_rws:             ['—', '—', '—', '—', 'Admin grant'],
    champion_fantasy:          ['—', '—', '—', '—', 'Admin grant'],
    player_of_season_team_tour:['—', '—', '—', '—', 'Admin grant'],
  };

  const thresholds: (number | string)[] = med.thresholds || [];
  const specialLabels = SPECIAL_LEVEL_LABELS[med.key];

  function getLevelReq(l: number): string {
    if (specialLabels) return specialLabels[l - 1] ?? '—';
    if (thresholds[l - 1] !== undefined) return String(thresholds[l - 1]);
    return '—';
  }

  // Calculate remaining progress details
  let nextTarget = med.requiredValueForNext;
  let remaining = 0;
  let progressPercent = 0;

  if (!med.isDirectLevel5 && med.thresholds) {
    const curVal = Number(med.currentValue) || 0;
    if (!isMax) {
      const targetVal = Number(nextTarget) || 0;
      remaining = targetVal - curVal;
      const prevTarget = lvl === 0 ? 0 : Number(med.thresholds[lvl - 1]) || 0;
      progressPercent = Math.max(0, Math.min(100, Math.round(((curVal - prevTarget) / (targetVal - prevTarget)) * 100)));
    } else {
      progressPercent = 100;
    }
  } else if (med.isDirectLevel5) {
    progressPercent = isMax ? 100 : 0;
  }

  const headerLabel = specialLabels ? 'Requirement' : 'Req (≥)';

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '14px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', opacity: dimmed ? 0.45 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color, background: `${color}15`, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.5px' }}>
          {med.category}
        </span>
        <StarDots level={lvl} color={color} />
      </div>

      {/* Title */}
      <div>
        <div style={{ fontWeight: 800, color: dimmed ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: '0.85rem', lineHeight: 1.2 }}>{med.name}</div>
        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3, marginTop: '2px' }}>{med.description}</div>
      </div>

      {/* Progress Info */}
      <div style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.68rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: med.isDirectLevel5 ? '0' : '4px' }}>
          <span>Current Value: <strong style={{ color: '#fff' }}>{med.currentValue}</strong></span>
          {!isMax && !med.isDirectLevel5 && (
            <span>Next Target: <strong style={{ color }}>{nextTarget}</strong></span>
          )}
        </div>
        
        {/* Progress Bar */}
        {!med.isDirectLevel5 && (
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
            <div style={{ width: `${progressPercent}%`, height: '100%', borderRadius: '2px', background: `linear-gradient(90deg, ${color}, #fff)` }} />
          </div>
        )}

        <div style={{ fontSize: '0.62rem', color: dimmed ? 'rgba(255,255,255,0.3)' : color, marginTop: med.isDirectLevel5 ? '0' : '6px', fontWeight: 700 }}>
          {isMax ? (
            <span style={{ color: '#fbbf24' }}><i className="fa-solid fa-circle-check" /> Max Level achieved</span>
          ) : med.isDirectLevel5 ? (
            <span>Admin override required</span>
          ) : (
            <span>{remaining} more needed for Level {lvl + 1}</span>
          )}
        </div>
      </div>

      {/* Levels Table */}
      <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Lvl</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{headerLabel}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>EXP</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(l => {
              const isAchieved = med.achievedLevels ? med.achievedLevels[l - 1] : l <= lvl;
              const isNextTarget = med.achievedLevels 
                ? (!isAchieved && med.achievedLevels.slice(0, l - 1).every(Boolean))
                : (l === lvl + 1);
              
              const rowBg = isAchieved ? `${color}08` : 'transparent';
              const expVal = getExpForLevel(med.category, l);
              const req = getLevelReq(l);
              return (
                <tr key={l} style={{ background: rowBg, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '4px 8px', color: isAchieved ? color : isNextTarget ? '#fbbf24' : 'rgba(255,255,255,0.25)', fontWeight: (isAchieved || isNextTarget) ? 700 : 400 }}>
                    {isAchieved ? '✓ ' : isNextTarget ? '❯ ' : ''} {l}
                  </td>
                  <td style={{ padding: '4px 8px', color: isAchieved ? '#fff' : isNextTarget ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)' }}>
                    {req}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: isAchieved ? color : 'rgba(255,255,255,0.2)', fontWeight: isAchieved ? 700 : 400 }}>
                    +{expVal} XP
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Earned XP */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', fontSize: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '4px' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total XP Earned:</span>
        <span style={{ fontWeight: 700, color: lvl > 0 ? color : 'rgba(255,255,255,0.2)' }}>
          {earnedExp} XP
        </span>
      </div>
    </div>
  );
}

export default function MemberMedalsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);

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
        setError("Failed to load tactician medals data");
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
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#c084fc", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading Medals & Achievements...</p>
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
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Error Loading Page</h2>
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

  const { manager, medalStats } = data;
  const medalInfo = medalStats || {
    level: 1,
    medals: [],
    medalExp: 0
  };

  const unlocked = medalInfo.medals.filter((med: any) => med.level > 0);
  const locked = medalInfo.medals.filter((med: any) => med.level <= 0);

  return (
    <div className="app-container">
      <PortalNavbar />

      <main className="main-content">
        <div className="portal-container" style={{ maxWidth: "100%", width: "100%", padding: "1.5rem 1.5rem", alignItems: "stretch" }}>
          
          {/* Breadcrumb */}
          <div className="portal-breadcrumb" style={{ marginBottom: "1.5rem" }}>
            <Link href={`/members/${id}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Profile
            </Link>
          </div>

          {/* Header Summary */}
          <div className="medals-header-summary">
            <div className="medals-header-title-section">
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "3px 10px", borderRadius: "10px", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", fontSize: "0.7rem", fontWeight: 600, color: "#c084fc", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                <i className="fa-solid fa-medal" /> Tactician Achievements
              </div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
                {manager.name}'s Medals
              </h1>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
                R2G career milestones and detailed progress logs.
              </p>
            </div>

            {/* Total Counters */}
            <div className="medals-counters-grid">
              <div className="medals-counter-card" style={{ background: 'rgba(192, 132, 252, 0.1)', border: '1px solid rgba(192, 132, 252, 0.2)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
                <div className="medals-counter-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c084fc' }}>{unlocked.length}</div>
                <div className="medals-counter-lbl" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Unlocked</div>
              </div>
              <div className="medals-counter-card" style={{ background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '120px' }}>
                <div className="medals-counter-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{medalInfo.medalExp.toLocaleString()}</div>
                <div className="medals-counter-lbl" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Medal EXP</div>
              </div>
              <div className="medals-counter-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '100px' }}>
                <div className="medals-counter-val" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgba(255,255,255,0.6)' }}>{locked.length}</div>
                <div className="medals-counter-lbl" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 600 }}>Locked</div>
              </div>
            </div>
          </div>

          <style>{`
            .medals-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 1.25rem;
            }
            .medals-header-summary {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 16px;
              padding: 1.5rem;
              backdrop-filter: blur(20px);
              margin-bottom: 2rem;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 1.5rem;
            }
            .medals-header-title-section {
              flex: 1;
              min-width: 250px;
            }
            .medals-counters-grid {
              display: flex;
              gap: 0.75rem;
              flex-wrap: wrap;
            }
            @media (max-width: 768px) {
              .medals-header-summary {
                flex-direction: column;
                align-items: stretch;
                text-align: center;
                gap: 1.25rem;
              }
              .medals-header-title-section {
                display: flex;
                flex-direction: column;
                align-items: center;
              }
              .medals-counters-grid {
                justify-content: center;
                width: 100%;
              }
            }
            @media (max-width: 576px) {
              .medals-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
              }
              .medals-counters-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 6px;
              }
              .medals-counter-card {
                padding: 8px 4px !important;
                min-width: unset !important;
              }
              .medals-counter-val {
                font-size: 1.15rem !important;
              }
              .medals-counter-lbl {
                font-size: 0.52rem !important;
              }
            }
          `}</style>

          {/* Unlocked Medals grouped by Category */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {['COMMON', 'RARE', 'MYTHIC'].map((cat) => {
              const catMedals = unlocked.filter((m: any) => m.category === cat);
              const catColor = cat === 'COMMON' ? '#60a5fa' : cat === 'RARE' ? '#f59e0b' : '#ec4899';
              if (catMedals.length === 0) return null;
              return (
                <div key={cat}>
                  <h3 style={{ color: catColor, fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: catColor }} /> Unlocked {cat} Medals
                  </h3>
                  <div className="medals-grid">
                    {catMedals.map((medal: any) => (
                      <MedalCard key={medal.key} med={medal} />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Toggle Button for Locked Medals */}
            {locked.length > 0 && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => setShowLocked(!showLocked)}
                    className="portal-btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.8rem' }}
                  >
                    <i className={`fa-solid ${showLocked ? 'fa-eye-slash' : 'fa-eye'}`} />
                    {showLocked ? 'Hide Locked Medals' : `Show Locked Medals (${locked.length})`}
                  </button>
                </div>

                {showLocked && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {['COMMON', 'RARE', 'MYTHIC'].map((cat) => {
                      const catMedals = locked.filter((m: any) => m.category === cat);
                      const catColor = cat === 'COMMON' ? '#60a5fa' : cat === 'RARE' ? '#f59e0b' : '#ec4899';
                      if (catMedals.length === 0) return null;
                      return (
                        <div key={cat}>
                          <h3 style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.95rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)' }} /> Locked {cat} Medals
                          </h3>
                          <div className="medals-grid">
                            {catMedals.map((medal: any) => (
                              <MedalCard key={medal.key} med={medal} dimmed />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
