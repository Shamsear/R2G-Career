"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import CustomSelect from "@/components/ui/CustomSelect";
import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchTournaments,
  deductMatchdayPlayerSalaries,
  applyTemplateAdjustment,
  applyCustomAdjustment,
  applyBulkCustomAdjustment,
  fetchRecentWalletTransactions,
  processTournamentMatchBonuses,
  fetchTournamentPositionRewardsPreview,
  disburseTournamentPositionRewards,
  fetchSeasonFinaleRewardsPreview,
  disburseSeasonFinaleRewards
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

  // Bulk Standings Payouts states
  const [selectedDisburseTourneyId, setSelectedDisburseTourneyId] = useState<string>("");
  const [tourneyPreviewList, setTourneyPreviewList] = useState<any[]>([]);

  // Bulk Season Finale states
  const [selectedSeasonTourneyId, setSelectedSeasonTourneyId] = useState<string>("");
  const [seasonPreviewList, setSeasonPreviewList] = useState<any[]>([]);

  // Multi-team / batch override states
  const [targetMode, setTargetMode] = useState<"single" | "bulk">("single");
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>([]);
  const [bulkClubSearch, setBulkClubSearch] = useState("");

  // Recent Wallet Transactions Ledger states
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txFilterManagerId, setTxFilterManagerId] = useState("");
  const [txFilterCurrency, setTxFilterCurrency] = useState<"all" | "coin" | "token" | "voucher">("all");
  const [txSearch, setTxSearch] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const txs = await fetchRecentWalletTransactions({
        seasonId: activeSeason?.id,
        limit: 120
      });
      setTransactions(txs || []);
    } catch {
      console.error("Error loading transactions");
    } finally {
      setTxLoading(false);
    }
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
      if (season) {
        const [res, txs] = await Promise.all([
          fetchSeasonFinaleRewardsPreview(season.id),
          fetchRecentWalletTransactions({ seasonId: season.id, limit: 120 })
        ]);
        setSeasonPreviewList(res || []);
        setTransactions(txs || []);
      }
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
    if (targetMode === "single") {
      if (!finOp.targetManagerId) return showToast("Select Manager / Club!");
    } else {
      if (selectedManagerIds.length === 0) return showToast("Select at least one team for bulk adjustment!");
    }

    if (finOp.customRc === 0 && finOp.customRt === 0 && finOp.customVoucher === 0) {
      return showToast("Enter an amount for coins, tokens, or vouchers!");
    }

    startTransition(async () => {
      try {
        if (targetMode === "single") {
          await applyCustomAdjustment(
            parseInt(finOp.targetManagerId),
            activeSeason?.id || 6,
            finOp.customType,
            finOp.customRc,
            finOp.customRt,
            finOp.customVoucher,
            finOp.customNotes
          );
          showToast("Custom financial adjustment applied successfully!");
        } else {
          const res = await applyBulkCustomAdjustment(
            selectedManagerIds,
            activeSeason?.id || 6,
            finOp.customType,
            finOp.customRc,
            finOp.customRt,
            finOp.customVoucher,
            finOp.customNotes
          );
          showToast(`Bulk adjustment applied to ${res.count || selectedManagerIds.length} teams!`);
          setSelectedManagerIds([]);
        }
        setFinOp(prev => ({ ...prev, customRc: 0, customRt: 0, customVoucher: 0, customNotes: "" }));
        loadData();
        loadTransactions();
      } catch (err: any) {
        showToast(err.message || "Error applying custom adjustment!");
      }
    });
  };

  const loadTourneyPreview = async (tourneyId: string) => {
    if (!tourneyId) {
      setTourneyPreviewList([]);
      return;
    }
    try {
      const res = await fetchTournamentPositionRewardsPreview(parseInt(tourneyId), activeSeason?.id || 6);
      setTourneyPreviewList(res || []);
    } catch {
      showToast("Error loading tournament rewards preview!");
    }
  };

  const loadSeasonPreview = async (tourneyIdStr?: string) => {
    try {
      const tourneyId = tourneyIdStr ? parseInt(tourneyIdStr) : undefined;
      const res = await fetchSeasonFinaleRewardsPreview(activeSeason?.id || 6, tourneyId);
      setSeasonPreviewList(res || []);
    } catch {
      showToast("Error loading season finale rewards preview!");
    }
  };

  const handleDisburseTourneyRewards = () => {
    if (!selectedDisburseTourneyId) return showToast("Select Tournament!");
    startTransition(async () => {
      try {
        const res = await disburseTournamentPositionRewards(parseInt(selectedDisburseTourneyId), activeSeason?.id || 6);
        showToast(`✅ Disbursed standing rewards to ${res.disbursedCount} clubs!`);
        loadTourneyPreview(selectedDisburseTourneyId);
      } catch (err: any) {
        showToast("❌ Error disbursing rewards: " + err.message);
      }
    });
  };

  const handleDisburseSeasonRewards = () => {
    startTransition(async () => {
      try {
        const res = await disburseSeasonFinaleRewards(
          activeSeason?.id || 6,
          selectedSeasonTourneyId ? parseInt(selectedSeasonTourneyId) : undefined
        );
        showToast(`✅ Disbursed season finale standing rewards to ${res.disbursedCount} clubs!`);
        loadSeasonPreview(selectedSeasonTourneyId);
      } catch (err: any) {
        showToast("❌ Error disbursing season rewards: " + err.message);
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
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}><i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }} /> Matchday Player Appearance Salary Payments</h3>
            <div style={{ background: "rgba(59, 130, 246, 0.08)", border: "1px dashed rgba(59, 130, 246, 0.3)", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.85rem", color: "#9ca3af", lineHeight: "1.5", margin: 0 }}>
                💡 <strong>Notice:</strong> Salary deductions are now fully automated! When you edit and save appearances on the 
                {" "}<Link href="/solo-tour/career-mode/appearances" style={{ color: "#3b82f6", textDecoration: "underline", fontWeight: 700 }}>Appearances Ledger</Link> page, the corresponding player appearance salaries are automatically computed and deducted or refunded in a single transaction. 
                Manual matchday processing from this panel is deprecated.
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className="admin-form-group" style={{ width: "100%", maxWidth: "200px", opacity: 0.5 }}>
                <label>Select Matchday</label>
                <CustomSelect
                  value={finOp.matchday}
                  disabled
                  onChange={(val) => setFinOp(prev => ({ ...prev, matchday: parseInt(val) || 1 }))}
                  options={Array.from({ length: 10 }, (_, i) => i + 1).map(md => ({
                    value: md,
                    label: `Matchday ${md}`
                  }))}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
              <button className="portal-btn btn-secondary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                <i className="fa-solid fa-lock" /> Deduct Matchday {finOp.matchday} Salaries (Automated)
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
                <CustomSelect
                  value={finOp.targetTournamentId}
                  onChange={(val) => setFinOp(prev => ({ ...prev, targetTournamentId: val }))}
                  placeholder="-- Select Tournament --"
                  options={[
                    { value: "", label: "-- Select Tournament --" },
                    ...tournaments.map(t => ({ value: String(t.id), label: t.name }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
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
                <CustomSelect
                  value={finOp.targetTournamentId}
                  onChange={(val) => setFinOp(prev => ({ ...prev, targetTournamentId: val }))}
                  placeholder="-- Select Tournament --"
                  options={[
                    { value: "", label: "-- Select Tournament --" },
                    ...tournaments.map(t => ({ value: String(t.id), label: t.name }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
              <div className="admin-form-group">
                <label>Target Manager / Club</label>
                <CustomSelect
                  value={finOp.targetManagerId}
                  onChange={(val) => setFinOp(prev => ({ ...prev, targetManagerId: val }))}
                  placeholder="-- Select Club --"
                  options={[
                    { value: "", label: "-- Select Club --" },
                    ...clubs.map(c => ({ value: String(c.manager_id || c.id), label: `${c.name} (${c.manager})` }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
              <div className="admin-form-group">
                <label>Adjustment Action</label>
                <CustomSelect
                  value={finOp.adjustmentType}
                  onChange={(val) => setFinOp(prev => ({ ...prev, adjustmentType: val }))}
                  options={[
                    { value: "tournament_bonus", label: "Apply Tournament Winner Bonus" },
                    { value: "season_bonus", label: "Apply Season Finale Bonus" }
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
            </div>
            <button className="portal-btn btn-primary" onClick={handleApplyTemplateAdj} disabled={isPending}>
              Apply Template Adjustment
            </button>
          </div>

          {/* Section 2.2: Bulk Tournament Standings Position Payouts */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}>
              <i className="fa-solid fa-ranking-star" style={{ color: "#eab308" }} /> Bulk Tournament Standings Position Payouts
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Fetch final standings for a completed tournament, preview reward distributions mapped to the financial template, and disburse coins/tokens to managers in bulk.
            </p>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div className="admin-form-group" style={{ width: "100%", maxWidth: "300px", marginBottom: 0 }}>
                <label>Select Tournament</label>
                <CustomSelect
                  value={selectedDisburseTourneyId}
                  onChange={(val) => {
                    setSelectedDisburseTourneyId(val);
                    loadTourneyPreview(val);
                  }}
                  placeholder="-- Select Tournament --"
                  options={[
                    { value: "", label: "-- Select Tournament --" },
                    ...tournaments.map(t => ({ value: String(t.id), label: t.name }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
              <button
                className="portal-btn btn-primary"
                onClick={handleDisburseTourneyRewards}
                disabled={isPending || !selectedDisburseTourneyId || tourneyPreviewList.length === 0}
              >
                Disburse Standings Payouts
              </button>
            </div>

            {selectedDisburseTourneyId && tourneyPreviewList.length > 0 && (
              <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", padding: "10px", marginTop: "1rem" }}>
                <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>Rank</th>
                      <th style={{ padding: "8px" }}>Club</th>
                      <th style={{ padding: "8px" }}>Manager</th>
                      <th style={{ padding: "8px" }}>Coins (RC)</th>
                      <th style={{ padding: "8px" }}>Tokens (RT)</th>
                      <th style={{ padding: "8px" }}>Voucher</th>
                      <th style={{ padding: "8px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tourneyPreviewList.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px", fontWeight: "bold", color: p.rank === 1 ? "#eab308" : p.rank === 2 ? "#94a3b8" : p.rank === 3 ? "#b45309" : "#fff" }}>
                          #{p.rank}
                        </td>
                        <td style={{ padding: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                          {p.club_logo && <img src={p.club_logo} style={{ width: "20px", height: "20px", objectFit: "contain" }} alt="" />}
                          <span>{p.club_name}</span>
                        </td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{p.manager}</td>
                        <td style={{ padding: "8px", color: "#eab308" }}>+{p.rc}</td>
                        <td style={{ padding: "8px", color: "#38bdf8" }}>+{p.rt}</td>
                        <td style={{ padding: "8px", color: "#a855f7" }}>+{p.voucher}</td>
                        <td style={{ padding: "8px" }}>
                          {p.disbursed ? (
                            <span style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}><i className="fa-solid fa-check-double" /> Disbursed</span>
                          ) : (
                            <span style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}><i className="fa-solid fa-clock" /> Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2.5: Bulk Season Finale Standing Payouts */}
          <div style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "1.5rem", marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "0.5rem", color: "#fff" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#a855f7" }} /> Bulk Season Finale standing Rewards
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Fetch the standings of the primary division tournament to calculate the final season champion payouts (combines season finale awards plus template season winner bonuses) in bulk.
            </p>
            
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "1rem" }}>
              <div className="admin-form-group" style={{ width: "100%", maxWidth: "300px", marginBottom: 0 }}>
                <label>Division Standings Source Tournament</label>
                <CustomSelect
                  value={selectedSeasonTourneyId}
                  onChange={(val) => {
                    setSelectedSeasonTourneyId(val);
                    loadSeasonPreview(val);
                  }}
                  placeholder="-- Auto Detect (Division Tier 1) --"
                  options={[
                    { value: "", label: "-- Auto Detect (Division Tier 1) --" },
                    ...tournaments.map(t => ({ value: String(t.id), label: t.name }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
              <button
                className="portal-btn btn-primary"
                onClick={handleDisburseSeasonRewards}
                disabled={isPending || seasonPreviewList.length === 0}
                style={{ background: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)" }}
              >
                Disburse Season Finale Rewards
              </button>
            </div>

            {seasonPreviewList.length > 0 && (
              <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.15)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", padding: "10px", marginTop: "1rem" }}>
                <table style={{ width: "100%", minWidth: "600px", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
                      <th style={{ padding: "8px" }}>Rank</th>
                      <th style={{ padding: "8px" }}>Club</th>
                      <th style={{ padding: "8px" }}>Manager</th>
                      <th style={{ padding: "8px" }}>Coins (RC)</th>
                      <th style={{ padding: "8px" }}>Tokens (RT)</th>
                      <th style={{ padding: "8px" }}>Voucher</th>
                      <th style={{ padding: "8px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonPreviewList.map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "8px", fontWeight: "bold", color: p.rank === 1 ? "#eab308" : p.rank === 2 ? "#94a3b8" : p.rank === 3 ? "#b45309" : "#fff" }}>
                          #{p.rank}
                        </td>
                        <td style={{ padding: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                          {p.club_logo && <img src={p.club_logo} style={{ width: "20px", height: "20px", objectFit: "contain" }} alt="" />}
                          <span>{p.club_name}</span>
                        </td>
                        <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{p.manager}</td>
                        <td style={{ padding: "8px", color: "#eab308" }}>+{p.rc}</td>
                        <td style={{ padding: "8px", color: "#38bdf8" }}>+{p.rt}</td>
                        <td style={{ padding: "8px", color: "#a855f7" }}>+{p.voucher}</td>
                        <td style={{ padding: "8px" }}>
                          {p.disbursed ? (
                            <span style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}><i className="fa-solid fa-check-double" /> Disbursed</span>
                          ) : (
                            <span style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}><i className="fa-solid fa-clock" /> Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Custom Financial Override Form */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1.1rem", margin: 0, color: "#fff" }}>
                <i className="fa-solid fa-gears" /> Custom Override &amp; Wallet Awards / Fines
              </h3>
              
              {/* Target Mode Segmented Switch */}
              <div style={{ display: "flex", gap: "6px", background: "rgba(0,0,0,0.3)", padding: "3px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <button
                  type="button"
                  onClick={() => setTargetMode("single")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "7px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: targetMode === "single" ? "rgba(59,130,246,0.3)" : "transparent",
                    color: targetMode === "single" ? "#60a5fa" : "rgba(255,255,255,0.6)",
                    boxShadow: targetMode === "single" ? "0 2px 8px rgba(59,130,246,0.3)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <i className="fa-solid fa-user" /> Single Team
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("bulk")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "7px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: targetMode === "bulk" ? "rgba(168,85,247,0.3)" : "transparent",
                    color: targetMode === "bulk" ? "#c084fc" : "rgba(255,255,255,0.6)",
                    boxShadow: targetMode === "bulk" ? "0 2px 8px rgba(168,85,247,0.3)" : "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <i className="fa-solid fa-users" /> Multiple Teams ({selectedManagerIds.length})
                </button>
              </div>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Award (+ coins/tokens) or deduct (- fines/penalties) directly to one team or batch-apply to multiple teams. Every adjustment is permanently recorded in the wallet transaction audit ledger.
            </p>

            {/* Target Selection View */}
            {targetMode === "bulk" ? (
              <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "12px", padding: "1rem", marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px" }}>
                    <input
                      type="text"
                      placeholder="Filter teams or managers..."
                      value={bulkClubSearch}
                      onChange={(e) => setBulkClubSearch(e.target.value)}
                      className="admin-input"
                      style={{ maxWidth: "260px", padding: "7px 12px", fontSize: "0.8rem", borderRadius: "8px" }}
                    />
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      Selected: <strong style={{ color: selectedManagerIds.length > 0 ? "#34d399" : "rgba(255,255,255,0.5)" }}>{selectedManagerIds.length}</strong> / {clubs.length}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setSelectedManagerIds(clubs.map(c => String(c.manager_id || c.id)))}
                      className="portal-btn btn-secondary"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", borderRadius: "6px" }}
                    >
                      <i className="fa-solid fa-check-double" style={{ marginRight: "4px" }} /> Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedManagerIds([])}
                      className="portal-btn btn-secondary"
                      style={{ padding: "5px 12px", fontSize: "0.75rem", borderRadius: "6px" }}
                    >
                      <i className="fa-solid fa-xmark" style={{ marginRight: "4px" }} /> Clear
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "8px", maxHeight: "200px", overflowY: "auto", paddingRight: "4px" }}>
                  {clubs.filter(c => {
                    if (!bulkClubSearch.trim()) return true;
                    const q = bulkClubSearch.toLowerCase();
                    return (c.name || "").toLowerCase().includes(q) || (c.manager || "").toLowerCase().includes(q);
                  }).map(c => {
                    const idStr = String(c.manager_id || c.id);
                    const isSelected = selectedManagerIds.includes(idStr);
                    return (
                      <div
                        key={idStr}
                        onClick={() => {
                          setSelectedManagerIds(prev =>
                            isSelected ? prev.filter(x => x !== idStr) : [...prev, idStr]
                          );
                        }}
                        style={{
                          padding: "8px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          border: isSelected ? "1px solid rgba(168,85,247,0.7)" : "1px solid rgba(255,255,255,0.06)",
                          background: isSelected ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.02)",
                          boxShadow: isSelected ? "0 0 10px rgba(168,85,247,0.2)" : "none",
                          transition: "all 0.15s ease",
                          userSelect: "none"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          style={{ accentColor: "#a855f7", pointerEvents: "none" }}
                        />
                        {c.image ? (
                          <img src={c.image} alt="" style={{ width: "20px", height: "20px", objectFit: "contain" }} />
                        ) : (
                          <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.8rem", opacity: 0.4 }} />
                        )}
                        <div style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: isSelected ? "#fff" : "rgba(255,255,255,0.85)" }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                            {c.manager}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="admin-form-grid" style={{ marginBottom: "1rem" }}>
                <div className="admin-form-group">
                  <label>Target Manager / Club</label>
                  <CustomSelect
                    value={finOp.targetManagerId}
                    onChange={(val) => setFinOp(prev => ({ ...prev, targetManagerId: val }))}
                    placeholder="-- Select Club --"
                    options={[
                      { value: "", label: "-- Select Club --" },
                      ...clubs.map(c => ({ value: String(c.manager_id || c.id), label: `${c.name} (${c.manager})` }))
                    ]}
                    buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Override Transaction Type</label>
                  <CustomSelect
                    value={finOp.customType}
                    onChange={(type) => {
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
                    options={[
                      { value: "custom_credit", label: "Custom Manual Credit (Add + coins/tokens)" },
                      { value: "custom_debit", label: "Custom Manual Debit (Deduct - coins/tokens)" },
                      { value: "reg_bonus", label: "Season Registration Bonus (Credit RC & RT)" },
                      { value: "season_reward", label: "Season Reward / Standing Payout" },
                      { value: "ballon_dor_ceremony", label: "Ballon d'Or Ceremony (Tokens RT only)" }
                    ]}
                    buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                  />
                </div>
              </div>
            )}

            {/* In bulk mode, also render the Transaction Type select if not shown above */}
            {targetMode === "bulk" && (
              <div className="admin-form-group" style={{ marginBottom: "1rem" }}>
                <label>Override Transaction Type</label>
                <CustomSelect
                  value={finOp.customType}
                  onChange={(type) => {
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
                  options={[
                    { value: "custom_credit", label: "Custom Manual Credit (Add + coins/tokens)" },
                    { value: "custom_debit", label: "Custom Manual Debit (Deduct - coins/tokens)" },
                    { value: "reg_bonus", label: "Season Registration Bonus (Credit RC & RT)" },
                    { value: "season_reward", label: "Season Reward / Standing Payout" },
                    { value: "ballon_dor_ceremony", label: "Ballon d'Or Ceremony (Tokens RT only)" }
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>
            )}

            {/* Quick Presets Row */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center", marginBottom: "0.85rem", background: "rgba(255,255,255,0.02)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontWeight: 700, marginRight: "4px" }}>
                <i className="fa-solid fa-bolt" style={{ color: "#eab308", marginRight: "4px" }} /> Quick Presets:
              </span>
              {[10, 20, 50, 100].map(amt => (
                <button
                  key={`plus-${amt}`}
                  type="button"
                  onClick={() => setFinOp(prev => ({ ...prev, customRc: amt, customType: "custom_credit" }))}
                  style={{ padding: "4px 9px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#34d399", cursor: "pointer" }}
                  title={`Award +${amt} Coins`}
                >
                  +{amt} RC
                </button>
              ))}
              <span style={{ margin: "0 4px", opacity: 0.3 }}>|</span>
              {[10, 20, 50].map(amt => (
                <button
                  key={`minus-${amt}`}
                  type="button"
                  onClick={() => setFinOp(prev => ({ ...prev, customRc: amt, customType: "custom_debit" }))}
                  style={{ padding: "4px 9px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)", color: "#f87171", cursor: "pointer" }}
                  title={`Deduct -${amt} Coins`}
                >
                  -{amt} RC
                </button>
              ))}
            </div>

            {/* Amount inputs */}
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>
                  <i className="fa-solid fa-coins" style={{ color: "#fbbf24", marginRight: "5px" }} />
                  Coins Amount (RC) {finOp.customType === "custom_debit" ? "(Deduct)" : "(Award)"}
                </label>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={finOp.customRc}
                  onChange={(e) => setFinOp(prev => ({ ...prev, customRc: Math.max(0, parseInt(e.target.value) || 0) }))}
                  style={{ color: finOp.customType === "custom_debit" ? "#f87171" : "#34d399", fontWeight: 700 }}
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <i className="fa-solid fa-star" style={{ color: "#38bdf8", marginRight: "5px" }} />
                  Tokens Amount (RT)
                </label>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={finOp.customRt}
                  onChange={(e) => setFinOp(prev => ({ ...prev, customRt: Math.max(0, parseInt(e.target.value) || 0) }))}
                />
              </div>
              <div className="admin-form-group">
                <label>
                  <i className="fa-solid fa-ticket" style={{ color: "#c084fc", marginRight: "5px" }} />
                  Vouchers Amount
                </label>
                <input
                  type="number"
                  min="0"
                  className="admin-input"
                  value={finOp.customVoucher}
                  onChange={(e) => setFinOp(prev => ({ ...prev, customVoucher: Math.max(0, parseInt(e.target.value) || 0) }))}
                />
              </div>
            </div>

            <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
              <div className="admin-form-group">
                <label>Adjustment Description / Reason (Required for Audit Trail)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={finOp.customNotes}
                  onChange={(e) => setFinOp(prev => ({ ...prev, customNotes: e.target.value }))}
                  placeholder="e.g. +10 Match bonus, -10 Late submission penalty, Fair play award..."
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", marginTop: "0.5rem" }}>
              <button
                className="portal-btn btn-primary"
                onClick={handleApplyCustomAdj}
                disabled={isPending}
                style={{
                  background: finOp.customType === "custom_debit"
                    ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
                    : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  boxShadow: finOp.customType === "custom_debit"
                    ? "0 4px 15px rgba(239,68,68,0.3)"
                    : "0 4px 15px rgba(16,185,129,0.3)"
                }}
              >
                {isPending ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "6px" }} /> Processing...</>
                ) : targetMode === "bulk" ? (
                  <>
                    <i className={finOp.customType === "custom_debit" ? "fa-solid fa-minus" : "fa-solid fa-plus"} style={{ marginRight: "6px" }} />
                    Apply {finOp.customType === "custom_debit" ? "Deduction" : "Award"} to {selectedManagerIds.length} Teams
                  </>
                ) : (
                  <>
                    <i className={finOp.customType === "custom_debit" ? "fa-solid fa-minus" : "fa-solid fa-plus"} style={{ marginRight: "6px" }} />
                    Apply {finOp.customType === "custom_debit" ? "Deduction (-)" : "Award (+)"}
                  </>
                )}
              </button>

              {targetMode === "bulk" && selectedManagerIds.length > 0 && (
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Each team will receive: <strong style={{ color: finOp.customType === "custom_debit" ? "#f87171" : "#34d399" }}>
                    {finOp.customType === "custom_debit" ? "-" : "+"}{finOp.customRc} RC, {finOp.customType === "custom_debit" ? "-" : "+"}{finOp.customRt} RT
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Section 4: Recent Wallet Transactions & Adjustments Ledger */}
          <div style={{ marginTop: "2.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.3rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                  <i className="fa-solid fa-receipt" style={{ color: "#34d399" }} /> Recent Wallet Transactions &amp; Adjustments Ledger
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
                  Live audit trail of all coin, token, and voucher disbursements, awards, deductions, and penalties.
                </p>
              </div>
              <button
                type="button"
                onClick={loadTransactions}
                className="portal-btn btn-secondary"
                style={{ padding: "6px 14px", fontSize: "0.78rem" }}
                disabled={txLoading}
              >
                <i className={`fa-solid fa-rotate ${txLoading ? "fa-spin" : ""}`} style={{ marginRight: "6px" }} /> Refresh Log
              </button>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ width: "100%", maxWidth: "240px" }}>
                <CustomSelect
                  value={txFilterManagerId}
                  onChange={(val) => setTxFilterManagerId(val)}
                  placeholder="-- All Teams --"
                  options={[
                    { value: "", label: "-- All Teams --" },
                    ...clubs.map(c => ({ value: String(c.manager_id || c.id), label: `${c.name} (${c.manager})` }))
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>

              <div style={{ width: "100%", maxWidth: "160px" }}>
                <CustomSelect
                  value={txFilterCurrency}
                  onChange={(val) => setTxFilterCurrency(val as any)}
                  options={[
                    { value: "all", label: "All Currencies" },
                    { value: "coin", label: "Coins (RC)" },
                    { value: "token", label: "Tokens (RT)" },
                    { value: "voucher", label: "Vouchers" }
                  ]}
                  buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                />
              </div>

              <input
                type="text"
                placeholder="Search reason / notes..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="admin-input"
                style={{ flex: 1, minWidth: "180px", padding: "8px 12px", borderRadius: "8px", fontSize: "0.8rem" }}
              />
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", background: "rgba(0,0,0,0.2)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)", padding: "10px" }}>
              {txLoading ? (
                <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px", color: "#34d399" }} /> Loading transactions...
                </div>
              ) : transactions.filter(tx => {
                if (txFilterManagerId && String(tx.manager_id) !== txFilterManagerId) return false;
                if (txFilterCurrency !== "all" && tx.currency_type !== txFilterCurrency) return false;
                if (txSearch.trim()) {
                  const q = txSearch.toLowerCase();
                  const descMatch = (tx.description || "").toLowerCase().includes(q);
                  const clubMatch = (tx.club_name || "").toLowerCase().includes(q);
                  const mgrMatch = (tx.manager_name || "").toLowerCase().includes(q);
                  if (!descMatch && !clubMatch && !mgrMatch) return false;
                }
                return true;
              }).length === 0 ? (
                <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  <i className="fa-solid fa-inbox" style={{ display: "block", fontSize: "1.5rem", marginBottom: "8px", opacity: 0.4 }} />
                  No transactions found matching your criteria.
                </div>
              ) : (
                <table style={{ width: "100%", minWidth: "750px", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "8px" }}>Time</th>
                      <th style={{ padding: "8px" }}>Club &amp; Manager</th>
                      <th style={{ padding: "8px" }}>Type</th>
                      <th style={{ padding: "8px" }}>Amount</th>
                      <th style={{ padding: "8px" }}>Reason / Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.filter(tx => {
                      if (txFilterManagerId && String(tx.manager_id) !== txFilterManagerId) return false;
                      if (txFilterCurrency !== "all" && tx.currency_type !== txFilterCurrency) return false;
                      if (txSearch.trim()) {
                        const q = txSearch.toLowerCase();
                        const descMatch = (tx.description || "").toLowerCase().includes(q);
                        const clubMatch = (tx.club_name || "").toLowerCase().includes(q);
                        const mgrMatch = (tx.manager_name || "").toLowerCase().includes(q);
                        if (!descMatch && !clubMatch && !mgrMatch) return false;
                      }
                      return true;
                    }).slice(0, 50).map((tx, idx) => {
                      const isPos = Number(tx.amount) > 0;
                      const isNeg = Number(tx.amount) < 0;
                      const currColor = tx.currency_type === 'token' ? '#38bdf8' : tx.currency_type === 'voucher' ? '#c084fc' : '#fbbf24';
                      const currIcon = tx.currency_type === 'token' ? 'fa-star' : tx.currency_type === 'voucher' ? 'fa-ticket' : 'fa-coins';
                      const currLabel = tx.currency_type === 'token' ? 'RT' : tx.currency_type === 'voucher' ? 'Voucher' : 'Coins';
                      
                      const dateStr = new Date(tx.created_at).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <tr key={tx.id || idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <td style={{ padding: "8px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                            {dateStr}
                          </td>
                          <td style={{ padding: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              {tx.club_logo ? (
                                <img src={tx.club_logo} alt="" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
                              ) : (
                                <i className="fa-solid fa-shield-halved" style={{ fontSize: "0.75rem", opacity: 0.4 }} />
                              )}
                              <div>
                                <strong style={{ color: "#fff" }}>{tx.club_name || `Manager #${tx.manager_id}`}</strong>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginLeft: "6px" }}>({tx.manager_name})</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <span style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              background: isPos ? "rgba(16,185,129,0.12)" : isNeg ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.08)",
                              color: isPos ? "#34d399" : isNeg ? "#f87171" : "rgba(255,255,255,0.7)"
                            }}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: "0.88rem",
                              color: isPos ? "#34d399" : isNeg ? "#f87171" : "rgba(255,255,255,0.6)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px"
                            }}>
                              <i className={`fa-solid ${currIcon}`} style={{ color: currColor, fontSize: "0.75rem" }} />
                              {isPos ? `+${tx.amount}` : tx.amount} {currLabel}
                            </span>
                          </td>
                          <td style={{ padding: "8px", color: "rgba(255,255,255,0.75)", maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tx.description}>
                            {tx.description}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
