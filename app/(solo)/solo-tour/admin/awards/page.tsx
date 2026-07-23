"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import CustomSelect from "@/components/ui/CustomSelect";
import {
  fetchActiveSeason,
  fetchTournaments,
  fetchPlayerAwards,
  givePlayerAward,
  revokePlayerAward,
  fetchSeasonsList,
  fetchRegisteredClubsForSeason
} from "@/utils/solo/serverActions";

export default function PlayerAwardsManager() {
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | number>("");
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [activeSeason, setActiveSeason] = useState<any>(null);

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [clubs, setClubs] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  // Custom type state
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeVal, setCustomTypeVal] = useState("");

  // Multiple nominees selection state
  const [selectedNominees, setSelectedNominees] = useState<string[]>([]);
  const [nomineeSearch, setNomineeSearch] = useState("");

  const [awardForm, setAwardForm] = useState({
    playerId: "", // holds the club ID for Winner/Runner Up
    playerName: "",
    tournamentId: "", 
    category: "award", // 'award' or 'trophy'
    type: "Ballon d'Or",
    position: "Winner", // 'Winner', 'Runner Up', 'Nominee'
    notes: "",
    rewardRc: 0,
    rewardRt: 0,
    rewardVoucher: 0
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Load seasons list first
  useEffect(() => {
    async function loadSeasons() {
      try {
        const seasonsData = await fetchSeasonsList();
        setSeasons(seasonsData || []);
        const active = seasonsData.find(s => s.is_active) || seasonsData[0];
        setActiveSeason(active);
        if (active) {
          setSelectedSeasonId(active.id);
          setSelectedSeasonNumber(active.season_number);
        }
      } catch (err) {
        console.error("Error loading seasons:", err);
      }
    }
    loadSeasons();
  }, []);

  // Fetch data when selected season changes
  const loadSeasonData = async () => {
    if (!selectedSeasonId) return;
    try {
      setLoading(true);
      const [tourneys, clubsData, awardList] = await Promise.all([
        fetchTournaments(),
        fetchRegisteredClubsForSeason(selectedSeasonId),
        fetchPlayerAwards(selectedSeasonId)
      ]);

      setTournaments(tourneys || []);
      setClubs(clubsData || []);
      setAwards(awardList || []);
    } catch (err) {
      console.error("Error loading season details:", err);
      showToast("Error loading season details!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeasonData();
  }, [selectedSeasonId]);

  const handleSaveAward = (e: React.FormEvent) => {
    e.preventDefault();

    const finalType = isCustomType ? customTypeVal.trim() : awardForm.type;
    if (!finalType) {
      return showToast("Enter or select award/trophy type name!");
    }

    const isNominee = awardForm.position === "Nominee";
    if (isNominee && selectedNominees.length === 0) {
      return showToast("Select at least one nominated team!");
    }
    if (!isNominee && !awardForm.playerId) {
      return showToast("Select Team!");
    }

    startTransition(async () => {
      try {
        if (isNominee) {
          // Loop through all selected nominees and save them
          for (const teamId of selectedNominees) {
            const clubObj = clubs.find(c => c.id.toString() === teamId);
            if (clubObj) {
              const payload = {
                ...awardForm,
                playerId: teamId,
                type: finalType,
                playerName: clubObj.name,
                seasonId: selectedSeasonId,
                recipientType: "team",
                category: awardForm.category
              };
              await givePlayerAward(payload);
            }
          }
          showToast("Nominees saved successfully!");
        } else {
          const clubObj = clubs.find(c => c.id.toString() === awardForm.playerId);
          if (!clubObj) return showToast("Team not found!");
          const finalPlayerName = clubObj.name;

          const payload = {
            ...awardForm,
            type: finalType,
            playerName: finalPlayerName,
            seasonId: selectedSeasonId,
            recipientType: "team",
            category: awardForm.category
          };
          await givePlayerAward(payload);
          showToast("Honors issued successfully!");
        }

        setAwardForm(prev => ({
          ...prev,
          playerId: "", 
          playerName: "", 
          tournamentId: "", 
          notes: "",
          rewardRc: 0, 
          rewardRt: 0, 
          rewardVoucher: 0
        }));
        setSelectedNominees([]);
        setNomineeSearch("");
        setCustomTypeVal("");
        setIsCustomType(false);
        loadSeasonData();
      } catch {
        showToast("Error saving honors!");
      }
    });
  };

  const handleRevokeAward = (id: number) => {
    if (!confirm("Revoke this award/trophy?")) return;
    startTransition(async () => {
      try {
        await revokePlayerAward(id);
        showToast("Award/trophy revoked!");
        loadSeasonData();
      } catch {
        showToast("Error revoking award!");
      }
    });
  };

  // Filter tournaments to only show those belonging to the selected season
  const filteredTournaments = tournaments.filter(t => Number(t.season_number) === Number(selectedSeasonNumber));

  const winnerCount = awards.filter(a => a.award_position === "Winner").length;
  const typeCounts: Record<string, number> = {};
  awards.forEach(a => { typeCounts[a.award_type] = (typeCounts[a.award_type] || 0) + 1; });
  const topAwardType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="portal-root-wrapper" data-module="awards">
      <style dangerouslySetInnerHTML={{ __html: `
        .ledger-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
          margin-top: 1rem;
        }

        .ledger-card {
          background: rgba(30, 41, 59, 0.4);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.25rem;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 240px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.2);
        }

        .ledger-card:hover {
          transform: translateY(-4px);
          border-color: rgba(234, 179, 8, 0.35);
          background: rgba(30, 41, 59, 0.65);
          box-shadow: 0 10px 30px rgba(234, 179, 8, 0.06);
        }

        .ledger-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .ledger-card-category {
          font-size: 0.68rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .ledger-card-category.award {
          background: rgba(56, 189, 248, 0.12);
          color: #38bdf8;
          border: 1px solid rgba(56, 189, 248, 0.2);
        }

        .ledger-card-category.trophy {
          background: rgba(168, 85, 247, 0.12);
          color: #c084fc;
          border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .ledger-card-title {
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          margin: 0.65rem 0 0.25rem 0;
          line-height: 1.25;
        }

        .ledger-card-subtitle {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ledger-card-team {
          background: rgba(0, 0, 0, 0.25);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }

        .ledger-card-team-name {
          font-weight: 700;
          color: #fbbf24;
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ledger-card-team-manager {
          font-size: 0.72rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 4px;
        }

        .ledger-card-rewards {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          margin-bottom: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .ledger-card-notes {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.45);
          font-style: italic;
          line-height: 1.35;
          border-left: 2px solid rgba(255, 255, 255, 0.1);
          padding-left: 8px;
          margin-bottom: 0.75rem;
        }

        .ledger-card-actions {
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 0.75rem;
        }
      ` }} />
      
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1600px", width: "100%", padding: "1.5rem 1rem" }}>
        
        {/* Navigation */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Hero Header */}
        <div className="portal-header" style={{ marginBottom: "1.5rem" }}>
          <div className="portal-page-badge"><i className="fa-solid fa-award" /> Historical Awards Console</div>
          <h1 className="portal-title">AWARDS MANAGER</h1>
          <p className="portal-subtitle">Issue team awards, tournament trophies, and official nominations across both active and historical seasons.</p>
        </div>

        {/* Season Selector Toolbar */}
        <div className="admin-card" style={{ padding: "1.2rem 1.5rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <i className="fa-solid fa-calendar-days" style={{ color: "#eab308", fontSize: "1.1rem" }} />
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff" }}>Target Season for Awards:</span>
            </div>
            <CustomSelect
              value={selectedSeasonId}
              onChange={(val) => {
                setSelectedSeasonId(val);
                const s = seasons.find(x => String(x.id) === String(val));
                if (s) setSelectedSeasonNumber(s.season_number);
              }}
              options={seasons.map(s => ({
                value: s.id,
                label: `Season ${s.season_number} ${s.is_active ? "(Active)" : "(Historical)"}`
              }))}
              buttonStyle={{ width: "260px", justifyContent: "space-between" }}
            />
          </div>
        </div>

        {/* Stats Summary cards */}
        <div className="admin-stats-row" style={{ marginBottom: "1.5rem" }}>
          <div className="admin-stat-card">
            <div className="stat-label">Honors Issued (Season {selectedSeasonNumber})</div>
            <div className="stat-value">{awards.length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Winners recognized</div>
            <div className="stat-value">{winnerCount}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Runners Up recognized</div>
            <div className="stat-value">{awards.filter(a => a.award_position === "Runner Up").length}</div>
          </div>
          <div className="admin-stat-card">
            <div className="stat-label">Nominees registered</div>
            <div className="stat-value">{awards.filter(a => a.award_position === "Nominee").length}</div>
          </div>
        </div>

        {loading ? (
          <div className="admin-card" style={{ padding: "4rem", textAlign: "center" }}>
            <i className="fa-solid fa-circle-notch fa-spin fa-3x" style={{ color: "#eab308", marginBottom: "1rem" }} />
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Loading season rosters and achievements ledger...</p>
          </div>
        ) : (
          <div className="admin-tools-grid" style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(400px, 1.35fr)", gap: "2rem", alignItems: "start" }}>
            
            {/* Create Award Card */}
            <div className="admin-card">
              <h2 className="admin-card-title" style={{ marginBottom: "1.5rem" }}><i className="fa-solid fa-trophy" style={{ color: "#eab308" }} /> Distribute Season Honors</h2>

              <form onSubmit={handleSaveAward}>

                {/* Position Selection */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-ranking-star" /> Honors Level</div>
                  <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="admin-form-group">
                      <label><i className="fa-solid fa-ranking-star" /> Position</label>
                      <CustomSelect
                        value={awardForm.position}
                        onChange={(val) => {
                          setAwardForm(prev => ({ ...prev, position: val }));
                          setSelectedNominees([]);
                        }}
                        options={[
                          { value: "Winner", label: "Winner" },
                          { value: "Runner Up", label: "Runner Up" },
                          { value: "Nominee", label: "Nominee" }
                        ]}
                        buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Recipient Selection Section */}
                <div className="sub-card">
                  <div className="sub-card-title">
                    <i className="fa-solid fa-shield" /> {awardForm.position === "Nominee" ? "Nominated Teams Selection" : "Team Selection"}
                  </div>
                  <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    {awardForm.position === "Nominee" ? (
                      <div className="admin-form-group">
                        <label><i className="fa-solid fa-list-check" /> Select Nominated Teams (Season {selectedSeasonNumber})</label>
                        
                        {/* Checklist Search Input */}
                        <div style={{ position: "relative", display: "flex", alignItems: "center", marginBottom: "0.5rem" }}>
                          <i className="fa-solid fa-magnifying-glass" style={{ position: "absolute", left: "10px", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }} />
                          <input
                            type="text"
                            placeholder="Type to filter teams..."
                            value={nomineeSearch}
                            onChange={(e) => setNomineeSearch(e.target.value)}
                            style={{
                              width: "100%",
                              background: "rgba(0, 0, 0, 0.4)",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                              borderRadius: "6px",
                              padding: "6px 10px 6px 30px",
                              fontSize: "0.8rem",
                              color: "#fff",
                              outline: "none",
                              transition: "all 0.2s ease"
                            }}
                          />
                          {nomineeSearch && (
                            <button
                              type="button"
                              onClick={() => setNomineeSearch("")}
                              style={{
                                position: "absolute",
                                right: "10px",
                                background: "transparent",
                                border: "none",
                                color: "rgba(255,255,255,0.4)",
                                cursor: "pointer",
                                fontSize: "0.8rem"
                              }}
                            >
                              <i className="fa-solid fa-xmark" />
                            </button>
                          )}
                        </div>

                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                          gap: "0.75rem",
                          maxHeight: "220px",
                          overflowY: "auto",
                          background: "rgba(0, 0, 0, 0.4)",
                          border: "1px solid rgba(168, 85, 247, 0.2)",
                          borderRadius: "8px",
                          padding: "1rem"
                        }}>
                          {clubs
                            .filter(c => 
                              c.name.toLowerCase().includes(nomineeSearch.toLowerCase()) ||
                              c.manager.toLowerCase().includes(nomineeSearch.toLowerCase()) ||
                              (c.r2g_id && c.r2g_id.toLowerCase().includes(nomineeSearch.toLowerCase()))
                            )
                            .map(c => {
                              const isChecked = selectedNominees.includes(String(c.id));
                              return (
                                <label
                                  key={c.id}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    cursor: "pointer",
                                    fontSize: "0.78rem",
                                    color: isChecked ? "#fbbf24" : "#e2e8f0",
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    background: isChecked ? "rgba(168, 85, 247, 0.15)" : "transparent",
                                    border: isChecked ? "1px solid rgba(168, 85, 247, 0.2)" : "1px solid transparent",
                                    transition: "all 0.2s ease"
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedNominees(prev => [...prev, String(c.id)]);
                                      } else {
                                        setSelectedNominees(prev => prev.filter(x => x !== String(c.id)));
                                      }
                                    }}
                                    style={{ accentColor: "#eab308" }}
                                  />
                                  <span>{c.name} ({c.manager} - {c.r2g_id || 'N/A'})</span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="admin-form-group">
                        <label><i className="fa-solid fa-shield" /> Select Team / Club (Season {selectedSeasonNumber})</label>
                        <CustomSelect
                          value={awardForm.playerId}
                          onChange={(val) => setAwardForm(prev => ({ ...prev, playerId: val }))}
                          placeholder="-- Select Team --"
                          options={[
                            { value: "", label: "-- Select Team --" },
                            ...clubs.map(c => ({ 
                              value: String(c.id), 
                              label: `${c.name} (${c.manager} - ${c.r2g_id || 'N/A'})` 
                            }))
                          ]}
                          buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                          showSearch={true}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Configuration Section */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-sliders" /> Honors Configuration</div>
                  <div className="admin-form-grid">
                    
                    {/* Category Selection: Award vs Trophy */}
                    <div className="admin-form-group">
                      <label><i className="fa-solid fa-tags" /> Honors Category</label>
                      <CustomSelect
                        value={awardForm.category}
                        onChange={(val) => {
                          setAwardForm(prev => ({ 
                            ...prev, 
                            category: val,
                            type: val === "award" ? "Ballon d'Or" : "League Champions" 
                          }));
                          setIsCustomType(false);
                        }}
                        options={[
                          { value: "award", label: "Award (Accolades: Ballon d'Or, Maldini, etc.)" },
                          { value: "trophy", label: "Trophy (Team titles: Champions, Cup Winner, etc.)" }
                        ]}
                        buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                      />
                    </div>

                    {/* Predefined Honors Type Dropdown */}
                    <div className="admin-form-group">
                      <label><i className="fa-solid fa-medal" /> Select Type Name</label>
                      <CustomSelect
                        value={isCustomType ? "custom" : awardForm.type}
                        onChange={(val) => {
                          if (val === "custom") {
                            setIsCustomType(true);
                          } else {
                            setIsCustomType(false);
                            setAwardForm(prev => ({ ...prev, type: val }));
                          }
                        }}
                        options={
                          awardForm.category === "award" ? [
                            { value: "Ballon d'Or", label: "Ballon d'Or" },
                            { value: "R2G Best", label: "R2G Best" },
                            { value: "Gerd Müller", label: "Gerd Müller" },
                            { value: "Yashin Trophy", label: "Yashin Trophy" },
                            { value: "Golden Ball", label: "Golden Ball" },
                            { value: "Maldini Trophy", label: "Maldini Trophy" },
                            { value: "custom", label: "-- Custom Award... --" }
                          ] : [
                            { value: "League Champions", label: "League Champions" },
                            { value: "UCL Winner", label: "UCL Winner" },
                            { value: "Cup Champions", label: "Cup Champions" },
                            { value: "Super Cup Winner", label: "Super Cup Winner" },
                            { value: "custom", label: "-- Custom Trophy... --" }
                          ]
                        }
                        buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                      />
                    </div>

                    {/* Custom text input if selected custom option */}
                    {isCustomType && (
                      <div className="admin-form-group" style={{ gridColumn: "1 / -1" }}>
                        <label><i className="fa-solid fa-keyboard" /> Enter Custom Name</label>
                        <input 
                          type="text" 
                          className="admin-input" 
                          value={customTypeVal} 
                          onChange={(e) => setCustomTypeVal(e.target.value)} 
                          placeholder="e.g. Fair Play Award, Manager of the Month" 
                        />
                      </div>
                    )}

                    <div className="admin-form-group" style={{ gridColumn: "1 / -1" }}>
                      <label><i className="fa-solid fa-futbol" /> Tournament Link (Optional)</label>
                      <CustomSelect
                        value={awardForm.tournamentId}
                        onChange={(val) => setAwardForm(prev => ({ ...prev, tournamentId: val }))}
                        placeholder="-- Season-wide (No tournament) --"
                        options={[
                          { value: "", label: "-- Season-wide (No tournament) --" },
                          ...filteredTournaments.map(t => ({ value: String(t.id), label: t.name }))
                        ]}
                        buttonStyle={{ width: "100%", justifyContent: "space-between" }}
                      />
                    </div>
                  </div>
                </div>

                {/* Reward Disbursement */}
                {activeSeason && String(selectedSeasonId) === String(activeSeason.id) ? (
                  <div className="sub-card">
                    <div className="sub-card-title"><i className="fa-solid fa-wallet" style={{ color: "#eab308" }} /> Reward Disbursement</div>
                    <div className="currency-input-container">
                      <div className="admin-form-group">
                        <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Coins (RC)</label>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-coins currency-icon rc" style={{ color: "#fbbf24" }} />
                          <input type="number" className="admin-input" value={awardForm.rewardRc} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardRc: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Tokens (RT)</label>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-star currency-icon rt" style={{ color: "#38bdf8" }} />
                          <input type="number" className="admin-input" value={awardForm.rewardRt} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardRt: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                      <div className="admin-form-group">
                        <label style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 700 }}>Reward Vouchers</label>
                        <div className="currency-input-wrapper">
                          <i className="fa-solid fa-ticket currency-icon voucher" style={{ color: "#ec4899" }} />
                          <input type="number" className="admin-input" value={awardForm.rewardVoucher} onChange={(e) => setAwardForm(prev => ({ ...prev, rewardVoucher: parseInt(e.target.value) || 0 }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="sub-card" style={{ background: "rgba(0,0,0,0.2)", border: "1px dashed rgba(255,255,255,0.1)", padding: "1.2rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "rgba(255,255,255,0.5)" }}>
                      <i className="fa-solid fa-circle-info" style={{ color: "#38bdf8" }} />
                      <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Reward distribution is disabled for historical/inactive seasons.</span>
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                <div className="sub-card">
                  <div className="sub-card-title"><i className="fa-solid fa-comment-dots" /> Narrative & Context</div>
                  <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr" }}>
                    <div className="admin-form-group">
                      <label><i className="fa-solid fa-pen-fancy" /> Award Description</label>
                      <textarea 
                        className="admin-textarea" 
                        value={awardForm.notes} 
                        onChange={(e) => setAwardForm(prev => ({ ...prev, notes: e.target.value }))} 
                        placeholder="Awarded for winning the division championship." 
                        rows={2} 
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-btn-row">
                  <button type="submit" className="portal-btn btn-primary" disabled={isPending} style={{ background: "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)", color: "#000", fontWeight: 800 }}>
                    <i className="fa-solid fa-trophy" /> Disburse Reward & Give Award
                  </button>
                </div>
              </form>
            </div>

            {/* Issued Awards Ledger (Cards Grid) */}
            <div className="admin-card">
              <h2 className="admin-card-title" style={{ marginBottom: "0.5rem" }}>
                <i className="fa-solid fa-scroll" style={{ color: "#eab308" }} /> Issued Awards Ledger (Season {selectedSeasonNumber})
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem", marginBottom: "1.5rem" }}>
                Historical log of achievements, trophies, and official nominations issued to teams.
              </p>

              {awards.length === 0 ? (
                <div className="admin-empty" style={{ padding: "4rem 2rem", background: "rgba(0,0,0,0.15)", borderRadius: "12px", border: "1px dashed rgba(255,255,255,0.06)" }}>
                  <i className="fa-solid fa-trophy" style={{ fontSize: "2.5rem", color: "rgba(255,255,255,0.15)", marginBottom: "0.75rem" }} />
                  <p style={{ margin: 0 }}>No awards issued yet for Season {selectedSeasonNumber}.</p>
                </div>
              ) : (
                <div className="ledger-grid">
                  {awards.map(aw => {
                    const linkedTour = tournaments.find(t => t.id.toString() === aw.tournament_id);
                    const isWinner = aw.award_position === "Winner";
                    const isNominee = aw.award_position === "Nominee";
                    const hasRewards = aw.reward_rc > 0 || aw.reward_rt > 0 || aw.reward_voucher > 0;
                    
                    return (
                      <div key={aw.id} className="ledger-card">
                        
                        {/* Header details: Category and Position */}
                        <div className="ledger-card-header">
                          <span className={`ledger-card-category ${aw.award_category}`}>
                            {aw.award_category === "trophy" ? (
                              <><i className="fa-solid fa-trophy" /> Trophy</>
                            ) : (
                              <><i className="fa-solid fa-medal" /> Award</>
                            )}
                          </span>
                          
                          {isWinner ? (
                            <span className="badge-active" style={{ background: "rgba(234, 179, 8, 0.15)", color: "#fbbf24", border: "1px solid rgba(234, 179, 8, 0.25)", fontSize: "0.68rem" }}>
                              <i className="fa-solid fa-crown" style={{ marginRight: "4px" }} /> Winner
                            </span>
                          ) : isNominee ? (
                            <span className="badge-info" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.2)", fontSize: "0.68rem" }}>
                              <i className="fa-solid fa-fingerprint" style={{ marginRight: "4px" }} /> Nominee
                            </span>
                          ) : (
                            <span className="badge-suspended" style={{ fontSize: "0.68rem" }}>
                              Runner Up
                            </span>
                          )}
                        </div>

                        {/* Title & Scope */}
                        <div>
                          <h3 className="ledger-card-title">{aw.award_type}</h3>
                          <div className="ledger-card-subtitle">
                            <i className="fa-solid fa-globe" />
                            {linkedTour ? linkedTour.name : "Season-wide accolade"}
                          </div>
                        </div>

                        {/* Winner/Nominated Team Info */}
                        <div className="ledger-card-team">
                          <div className="ledger-card-team-name">
                            <i className="fa-solid fa-shield-halved" />
                            {aw.player_name}
                          </div>
                          <div className="ledger-card-team-manager">
                            Team Recipient
                          </div>
                        </div>

                        {/* Optional Narrative notes */}
                        {aw.notes && (
                          <div className="ledger-card-notes">
                            "{aw.notes}"
                          </div>
                        )}

                        {/* Rewards display */}
                        {hasRewards && (
                          <div className="ledger-card-rewards">
                            <span style={{ color: "rgba(255,255,255,0.4)" }}>Disbursed:</span>
                            {aw.reward_rc > 0 && (
                              <span style={{ color: "#fbbf24", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <i className="fa-solid fa-coins" /> {aw.reward_rc}
                              </span>
                            )}
                            {aw.reward_rt > 0 && (
                              <span style={{ color: "#38bdf8", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <i className="fa-solid fa-star" /> {aw.reward_rt}
                              </span>
                            )}
                            {aw.reward_voucher > 0 && (
                              <span style={{ color: "#ec4899", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
                                <i className="fa-solid fa-ticket" /> {aw.reward_voucher}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Actions block */}
                        <div className="ledger-card-actions">
                          <button 
                            className="portal-btn btn-danger" 
                            style={{ 
                              padding: "6px 12px", 
                              fontSize: "0.72rem", 
                              borderRadius: "8px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }} 
                            onClick={() => handleRevokeAward(aw.id)}
                          >
                            <i className="fa-solid fa-trash-can" /> Revoke
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
