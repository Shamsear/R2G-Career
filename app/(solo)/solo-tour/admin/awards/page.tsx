"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchTournaments,
  fetchPlayerAwards,
  givePlayerAward,
  revokePlayerAward,
  fetchClubPlayers
} from "@/utils/solo/serverActions";

export default function PlayerAwardsManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [awardForm, setAwardForm] = useState({
    playerId: "",
    playerName: "",
    tournamentId: "", 
    category: "individual",
    type: "Ballon d'Or",
    position: "Winner",
    notes: "",
    rewardRc: 0,
    rewardRt: 0,
    rewardVoucher: 0
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);
      
      const [tourneys, clubsData] = await Promise.all([
        fetchTournaments(),
        fetchRegisteredClubs()
      ]);
      setTournaments(tourneys || []);

      const allPlayers: any[] = [];
      for (const club of (clubsData || [])) {
        const cPlayers = await fetchClubPlayers(club.id);
        allPlayers.push(...cPlayers.map(p => ({ ...p, clubName: club.name, clubId: club.id })));
      }
      setPlayers(allPlayers);

      if (season) {
        const awardList = await fetchPlayerAwards(season.id);
        setAwards(awardList || []);
      }
    } catch {
      showToast("Error loading awards details!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveAward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardForm.playerId || !awardForm.type) return showToast("Select Player and Award Type!");
    
    const playerObj = players.find(p => p.id.toString() === awardForm.playerId);
    if (!playerObj) return showToast("Player not found!");

    startTransition(async () => {
      try {
        const payload = {
          ...awardForm,
          playerName: playerObj.name,
          seasonId: activeSeason?.id || 6
        };
        await givePlayerAward(payload);
        showToast("Player award given successfully!");
        setAwardForm({
          playerId: "", playerName: "", tournamentId: "", category: "individual",
          type: "Ballon d'Or", position: "Winner", notes: "",
          rewardRc: 0, rewardRt: 0, rewardVoucher: 0
        });
        loadData();
      } catch {
        showToast("Error saving award!");
      }
    });
  };

  const handleRevokeAward = (id: number) => {
    if (!confirm("Revoke this award?")) return;
    startTransition(async () => {
      try {
        await revokePlayerAward(id);
        showToast("Award revoked!");
        loadData();
      } catch {
        showToast("Error revoking award!");
      }
    });
  };

  /* ── Derived stats ── */
  const winnerCount = awards.filter(a => a.award_position === "Winner").length;
  const typeCounts: Record<string, number> = {};
  awards.forEach(a => { typeCounts[a.award_type] = (typeCounts[a.award_type] || 0) + 1; });
  const topAwardType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="portal-root-wrapper" data-module="awards">
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
          <div className="portal-page-badge"><i className="fa-solid fa-award" /> Player Awards</div>
          <h1 className="portal-title">PLAYER AWARDS</h1>
          <p className="portal-subtitle">Issue individual or category honors. Awarding credits manager wallet balances automatically.</p>
        </div>

        {/* ── Stats Row ── */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <div className="stat-label">Total Awards Issued</div>
            <div className="stat-value">{awards.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Winners</div>
            <div className="stat-value">{winnerCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Runners Up</div>
            <div className="stat-value">{awards.length - winnerCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Top Award</div>
            <div className="stat-value">{topAwardType ? topAwardType[0] : "—"}</div>
          </div>
        </div>

        {/* ── Award Form Card ── */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-award" /> Give Player Award</h2>

          <form onSubmit={handleSaveAward}>

            {/* Player & Scope Section */}
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-user-check" /> Player Selection</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-users" /> Select Player</label>
                  <select className="admin-select" value={awardForm.playerId} onChange={(e) => setAwardForm(prev => ({ ...prev, playerId: e.target.value }))}>
                    <option value="">-- Select Player --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-layer-group" /> Scope</label>
                  <select className="admin-select" value={awardForm.category} onChange={(e) => setAwardForm(prev => ({ ...prev, category: e.target.value }))}>
                    <option value="individual">Individual Honors (Ballon d&apos;Or, Golden Boot)</option>
                    <option value="category">Category Honors (Best Attacker, Best Midfielder)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Award Configuration Section */}
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-trophy" /> Award Configuration</div>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-medal" /> Award Type Name</label>
                  <input type="text" className="admin-input" value={awardForm.type} onChange={(e) => setAwardForm(prev => ({ ...prev, type: e.target.value }))} placeholder="e.g. Ballon d'Or, Golden Boot" />
                </div>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-futbol" /> Tournament Link (Optional)</label>
                  <select className="admin-select" value={awardForm.tournamentId} onChange={(e) => setAwardForm(prev => ({ ...prev, tournamentId: e.target.value }))}>
                    <option value="">-- Season-wide (No tournament) --</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-ranking-star" /> Position</label>
                  <select className="admin-select" value={awardForm.position} onChange={(e) => setAwardForm(prev => ({ ...prev, position: e.target.value }))}>
                    <option value="Winner">Winner</option>
                    <option value="Runner Up">Runner Up</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Rewards Section */}
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-wallet" style={{ color: "#3b82f6" }} /> Reward Disbursement</div>
              <div className="currency-input-container">
                <div className="admin-form-group">
                  <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Coins (RC)</label>
                  <div className="currency-input-wrapper">
                    <i className="fa-solid fa-coins currency-icon rc" />
                    <input type="number" className="admin-input" value={awardForm.rewardRc} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardRc: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Tokens (RT)</label>
                  <div className="currency-input-wrapper">
                    <i className="fa-solid fa-star currency-icon rt" />
                    <input type="number" className="admin-input" value={awardForm.rewardRt} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardRt: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Vouchers</label>
                  <div className="currency-input-wrapper">
                    <i className="fa-solid fa-ticket currency-icon voucher" />
                    <input type="number" className="admin-input" value={awardForm.rewardVoucher} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardVoucher: parseInt(e.target.value) || 0 }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="sub-card">
              <div className="sub-card-title"><i className="fa-solid fa-comment-dots" /> Notes & Context</div>
              <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="admin-form-group">
                  <label><i className="fa-solid fa-pen-fancy" /> Award Narrative</label>
                  <textarea className="admin-textarea" value={awardForm.notes} onChange={(e) => setAwardForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Secured after leading the league with 15 goals." rows={2} />
                </div>
              </div>
            </div>

            <div className="admin-btn-row">
              <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                <i className="fa-solid fa-trophy" /> Give Award & Disburse Rewards
              </button>
            </div>
          </form>
        </div>

        {/* ── Awards Table Card ── */}
        <div className="admin-card">
          <h2 className="admin-card-title"><i className="fa-solid fa-scroll" /> Issued Awards Ledger</h2>

          {awards.length === 0 ? (
            <div className="admin-empty">
              <i className="fa-solid fa-trophy" />
              No awards issued yet for this season. Use the form above to recognize outstanding players.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-list-table">
                <thead>
                  <tr>
                    <th>Award Name</th>
                    <th>Position</th>
                    <th>Winner Player</th>
                    <th>Reward (RC / RT / V)</th>
                    <th>Scope</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.map(aw => {
                    const linkedTour = tournaments.find(t => t.id.toString() === aw.tournament_id);
                    return (
                      <tr key={aw.id}>
                        <td><strong>{aw.award_type}</strong></td>
                        <td>
                          <span className={aw.award_position === "Winner" ? "badge-active" : "badge-suspended"}>
                            {aw.award_position === "Winner" ? <><i className="fa-solid fa-crown" style={{ marginRight: 4 }} />{aw.award_position}</> : aw.award_position}
                          </span>
                        </td>
                        <td>{aw.player_name}</td>
                        <td>
                          <span style={{ color: "#fbbf24" }}>{aw.reward_rc || 0}</span>
                          {" / "}
                          <span style={{ color: "#38bdf8" }}>{aw.reward_rt || 0}</span>
                          {" / "}
                          <span style={{ color: "#ec4899" }}>{aw.reward_voucher || 0}</span>
                        </td>
                        <td>
                          <span className="badge-info">{linkedTour ? linkedTour.name : "Season-wide"}</span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button className="portal-btn btn-danger" style={{ padding: "4px 10px", fontSize: "0.75rem" }} onClick={() => handleRevokeAward(aw.id)}>
                            <i className="fa-solid fa-ban" /> Revoke
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
