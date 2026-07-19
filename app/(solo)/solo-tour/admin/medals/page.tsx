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

        <div className="portal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <div className="portal-page-badge">
              <i className="fa-solid fa-sync" /> MEDALS & EXP ALIGNMENT
            </div>
            <h1 className="portal-title">MEDALS & EXP ALIGNMENT</h1>
            <p className="portal-subtitle">
              Cross-check and backfill medals/EXP for tacticians.
            </p>
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
        <div className="admin-card" style={{ marginTop: 0, padding: '1.25rem', border: '1px solid rgba(192, 132, 252, 0.15)', background: 'rgba(192, 132, 252, 0.03)', marginBottom: '1.5rem' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            <i className="fa-solid fa-circle-info" style={{ color: '#c084fc', marginRight: '6px' }} /> 
            Use this page to cross-check and assign medals to players based on their current historical statistics. 
            Once aligned, their gameplay EXP is locked in database, and will <strong>only accrue progressively</strong> in the future when fixture results are finalized.
          </p>
        </div>

        {/* Search */}
        <div style={{ marginBottom: '1.5rem' }}>
          <input 
            type="text" 
            placeholder="Search manager name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input"
            style={{ maxWidth: '400px', width: '100%', height: '42px' }}
          />
        </div>

        {/* Alignment Table */}
        <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-responsive" style={{ margin: 0, width: '100%' }}>
            <table className="admin-list-table">
              <thead>
                <tr>
                  <th>Tactician</th>
                  <th style={{ width: '160px' }}>Stored EXP (DB)</th>
                  <th style={{ width: '160px' }}>Calculated EXP</th>
                  <th style={{ width: '220px' }}>Calculated League</th>
                  <th style={{ width: '140px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
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
                    const hasPhoto = !!m.photo;
                    const photoUrl = hasPhoto 
                      ? m.photo 
                      : `/assets/images/managers/${m.name.toLowerCase().replace(/\s+/g, "-")}.webp`;
                    const isExpanded = !!expandedManagerIds[m.id];
                    const unlockedCount = m.medals ? m.medals.filter((med: any) => med.level > 0).length : 0;

                    return (
                      <React.Fragment key={m.id}>
                        <tr 
                          style={{ 
                            borderBottom: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.03)', 
                            transition: 'background 0.2s',
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(192, 132, 252, 0.03)' : 'transparent'
                          }}
                          onClick={() => toggleExpandManager(m.id)}
                        >
                          <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', color: '#c084fc', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandManager(m.id);
                              }}
                            >
                              <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`} style={{ width: '12px' }} />
                            </button>
                            <div 
                              style={{
                                width: "36px", height: "36px", borderRadius: "50%",
                                backgroundSize: "cover", backgroundPosition: "center",
                                backgroundImage: `url('${photoUrl}'), url('/assets/images/default-manager.webp')`
                              }}
                            />
                            <div>
                              <div style={{ fontWeight: 600, color: '#fff' }}>{m.name}</div>
                              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                                {m.r2gId || "No ID"} • <span style={{ color: '#c084fc', fontWeight: 'bold' }}>{unlockedCount} Medals</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {m.storedNormalExp} EXP
                          </td>
                          <td style={{ color: m.hasDiscrepancy ? '#fbbf24' : '#fff', fontWeight: 600 }}>
                            {m.calculatedNormalExp} EXP
                          </td>
                          <td>
                            <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                              Lvl {m.calculatedLevel} • {m.calculatedLeague}
                            </span>
                          </td>
                          <td>
                            {m.hasDiscrepancy ? (
                              <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-triangle-exclamation" /> Mismatched
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <i className="fa-solid fa-circle-check" /> Aligned
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <button 
                              onClick={() => handleAlignSingle(m.id, m.name)}
                              disabled={isPending}
                              className="portal-btn btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.7rem', minHeight: 'auto', height: '30px' }}
                            >
                              Align Stats
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr style={{ background: 'rgba(8, 11, 17, 0.4)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td colSpan={6} style={{ padding: '1.5rem 2rem' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                  <i className="fa-solid fa-medal" /> Unlocked Medals & Achievements ({unlockedCount})
                                </h4>
                                
                                {unlockedCount === 0 ? (
                                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <i className="fa-solid fa-lock" /> This manager has not unlocked any medals yet. Play matches or log statistics to unlock achievements.
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {m.medals.filter((med: any) => med.level > 0).map((med: any) => {
                                      const isMythic = med.category === 'MYTHIC';
                                      const isRare = med.category === 'RARE';
                                      const color = isMythic ? '#fbbf24' : isRare ? '#3b82f6' : '#10b981';
                                      const bg = isMythic ? 'rgba(251,191,36,0.04)' : isRare ? 'rgba(59,130,246,0.04)' : 'rgba(16,185,129,0.04)';
                                      const border = isMythic ? 'rgba(251,191,36,0.15)' : isRare ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)';
                                      
                                      return (
                                        <div 
                                          key={med.key} 
                                          style={{ 
                                            background: bg, 
                                            border: `1px solid ${border}`, 
                                            borderRadius: '8px', 
                                            padding: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.4rem'
                                          }}
                                        >
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.62rem', fontWeight: 'bold', textTransform: 'uppercase', color: color, background: `${color}15`, padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.5px' }}>
                                              {med.category}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', letterSpacing: '2px' }}>
                                              {'★'.repeat(med.level)}{'☆'.repeat(5 - med.level)}
                                            </span>
                                          </div>
                                          <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.85rem' }}>{med.name}</div>
                                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{med.description}</div>
                                          
                                          <div style={{ 
                                            fontSize: '0.68rem', 
                                            fontFamily: 'var(--font-mono)', 
                                            marginTop: '0.3rem', 
                                            color: 'rgba(255,255,255,0.4)', 
                                            background: 'rgba(8,11,17,0.5)', 
                                            border: '1px solid rgba(255,255,255,0.03)',
                                            padding: '6px 10px', 
                                            borderRadius: '6px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '2px'
                                          }}>
                                            <div>
                                              <span style={{ color: 'rgba(255,255,255,0.5)' }}>Current Record:</span>{' '}
                                              <strong style={{ color: '#fff' }}>{med.currentValue}</strong>
                                            </div>
                                            {med.requiredValueForNext !== '-' && (
                                              <div>
                                                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Next Milestone:</span>{' '}
                                                <strong style={{ color: color }}>{med.requiredValueForNext}</strong>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
