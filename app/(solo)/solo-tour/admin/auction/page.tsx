"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../admin.css";

import {
  fetchActiveSeason,
  fetchRegisteredClubs,
  fetchFreeAgents,
  executeTransferBuy
} from "@/utils/solo/serverActions";

export default function AuctionManager() {
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [clubs, setClubs] = useState<any[]>([]);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Page level setting
  const [auctionTiming, setAuctionTiming] = useState<"start" | "mid">("start");

  // Rapid Entry State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [winningClubId, setWinningClubId] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<number>(50);

  // Search filter for free agents
  const [searchQuery, setSearchQuery] = useState<string>("");

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
    } catch {
      showToast("Error loading auction data!");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRapidAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId) return showToast("Select a player!");
    if (!winningClubId) return showToast("Select winning club!");
    if (bidAmount <= 0) return showToast("Enter a valid bid amount!");

    const seasonNum = activeSeason ? activeSeason.season_number : 9;
    
    // Automatically calculate expiration for 2 seasons:
    // If start is 9.0 -> expires at 11.0
    // If start is 9.5 -> expires at 11.5
    const startValue = auctionTiming === "start" ? seasonNum : seasonNum + 0.5;
    const expireValue = startValue + 2;
    const expireSeasonStr = expireValue.toString();

    startTransition(async () => {
      try {
        await executeTransferBuy(
          parseInt(winningClubId),
          parseInt(selectedPlayerId),
          bidAmount,
          expireSeasonStr
        );
        
        // Find player name for toast
        const playerObj = freeAgents.find(p => p.id.toString() === selectedPlayerId);
        showToast(`Assigned ${playerObj?.name || 'Player'} to club successfully!`);
        
        // Reset player selection but keep club selected for back-to-back signings if needed
        setSelectedPlayerId("");
        setBidAmount(50);
        loadData();
      } catch (err: any) {
        showToast(`Assignment failed: ${err.message || "Insufficient balance"}`);
      }
    });
  };

  // Filter free agents based on search query
  const filteredFreeAgents = freeAgents.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="portal-page-badge"><i className="fa-solid fa-bolt" style={{ color: "#eab308" }} /> Rapid Player Auction</div>
          <h1 className="portal-title">WHATSAPP AUCTION CENTER</h1>
          <p className="portal-subtitle">
            Rapid-fire panel for live auctions. Instantly assign players to clubs, auto-deduct wallets, and auto-calculate 2-season contracts.
          </p>
        </div>

        {/* Global Configuration Card */}
        <div className="admin-card" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Active Season: </span>
              <strong style={{ color: "#fff" }}>Season {activeSeason?.season_number || "9"}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Auction Window:</span>
              <div style={{ display: "flex", gap: "4px" }}>
                <button 
                  type="button" 
                  className={`portal-btn ${auctionTiming === 'start' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setAuctionTiming('start')}
                  style={{ padding: "4px 12px", fontSize: "0.75rem", height: "30px" }}
                >
                  Season Start
                </button>
                <button 
                  type="button" 
                  className={`portal-btn ${auctionTiming === 'mid' ? 'btn-primary' : 'btn-secondary'}`} 
                  onClick={() => setAuctionTiming('mid')}
                  style={{ padding: "4px 12px", fontSize: "0.75rem", height: "30px" }}
                >
                  Mid-Season
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="financial-layout" style={{ marginTop: "1rem" }}>
          {/* Left Column: Rapid Assignment Form */}
          <div className="financial-sidebar" style={{ minWidth: "340px" }}>
            <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
              <h2 className="admin-card-title">
                <i className="fa-solid fa-file-signature" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                Assign Auction Winner
              </h2>
              
              <form onSubmit={handleRapidAssign}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  
                  <div className="admin-form-group">
                    <label>Select Player</label>
                    <select 
                      className="admin-select" 
                      value={selectedPlayerId} 
                      onChange={(e) => setSelectedPlayerId(e.target.value)} 
                      required
                    >
                      <option value="">-- Choose Player --</option>
                      {filteredFreeAgents.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position} - {p.star.replace("-", " ")})</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Select Bidding Club</label>
                    <select 
                      className="admin-select" 
                      value={winningClubId} 
                      onChange={(e) => setWinningClubId(e.target.value)} 
                      required
                    >
                      <option value="">-- Select Winner --</option>
                      {clubs.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>Winning Bid Amount (Coins)</label>
                    <input 
                      type="number" 
                      className="admin-input" 
                      value={bidAmount} 
                      onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)} 
                      required 
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                      <span>Salary (5%): <strong>{(bidAmount * 0.05).toFixed(2)} Coins</strong></span>
                      <span>Contract: <strong>2 Seasons</strong></span>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="portal-btn btn-primary" 
                    style={{ width: "100%", justifyContent: "center", height: "40px", fontSize: "0.9rem" }}
                    disabled={isPending}
                  >
                    {isPending ? "Assigning..." : "Assign Player & Deduct Wallet"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Free Agent Directory with quick links */}
          <div className="financial-main">
            <div className="admin-card" style={{ marginTop: 0, padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
                <h2 className="admin-card-title" style={{ margin: 0 }}>
                  <i className="fa-solid fa-users" style={{ color: "var(--solo-primary)", marginRight: "8px" }} />
                  Free Agents ({filteredFreeAgents.length})
                </h2>
                <input 
                  type="text" 
                  className="admin-input" 
                  placeholder="Search player or position..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ maxWidth: "220px", height: "32px", fontSize: "0.8rem" }}
                />
              </div>

              <div className="table-responsive" style={{ maxHeight: "480px", overflowY: "auto" }}>
                <table className="admin-list-table">
                  <thead>
                    <tr>
                      <th>Player Card</th>
                      <th>Position</th>
                      <th>Tier</th>
                      <th>Base Value</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFreeAgents.map(p => (
                      <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setSelectedPlayerId(p.id.toString())}>
                        <td>
                          <strong style={{ color: selectedPlayerId === p.id.toString() ? "var(--solo-primary)" : "#fff" }}>
                            {p.name}
                          </strong>
                        </td>
                        <td>{p.position}</td>
                        <td>{p.star.replace("-", " ")}</td>
                        <td>{p.value} Coins</td>
                        <td style={{ textAlign: "right" }}>
                          <button 
                            className={`portal-btn ${selectedPlayerId === p.id.toString() ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ padding: "3px 10px", fontSize: "0.75rem" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlayerId(p.id.toString());
                            }}
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
