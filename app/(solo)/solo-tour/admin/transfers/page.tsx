"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchFreeAgents,
  fetchClubPlayers,
  executeTransferBuy,
  executeTransferSale,
  executeTransferSwap,
  releaseExpiredContractsForSeason,
  releaseMidSeasonContracts
} from "@/utils/solo/serverActions";

export default function TransfersManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"buy" | "sell" | "swap" | "window">("buy");
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Buy state
  const [buyClubId, setBuyClubId] = useState<string>("");
  const [buyPlayerId, setBuyPlayerId] = useState<string>("");
  const [buyPrice, setBuyPrice] = useState<number>(80);
  const [buyExpireSeason, setBuyExpireSeason] = useState<string>("");

  // Sell state
  const [sellClubId, setSellClubId] = useState<string>("");
  const [sellClubPlayers, setSellClubPlayers] = useState<any[]>([]);
  const [sellPlayerId, setSellPlayerId] = useState<string>("");
  const [sellPrice, setSellPrice] = useState<number>(40);

  // Swap state
  const [swapClubAId, setSwapClubAId] = useState<string>("");
  const [swapClubBId, setSwapClubBId] = useState<string>("");
  const [swapClubAPlayers, setSwapClubAPlayers] = useState<any[]>([]);
  const [swapClubBPlayers, setSwapClubBPlayers] = useState<any[]>([]);
  const [swapPlayerAId, setSwapPlayerAId] = useState<string>("");
  const [swapPlayerBId, setSwapPlayerBId] = useState<string>("");
  const [swapAdjustmentAtoB, setSwapAdjustmentAtoB] = useState<number>(0);
  const [swapNewValueA, setSwapNewValueA] = useState<number>(80);
  const [swapNewValueB, setSwapNewValueB] = useState<number>(80);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const season = await fetchActiveSeason();
      setActiveSeason(season);

      const clubsData = await fetchRegisteredClubs();
      setClubs(clubsData || []);

      const agents = await fetchFreeAgents();
      setFreeAgents(agents || []);

      if (season) {
        setBuyExpireSeason((season.season_number + 1).toString());
      }
    } catch {
      showToast("Error loading transfers data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch players for sell tab
  useEffect(() => {
    if (sellClubId) {
      fetchClubPlayers(sellClubId).then(setSellClubPlayers).catch(() => showToast("Error loading club players"));
    } else {
      setSellClubPlayers([]);
    }
  }, [sellClubId]);

  // Fetch players for swap tab
  useEffect(() => {
    if (swapClubAId) {
      fetchClubPlayers(swapClubAId).then(setSwapClubAPlayers).catch(() => showToast("Error loading Club A players"));
    } else {
      setSwapClubAPlayers([]);
    }
  }, [swapClubAId]);

  useEffect(() => {
    if (swapClubBId) {
      fetchClubPlayers(swapClubBId).then(setSwapClubBPlayers).catch(() => showToast("Error loading Club B players"));
    } else {
      setSwapClubBPlayers([]);
    }
  }, [swapClubBId]);

  const handleBuy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyClubId || !buyPlayerId || buyPrice <= 0 || !buyExpireSeason) {
      return showToast("Please fill in all buy options correctly!");
    }
    startTransition(async () => {
      try {
        await executeTransferBuy(
          parseInt(buyClubId),
          parseInt(buyPlayerId),
          buyPrice,
          buyExpireSeason
        );
        showToast("Player bought successfully!");
        setBuyPlayerId("");
        loadData();
      } catch (err: any) {
        showToast(`Transaction failed: ${err.message || "Insufficient balance"}`);
      }
    });
  };

  const handleSell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellClubId || !sellPlayerId || sellPrice < 0) {
      return showToast("Please fill in all sell options correctly!");
    }
    startTransition(async () => {
      try {
        await executeTransferSale(
          parseInt(sellClubId),
          parseInt(sellPlayerId),
          sellPrice
        );
        showToast("Player sold successfully!");
        setSellPlayerId("");
        loadData();
      } catch {
        showToast("Transaction failed!");
      }
    });
  };

  const handleSwap = (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapClubAId || !swapClubBId || !swapPlayerAId || !swapPlayerBId) {
      return showToast("Please select all clubs and players for swap!");
    }
    if (swapClubAId === swapClubBId) {
      return showToast("Cannot swap players within the same club!");
    }
    startTransition(async () => {
      try {
        await executeTransferSwap(
          parseInt(swapClubAId),
          parseInt(swapPlayerAId),
          parseInt(swapClubBId),
          parseInt(swapPlayerBId),
          swapAdjustmentAtoB,
          swapNewValueA,
          swapNewValueB
        );
        showToast("Swap transfer completed successfully!");
        setSwapPlayerAId("");
        setSwapPlayerBId("");
        loadData();
      } catch (err: any) {
        showToast(`Swap failed: ${err.message || "Verify parameters or balances"}`);
      }
    });
  };

  const triggerSeasonStartReleases = () => {
    if (!activeSeason) return;
    if (!confirm(`Release all contracts ending at start of Season ${activeSeason.season_number}?`)) return;
    startTransition(async () => {
      try {
        const res = await releaseExpiredContractsForSeason(activeSeason.season_number);
        showToast(`Released ${res.releasedCount} players whose contracts expired.`);
        loadData();
      } catch {
        showToast("Error triggering releases!");
      }
    });
  };

  const triggerMidSeasonReleases = () => {
    if (!activeSeason) return;
    if (!confirm(`Release all contracts ending at mid of Season ${activeSeason.season_number}?`)) return;
    startTransition(async () => {
      try {
        const res = await releaseMidSeasonContracts(activeSeason.season_number);
        showToast(`Released ${res.releasedCount} players whose mid-season contracts expired.`);
        loadData();
      } catch {
        showToast("Error triggering mid-season releases!");
      }
    });
  };

  return (
    <div className="portal-root-wrapper">
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
          <div className="portal-page-badge"><i className="fa-solid fa-arrow-right-arrow-left" /> Transfer Window</div>
          <h1 className="portal-title">TRANSFER WINDOW</h1>
          <p className="portal-subtitle">
            Transfer players between squads via purchase, sale, or swap. Process seasonal contract releases.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="tab-menu" style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <button className={`portal-btn ${activeTab === 'buy' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('buy')}>
            <i className="fa-solid fa-cart-shopping" /> Buy Free Agent
          </button>
          <button className={`portal-btn ${activeTab === 'sell' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('sell')}>
            <i className="fa-solid fa-hand-holding-dollar" /> Sell/Release Player
          </button>
          <button className={`portal-btn ${activeTab === 'swap' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('swap')}>
            <i className="fa-solid fa-rotate" /> Swap Deal
          </button>
          <button className={`portal-btn ${activeTab === 'window' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('window')}>
            <i className="fa-solid fa-calendar-minus" /> Season Releases
          </button>
        </div>

        {/* Tab 1: Buy */}
        {activeTab === 'buy' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-cart-shopping" /> Sign Free Agent to Squad</h2>
            <form onSubmit={handleBuy}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Select Buying Club</label>
                  <select className="admin-select" value={buyClubId} onChange={(e) => setBuyClubId(e.target.value)} required>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Select Free Agent</label>
                  <select className="admin-select" value={buyPlayerId} onChange={(e) => setBuyPlayerId(e.target.value)} required>
                    <option value="">-- Select Player --</option>
                    {freeAgents.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.star.replace("-", " ")})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Signed Value / Buy Price (Coins)</label>
                  <input type="number" className="admin-input" value={buyPrice} onChange={(e) => setBuyPrice(parseInt(e.target.value) || 0)} required />
                </div>
                <div className="admin-form-group">
                  <label>Contract Expiration Season</label>
                  <select className="admin-select" value={buyExpireSeason} onChange={(e) => setBuyExpireSeason(e.target.value)} required>
                    {activeSeason && (
                      <>
                        <option value={activeSeason.season_number.toString()}>Start of Season {activeSeason.season_number}</option>
                        <option value={(activeSeason.season_number + 0.5).toString()}>Mid of Season {activeSeason.season_number}</option>
                        <option value={(activeSeason.season_number + 1).toString()}>Start of Season {activeSeason.season_number + 1}</option>
                        <option value={(activeSeason.season_number + 1.5).toString()}>Mid of Season {activeSeason.season_number + 1}</option>
                        <option value={(activeSeason.season_number + 2).toString()}>Start of Season {activeSeason.season_number + 2}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div className="admin-btn-row" style={{ marginTop: "1rem" }}>
                <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                  Confirm Purchase & Sign
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Sell */}
        {activeTab === 'sell' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-hand-holding-dollar" /> Sell/Release Squad Player</h2>
            <form onSubmit={handleSell}>
              <div className="admin-form-grid">
                <div className="admin-form-group">
                  <label>Select Selling Club</label>
                  <select className="admin-select" value={sellClubId} onChange={(e) => setSellClubId(e.target.value)} required>
                    <option value="">-- Select Club --</option>
                    {clubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Select Player to Sell</label>
                  <select className="admin-select" value={sellPlayerId} onChange={(e) => setSellPlayerId(e.target.value)} required>
                    <option value="">-- Select Player --</option>
                    {sellClubPlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Selling Price / Compensation (Coins)</label>
                  <input type="number" className="admin-input" value={sellPrice} onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)} required />
                </div>
              </div>
              <div className="admin-btn-row" style={{ marginTop: "1rem" }}>
                <button type="submit" className="portal-btn btn-danger" disabled={isPending}>
                  Confirm Sale & Terminate Contract
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 3: Swap */}
        {activeTab === 'swap' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-rotate" /> Execute Player Swap Deal</h2>
            <form onSubmit={handleSwap}>
              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Club A Setup</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Club A</label>
                    <select className="admin-select" value={swapClubAId} onChange={(e) => setSwapClubAId(e.target.value)} required>
                      <option value="">-- Select Club --</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Swapped Player (from Club A)</label>
                    <select className="admin-select" value={swapPlayerAId} onChange={(e) => setSwapPlayerAId(e.target.value)} required>
                      <option value="">-- Select Player --</option>
                      {swapClubAPlayers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>New Value for Player A at Club B (Coins)</label>
                    <input type="number" className="admin-input" value={swapNewValueA} onChange={(e) => setSwapNewValueA(parseInt(e.target.value) || 0)} required />
                  </div>
                </div>
              </div>

              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Club B Setup</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Club B</label>
                    <select className="admin-select" value={swapClubBId} onChange={(e) => setSwapClubBId(e.target.value)} required>
                      <option value="">-- Select Club --</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Swapped Player (from Club B)</label>
                    <select className="admin-select" value={swapPlayerBId} onChange={(e) => setSwapPlayerBId(e.target.value)} required>
                      <option value="">-- Select Player --</option>
                      {swapClubBPlayers.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>New Value for Player B at Club A (Coins)</label>
                    <input type="number" className="admin-input" value={swapNewValueB} onChange={(e) => setSwapNewValueB(parseInt(e.target.value) || 0)} required />
                  </div>
                </div>
              </div>

              <div className="sub-card" style={{ marginBottom: "1rem" }}>
                <div className="sub-card-title">Cash Adjustment</div>
                <div className="admin-form-grid">
                  <div className="admin-form-group">
                    <label>Adjustment: Club A pays Club B (use negative for B pays A)</label>
                    <input type="number" className="admin-input" value={swapAdjustmentAtoB} onChange={(e) => setSwapAdjustmentAtoB(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              <div className="admin-btn-row">
                <button type="submit" className="portal-btn btn-primary" disabled={isPending}>
                  Execute Swap Deal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 4: Season Transition Contract Releases */}
        {activeTab === 'window' && (
          <div className="admin-card">
            <h2 className="admin-card-title"><i className="fa-solid fa-calendar-minus" /> Batch Contract Release Controls</h2>
            <div className="admin-empty" style={{ padding: "2rem", textAlign: "left", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3><i className="fa-solid fa-calendar-day" /> Release Season-End Contracts</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Triggers releases for contracts whose expiration is set to <strong>Season {activeSeason?.season_number || ""}</strong>.
                </p>
                <button className="portal-btn btn-danger" style={{ marginTop: "0.75rem" }} onClick={triggerSeasonStartReleases} disabled={isPending}>
                  Release Season {activeSeason?.season_number || ""} Start Contracts
                </button>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
                <h3><i className="fa-solid fa-calendar-week" /> Release Mid-Season Contracts</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "4px" }}>
                  Triggers releases for contracts whose expiration is set to <strong>Season {activeSeason?.season_number || ""}.5</strong>.
                </p>
                <button className="portal-btn btn-danger" style={{ marginTop: "0.75rem" }} onClick={triggerMidSeasonReleases} disabled={isPending}>
                  Release Season {activeSeason?.season_number || ""}.5 Mid-Season Contracts
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
