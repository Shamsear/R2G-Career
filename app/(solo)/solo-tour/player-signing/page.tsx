"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../../../portal.css";
import { POSITIONS } from "@/utils/solo/playerAuctionFetcher";
import { fetchPlayerAuctionData } from "@/utils/solo/serverActions";

function getPlayerValue(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return "Legend";
    case 120: return "5★ Standard";
    case 100: return "4★ Standard";
    case 80:  return "3★ Standard";
    default:  return "Unknown";
  }
}

function getRatingClass(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return "five-star-legend";
    case 120: return "five-star-standard";
    case 100: return "four-star-standard";
    case 80:  return "three-star-standard";
    default:  return "unknown-rating";
  }
}

function getTierBadgeLabel(baseValue: any) {
  switch (Number(baseValue)) {
    case 150: return { label: "Legend",    cls: "five-star-legend" };
    case 120: return { label: "5★",        cls: "five-star-standard" };
    case 100: return { label: "4★",        cls: "four-star-standard" };
    case 80:  return { label: "3★",        cls: "three-star-standard" };
    default:  return { label: "—",         cls: "" };
  }
}

export default function PlayerSigning() {
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchPlayerAuctionData();
        setPlayers(data);
      } catch {
        setError("Failed to load auction data from database.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = players;
    if (activeTab !== "all") {
      result = result.filter((p) => {
        const pos = String(p.position).toUpperCase().trim();
        let mapped = pos;
        if (pos.includes("GOALKEEPER") || pos === "G" || pos === "GOALIE" || pos === "GK") mapped = "GK";
        else if (pos.includes("CENTER BACK") || pos === "CD" || pos === "DC" || pos === "CB" || pos.includes("CENTRE BACK")) mapped = "CB";
        else if (pos.includes("LEFT BACK") || pos === "LWB" || pos === "LD" || pos === "LB" || pos === "LFB") mapped = "LB";
        else if (pos.includes("RIGHT BACK") || pos === "RWB" || pos === "RD" || pos === "RB" || pos === "RFB") mapped = "RB";
        else if (pos.includes("CENTER MID") || pos === "CMF" || pos === "MC" || pos === "CM" || pos.includes("CENTRE MID")) mapped = "CM";
        else if (pos.includes("DEFENSIVE MID") || pos === "CDM" || pos === "DMF" || pos === "DM" || pos === "DCM") mapped = "DM";
        else if (pos.includes("ATTACKING MID") || pos === "CAM" || pos === "AMF" || pos === "AM" || pos === "ACM") mapped = "AM";
        else if (pos.includes("STRIKER") || pos === "FW" || pos === "ST" || pos === "CF" || pos.includes("FORWARD")) mapped = "ST";
        else if (pos.includes("RIGHT WING") || pos === "RM" || pos === "RMF" || pos === "RW" || pos === "RF") mapped = "RW";
        else if (pos.includes("LEFT WING") || pos === "LM" || pos === "LMF" || pos === "LW" || pos === "LF") mapped = "LW";
        return mapped === activeTab;
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.team && p.team.toLowerCase().includes(term)) ||
          p.position.toLowerCase().includes(term)
      );
    }
    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === "valueStr") {
          valA = getPlayerValue(a.rating);
          valB = getPlayerValue(b.rating);
        }
        if (typeof valA === "string" && typeof valB === "string") {
          return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortConfig.direction === "asc" ? valA - valB : valB - valA;
      });
    }
    setFilteredPlayers(result);
  }, [players, activeTab, searchTerm, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <i className="fas fa-sort sort-icon" />;
    return sortConfig.direction === "asc"
      ? <i className="fas fa-sort-up sort-icon" />
      : <i className="fas fa-sort-down sort-icon" />;
  };

  const colCount = activeTab === "all" ? 7 : 6;

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Mode
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-gavel" />
            Player Signings
          </div>
          <h1 className="portal-title">PLAYER SIGNINGS</h1>
          <p className="portal-subtitle">
            Inspect active player values, live transfer auction results, and contract payrolls for
            Season 2025-2026.
          </p>
        </div>

        {/* Stats ribbon */}
        <div className="portal-stats-ribbon">
          <div className="stat-pill">
            <i className="fa-solid fa-users" />
            <span>Total Records: {players.length}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-pill">
            <span className="live-dot" />
            <span>Ledger: Connected</span>
          </div>
        </div>

        {/* Search */}
        <div className="search-container">
          <div className="search-box">
            <i className="fas fa-search" />
            <input
              type="text"
              placeholder="Search player, team, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Position tabs */}
        <div className="tabs-filter">
          <button
            className={`tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Positions
          </button>
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              className={`tab-btn ${activeTab === pos ? "active" : ""}`}
              onClick={() => setActiveTab(pos)}
            >
              {pos}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="r2g-loading">
            <div className="r2g-spinner" />
            <span>Loading Player Database...</span>
          </div>
        ) : (
          <div className="player-db-table-wrapper">
            <table className="player-db-table">
              <thead>
                <tr>
                  <th
                    onClick={() => requestSort("name")}
                    className={sortConfig?.key === "name" ? "sorted" : ""}
                  >
                    Player Name {renderSortIcon("name")}
                  </th>
                  {activeTab === "all" && (
                    <th
                      onClick={() => requestSort("position")}
                      className={sortConfig?.key === "position" ? "sorted" : ""}
                    >
                      Position {renderSortIcon("position")}
                    </th>
                  )}
                  <th
                    onClick={() => requestSort("rating")}
                    className={sortConfig?.key === "rating" ? "sorted" : ""}
                  >
                    Base Value {renderSortIcon("rating")}
                  </th>
                  <th
                    onClick={() => requestSort("valueStr")}
                    className={sortConfig?.key === "valueStr" ? "sorted" : ""}
                  >
                    Rarity {renderSortIcon("valueStr")}
                  </th>
                  <th
                    onClick={() => requestSort("team")}
                    className={sortConfig?.key === "team" ? "sorted" : ""}
                  >
                    Signing Club {renderSortIcon("team")}
                  </th>
                  <th
                    onClick={() => requestSort("bidAmount")}
                    className={sortConfig?.key === "bidAmount" ? "sorted" : ""}
                  >
                    Signing Value {renderSortIcon("bidAmount")}
                  </th>
                  <th
                    onClick={() => requestSort("contract")}
                    className={sortConfig?.key === "contract" ? "sorted" : ""}
                  >
                    Contract {renderSortIcon("contract")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {error && filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={colCount} style={{ textAlign: "center", padding: "2.5rem", color: "var(--red-error)" }}>
                      <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "0.5rem" }} />
                      {error}
                    </td>
                  </tr>
                )}
                {!loading && !error && filteredPlayers.length === 0 && (
                  <tr>
                    <td colSpan={colCount} style={{ textAlign: "center", padding: "2.5rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", color: "var(--text-secondary)" }}>
                        <i className="fa-solid fa-magnifying-glass" style={{ fontSize: "1.5rem", color: "var(--text-muted)" }} />
                        <span>No players found for &ldquo;{searchTerm}&rdquo; in {activeTab === "all" ? "any position" : activeTab}</span>
                        <button
                          className="portal-btn btn-secondary"
                          onClick={() => { setSearchTerm(""); setActiveTab("all"); }}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {filteredPlayers.map((player) => {
                  const tier = getTierBadgeLabel(player.rating);
                  return (
                    <tr key={player.rowId} className={getRatingClass(player.rating)}>
                      <td data-label="Player">{player.name}</td>
                      {activeTab === "all" && <td data-label="Position">{player.position}</td>}
                      <td data-label="Base Value">{player.rating}</td>
                      <td data-label="Rarity">
                        <span className={`table-tier-badge ${tier.cls}`}>{tier.label}</span>
                      </td>
                      <td data-label="Signing Club">{player.team || "Unsold"}</td>
                      <td data-label="Signing Value">{player.bidAmount ? player.bidAmount : "Not Bid"}</td>
                      <td data-label="Contract">{player.contract || "N/A"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <footer className="portal-footer">
          <div className="portal-status-bar">
            <div className="status-item">
              <span className="status-indicator online" />
              Ledger Status: Connected
            </div>
            <div className="status-item">Total Records: {players.length}</div>
          </div>
          <div className="portal-copyright">&copy; 2026 Road to Glory. All rights reserved.</div>
        </footer>
      </div>
    </div>
  );
}
