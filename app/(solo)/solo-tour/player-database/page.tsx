"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import "../../../portal.css";
import "./player-database.css";
import { fetchPlayersDb } from "../../../../utils/solo/serverActions";

const STORAGE_KEY = "r2g_solo_player_db_filters";

const TIER_OPTIONS = [
  { value: "all", label: "All Tiers", badge: "ALL" },
  { value: "legend", label: "Legend", badge: "PRIME" },
  { value: "5-star", label: "5★ Standard", badge: "5★" },
  { value: "4-star", label: "4★ Standard", badge: "4★" },
  { value: "3-star", label: "3★ Standard", badge: "3★" }
];

export default function PlayerStatus() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Connecting to database...");
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  const [searchTerm, setSearchTerm] = useState("");
  const [starFilter, setStarFilter] = useState("all");
  const [clubFilter, setClubFilter] = useState("ALL");
  const [positionFilters, setPositionFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialized, setIsInitialized] = useState(false);
  const itemsPerPage = 24;

  // Custom Searchable Dropdown States
  const [clubDropdownOpen, setClubDropdownOpen] = useState(false);
  const [clubSearch, setClubSearch] = useState("");
  const [starDropdownOpen, setStarDropdownOpen] = useState(false);
  const [starSearch, setStarSearch] = useState("");

  // Close custom dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest("[data-club-filter-dropdown]")) {
        setClubDropdownOpen(false);
      }
      if (!target.closest("[data-star-filter-dropdown]")) {
        setStarDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isPopStateRef = useRef(false);

  // Restore filter state from URL or sessionStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qSearch = params.get("search");
    const qStar = params.get("star");
    const qClub = params.get("club");
    const qPos = params.get("pos");
    const qPage = params.get("page");

    const hasUrlParams =
      qSearch !== null ||
      qStar !== null ||
      qClub !== null ||
      qPos !== null ||
      qPage !== null;

    if (hasUrlParams) {
      if (qSearch !== null) setSearchTerm(qSearch);
      if (qStar !== null) setStarFilter(qStar);
      if (qClub !== null) setClubFilter(qClub);
      if (qPos !== null) setPositionFilters(qPos ? qPos.split(",").filter(Boolean) : []);
      if (qPage !== null && !isNaN(Number(qPage))) setCurrentPage(Math.max(1, Number(qPage)));
    } else {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.searchTerm !== undefined) setSearchTerm(parsed.searchTerm);
          if (parsed.starFilter !== undefined) setStarFilter(parsed.starFilter);
          if (parsed.clubFilter !== undefined) setClubFilter(parsed.clubFilter);
          if (parsed.positionFilters !== undefined) setPositionFilters(parsed.positionFilters);
          if (parsed.currentPage !== undefined) setCurrentPage(parsed.currentPage);
        }
      } catch (e) {
        console.error("Failed to restore player database state", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Listen for browser/PWA back navigation (popstate)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const qSearch = params.get("search");
      const qStar = params.get("star");
      const qClub = params.get("club");
      const qPos = params.get("pos");
      const qPage = params.get("page");

      isPopStateRef.current = true;

      setSearchTerm(qSearch !== null ? qSearch : "");
      setStarFilter(qStar !== null ? qStar : "all");
      setClubFilter(qClub !== null ? qClub : "ALL");
      setPositionFilters(qPos ? qPos.split(",").filter(Boolean) : []);
      setCurrentPage(qPage !== null && !isNaN(Number(qPage)) ? Math.max(1, Number(qPage)) : 1);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Save filter state to sessionStorage and URL query parameters via pushState
  useEffect(() => {
    if (!isInitialized) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ searchTerm, starFilter, clubFilter, positionFilters, currentPage })
      );
    } catch (e) {
      console.error("Failed to save player database state", e);
    }

    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (starFilter && starFilter !== "all") params.set("star", starFilter);
    if (clubFilter && clubFilter !== "ALL") params.set("club", clubFilter);
    if (positionFilters.length > 0) params.set("pos", positionFilters.join(","));
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.pushState({ page: currentPage }, "", newUrl);
    }
  }, [searchTerm, starFilter, clubFilter, positionFilters, currentPage, isInitialized]);

  useEffect(() => {
    document.title = "Players Database - Solo Tour | R2G";
    async function loadData() {
      setLoading(true);
      try {
        setLoadingMsg("Loading players...");
        const data = await fetchPlayersDb();
        data.sort((a: any, b: any) => {
          if (a.value !== b.value) return b.value - a.value;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        setPlayers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }
    loadData();
  }, []);

  const togglePosition = (pos: string) => {
    setPositionFilters((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStarFilter("all");
    setClubFilter("ALL");
    setPositionFilters([]);
    setCurrentPage(1);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  };

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase()))
        return false;
      if (starFilter !== "all") {
        const baseVal = player.value || 0;
        if (starFilter === "legend" && baseVal < 150) return false;
        if (starFilter === "5-star" && (baseVal < 120 || baseVal >= 150)) return false;
        if (starFilter === "4-star" && (baseVal < 100 || baseVal >= 120)) return false;
        if (starFilter === "3-star" && baseVal >= 100) return false;
      }
      if (clubFilter !== "ALL" && player.club !== clubFilter) return false;
      if (positionFilters.length > 0) {
        const pos = player.position.split(",").map((p: string) => p.trim());
        if (!pos.some((p: string) => positionFilters.includes(p))) return false;
      }
      return true;
    });
  }, [players, searchTerm, starFilter, clubFilter, positionFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage));
  const currentPlayers = filteredPlayers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clubs = useMemo(() => {
    const c = new Set<string>();
    players.forEach((p) => { if (p.club) c.add(p.club); });
    return Array.from(c).sort();
  }, [players]);

  // Filtered List for Custom Club Dropdown
  const filteredClubList = useMemo(() => {
    const allClubs = ["ALL", "FREE AGENT", ...clubs.filter(c => c !== "FREE AGENT")];
    return allClubs.filter(c => c.toLowerCase().includes(clubSearch.toLowerCase()));
  }, [clubs, clubSearch]);

  // Filtered List for Custom Tier Dropdown
  const filteredTierList = useMemo(() => {
    return TIER_OPTIONS.filter(t => t.label.toLowerCase().includes(starSearch.toLowerCase()));
  }, [starSearch]);

  const selectedTierLabel = useMemo(() => {
    const opt = TIER_OPTIONS.find(t => t.value === starFilter);
    return opt ? opt.label : "All Tiers";
  }, [starFilter]);

  const hasActiveFilters =
    searchTerm || starFilter !== "all" || clubFilter !== "ALL" || positionFilters.length > 0;

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const handleImgError = (playerId: number) => {
    setImgErrors((prev) => new Set(prev).add(playerId));
  };

  return (
    <div className="portal-root-wrapper">
      <style jsx global>{`
        .portal-container {
          gap: 0.75rem !important;
        }
        @media (max-width: 768px) {
          .portal-container {
            gap: 0.5rem !important;
            padding: 0.75rem 0.75rem 1.25rem !important;
          }
          .filter-toolbar-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }
          .toolbar-search {
            width: 100% !important;
            min-width: 100% !important;
            flex: none !important;
          }
          .custom-filter-dropdown {
            width: 100% !important;
            min-width: 100% !important;
            flex: none !important;
          }
          .custom-dropdown-trigger {
            background: #131824 !important;
            opacity: 1 !important;
          }
          .custom-dropdown-menu {
            background: #131824 !important;
            opacity: 1 !important;
          }
        }
        .filter-toolbar {
          position: relative !important;
          z-index: 100 !important;
          overflow: visible !important;
          margin-bottom: 0.4rem !important;
        }
        .filter-toolbar-row {
          position: relative !important;
          z-index: 100 !important;
          overflow: visible !important;
        }
        .active-filters {
          margin-top: 0.2rem !important;
          margin-bottom: 0.25rem !important;
        }
        .result-count {
          padding: 0 !important;
          margin-top: 0 !important;
          margin-bottom: 0 !important;
          line-height: 1 !important;
        }
        .cards-wrapper {
          position: relative !important;
          z-index: 1 !important;
          margin-top: -6px !important;
          padding-top: 0 !important;
        }
        .card {
          margin-top: 0 !important;
        }
        @keyframes adminFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-filter-dropdown {
          position: relative !important;
          z-index: 110 !important;
          min-width: 170px;
          flex: 1;
        }
        .custom-filter-dropdown.dropdown-active {
          z-index: 10000 !important;
        }
        .custom-dropdown-trigger {
          background: #101524 !important;
          border: 1px solid rgba(255, 255, 255, 0.15) !important;
          border-radius: 10px;
          padding: 9px 14px;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          user-select: none;
          transition: all 0.2s ease;
          opacity: 1 !important;
        }
        .custom-dropdown-trigger:hover {
          border-color: var(--solo-primary, #6366f1);
          background: #171d30 !important;
        }
        .custom-dropdown-menu {
          position: absolute !important;
          top: 100% !important;
          left: 0 !important;
          right: 0 !important;
          margin-top: 6px !important;
          background: #101524 !important;
          border: 1px solid rgba(255, 255, 255, 0.18) !important;
          border-radius: 12px !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.95), 0 0 20px rgba(99, 102, 241, 0.2) !important;
          z-index: 9999 !important;
          overflow: hidden !important;
          animation: adminFadeIn 0.18s ease !important;
          opacity: 1 !important;
        }
        .cards-wrapper {
          position: relative !important;
          z-index: 1 !important;
        }
        .custom-dropdown-search {
          padding: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .custom-dropdown-search input {
          width: 100%;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 7px 10px;
          font-size: 0.8rem;
          color: #fff;
          outline: none;
          box-sizing: border-box;
        }
        .custom-dropdown-list {
          max-height: 220px;
          overflow-y: auto;
        }
        .custom-dropdown-list::-webkit-scrollbar {
          width: 5px;
        }
        .custom-dropdown-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 4px;
        }
        .custom-dropdown-item {
          padding: 9px 12px;
          font-size: 0.82rem;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          transition: background 0.12s ease;
        }
        .custom-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .custom-dropdown-item.selected {
          background: rgba(99, 102, 241, 0.2);
          border-left: 3px solid var(--solo-primary, #6366f1);
          font-weight: 600;
        }
      `}</style>

      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Loading screen */}
      {loading && (
        <div className="cyber-welcome-screen">
          <div className="cyber-welcome-loader">
            <div className="welcome-message">R2G Player Data</div>
            <div className="loader-bar">
              <div className="loader-fill" />
            </div>
            <div className="subtext">{loadingMsg}</div>
          </div>
        </div>
      )}

      <div className="portal-container">
        {/* Back nav */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Mode
          </Link>
        </div>

        {/* Hero */}
        <div className="db-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-database" />
            Database
          </div>
          <h1 className="db-hero-title">
            Players Database
            {!loading && (
              <span className="db-hero-count">{players.length} Players</span>
            )}
          </h1>
          <p className="db-hero-sub">
            Browse contracts, card tiers, positions, and valuations league-wide
          </p>
        </div>

        {/* Filter toolbar */}
        <div className="filter-toolbar">
          <div className="filter-toolbar-row" style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <div className="toolbar-search" style={{ flex: 1.5 }}>
              <input
                type="text"
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
              <i className="fas fa-search search-icon" />
              {searchTerm && (
                <i
                  className="fas fa-times search-clear"
                  onClick={() => { setSearchTerm(""); setCurrentPage(1); }}
                />
              )}
            </div>

            {/* CUSTOM SEARCHABLE TIER DROPDOWN */}
            <div className={`custom-filter-dropdown ${starDropdownOpen ? "dropdown-active" : ""}`} data-star-filter-dropdown="true">
              <div
                className="custom-dropdown-trigger"
                onClick={() => setStarDropdownOpen(prev => !prev)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                  <i className="fa-solid fa-layer-group" style={{ color: "var(--solo-primary)", fontSize: "0.8rem" }} />
                  <strong>{selectedTierLabel}</strong>
                </span>
                <i className={`fa-solid fa-chevron-${starDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </div>

              {starDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div className="custom-dropdown-search">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search tier..."
                      value={starSearch}
                      onChange={(e) => setStarSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="custom-dropdown-list">
                    {filteredTierList.map(opt => {
                      const isSelected = starFilter === opt.value;
                      return (
                        <div
                          key={opt.value}
                          className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setStarFilter(opt.value);
                            setCurrentPage(1);
                            setStarDropdownOpen(false);
                            setStarSearch("");
                          }}
                        >
                          <span>{opt.label}</span>
                          {isSelected && <i className="fa-solid fa-check" style={{ color: "var(--solo-primary)", fontSize: "0.75rem" }} />}
                        </div>
                      );
                    })}
                    {filteredTierList.length === 0 && (
                      <div style={{ padding: "12px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                        No tiers found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CUSTOM SEARCHABLE CLUB DROPDOWN */}
            <div className={`custom-filter-dropdown ${clubDropdownOpen ? "dropdown-active" : ""}`} data-club-filter-dropdown="true">
              <div
                className="custom-dropdown-trigger"
                onClick={() => setClubDropdownOpen(prev => !prev)}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "6px" }}>
                  {clubFilter === "FREE AGENT" ? (
                    <img src="/assets/images/freeagent.WEBP" alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                  ) : clubFilter !== "ALL" ? (
                    <img
                      src={`/assets/images/club-logos/${encodeURIComponent(clubFilter.replace(/\s+/g, '-'))}.webp`}
                      alt=""
                      style={{ width: "16px", height: "16px", objectFit: "contain" }}
                      onError={(e: any) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <i className="fa-solid fa-shield-halved" style={{ color: "var(--solo-primary)", fontSize: "0.8rem" }} />
                  )}
                  <strong>{clubFilter === "ALL" ? "All Clubs" : clubFilter}</strong>
                </span>
                <i className={`fa-solid fa-chevron-${clubDropdownOpen ? "up" : "down"}`} style={{ fontSize: "0.75rem", opacity: 0.6 }} />
              </div>

              {clubDropdownOpen && (
                <div className="custom-dropdown-menu">
                  <div className="custom-dropdown-search">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search club name..."
                      value={clubSearch}
                      onChange={(e) => setClubSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="custom-dropdown-list">
                    {filteredClubList.map(clubName => {
                      const isSelected = clubFilter === clubName;
                      return (
                        <div
                          key={clubName}
                          className={`custom-dropdown-item ${isSelected ? "selected" : ""}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClubFilter(clubName);
                            setCurrentPage(1);
                            setClubDropdownOpen(false);
                            setClubSearch("");
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {clubName === "FREE AGENT" ? (
                              <img src="/assets/images/freeagent.WEBP" alt="" style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                            ) : clubName !== "ALL" ? (
                              <img
                                src={`/assets/images/club-logos/${encodeURIComponent(clubName.replace(/\s+/g, '-'))}.webp`}
                                alt=""
                                style={{ width: "16px", height: "16px", objectFit: "contain" }}
                                onError={(e: any) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              <i className="fa-solid fa-layer-group" style={{ fontSize: "0.75rem", opacity: 0.5 }} />
                            )}
                            <span>{clubName === "ALL" ? "All Clubs" : clubName}</span>
                          </div>
                          {isSelected && <i className="fa-solid fa-check" style={{ color: "var(--solo-primary)", fontSize: "0.75rem" }} />}
                        </div>
                      );
                    })}
                    {filteredClubList.length === 0 && (
                      <div style={{ padding: "12px", textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: "0.8rem" }}>
                        No clubs found
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="filter-toolbar-row">
            <div className="toolbar-positions">
              {["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => togglePosition(pos)}
                  className={`pos-btn pos-${pos} ${positionFilters.includes(pos) ? "active" : ""}`}
                >
                  {pos}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button className="toolbar-reset-btn" onClick={resetFilters}>
                <i className="fas fa-undo" style={{ marginRight: "0.3rem", fontSize: "0.6rem" }} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="active-filters">
            {searchTerm && (
              <span className="filter-chip">
                &quot;{searchTerm}&quot;
                <i className="fas fa-times filter-chip-remove" onClick={() => { setSearchTerm(""); setCurrentPage(1); }} />
              </span>
            )}
            {starFilter !== "all" && (
              <span className="filter-chip">
                {starFilter === "legend" ? "Legend" : `${starFilter.replace("-", "★ ")}`}
                <i className="fas fa-times filter-chip-remove" onClick={() => { setStarFilter("all"); setCurrentPage(1); }} />
              </span>
            )}
            {clubFilter !== "ALL" && (
              <span className="filter-chip">
                {clubFilter}
                <i className="fas fa-times filter-chip-remove" onClick={() => { setClubFilter("ALL"); setCurrentPage(1); }} />
              </span>
            )}
            {positionFilters.map((pos) => (
              <span className="filter-chip" key={pos}>
                {pos}
                <i className="fas fa-times filter-chip-remove" onClick={() => togglePosition(pos)} />
              </span>
            ))}
          </div>
        )}

        {/* Result count */}
        <div className="result-count">
          Showing <strong>{filteredPlayers.length}</strong> of {players.length} players
          {currentPage > 1 && <>&nbsp;&middot; Page {currentPage}</>}
        </div>

        {/* Cards / No results (PRESERVED FIFA CARD RENDER CODE) */}
        {filteredPlayers.length === 0 ? (
          <div className="no-results-message">
            <i className="fa-solid fa-user-slash" />
            <h3>No players found</h3>
            <p>No players match the chosen filters or search query.</p>
            <button className="portal-btn btn-secondary" onClick={resetFilters}>
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            <div className="cards-wrapper">
              {currentPlayers.map((player) => {
                let themeClass = "rivals-blue";
                let staticBg = "/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_BLUE_STATIC.png";
                let animBg = "/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_BLUE_LOOP.png";

                const baseVal = player.value || 0;
                if (baseVal >= 150) {
                  themeClass = "prime-icon";
                  staticBg = "/assets/cards/download_24/backgrounds_23_B_BASE_PRIMEICON_STATIC.png";
                  animBg = "/assets/cards/conv_anim_24/playercardui_primeicon_B_BASE_PRIMEICON_LOOP.png";
                } else if (baseVal >= 120) {
                  themeClass = "rivals-icon";
                  staticBg = "/assets/imgassets/background_blank.png";
                  animBg = "/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_ICON_LOOP.png";
                } else if (baseVal >= 100) {
                  themeClass = "rivals-red";
                  staticBg = "/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_RED_STATIC.png";
                  animBg = "/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_RED_LOOP.png";
                }

                return (
                  <Link
                    key={player.id}
                    href={`/solo-tour/player-database/${player.id}`}
                    className={`card ${themeClass}`}
                  >
                    <img
                      className="card-bg-static"
                      src={staticBg}
                      alt="Card Background"
                      onError={(e) => { e.currentTarget.src = "/assets/imgassets/background_blank.png"; }}
                    />
                    <div className="card-bg-animated" style={{ backgroundImage: `url('${animBg}')` }} />
                    <img
                      className="player-img"
                      src={imgErrors.has(player.id) ? "/assets/images/players/default.webp" : player.imagePath}
                      alt={player.name}
                      onError={() => handleImgError(player.id)}
                    />
                    <div className="player-info">
                      <div className="rating-pos">
                        <span className="position">{player.position}</span>
                      </div>
                      <div className="name">
                        {(() => {
                          const parts = player.name.trim().split(/\s+/);
                          if (parts.length > 1) return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
                          return player.name;
                        })()}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-controls">
                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fas fa-chevron-left" />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === "ellipsis" ? (
                    <span className="page-ellipsis" key={`ellipsis-${idx}`}>…</span>
                  ) : (
                    <button
                      key={page}
                      className={`page-num-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page as number)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className="pagination-btn"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
