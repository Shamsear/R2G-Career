"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchTournaments,
  deductMatchdayPlayerSalaries,
  applyTemplateAdjustment,
  applyCustomAdjustment,
  processTournamentMatchBonuses
} from "@/utils/solo/serverActions";

export default function FinancialOperations() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [finOp, setFinOp] = useState({
    matchday: 1,
    targetManagerId: "",
    targetTournamentId: "",
    adjustmentType: "tournament_bonus", 
    customType: "reg_bonus", 
    customRc: 0,
    customRt: 0,
    customVoucher: 0,
    customNotes: ""
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      const [clubsData, tourneys] = await Promise.all([
        fetchRegisteredClubs(),
        fetchTournaments()
      ]);
      setClubs(clubsData || []);
      setTournaments(tourneys || []);
    } catch {
      showToast("Error loading financial settings!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleProcessSalaries = () => {
    startTransition(async () => {
      try {
        const res = await deductMatchdayPlayerSalaries(activeSeason?.id || 6, finOp.matchday);
        if (res.success) {
          showToast(`Salaries processed! ${res.summary.length} teams charged.`);
          loadData();
        }
      } catch {
        showToast("Error processing salaries!");
      }
    });
  };

  const handleApplyTemplateAdj = () => {
    if (!finOp.targetManagerId || !finOp.targetTournamentId) return showToast("Select Manager & Tournament!");
    startTransition(async () => {
      try {
        const res = await applyTemplateAdjustment(
          finOp.adjustmentType as any,
          parseInt(finOp.targetManagerId),
          activeSeason?.id || 6,
          parseInt(finOp.targetTournamentId)
        );
        if (res.success) {
          showToast(`Adjustment applied: +${res.rc} RC, +${res.rt} RT, +${res.voucher} Voucher!`);
          loadData();
        }
      } catch (e: any) {
        showToast(e.message || "Error applying template adjustment!");
      }
    });
  };

  const handleProcessMatchBonuses = () => {
    if (!finOp.targetTournamentId) return showToast("Select Tournament!");
    startTransition(async () => {
      try {
        const res = await processTournamentMatchBonuses(
          parseInt(finOp.targetTournamentId),
          activeSeason?.id || 6
        );
        if (res.success) {
          showToast(`Match bonuses processed! Paid rewards for ${res.processedCount} match-managers.`);
          loadData();
        }
      } catch (e: any) {
        showToast(e.message || "Error processing match bonuses!");
      }
    });
  };

  const handleApplyCustomAdj = () => {
    if (!finOp.targetManagerId) return showToast("Select Manager!");
    startTransition(async () => {
      try {
        await applyCustomAdjustment(
          parseInt(finOp.targetManagerId),
          activeSeason?.id || 6,
          finOp.customType,
          finOp.customRc,
          finOp.customRt,
          finOp.customVoucher,
          finOp.customNotes
        );
        showToast("Custom financial adjustment applied!");
        setFinOp(prev => ({ ...prev, customRc: 0, customRt: 0, customVoucher: 0, customNotes: "" }));
        loadData();
      } catch {
        showToast("Error applying custom adjustment!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper" data-module="financial-ops">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container">
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-wallet" /> Financial Panel</div>
          <h1 className="portal-title">FINANCIAL OPERATIONS</h1>
          <p className="portal-subtitle">Execute matchday salary pay cuts, template-based bonuses/fines, and registration overrides.</p>
        </div>

        <div className="admin-card">
          {/* Section 1: Matchday Player appearance salary pay cuts */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}><i className="fa-solid fa-user-minus" /> Matchday Player Appearance Salary Payments</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Deduct active player contract salaries for the selected matchday based on recorded appearances in the ledger.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div className="admin-form-group" style={{ width: "200px" }}>
                <label>Select Matchday</label>
                <select className="admin-select" value={finOp.matchday} onChange={(e) => setFinOp(prev => ({ ...prev, matchday: parseInt(e.target.value) || 1 }))}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(md => (
                    <option key={md} value={md}>Matchday {md}</option>
                  ))}
                </select>
              </div>
              <button className="portal-btn btn-primary" onClick={handleProcessSalaries} disabled={isPending}>
                Deduct Matchday {finOp.matchday} Salaries
              </button>
            </div>
          </div>

          {/* Section 1.5: Bulk Played Match Bonuses */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}><i className="fa-solid fa-wand-magic-sparkles" style={{ color: "var(--solo-primary)" }} /> Process Played Match Bonuses (Bulk Auto-payout)</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Scan the app's fixture records for all completed matches in the selected tournament, evaluate win/draw/loss bonuses, credit manager wallets, and prevent double payouts.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
              <div className="admin-form-group" style={{ width: "300px", marginBottom: 0 }}>
                <label>Select Tournament</label>
                <select className="admin-select" value={finOp.targetTournamentId} onChange={(e) => setFinOp(prev => ({ ...prev, targetTournamentId: e.target.value }))}>
                  <option value="">-- Select Tournament --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button className="portal-btn btn-primary" onClick={handleProcessMatchBonuses} disabled={isPending}>
                Process &amp; Payout Match Bonuses
              </button>
            </div>
          </div>

          {/* Section 2: Linked Template Adjustments */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}><i className="fa-solid fa-file-invoice-dollar" /> Apply Tournament Template (Bonuses & Fines)</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Apply match bonuses, walkover fines, or match extension fees dynamically based on the financial template linked to the tournament.
            </p>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Target Tournament (to read Template)</label>
                <select className="admin-select" value={finOp.targetTournamentId} onChange={(e) => setFinOp(prev => ({ ...prev, targetTournamentId: e.target.value }))}>
                  <option value="">-- Select Tournament --</option>
                  {tournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Target Manager / Club</label>
                <select className="admin-select" value={finOp.targetManagerId} onChange={(e) => setFinOp(prev => ({ ...prev, targetManagerId: e.target.value }))}>
                  <option value="">-- Select Club --</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.manager})</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Adjustment Action</label>
                <select className="admin-select" value={finOp.adjustmentType} onChange={(e) => setFinOp(prev => ({ ...prev, adjustmentType: e.target.value }))}>
                  <option value="tournament_bonus">Apply Tournament Winner Bonus</option>
                  <option value="season_bonus">Apply Season Finale Bonus</option>
                </select>
              </div>
            </div>
            <button className="portal-btn btn-primary" onClick={handleApplyTemplateAdj} disabled={isPending}>
              Apply Template Adjustment
            </button>
          </div>

          {/* Section 3: Custom Financial Override Form */}
          <div>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}><i className="fa-solid fa-gears" /> Custom Override (Season Registration Bonus & Manual Adjustments)</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Directly disburse season registration bonuses or manually credit/debit custom token sums.
            </p>
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Target Manager / Club</label>
                <select className="admin-select" value={finOp.targetManagerId} onChange={(e) => setFinOp(prev => ({ ...prev, targetManagerId: e.target.value }))}>
                  <option value="">-- Select Club --</option>
                  {clubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.manager})</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-group">
                <label>Override Transaction Type</label>
                <select
                  className="admin-select"
                  value={finOp.customType}
                  onChange={(e) => {
                    const type = e.target.value;
                    let rc = finOp.customRc;
                    let rt = finOp.customRt;
                    let v = finOp.customVoucher;
                    let notes = finOp.customNotes;
                    if (type === "reg_bonus" && activeSeason) {
                      rc = activeSeason.start_bonus_rc || 0;
                      rt = activeSeason.start_bonus_rt || 0;
                      v = activeSeason.start_bonus_voucher || 0;
                      notes = `Season ${activeSeason.season_number} registration starting bonus`;
                    } else if (type === "season_reward" && activeSeason) {
                      rc = activeSeason.finale_bonus_rc || 0;
                      rt = activeSeason.finale_bonus_rt || 0;
                      v = activeSeason.finale_bonus_voucher || 0;
                      notes = `Season ${activeSeason.season_number} finale bonus standing reward`;
                    }
                    setFinOp(prev => ({
                      ...prev,
                      customType: type,
                      customRc: rc,
                      customRt: rt,
                      customVoucher: v,
                      customNotes: notes
                    }));
                  }}
                >
                  <option value="reg_bonus">Season Registration Bonus (Credit RC & RT)</option>
                  <option value="season_reward">Season Reward / Standing Payout</option>
                  <option value="ballon_dor_ceremony">Ballon d'Or Ceremony (Tokens RT only)</option>
                  <option value="custom_credit">Custom Manual Credit (Add coins/tokens)</option>
                  <option value="custom_debit">Custom Manual Debit (Deduct coins/tokens)</option>
                </select>
              </div>
            </div>
            
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Coins Amount (RC)</label>
                <input type="number" className="admin-input" value={finOp.customRc} onChange={(e) => setFinOp(prev => ({ ...prev, customRc: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="admin-form-group">
                <label>Tokens Amount (RT)</label>
                <input type="number" className="admin-input" value={finOp.customRt} onChange={(e) => setFinOp(prev => ({ ...prev, customRt: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="admin-form-group">
                <label>Vouchers Amount</label>
                <input type="number" className="admin-input" value={finOp.customVoucher} onChange={(e) => setFinOp(prev => ({ ...prev, customVoucher: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="admin-form-group">
                <label>Adjustment Description / Reason</label>
                <input type="text" className="admin-input" value={finOp.customNotes} onChange={(e) => setFinOp(prev => ({ ...prev, customNotes: e.target.value }))} placeholder="Reason for this override entry..." />
              </div>
            </div>

            <button className="portal-btn btn-primary" onClick={handleApplyCustomAdj} disabled={isPending}>
              Apply Custom Override
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
