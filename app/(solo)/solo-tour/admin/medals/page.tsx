"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";
import {
  fetchManagersAlignment,
  alignManagerStatsAndMedals,
  alignAllManagersStatsAndMedals
} from "@/utils/solo/serverActions";

export default function MedalsAlignmentDashboard() {
  const [alignmentData, setAlignmentData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [lastRecalculated, setLastRecalculated] = useState<Date | null>(null);
  const [expandedManagerIds, setExpandedManagerIds] = useState<Record<number, boolean>>({}); 

  const toggleExpandManager = (managerId: number) => {
    setExpandedManagerIds(prev => ({
      ...prev,
      [managerId]: !prev[managerId]
    }));
  };

  const loadData = async () => {
    try {
      const data = await fetchManagersAlignment();
      setAlignmentData(data);
    } catch (err) {
      console.error(err);
      showToast("Error loading alignment data.");
    }
  };

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      const data = await fetchManagersAlignment();
      setAlignmentData(data);
      setLastRecalculated(new Date());
      showToast("Preview recalculated from live stats.");
    } catch (err) {
      console.error(err);
      showToast("Error recalculating preview.");
    } finally {
      setIsRecalculating(false);
    }
  };

  useEffect(() => {
    handleRecalculate();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAlignSingle = (managerId: number, name: string) => {
    startTransition(async () => {
      try {
        await alignManagerStatsAndMedals(managerId);
        showToast(`Saved & aligned medals for ${name}!`);
        await handleRecalculate();
      } catch (err) {
        console.error(err);
        showToast(`Failed to save stats for ${name}`);
      }
    });
  };

  const handleAlignAll = () => {
    if (!confirm("This will SAVE recalculated medals and EXP to the database for ALL managers. Proceed?")) return;
    startTransition(async () => {
      try {
        const res = await alignAllManagersStatsAndMedals();
        showToast(`Saved & aligned ${res.count} managers to database!`);
        await handleRecalculate();
      } catch (err) {
        console.error(err);
        showToast("Error during bulk save.");
      }
    });
  };

  const filteredData = alignmentData.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.r2gId && m.r2gId.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="portal-root-wrapper" data-module="medals">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Responsive styles injected via style tag */}
      <style>{`
        .medals-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem; }
        .medals-search-row { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; }
        .medals-search-row input { flex: 1; min-width: 200px; max-width: 400px; height: 42px; }

        /* Desktop table */
        .medals-table-wrap { display: block; }
        .medals-cards-wrap { display: none; }

        /* Medal grid */
        .medals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }

        /* Star dots */
        .star-dots { display: flex; gap: 4px; align-items: center; }
        .star-dot { width: 10px; height: 10px; border-radius: 50%; transition: all 0.2s; }
        .star-dot.filled { box-shadow: 0 0 6px currentColor; }
        .star-dot.empty { opacity: 0.18; }

        @media (max-width: 768px) {
          .medals-table-wrap { display: none; }
          .medals-cards-wrap { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; }

          .manager-card { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 1rem; cursor: pointer; transition: background 0.2s; }
          .manager-card.expanded { background: rgba(192,132,252,0.04); border-color: rgba(192,132,252,0.2); border-bottom-left-radius: 0; border-bottom-right-radius: 0; border-bottom: none; }
          .manager-card-top { display: flex; align-items: center; gap: 10px; }
          .manager-card-avatar { width: 38px; height: 38px; border-radius: 50%; background-size: cover; background-position: center; flex-shrink: 0; }
          .manager-card-info { flex: 1; min-width: 0; }
          .manager-card-name { font-weight: 600; color: #fff; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .manager-card-meta { font-size: 0.68rem; color: var(--text-secondary); }
          .manager-card-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; font-size: 0.72rem; }
          .manager-card-stat-pill { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 4px 8px; display: flex; flex-direction: column; gap: 1px; flex: 1; min-width: 80px; }
          .manager-card-stat-pill label { color: var(--text-secondary); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.5px; }
          .manager-card-stat-pill span { font-weight: 600; color: #fff; }
          .manager-card-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); }

          .medals-expanded-panel { background: rgba(8,11,17,0.5); border: 1px solid rgba(192,132,252,0.2); border-top: none; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px; padding: 1rem; }
          .medals-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 480px) {
          .medals-header { flex-direction: column; align-items: flex-start; }
          .medals-header button { width: 100%; justify-content: center; }
        }
      `}</style>

      {toast && (
        <div className="portal-toast" style={{ zIndex: 9999 }}>
          {toast}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: '1200px' }}>
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Dashboard
          </Link>
        </div>

        <div className="medals-header portal-header">
          <div>
            <div className="portal-page-badge">
              <i className="fa-solid fa-sync" /> MEDALS & EXP ALIGNMENT
            </div>
            <h1 className="portal-title">MEDALS & EXP ALIGNMENT</h1>
            <p className="portal-subtitle">Recalculate preview from live stats, then save to database.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Step 1 — Preview */}
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating || isPending}
              className="portal-btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '42px' }}
            >
              {isRecalculating
                ? <i className="fa-solid fa-spinner fa-spin" />
                : <i className="fa-solid fa-rotate" />}
              Recalculate Preview
            </button>
            {/* Step 2 — Save */}
            <button
              onClick={handleAlignAll}
              disabled={isPending || isRecalculating}
              className="portal-btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '42px' }}
            >
              {isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-floppy-disk" />}
              Save All to DB
            </button>
          </div>
        </div>

        {/* Info card — two-step workflow */}
        <div className="admin-card" style={{ marginTop: 0, padding: '1.25rem', border: '1px solid rgba(192,132,252,0.15)', background: 'rgba(192,132,252,0.03)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>1</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#60a5fa' }}>Recalculate Preview</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, paddingLeft: '26px' }}>
                Reads live fixture stats and computes what each manager's medals and EXP <em>should</em> be. <strong style={{ color: '#fff' }}>Nothing is saved.</strong>
              </p>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>2</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fbbf24' }}>Save All to DB</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, paddingLeft: '26px' }}>
                Commits the calculated values to the database. Only run after reviewing the preview and confirming the values look correct.
              </p>
            </div>
            {lastRecalculated && (
              <div style={{ width: '100%', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.6rem', marginTop: '0.25rem' }}>
                <i className="fa-solid fa-clock" style={{ marginRight: '4px' }} />
                Preview last recalculated: {lastRecalculated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="medals-search-row">
          <input
            type="text"
            placeholder="Search manager name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
            {filteredData.length} tactician{filteredData.length !== 1 ? 's' : ''} found
          </span>
        </div>

        {/* ─── DESKTOP: table ─── */}
        <div className="admin-card medals-table-wrap" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive" style={{ margin: 0, width: '100%' }}>
            <table className="admin-list-table">
              <thead>
                <tr>
                  <th>Tactician</th>
                  <th style={{ width: '145px' }}>Stored EXP</th>
                  <th style={{ width: '145px' }}>Calculated EXP</th>
                  <th style={{ width: '200px' }}>League</th>
                  <th style={{ width: '130px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <i className="fa-solid fa-users-slash" style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }} />
                      No managers found.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((m) => {
                    const photoUrl = m.photo || `/assets/images/managers/${m.name.toLowerCase().replace(/\s+/g, "-")}.webp`;
                    const isExpanded = !!expandedManagerIds[m.id];
                    const unlockedCount = m.medals ? m.medals.filter((med: any) => med.level > 0).length : 0;
                    return (
                      <React.Fragment key={m.id}>
                        <tr
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(192,132,252,0.03)' : 'transparent',
                            transition: 'background 0.2s'
                          }}
                          onClick={() => toggleExpandManager(m.id)}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ color: '#c084fc', width: '12px', fontSize: '0.7rem' }} />
                            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundSize: 'cover', backgroundPosition: 'center', backgroundImage: `url('${photoUrl}'), url('/assets/images/default-manager.webp')`, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{m.name}</div>
                              <div style={{ fontSize: '0.67rem', color: 'var(--text-secondary)' }}>
                                {m.r2gId || 'No ID'} • <span style={{ color: '#c084fc', fontWeight: 700 }}>{unlockedCount} Medals</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600, fontSize: '0.8rem' }}>{m.storedNormalExp} EXP</td>
                          <td style={{ fontWeight: 600, fontSize: '0.8rem', color: m.hasDiscrepancy ? '#fbbf24' : '#fff' }}>{m.calculatedNormalExp} EXP</td>
                          <td>
                            <span style={{ background: 'rgba(59,130,246,0.12)', color: '#60a5fa', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                              Lvl {m.calculatedLevel} · {m.calculatedLeague}
                            </span>
                          </td>
                          <td>
                            {m.hasDiscrepancy ? (
                              <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-triangle-exclamation" /> Mismatch
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-circle-check" /> Aligned
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => handleAlignSingle(m.id, m.name)} disabled={isPending} className="portal-btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.7rem', minHeight: 'auto', height: '30px' }}>
                              Save to DB
                            </button>
                          </td>
                        </tr>
                        {isExpanded && <MedalPanel medals={m.medals} unlockedCount={unlockedCount} colSpan={6} />}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── MOBILE: cards ─── */}
        <div className="medals-cards-wrap">
          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              <i className="fa-solid fa-users-slash" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.75rem' }} />
              No managers found.
            </div>
          ) : (
            filteredData.map((m) => {
              const photoUrl = m.photo || `/assets/images/managers/${m.name.toLowerCase().replace(/\s+/g, "-")}.webp`;
              const isExpanded = !!expandedManagerIds[m.id];
              const unlockedCount = m.medals ? m.medals.filter((med: any) => med.level > 0).length : 0;
              return (
                <div key={m.id}>
                  <div className={`manager-card${isExpanded ? ' expanded' : ''}`} onClick={() => toggleExpandManager(m.id)}>
                    <div className="manager-card-top">
                      <div className="manager-card-avatar" style={{ backgroundImage: `url('${photoUrl}'), url('/assets/images/default-manager.webp')` }} />
                      <div className="manager-card-info">
                        <div className="manager-card-name">{m.name}</div>
                        <div className="manager-card-meta">{m.r2gId || 'No ID'} · <span style={{ color: '#c084fc', fontWeight: 700 }}>{unlockedCount} Medals</span></div>
                      </div>
                      <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ color: '#c084fc', fontSize: '0.75rem' }} />
                    </div>

                    <div className="manager-card-stats">
                      <div className="manager-card-stat-pill">
                        <label>Stored EXP</label>
                        <span>{m.storedNormalExp}</span>
                      </div>
                      <div className="manager-card-stat-pill">
                        <label>Calc. EXP</label>
                        <span style={{ color: m.hasDiscrepancy ? '#fbbf24' : '#fff' }}>{m.calculatedNormalExp}</span>
                      </div>
                      <div className="manager-card-stat-pill">
                        <label>Level</label>
                        <span style={{ color: '#60a5fa' }}>Lvl {m.calculatedLevel}</span>
                      </div>
                      <div className="manager-card-stat-pill">
                        <label>Status</label>
                        <span style={{ color: m.hasDiscrepancy ? '#fbbf24' : '#10b981' }}>
                          {m.hasDiscrepancy ? '⚠ Mismatch' : '✓ Aligned'}
                        </span>
                      </div>
                    </div>

                    <div className="manager-card-actions" onClick={(e) => e.stopPropagation()}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{m.calculatedLeague}</span>
                      <button onClick={() => handleAlignSingle(m.id, m.name)} disabled={isPending} className="portal-btn btn-secondary" style={{ padding: '5px 14px', fontSize: '0.72rem', minHeight: 'auto' }}>
                        Align Stats
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="medals-expanded-panel">
                      <MedalPanelInline medals={m.medals} unlockedCount={unlockedCount} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

/* ── Shared medal panel helpers ── */

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
    <div className="star-dots">
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`star-dot ${i < lvl ? 'filled' : 'empty'}`}
          style={{ backgroundColor: i < lvl ? color : 'rgba(255,255,255,0.3)', color }}
        />
      ))}
      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', marginLeft: '2px' }}>Lvl {lvl}</span>
    </div>
  );
}

function MedalCard({ med, dimmed }: { med: any; dimmed?: boolean }) {
  const isMythic = med.category === 'MYTHIC';
  const isRare = med.category === 'RARE';
  const color = isMythic ? '#fbbf24' : isRare ? '#3b82f6' : '#10b981';
  const bg = isMythic ? 'rgba(251,191,36,0.03)' : isRare ? 'rgba(59,130,246,0.03)' : 'rgba(16,185,129,0.03)';
  const border = isMythic ? 'rgba(251,191,36,0.15)' : isRare ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)';
  
  // Sum cumulative XP ONLY from the levels that are actually achieved (marked true in achievedLevels)
  const earnedExp = med.achievedLevels
    ? med.achievedLevels.reduce((sum: number, achieved: boolean, idx: number) => {
        return sum + (achieved ? getExpForLevel(med.category, idx + 1) : 0);
      }, 0)
    : Number(med.exp) || 0;

  const lvl = Math.min(5, Math.max(0, Number(med.level) || 0));

  // Per-key label overrides for medals with custom (non-threshold) logic
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

  const headerLabel = specialLabels ? 'Requirement' : 'Req. (≥)';

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', opacity: dimmed ? 0.5 : 1 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color, background: `${color}18`, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
          {med.category}
        </span>
        <StarDots level={lvl} color={color} />
      </div>

      {/* Name + description */}
      <div style={{ fontWeight: 700, color: dimmed ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: '0.83rem', lineHeight: 1.2 }}>{med.name}</div>
      <div style={{ fontSize: '0.69rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{med.description}</div>

      {/* Current record */}
      {lvl > 0 && (
        <div style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: '5px', display: 'flex', gap: '12px' }}>
          <span><span style={{ color: 'rgba(255,255,255,0.4)' }}>Record: </span><strong style={{ color: '#fff' }}>{med.currentValue}</strong></span>
          {med.requiredValueForNext !== '-' && (
            <span><span style={{ color: 'rgba(255,255,255,0.4)' }}>Next: </span><strong style={{ color }}>{med.requiredValueForNext}</strong></span>
          )}
        </div>
      )}

      {/* ── Level breakdown table ── */}
      <div style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
              <th style={{ padding: '4px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Lvl</th>
              <th style={{ padding: '4px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{headerLabel}</th>
              <th style={{ padding: '4px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>EXP</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(l => {
              const isAchieved = med.achievedLevels ? med.achievedLevels[l - 1] : l <= lvl;
              // Next required target is the first level that is NOT achieved
              const isNextTarget = med.achievedLevels 
                ? (!isAchieved && med.achievedLevels.slice(0, l - 1).every(Boolean))
                : (l === lvl + 1);
              
              // Style achieved rows with subtle background color
              const rowBg = isAchieved ? `${color}07` : 'transparent';
              const expVal = getExpForLevel(med.category, l);
              const req = getLevelReq(l);
              return (
                <tr key={l} style={{ background: rowBg, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '4px 8px', color: isAchieved ? color : isNextTarget ? '#fbbf24' : 'rgba(255,255,255,0.3)', fontWeight: (isAchieved || isNextTarget) ? 700 : 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {isAchieved && <span style={{ color, fontSize: '0.55rem' }}>✓</span>}
                    {!isAchieved && isNextTarget && <span style={{ color: '#fbbf24', fontSize: '0.55rem' }}>❯</span>}
                    {l}
                  </td>
                  <td style={{ padding: '4px 8px', color: isAchieved ? '#fff' : isNextTarget ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.25)' }}>
                    {req}
                  </td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', color: isAchieved ? color : 'rgba(255,255,255,0.25)', fontWeight: isAchieved ? 700 : 400 }}>
                    +{expVal.toLocaleString()} XP
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Total XP earned */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px', paddingTop: '2px' }}>
        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)' }}>Total XP Earned:</span>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: lvl > 0 ? color : 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
          {earnedExp.toLocaleString()} XP
        </span>
      </div>
    </div>
  );
}

function MedalPanel({ medals, unlockedCount, colSpan }: { medals: any[]; unlockedCount: number; colSpan: number }) {
  return (
    <tr style={{ background: 'rgba(8,11,17,0.45)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <td colSpan={colSpan} style={{ padding: '1.5rem 1.75rem' }}>
        <MedalPanelInline medals={medals} unlockedCount={unlockedCount} />
      </td>
    </tr>
  );
}

function MedalPanelInline({ medals, unlockedCount }: { medals: any[]; unlockedCount: number }) {
  const [showLocked, setShowLocked] = React.useState(false);

  const unlocked = medals.filter((med: any) => med.level > 0);
  const locked = medals.filter((med: any) => med.level <= 0);
  const totalMedalExp = unlocked.reduce((sum: number, med: any) => sum + (Number(med.exp) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header with totals */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          <i className="fa-solid fa-medal" /> Medals & Achievements
        </h4>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', background: 'rgba(192,132,252,0.1)', border: '1px solid rgba(192,132,252,0.2)', borderRadius: '6px', padding: '3px 10px', color: '#c084fc', fontWeight: 600 }}>
            <i className="fa-solid fa-lock-open" style={{ marginRight: '4px' }} />{unlockedCount} Unlocked
          </span>
          <span style={{ fontSize: '0.7rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', padding: '3px 10px', color: '#fbbf24', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            <i className="fa-solid fa-star" style={{ marginRight: '4px' }} />{totalMedalExp.toLocaleString()} XP from Medals
          </span>
          <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '3px 10px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
            {medals.length - unlockedCount} Locked
          </span>
        </div>
      </div>

      {/* Unlocked medals */}
      {unlockedCount === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0' }}>
          <i className="fa-solid fa-lock" /> No medals unlocked yet. Play matches or log statistics to unlock achievements.
        </div>
      ) : (
        <div className="medals-grid">
          {unlocked.map((med: any) => (
            <MedalCard key={med.key} med={med} />
          ))}
        </div>
      )}

      {/* Locked medals toggle */}
      {locked.length > 0 && (
        <div>
          <button
            onClick={() => setShowLocked(s => !s)}
            style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', padding: '5px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: showLocked ? '0.75rem' : 0, transition: 'all 0.2s' }}
          >
            <i className={`fa-solid ${showLocked ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ fontSize: '0.6rem' }} />
            {showLocked ? 'Hide' : 'Show'} {locked.length} locked medals
          </button>
          {showLocked && (
            <div className="medals-grid">
              {locked.map((med: any) => (
                <MedalCard key={med.key} med={med} dimmed />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


