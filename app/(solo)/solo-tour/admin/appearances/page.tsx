
"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "../../career-mode/appearances/appearances.css";
import { 
  fetchRegisteredClubs, 
  fetchClubPlayers, 
  fetchAppearances, 
  saveAppearances,
  fetchActiveSeason,
  revertAppearancesAndSalaries,
  fetchSeasonMatchdays,
  fetchClubTournamentsForSeason,
  fetchCompletedFixturesForClub
} from "@/utils/solo/serverActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

interface Club {
  id: string;
  name: string;
  manager: string;
  image: string;
}

interface Player {
  id: string;
  name: string;
  position: string;
  value: number;
  star: string;
  imagePath: string;
  isSuspended?: boolean;
}

interface Tournament {
  id: string;
  name: string;
}

interface CompletedFixture {
  id: string;
  roundNumber: number;
  tournamentId: string;
  tournamentName: string;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  homeScore: number;
  awayScore: number;
}

export default function AppearancesManagerPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [appearances, setAppearances] = useState<Record<string, number[]>>({});
  const [season, setSeason] = useState<{ id: any; season_number: number }>({ id: 6, season_number: 9 });

  // Filter state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [completedFixtures, setCompletedFixtures] = useState<CompletedFixture[]>([]);
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [filterMatch, setFilterMatch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [activeMatchday, setActiveMatchday] = useState<number>(1);
  const [editSelections, setEditSelections] = useState<string[]>([]);
  const [isSaving, startSaving] = useTransition();

  // loading state
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // List of Matchdays dynamic based on season fixtures
  const [matchdays, setMatchdays] = useState<number[]>([]);

  // Fetch initial data (clubs and active season)
  useEffect(() => {
    document.title = "Appearances Manager - Admin Hub";
    async function loadInitialData() {
      try {
        const [activeSeasonData, clubsData] = await Promise.all([
          fetchActiveSeason(),
          fetchRegisteredClubs()
        ]);
        
        if (activeSeasonData) {
          setSeason({
            id: activeSeasonData.id,
            season_number: activeSeasonData.season_number
          });
          const mds = await fetchSeasonMatchdays(activeSeasonData.id);
          setMatchdays(mds);
          if (mds.length > 0) {
            setActiveMatchday(mds[0]);
          }
        }
        
        if (clubsData && clubsData.length > 0) {
          setClubs(clubsData);
          setSelectedClubId(clubsData[0].id);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Fetch players and appearances for the selected club
  useEffect(() => {
    if (!selectedClubId || !season.id) return;
    
    async function loadClubData() {
      setLoadingPlayers(true);
      setIsEditing(false); // cancel edit when changing clubs
      try {
        const [playersData, appearancesData, tournamentsData, fixturesData] = await Promise.all([
          fetchClubPlayers(selectedClubId),
          fetchAppearances(selectedClubId, season.id),
          fetchClubTournamentsForSeason(selectedClubId, season.id),
          fetchCompletedFixturesForClub(selectedClubId, season.id)
        ]);

        setPlayers(playersData);
        setTournaments(tournamentsData);
        setCompletedFixtures(fixturesData);
        setFilterTournament("all");
        setFilterMatch("all");
        setSearchQuery("");
        // Group appearances by player_id
        const appearanceMap: Record<string, number[]> = {};
        playersData.forEach((p: Player) => {
          appearanceMap[p.id] = [];
        });
        
        if (appearancesData) {
          appearancesData.forEach((row: any) => {
            const pid = row.player_id.toString();
            const md = parseInt(row.matchday, 10);
            if (!appearanceMap[pid]) {
              appearanceMap[pid] = [];
            }
            if (!appearanceMap[pid].includes(md)) {
              appearanceMap[pid].push(md);
            }
          });
        }
        
        setAppearances(appearanceMap);
      } catch (err) {
        console.error("Error loading club details:", err);
      } finally {
        setLoadingPlayers(false);
      }
    }
    loadClubData();
  }, [selectedClubId, season.id]);

  // Handle entering edit mode
  const enterEditMode = () => {
    const selected: string[] = [];
    Object.entries(appearances).forEach(([pid, mds]) => {
      if (mds.includes(activeMatchday)) {
        selected.push(pid);
      }
    });
    setEditSelections(selected);
    setIsEditing(true);
  };

  // Handle matchday change during edit mode
  const handleMatchdayChange = (md: number) => {
    setActiveMatchday(md);
    const selected: string[] = [];
    Object.entries(appearances).forEach(([pid, mds]) => {
      if (mds.includes(md)) {
        selected.push(pid);
      }
    });
    setEditSelections(selected);

    // Reset match filter if it doesn't match the new matchday
    setFilterMatch((prev) => {
      if (prev === "all") return prev;
      const fixture = completedFixtures.find(f => f.id === prev);
      if (fixture && fixture.roundNumber !== md) {
        return "all";
      }
      return prev;
    });
  };

  // Toggle player selection for the active matchday
  const togglePlayerSelection = (playerId: string) => {
    setEditSelections((prev) =>
      prev.includes(playerId)
        ? prev.filter((id) => id !== playerId)
        : [...prev, playerId]
    );
  };

  // Save selected appearances to database (auto-processes financial salaries)
  const handleSave = () => {
    startSaving(async () => {
      try {
        await saveAppearances(selectedClubId, season.id, activeMatchday, editSelections);
        
        // Update local state directly
        setAppearances((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((pid) => {
            next[pid] = next[pid].filter((m) => m !== activeMatchday);
            if (editSelections.includes(pid)) {
              next[pid].push(activeMatchday);
            }
          });
          return next;
        });

        setIsEditing(false);
        showToast(`Saved appearances and updated salaries for Matchday ${activeMatchday}!`);
      } catch (err) {
        console.error(err);
        showToast("Error saving appearances.");
      }
    });
  };

  // Revert/reset appearances for the active matchday
  const handleRevert = () => {
    if (!window.confirm(`Are you sure you want to revert Matchday ${activeMatchday} appearances? This will clear all selected players and refund their appearance salaries for this team.`)) {
      return;
    }
    
    startSaving(async () => {
      try {
        await revertAppearancesAndSalaries(selectedClubId, season.id, activeMatchday);
        
        // Update local state directly by clearing activeMatchday from all players
        setAppearances((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((pid) => {
            next[pid] = next[pid].filter((m) => m !== activeMatchday);
          });
          return next;
        });
        
        setIsEditing(false);
        showToast(`Reverted Matchday ${activeMatchday} appearances and refunded salaries!`);
      } catch (err) {
        console.error(err);
        showToast("Error reverting matchday appearances.");
      }
    });
  };

  // Export player appearances list to a CSV template
  const exportToCSV = () => {
    const headers = ["Player Name", "Present (1 or blank)"];
    const rows = players.map(p => {
      const isPresent = editSelections.includes(p.id) ? "1" : "";
      return [p.name, isPresent];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const teamCleanName = activeClub ? activeClub.name.replace(/\s+/g, "_") : "Team";
    link.setAttribute("download", `${teamCleanName}_Matchday_${activeMatchday}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV template exported successfully!");
  };

  // Import player appearances list from a modified CSV file
  const importFromCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) return;

        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return;

        const newSelections: string[] = [];
        const playerMap = new Map<string, Player>();
        players.forEach(p => {
          playerMap.set(p.name.trim().toLowerCase(), p);
        });

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split line values supporting double quotes
          let parts: string[] = [];
          let current = '';
          let inQuotes = false;
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              parts.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          parts.push(current.trim());

          if (parts.length < 2) continue;

          const name = parts[0].replace(/^"|"$/g, '').trim().toLowerCase();
          const presentVal = parts[1].replace(/^"|"$/g, '').trim();

          const matchedPlayer = playerMap.get(name);
          if (matchedPlayer && presentVal === "1") {
            newSelections.push(matchedPlayer.id);
          }
        }

        setEditSelections(newSelections);
        showToast(`Successfully imported selections! Matched and checked ${newSelections.length} players.`);
      } catch (err) {
        console.error(err);
        showToast("Failed to parse CSV file. Ensure it is a valid format.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Clone appearances from a previous matchday for active squad members
  const cloneLineup = (fromMatchday: number) => {
    const clonedIds: string[] = [];
    Object.entries(appearances).forEach(([pid, mds]) => {
      if (mds.includes(fromMatchday)) {
        if (players.some(p => p.id === pid)) {
          clonedIds.push(pid);
        }
      }
    });
    setEditSelections(clonedIds);
    showToast(`Cloned lineup from Matchday ${fromMatchday}! ${clonedIds.length} players checked.`);
  };

  // Check if any player has an appearance recorded for the active matchday
  const matchdayHasAppearances = useMemo(() => {
    return Object.values(appearances).some((mds) => mds.includes(activeMatchday));
  }, [appearances, activeMatchday]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const activeClub = useMemo(() => {
    return clubs.find(c => c.id === selectedClubId);
  }, [clubs, selectedClubId]);

  // Compute stats metrics
  const activeClubStats = useMemo(() => {
    if (players.length === 0) return { trackedMatchdays: 0, topPlayerName: "None", avgPlayersPerMatch: "0" };
    
    const uniqueMatchdays = new Set<number>();
    const matchdayPlayerCounts: Record<number, number> = {};
    
    Object.values(appearances).forEach((mds) => {
      mds.forEach(m => {
        uniqueMatchdays.add(m);
        matchdayPlayerCounts[m] = (matchdayPlayerCounts[m] || 0) + 1;
      });
    });

    let maxApp = 0;
    let topPlayerName = "None";
    players.forEach(p => {
      const count = appearances[p.id]?.length || 0;
      if (count > maxApp) {
        maxApp = count;
        topPlayerName = `${p.name} (${count} matches)`;
      }
    });

    const totalTracked = uniqueMatchdays.size;
    let avgPlayersPerMatch = "0";
    if (totalTracked > 0) {
      const sumCounts = Object.values(matchdayPlayerCounts).reduce((a, b) => a + b, 0);
      avgPlayersPerMatch = (sumCounts / totalTracked).toFixed(1);
    }

    return {
      trackedMatchdays: totalTracked,
      topPlayerName,
      avgPlayersPerMatch
    };
  }, [players, appearances]);

  // Derive filtered matchdays based on tournament filter
  const filteredMatchdays = useMemo(() => {
    if (filterTournament === "all") return matchdays;
    const tournamentRounds = completedFixtures
      .filter(f => f.tournamentId === filterTournament)
      .map(f => f.roundNumber);
    return matchdays.filter(md => tournamentRounds.includes(md));
  }, [matchdays, filterTournament, completedFixtures]);

  // Build available matches list for the match dropdown
  const availableMatches = useMemo(() => {
    let fixtures = completedFixtures;
    if (filterTournament !== "all") {
      fixtures = fixtures.filter(f => f.tournamentId === filterTournament);
    }
    return fixtures;
  }, [completedFixtures, filterTournament]);

  // Filter players by search query
  const filteredPlayers = useMemo(() => {
    let result = players;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q)
      );
    }

    return result;
  }, [players, searchQuery]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterTournament !== "all" || filterMatch !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterTournament("all");
    setFilterMatch("all");
  };

  // Synchronize activeMatchday with selected filterMatch
  useEffect(() => {
    if (filterMatch !== "all") {
      const fixture = completedFixtures.find(f => f.id === filterMatch);
      if (fixture) {
        handleMatchdayChange(fixture.roundNumber);
      }
    }
  }, [filterMatch, completedFixtures]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <RwsFullPageLoading text="Loading Ledger Manager" />
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        {/* Breadcrumb */}
        <div className="portal-breadcrumb">
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-user-gear" />
            Admin Operations
          </div>
          <h1 className="portal-title">APPEARANCES MANAGER</h1>
          <p className="portal-subtitle">
            Log matchday squad participation. Saving selections will automatically compute and deduct or refund player appearance salaries for Season {season.season_number}.
          </p>
        </div>

        <div className="appearances-container">
          {/* Teams selector ribbon */}
          <div>
            <h3 className="section-heading" style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>Select Team</h3>
            <div className="teams-selector-grid">
              {clubs.map((club) => (
                <div
                  key={club.id}
                  className={`team-select-card ${selectedClubId === club.id ? "active" : ""}`}
                  onClick={() => setSelectedClubId(club.id)}
                >
                  <img 
                    src={club.image || "/assets/images/placeholder.webp"} 
                    alt={club.name} 
                    className="team-select-logo" 
                    onError={(e) => { e.currentTarget.src = "/assets/imgassets/background_blank.png"; }}
                  />
                  <span className="team-select-name">{club.name}</span>
                </div>
              ))}
            </div>
          </div>

          {activeClub && (
            <>
              {/* Squad & Appearance Statistics Cards */}
              <div className="stats-cards-grid">
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-users" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Squad Size</span>
                    <span className="stat-val">{players.length} Players</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-calendar-check" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Matchdays Used</span>
                    <span className="stat-val">{activeClubStats.trackedMatchdays} Played</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-chart-line" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Avg. Squad Per Match</span>
                    <span className="stat-val">{activeClubStats.avgPlayersPerMatch}</span>
                  </div>
                </div>
                <div className="stat-item-card">
                  <div className="stat-icon-wrapper">
                    <i className="fa-solid fa-trophy" />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">Most Appearances</span>
                    <span className="stat-val" style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "0.25rem" }}>
                      {activeClubStats.topPlayerName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Editor Control Section */}
              <div className="admin-actions-bar">
                <div className="matchday-picker">
                  <i className="fa-solid fa-user-gear" style={{ color: "#3b82f6", marginRight: "0.25rem" }} />
                  <span style={{ fontWeight: 700 }}>Admin controls:</span>
                  <select
                    className="matchday-select-input"
                    value={activeMatchday}
                    onChange={(e) => handleMatchdayChange(parseInt(e.target.value, 10))}
                    disabled={isSaving || matchdays.length === 0}
                  >
                    {matchdays.length === 0 ? (
                      <option value="">No Matchdays</option>
                    ) : (
                      matchdays.map((md) => (
                        <option key={md} value={md}>Matchday {md}</option>
                      ))
                    )}
                  </select>
                </div>

                {!isEditing ? (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button 
                      onClick={enterEditMode} 
                      className="portal-btn btn-primary"
                      disabled={loadingPlayers || matchdays.length === 0}
                    >
                      <i className="fa-solid fa-pen-to-square" /> Edit Matchday {activeMatchday} Players
                    </button>
                    {matchdayHasAppearances && matchdays.length > 0 && (
                      <button 
                        onClick={handleRevert} 
                        className="portal-btn btn-danger"
                        disabled={loadingPlayers || isSaving}
                        style={{ background: "#ef4444", borderColor: "#dc2626" }}
                      >
                        <i className="fa-solid fa-arrow-rotate-left" /> Revert Matchday {activeMatchday}
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
                    {/* Primary actions */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <button 
                        onClick={handleSave} 
                        className="portal-btn btn-success" 
                        disabled={isSaving}
                        style={{ background: "#10b981", borderColor: "#059669" }}
                      >
                        {isSaving ? (
                          <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                        ) : (
                          <><i className="fa-solid fa-check" /> Save Selections</>
                        )}
                      </button>
                      <button 
                        onClick={() => setIsEditing(false)} 
                        className="portal-btn btn-secondary"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Secondary helper utilities */}
                    <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      <button 
                        onClick={() => {
                          const allFilteredIds = filteredPlayers.map(p => p.id);
                          setEditSelections(prev => {
                            const nonFiltered = prev.filter(id => !players.find(p => p.id === id) || !filteredPlayers.find(fp => fp.id === id));
                            return [...nonFiltered, ...allFilteredIds];
                          });
                        }}
                        className="portal-btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: "rgba(59, 130, 246, 0.4)", color: "#3b82f6" }}
                        disabled={isSaving}
                      >
                        <i className="fa-solid fa-square-check" /> Select All Filtered
                      </button>
                      <button 
                        onClick={() => {
                          const filteredIds = filteredPlayers.map(p => p.id);
                          setEditSelections(prev => prev.filter(id => !filteredIds.includes(id)));
                        }}
                        className="portal-btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                        disabled={isSaving}
                      >
                        <i className="fa-solid fa-square" /> Clear Filtered
                      </button>

                      <div style={{ width: "1px", height: "20px", background: "rgba(255, 255, 255, 0.12)" }} />

                      {/* Excel/CSV Tool */}
                      <button
                        onClick={exportToCSV}
                        className="portal-btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: "rgba(16, 185, 129, 0.4)", color: "#10b981" }}
                        disabled={isSaving}
                      >
                        <i className="fa-solid fa-file-export" /> Export CSV Template
                      </button>

                      <label 
                        className="portal-btn btn-secondary"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", borderColor: "rgba(16, 185, 129, 0.4)", color: "#10b981", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                      >
                        <i className="fa-solid fa-file-import" /> Import CSV
                        <input
                          type="file"
                          accept=".csv"
                          onChange={importFromCSV}
                          style={{ display: "none" }}
                          disabled={isSaving}
                        />
                      </label>

                      <div style={{ width: "1px", height: "20px", background: "rgba(255, 255, 255, 0.12)" }} />

                      {/* Lineup Cloner */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 700, letterSpacing: "0.5px" }}>CLONE FROM:</span>
                        <select
                          className="matchday-select-input"
                          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                          onChange={(e) => {
                            const cloneFromMd = parseInt(e.target.value, 10);
                            if (cloneFromMd) cloneLineup(cloneFromMd);
                            e.target.value = ""; // reset selection
                          }}
                          disabled={isSaving}
                        >
                          <option value="">Choose round...</option>
                          {matchdays.filter(md => md !== activeMatchday).map(md => (
                            <option key={md} value={md}>Matchday {md}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Toolbar */}
              <div className="filter-toolbar">
                <div className="filter-search-wrapper">
                  <i className="fa-solid fa-magnifying-glass filter-search-icon" />
                  <input
                    type="text"
                    className="filter-search-input"
                    placeholder="Search player name or position..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="filter-divider" />

                <div className="filter-select-group">
                  <span className="filter-label">Tournament</span>
                  <select
                    className="filter-select"
                    value={filterTournament}
                    onChange={(e) => { setFilterTournament(e.target.value); setFilterMatch("all"); }}
                    disabled={isEditing}
                  >
                    <option value="all">All Tournaments</option>
                    {tournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="filter-select-group">
                  <span className="filter-label">Match</span>
                  <select
                    className="filter-select"
                    value={filterMatch}
                    onChange={(e) => setFilterMatch(e.target.value)}
                    disabled={isEditing}
                  >
                    <option value="all">All Matches</option>
                    {availableMatches.map(f => {
                      const opponent = f.homeClubId === selectedClubId ? f.awayClubName : f.homeClubName;
                      const label = `R${f.roundNumber} vs ${opponent} (${f.homeScore}-${f.awayScore})`;
                      return <option key={f.id} value={f.id}>{label}</option>;
                    })}
                  </select>
                </div>

                {hasActiveFilters && (
                  <button className="filter-clear-btn" onClick={clearFilters} disabled={isEditing}>
                    <i className="fa-solid fa-xmark" /> Clear
                  </button>
                )}

                <span className="filter-result-count">
                  {filteredPlayers.length} of {players.length} players
                </span>
              </div>

              {/* Main Ledger Table */}
              <div className="table-panel">
                {loadingPlayers ? (
                  <div style={{ padding: "4rem", textAlign: "center" }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#3b82f6", marginBottom: "1rem" }} />
                    <p style={{ color: "#9ca3af" }}>Loading {activeClub.name} squad ledger...</p>
                  </div>
                ) : players.length === 0 ? (
                  <div style={{ padding: "4rem", textAlign: "center" }}>
                    <i className="fa-solid fa-user-slash" style={{ fontSize: "2.5rem", color: "#4b5563", marginBottom: "1rem" }} />
                    <h4>No active squad contract</h4>
                    <p style={{ color: "#9ca3af" }}>Ensure players are signed and assigned active contracts for {activeClub.name}.</p>
                  </div>
                ) : matchdays.length === 0 ? (
                  <div style={{ padding: "4rem", textAlign: "center" }}>
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "2.5rem", color: "#ef4444", marginBottom: "1rem" }} />
                    <h4 style={{ marginBottom: "0.5rem" }}>No Matchdays Found</h4>
                    <p style={{ color: "#9ca3af", maxWidth: "450px", margin: "0 auto" }}>No matchdays or fixtures have been generated for the active season yet. Generate fixtures first to enable appearances management.</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <table className="appearances-table">
                      <thead>
                        <tr>
                          <th>Player</th>
                          {filteredMatchdays.map((md) => (
                            <th key={md} style={{ textAlign: "center", width: "7%" }}>
                              {activeMatchday === md && isEditing ? (
                                <span style={{ color: "#3b82f6", borderBottom: "2px solid #3b82f6", paddingBottom: "0.25rem" }}>
                                  M{md} *
                                </span>
                              ) : (
                                `M${md}`
                              )}
                            </th>
                          ))}
                          <th style={{ textAlign: "center", width: "10%" }}>Total Played</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((player) => {
                          const playerApps = appearances[player.id] || [];
                          const totalCount = filterTournament !== "all" || filterMatch !== "all"
                            ? playerApps.filter(md => filteredMatchdays.includes(md)).length
                            : playerApps.length;

                          return (
                            <tr key={player.id}>
                              <td>
                                <div className="player-cell-info">
                                  <img
                                    src={player.imagePath}
                                    alt={player.name}
                                    className="player-cell-avatar"
                                    onError={(e) => { e.currentTarget.src = "/assets/images/players/default.webp"; }}
                                  />
                                  <div>
                                    <div className="player-cell-name">
                                      {player.name}
                                      {player.isSuspended && (
                                        <span style={{
                                          marginLeft: "0.5rem",
                                          background: "rgba(239, 68, 68, 0.2)",
                                          color: "#ef4444",
                                          border: "1px solid rgba(239, 68, 68, 0.4)",
                                          padding: "1px 6px",
                                          borderRadius: "4px",
                                          fontSize: "0.65rem",
                                          fontWeight: "bold",
                                          textTransform: "uppercase"
                                        }}>
                                          Suspended
                                        </span>
                                      )}
                                    </div>
                                    <span className="player-cell-pos">{player.position}</span>
                                  </div>
                                </div>
                              </td>

                              {filteredMatchdays.map((md) => {
                                const played = playerApps.includes(md);
                                
                                return (
                                  <td 
                                    key={md} 
                                    style={{ 
                                      verticalAlign: "middle", 
                                      cursor: isEditing && activeMatchday === md ? "pointer" : "default" 
                                    }}
                                    onClick={(e) => {
                                      if (isEditing && activeMatchday === md) {
                                        if (!(e.target as HTMLElement).closest('.custom-checkbox-container')) {
                                          togglePlayerSelection(player.id);
                                        }
                                      }
                                    }}
                                  >
                                    {isEditing && activeMatchday === md ? (
                                      <div className="editor-checkbox-cell">
                                        <label className="custom-checkbox-container">
                                          <input
                                            type="checkbox"
                                            checked={editSelections.includes(player.id)}
                                            onChange={() => togglePlayerSelection(player.id)}
                                            disabled={isSaving}
                                          />
                                          <span className="custom-checkbox-checkmark"></span>
                                        </label>
                                      </div>
                                    ) : (
                                      <div className="md-cell-active">
                                        {played ? (
                                          <div className="md-indicator-pill">✓</div>
                                        ) : (
                                          <span className="md-indicator-none">-</span>
                                        )}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}

                              <td style={{ verticalAlign: "middle" }}>
                                <div className="total-matches-count">
                                  👕 {totalCount}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Mobile Card Layout */}
                    <div className="appearances-card-list">
                      {filteredPlayers.map((player) => {
                        const playerApps = appearances[player.id] || [];
                        const totalCount = filterTournament !== "all" || filterMatch !== "all"
                          ? playerApps.filter(md => filteredMatchdays.includes(md)).length
                          : playerApps.length;

                        return (
                          <div 
                            key={player.id} 
                            className="appearance-player-card"
                            style={{ cursor: isEditing ? "pointer" : "default" }}
                            onClick={(e) => {
                              if (isEditing) {
                                if (!(e.target as HTMLElement).closest('.custom-checkbox-container')) {
                                  togglePlayerSelection(player.id);
                                }
                              }
                            }}
                          >
                            <div className="card-player-header">
                              <div className="card-player-left">
                                {isEditing && (
                                  <label className="custom-checkbox-container" style={{ flexShrink: 0, marginRight: "0.25rem" }}>
                                    <input
                                      type="checkbox"
                                      checked={editSelections.includes(player.id)}
                                      onChange={() => togglePlayerSelection(player.id)}
                                      disabled={isSaving}
                                    />
                                    <span className="custom-checkbox-checkmark"></span>
                                  </label>
                                )}
                                <img
                                  src={player.imagePath}
                                  alt={player.name}
                                  className="card-player-avatar"
                                  onError={(e) => { e.currentTarget.src = "/assets/images/players/default.webp"; }}
                                />
                                <div className="card-player-meta">
                                  <div className="card-player-name">
                                    {player.name}
                                    {player.isSuspended && (
                                      <span style={{
                                        marginLeft: "0.35rem",
                                        background: "rgba(239, 68, 68, 0.2)",
                                        color: "#ef4444",
                                        border: "1px solid rgba(239, 68, 68, 0.4)",
                                        padding: "1px 5px",
                                        borderRadius: "3px",
                                        fontSize: "0.55rem",
                                        fontWeight: "bold",
                                        textTransform: "uppercase"
                                      }}>
                                        SUS
                                      </span>
                                    )}
                                  </div>
                                  <span className="card-player-pos">{player.position}</span>
                                </div>
                              </div>
                              <div className="card-total-badge">
                                👕 {totalCount}
                              </div>
                            </div>
                            <div className="card-matchday-strip">
                              {filteredMatchdays.map((md) => {
                                const played = playerApps.includes(md);
                                const isActiveEditing = isEditing && activeMatchday === md;
                                return (
                                  <div
                                    key={md}
                                    className={`card-md-chip ${played ? "played" : "missed"} ${isActiveEditing ? "editing" : ""}`}
                                    style={isActiveEditing ? { borderColor: "#3b82f6", color: "#3b82f6" } : undefined}
                                  >
                                    {isActiveEditing ? `M${md} ✎` : played ? `M${md} ✓` : `M${md}`}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Guidelines info panel */}
          <div className="glass-panel" style={{ marginTop: "1rem" }}>
            <h3 className="section-heading" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }} /> 
              Manager Ledger Guidelines
            </h3>
            <p className="section-text" style={{ fontSize: "0.85rem", color: "#9ca3af", lineHeight: "1.6" }}>
              1. Select a club from the top selector ribbon to load its ledger.<br />
              2. Change the <strong>Matchday</strong> dropdown to select the target fixture.<br />
              3. Click <strong>Edit Matchday Players</strong>, check the players who participated, and click <strong>Save Selections</strong> to deduct their salaries.<br />
              4. Click <strong>Revert Matchday</strong> to completely clear appearances for that fixture and refund all associated salaries.
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="alert-toast">
            <i className="fa-solid fa-circle-check" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
