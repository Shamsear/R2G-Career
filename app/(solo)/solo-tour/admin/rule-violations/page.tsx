"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchFixtures,
  fetchTournaments,
  fetchRuleViolations,
  createRuleViolation,
  deleteRuleViolation
} from "@/utils/solo/serverActions";

export default function RuleViolationsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [violations, setViolations] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedFixtureId, setSelectedFixtureId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [useTemplateFine, setUseTemplateFine] = useState<boolean>(true);
  const [customCoins, setCustomCoins] = useState<string>("");
  const [customTokens, setCustomTokens] = useState<string>("");
  const [customVouchers, setCustomVouchers] = useState<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);

      if (season) {
        const [clubsList, violationsList] = await Promise.all([
          fetchRegisteredClubs(),
          fetchRuleViolations(season.id)
        ]);
        setClubs(clubsList || []);
        setViolations(violationsList || []);

        // Fetch fixtures of all tournaments in this season
        const tourneys = await fetchTournaments();
        const seasonTourneys = tourneys.filter((t: any) => t.season_id === season.id);
        const allFixtures: any[] = [];
        for (const t of seasonTourneys) {
          const tFixtures = await fetchFixtures(t.id);
          allFixtures.push(...(tFixtures || []).map(f => ({ ...f, tournamentName: t.name })));
        }
        setFixtures(allFixtures);
      }
    } catch (e: any) {
      console.error(e);
      showToast("❌ Error loading data: " + e.message);
    }
  };

  useEffect(() => {
    loadData();
    document.title = "Admin - Rule Violations Discipline Hub";
  }, []);

  const handleSaveViolation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClubId) return showToast("⚠️ Select club/manager!");
    if (!notes) return showToast("⚠️ Violation description required!");
    if (useTemplateFine && !selectedFixtureId) {
      return showToast("⚠️ Select a fixture to look up the template fine, or use a custom fine!");
    }

    startTransition(async () => {
      try {
        await createRuleViolation({
          fixtureId: selectedFixtureId ? parseInt(selectedFixtureId, 10) : null,
          clubId: parseInt(selectedClubId, 10),
          seasonId: activeSeason?.id || 6,
          notes,
          useTemplateFine,
          customCoins: customCoins ? parseInt(customCoins, 10) : 0,
          customTokens: customTokens ? parseInt(customTokens, 10) : 0,
          customVouchers: customVouchers ? parseInt(customVouchers, 10) : 0
        });

        showToast("✅ Rule violation fine applied!");
        setSelectedClubId("");
        setSelectedFixtureId("");
        setNotes("");
        setCustomCoins("");
        setCustomTokens("");
        setCustomVouchers("");
        loadData();
      } catch (err: any) {
        showToast("❌ Error applying fine: " + err.message);
      }
    });
  };

  const handleDeleteViolation = (id: number) => {
    if (!confirm("Revert this rule violation fine and refund manager wallets?")) return;
    startTransition(async () => {
      try {
        await deleteRuleViolation(id);
        showToast("✅ Fine reverted and manager refunded.");
        loadData();
      } catch (err: any) {
        showToast("❌ Error reverting violation: " + err.message);
      }
    });
  };

  // Find home/away team options for selected fixture to make it easier for admin
  const filteredClubs = () => {
    if (!selectedFixtureId) return clubs;
    const fix = fixtures.find(f => f.id.toString() === selectedFixtureId);
    if (!fix) return clubs;
    return clubs.filter(c => c.name === fix.homeClub || c.name === fix.awayClub);
  };

  return (
    <div className="portal-root-wrapper" data-module="rule-violations">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup">{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge"><i className="fa-solid fa-gavel" /> Rule Violations Hub</div>
          <h1 className="portal-title">DISCIPLINARY ACTIONS & FINES</h1>
          <p className="portal-subtitle">
            Fine managers for rule violations, apply template deductions, and track disciplinary records for Season {activeSeason?.season_number || "?"}.
          </p>
        </div>

        {/* Form & Ledger Container */}
        <div className="financial-layout">
          
          {/* Left Column: Form */}
          <div className="financial-sidebar" style={{ flex: "0 0 420px" }}>
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title"><i className="fa-solid fa-gavel" /> Issue Disciplinary Fine</h3>
              
              <form onSubmit={handleSaveViolation} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* 1. Fixture Link */}
                <div className="admin-form-group">
                  <label>Associate Fixture (Optional)</label>
                  <select
                    className="admin-select"
                    value={selectedFixtureId}
                    onChange={(e) => {
                      setSelectedFixtureId(e.target.value);
                      setSelectedClubId(""); // Reset club selection as options will filter
                    }}
                  >
                    <option value="">-- No Fixture / General Violation --</option>
                    {fixtures.map(f => (
                      <option key={f.id} value={f.id}>
                        Round {f.roundNumber} - {f.homeClub} vs {f.awayClub} ({f.tournamentName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Manager/Club select */}
                <div className="admin-form-group">
                  <label>Offending Manager / Club</label>
                  <select
                    className="admin-select"
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Offender --</option>
                    {filteredClubs().map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.manager || "No Manager"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Notes */}
                <div className="admin-form-group">
                  <label>Violation Reason / Notes</label>
                  <textarea
                    className="admin-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g., Exceeded maximum squad size; Missed deadline for lineups."
                    style={{ minHeight: "80px", resize: "vertical", width: "100%" }}
                    required
                  />
                </div>

                {/* 4. Fine configuration */}
                <div className="admin-form-group" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    id="chkTemplate"
                    checked={useTemplateFine}
                    onChange={(e) => setUseTemplateFine(e.target.checked)}
                    disabled={!selectedFixtureId}
                  />
                  <label htmlFor="chkTemplate" style={{ cursor: "pointer", fontSize: "0.85rem", color: "#fff" }}>
                    Use template default fine amount
                  </label>
                </div>

                {(!useTemplateFine || !selectedFixtureId) && (
                  <div className="admin-form-group">
                    <label>Custom Fine Amount</label>
                    <div className="currency-input-container">
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-coins currency-icon rc" />
                        <input
                          type="number"
                          className="admin-input"
                          value={customCoins}
                          onChange={(e) => setCustomCoins(e.target.value)}
                          placeholder="Coins"
                          min="0"
                        />
                      </div>
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-star currency-icon rt" />
                        <input
                          type="number"
                          className="admin-input"
                          value={customTokens}
                          onChange={(e) => setCustomTokens(e.target.value)}
                          placeholder="Tokens"
                          min="0"
                        />
                      </div>
                      <div className="currency-input-wrapper">
                        <i className="fa-solid fa-ticket currency-icon voucher" />
                        <input
                          type="number"
                          className="admin-input"
                          value={customVouchers}
                          onChange={(e) => setCustomVouchers(e.target.value)}
                          placeholder="Vouchers"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="portal-btn btn-primary"
                  style={{ width: "100%", height: "42px", justifyContent: "center", marginTop: "1rem" }}
                  disabled={isPending}
                >
                  {isPending ? "Applying fine..." : "Apply Wallet Fine"}
                </button>

              </form>
            </div>
          </div>

          {/* Right Column: Ledger List */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h2 className="admin-card-title">
                <i className="fa-solid fa-book-open" /> Disciplinary Ledger & Fines Log
              </h2>
              
              {violations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>
                  <i className="fa-solid fa-circle-check" style={{ fontSize: "3rem", color: "#10b981", marginBottom: "1rem", display: "block" }} />
                  Clean sheet! No rule violations logged for this season.
                </div>
              ) : (
                <div className="table-responsive" style={{ marginTop: 0 }}>
                  <table className="admin-list-table">
                    <thead>
                      <tr>
                        <th>Manager / Club</th>
                        <th>Association</th>
                        <th>Fine Deducted</th>
                        <th>Violation Details</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map(v => (
                        <tr key={v.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              {v.club_logo && <img src={v.club_logo} style={{ width: "24px", height: "24px", objectFit: "contain" }} alt="" />}
                              <span style={{ fontWeight: "bold", color: "#fff" }}>{v.club_name}</span>
                            </div>
                          </td>
                          <td>
                            {v.fixture_id ? (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                                {v.tournament_name} (Round {v.round_number})
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>General</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "8px", fontSize: "0.8rem", fontWeight: "bold" }}>
                              {Number(v.fine_coins) > 0 && <span style={{ color: "#ef4444" }}>-{v.fine_coins} RC</span>}
                              {Number(v.fine_tokens) > 0 && <span style={{ color: "#f59e0b" }}>-{v.fine_tokens} RT</span>}
                              {Number(v.fine_vouchers) > 0 && <span style={{ color: "#06b6d4" }}>-{v.fine_vouchers} V</span>}
                              {Number(v.fine_coins) === 0 && Number(v.fine_tokens) === 0 && Number(v.fine_vouchers) === 0 && (
                                <span style={{ color: "var(--text-secondary)" }}>None</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <p style={{ margin: 0, fontSize: "0.85rem", color: "#fff", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={v.notes}>
                              {v.notes}
                            </p>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              onClick={() => handleDeleteViolation(v.id)}
                              className="portal-btn btn-secondary"
                              style={{ padding: "4px 8px", fontSize: "0.75rem", color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
                            >
                              <i className="fa-solid fa-trash-can" /> Revert Fine
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
