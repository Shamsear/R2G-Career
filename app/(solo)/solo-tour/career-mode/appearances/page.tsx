"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import "../../../../portal.css";
import "./appearances.css";
import CustomSelect from "@/components/ui/CustomSelect";
import { 
  fetchRegisteredClubs, 
  fetchClubPlayers, 
  fetchAppearances, 
  fetchActiveSeason,
  checkIsSoloAdmin,
  fetchCompletedMatchdays,
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

export default function AppearancesLedgerPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [appearances, setAppearances] = useState<Record<string, number[]>>({});
  const [season, setSeason] = useState<{ id: any; season_number: number }>({ id: 6, season_number: 9 });
  const [isAdmin, setIsAdmin] = useState(false);

  // loading state
  const [loading, setLoading] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // List of Completed Matchdays for selected club
  const [matchdays, setMatchdays] = useState<number[]>([]);

  // Filter state
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [completedFixtures, setCompletedFixtures] = useState<CompletedFixture[]>([]);
  const [filterTournament, setFilterTournament] = useState<string>("all");
  const [filterMatch, setFilterMatch] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Fetch initial data (clubs and active season)
  useEffect(() => {
    document.title = "Appearances Ledger - Career Mode";
    async function loadInitialData() {
      try {
        const [activeSeasonData, clubsData, adminCheck] = await Promise.all([
          fetchActiveSeason(),
          fetchRegisteredClubs(),
          checkIsSoloAdmin()
        ]);
        
        setIsAdmin(adminCheck || false);
        
        if (activeSeasonData) {
          setSeason({
            id: activeSeasonData.id,
            season_number: activeSeasonData.season_number
          });
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
      try {
        const [playersData, appearancesData, completedMds, tournamentsData, fixturesData] = await Promise.all([
          fetchClubPlayers(selectedClubId),
          fetchAppearances(selectedClubId, season.id),
          fetchCompletedMatchdays(selectedClubId, season.id),
          fetchClubTournamentsForSeason(selectedClubId, season.id),
          fetchCompletedFixturesForClub(selectedClubId, season.id)
        ]);

        setPlayers(playersData);
        setMatchdays(completedMds);
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

  // Filter players by search query + tournament/match appearance
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

    // If a specific match is selected, only show players who appeared in that match's round
    if (filterMatch !== "all") {
      const fixture = completedFixtures.find(f => f.id === filterMatch);
      if (fixture) {
        const md = fixture.roundNumber;
        result = result.filter(p => {
          const pApps = appearances[p.id] || [];
          return pApps.includes(md);
        });
      }
    }

    return result;
  }, [players, searchQuery, filterMatch, completedFixtures, appearances]);

  const hasActiveFilters = searchQuery.trim() !== "" || filterTournament !== "all" || filterMatch !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterTournament("all");
    setFilterMatch("all");
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <RwsFullPageLoading text="Loading Ledger System" />
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
          <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Career Hub
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header">
          <div className="portal-page-badge">
            <i className="fa-solid fa-shirt" />
            Squad Appearances
          </div>
          <h1 className="portal-title">APPEARANCES LEDGER</h1>
          <p className="portal-subtitle">
            Monitor match-by-match squad usages, matches played, and verify player contribution records for Season {season.season_number}.
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

              {/* Admin Editor Control Section (Shortcut link for admin user) */}
              {isAdmin && (
                <div className="admin-actions-bar" style={{ borderStyle: "solid", borderColor: "rgba(59, 130, 246, 0.3)", background: "rgba(59, 130, 246, 0.05)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", flexWrap: "wrap", gap: "1rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>
                      🔑 <strong>Admin Mode:</strong> You are logged in as administrator. You can edit and revert appearances on the manager page.
                    </span>
                    <Link href="/solo-tour/admin/appearances" className="portal-btn btn-primary" style={{ padding: "6px 16px", fontSize: "0.85rem" }}>
                      <i className="fa-solid fa-user-gear" /> Go to Appearances Manager
                    </Link>
                  </div>
                </div>
              )}

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
                  <CustomSelect
                    value={filterTournament}
                    onChange={(val) => { setFilterTournament(val); setFilterMatch("all"); }}
                    options={[
                      { value: "all", label: "All Tournaments" },
                      ...tournaments.map(t => ({ value: String(t.id), label: t.name }))
                    ]}
                    menuWidth={200}
                  />
                </div>

                <div className="filter-select-group">
                  <span className="filter-label">Match</span>
                  <CustomSelect
                    value={filterMatch}
                    onChange={(val) => setFilterMatch(val)}
                    options={[
                      { value: "all", label: "All Matches" },
                      ...availableMatches.map(f => {
                        const opponent = f.homeClubId === selectedClubId ? f.awayClubName : f.homeClubName;
                        const label = `R${f.roundNumber} vs ${opponent} (${f.homeScore}-${f.awayScore})`;
                        return { value: String(f.id), label };
                      })
                    ]}
                    menuWidth={240}
                  />
                </div>

                {hasActiveFilters && (
                  <button className="filter-clear-btn" onClick={clearFilters}>
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
                    <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "2.5rem", color: "#4b5563", marginBottom: "1rem" }} />
                    <h4 style={{ marginBottom: "0.5rem" }}>No completed matches</h4>
                    <p style={{ color: "#9ca3af", maxWidth: "450px", margin: "0 auto" }}>No completed matches exist for {activeClub.name} in this season yet. Player appearances will be visible once matches are played and scores are recorded.</p>
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
                              {`M${md}`}
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
                                  <td key={md} style={{ verticalAlign: "middle" }}>
                                    <div className="md-cell-active">
                                      {played ? (
                                        <div className="md-indicator-pill">✓</div>
                                      ) : (
                                        <span className="md-indicator-none">-</span>
                                      )}
                                    </div>
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
                          <div key={player.id} className="appearance-player-card">
                            <div className="card-player-header">
                              <div className="card-player-left">
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
                                return (
                                  <div key={md} className={`card-md-chip ${played ? "played" : "missed"}`}>
                                    {played ? `M${md} ✓` : `M${md}`}
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
              Ledger Usage Instructions
            </h3>
            <p className="section-text" style={{ fontSize: "0.85rem", color: "#9ca3af", lineHeight: "1.6" }}>
              1. <strong>Select a club</strong> from the selector ribbon to load its players and appearances.<br />
              2. Review team-wise squad contribution per completed matchday. Cells displaying <strong>✓</strong> indicate the player participated in that matchday.<br />
              3. This is a public read-only viewer. Administrators can use the link above or navigate to the admin hub to manage the roster lineups.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
