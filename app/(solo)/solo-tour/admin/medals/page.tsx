"use client";

import { useEffect, useState, useTransition } from "react";
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
    <div className="portal-container" style={{ minHeight: "100vh", background: "var(--bg-main)", color: "#fff", paddingBottom: "3rem" }}>
      {toast && (
        <div style={{
          position: "fixed", top: "20px", right: "20px", background: "linear-gradient(135deg, #a855f7, #c084fc)",
          color: "#fff", padding: "12px 24px", borderRadius: "8px", zIndex: 9999,
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)", fontWeight: 600, animation: "rwsFadeIn 0.3s ease-out"
        }}>
          {toast}
        </div>
      )}

      {/* Admin Nav / Header */}
      <div className="admin-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(10,15,22,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/solo-tour/admin" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>
            <i className="fa-solid fa-arrow-left" /> Back to Admin
          </Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
          <h1 style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-sync" style={{ color: '#c084fc' }} /> Medals & EXP Alignment Utility
          </h1>
        </div>
        <button 
          onClick={handleAlignAll} 
          disabled={isPending}
          className="portal-btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isPending ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-users" />}
          Align All Members
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {/* Info card */}
        <div style={{ background: 'rgba(192, 132, 252, 0.05)', border: '1px solid rgba(192, 132, 252, 0.15)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
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
            style={{ maxWidth: '400px', width: '100%' }}
          />
        </div>

        {/* Alignment Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th style={{ padding: '12px 16px' }}>Tactician</th>
                <th style={{ padding: '12px 16px' }}>Stored EXP (DB)</th>
                <th style={{ padding: '12px 16px' }}>Calculated EXP</th>
                <th style={{ padding: '12px 16px' }}>Calculated League</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>
                    No managers found.
                  </td>
                </tr>
              ) : (
                filteredData.map((m) => {
                  const hasPhoto = !!m.photo;
                  const photoUrl = hasPhoto 
                    ? m.photo 
                    : `/assets/images/managers/${m.name.toLowerCase().replace(/\s+/g, "-")}.webp`;

                  return (
                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div 
                          style={{
                            width: "36px", height: "36px", borderRadius: "50%",
                            backgroundSize: "cover", backgroundPosition: "center",
                            backgroundImage: `url('${photoUrl}'), url('/assets/images/default-manager.webp')`
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{m.name}</div>
                          <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)' }}>{m.r2gId || "No ID"}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        {m.storedNormalExp} EXP
                      </td>
                      <td style={{ padding: '12px 16px', color: m.hasDiscrepancy ? '#f59e0b' : '#fff', fontWeight: 600 }}>
                        {m.calculatedNormalExp} EXP
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                          Lvl {m.calculatedLevel} • {m.calculatedLeague}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {m.hasDiscrepancy ? (
                          <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600 }}>
                            <i className="fa-solid fa-triangle-exclamation" /> Mismatched
                          </span>
                        ) : (
                          <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.68rem', fontWeight: 600 }}>
                            <i className="fa-solid fa-circle-check" /> Aligned
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button 
                          onClick={() => handleAlignSingle(m.id, m.name)}
                          disabled={isPending}
                          className="portal-btn btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                        >
                          Align Stats
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
