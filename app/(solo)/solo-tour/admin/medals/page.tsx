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

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleAlignSingle = (managerId: number, name: string) => {
    startTransition(async () => {
      try {
        await alignManagerStatsAndMedals(managerId);
        showToast(`Successfully aligned medals and EXP for ${name}!`);
        await loadData();
      } catch (err) {
        console.error(err);
        showToast(`Failed to align stats for ${name}`);
      }
    });
  };

  const handleAlignAll = () => {
    if (!confirm("Are you sure you want to align and backfill stats and medals for ALL managers?")) return;
    startTransition(async () => {
      try {
        const res = await alignAllManagersStatsAndMedals();
        showToast(`Successfully backfilled and aligned ${res.count} managers!`);
        await loadData();
      } catch (err) {
        console.error(err);
        showToast("Error during bulk alignment.");
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
            <p className="portal-subtitle">Cross-check and backfill medals/EXP for tacticians.</p>
          </div>
          <button
            onClick={handleAlignAll}
            disabled={isPending}
            className="portal-btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '42px' }}
          >
            {isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-users" />}
            Align All Members
          </button>
        </div>

        {/* Info card */}
        <div className="admin-card" style={{ marginTop: 0, padding: '1.25rem', border: '1px solid rgba(192,132,252,0.15)', background: 'rgba(192,132,252,0.03)', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#c084fc', marginRight: '6px' }} />
            Use this page to cross-check and assign medals to players based on their current historical statistics.
            Once aligned, their gameplay EXP is locked in database, and will <strong>only accrue progressively</strong> in the future when fixture results are finalized.
          </p>
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
                              Align
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

function MedalCard({ med }: { med: any }) {
  const isMythic = med.category === 'MYTHIC';
  const isRare = med.category === 'RARE';
  const color = isMythic ? '#fbbf24' : isRare ? '#3b82f6' : '#10b981';
  const bg = isMythic ? 'rgba(251,191,36,0.04)' : isRare ? 'rgba(59,130,246,0.04)' : 'rgba(16,185,129,0.04)';
  const border = isMythic ? 'rgba(251,191,36,0.2)' : isRare ? 'rgba(59,130,246,0.2)' : 'rgba(16,185,129,0.2)';
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', color, background: `${color}18`, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
          {med.category}
        </span>
        <StarDots level={med.level} color={color} />
      </div>
      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.83rem', lineHeight: 1.2 }}>{med.name}</div>
      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>{med.description}</div>
      <div style={{ fontSize: '0.67rem', fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)', padding: '5px 9px', borderRadius: '5px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span><span style={{ color: 'rgba(255,255,255,0.45)' }}>Record: </span><strong style={{ color: '#fff' }}>{med.currentValue}</strong></span>
        {med.requiredValueForNext !== '-' && (
          <span><span style={{ color: 'rgba(255,255,255,0.45)' }}>Next: </span><strong style={{ color }}>{med.requiredValueForNext}</strong></span>
        )}
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
        <i className="fa-solid fa-medal" /> Unlocked Medals & Achievements ({unlockedCount})
      </h4>
      {unlockedCount === 0 ? (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-lock" /> No medals unlocked yet.
        </div>
      ) : (
        <div className="medals-grid">
          {medals.filter((med: any) => med.level > 0).map((med: any) => (
            <MedalCard key={med.key} med={med} />
          ))}
        </div>
      )}
    </div>
  );
}


