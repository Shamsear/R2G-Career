"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { 
  fetchTournamentById, 
  fetchFixtures, 
  fetchTournamentStandings, 
  fetchTournamentClubs,
  fetchKnockoutRounds
} from "@/utils/solo/serverActions";
import { getRoundDisplay } from "@/utils/roundFormatter";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../../portal.css";
import "../../../../(rws)/rws/rws.css";

interface Match {
  id: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  roundNumber: number;
  groupName?: string | null;
  status: "live" | "upcoming" | "finished";
  matchEvents?: any[];
}

export default function SpecialTourFixtures() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const containerRef = useRef<HTMLDivElement>(null);
  const [tournament, setTournament] = useState<any>(null);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [tournamentClubs, setTournamentClubs] = useState<any[]>([]);
  const [knockoutRounds, setKnockoutRounds] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab selections
  const [activeTab, setActiveTab] = useState<string>("table");
  const [activeSubTab, setActiveSubTab] = useState<string>("boot");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const viewModeToggled = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      if (viewModeToggled.current) return;
      setViewMode(window.innerWidth < 992 ? "card" : "table");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fixtures filtering states
  const [activeRound, setActiveRound] = useState<number>(1);
  const [activeGroup, setActiveGroup] = useState<string>("All");

  useEffect(() => {
    async function loadData() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          return;
        }

        const [t, f, sData, clubsData, koData] = await Promise.all([
          fetchTournamentById(tourneyId),
          fetchFixtures(tourneyId),
          fetchTournamentStandings(tourneyId),
          fetchTournamentClubs(tourneyId),
          fetchKnockoutRounds(tourneyId).catch(() => [])
        ]);

        if (!t) {
          setError(`No Special Tournament details for ID ${tourneyId}`);
          return;
        }
        setTournament(t);
        setFixtures(f || []);
        setStandings(sData || []);
        setTournamentClubs(clubsData || []);
        setKnockoutRounds(koData || []);

        document.title = `${t.name} Series Portal | R2G`;

        // Determine initial active round — prefer last group-stage round (< 100) or first round
        if (f && f.length > 0) {
          const groupPlayed = f.filter((m: any) => m.homeScore !== null && m.awayScore !== null && (m.roundNumber || 0) < 100);
          const allPlayed = f.filter((m: any) => m.homeScore !== null && m.awayScore !== null);
          if (groupPlayed.length > 0) {
            setActiveRound(Math.max(...groupPlayed.map((m: any) => m.roundNumber || 1)));
          } else if (allPlayed.length > 0) {
            setActiveRound(Math.max(...allPlayed.map((m: any) => m.roundNumber || 1)));
          } else {
            setActiveRound(1);
          }
        }
      } catch (err) {
        console.error("Error loading tournament details:", err);
        setError("Failed to load tournament standings and fixtures.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tourneyId]);

  // Unique rounds list
  const roundsList = useMemo(() => {
    const rounds = new Set<number>();
    fixtures.forEach(f => {
      if (f.roundNumber) rounds.add(f.roundNumber);
    });
    return Array.from(rounds).sort((a, b) => a - b);
  }, [fixtures]);

  // Unique groups list from fixtures
  const availableGroups = useMemo(() => {
    const groups = new Set<string>();
    fixtures.forEach(f => {
      if (f.groupName) {
        groups.add(f.groupName);
      }
    });
    return Array.from(groups).sort();
  }, [fixtures]);

  // Filtered fixtures based on activeRound and activeGroup
  const filteredFixtures = useMemo(() => {
    return fixtures.filter(f => {
      if (activeGroup === "Knockout") {
        if (activeRound >= 100) {
          return f.roundNumber === activeRound;
        }
        return (f.roundNumber || 0) >= 100 || !f.groupName;
      }
      if (activeGroup === "All") {
        return f.roundNumber === activeRound;
      }
      // Specific group filter (e.g. "A", "B", "C", "D")
      if (activeRound < 100) {
        return f.roundNumber === activeRound && f.groupName === activeGroup;
      }
      return f.groupName === activeGroup;
    });
  }, [fixtures, activeRound, activeGroup]);

  // Dynamically calculate wins, draws, losses, goals for/against on client side
  const standingsWithStats = useMemo(() => {
    if (!standings || !fixtures) return [];
    
    // Build stats map
    const stats: Record<string, { wins: number; draws: number; losses: number; goals_for: number; goals_against: number }> = {};
    
    standings.forEach(row => {
      stats[row.club_id] = { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 };
    });
    
    fixtures.forEach(match => {
      // Exclude knockout fixtures (roundNumber >= 100) from group/league standings
      if ((match.roundNumber || 0) >= 100) return;
      if (match.homeScore === null || match.awayScore === null || match.match_status === 'void') return;
      
      const homeId = match.homeClubId;
      const awayId = match.awayClubId;
      const hs = Number(match.homeScore);
      const as_ = Number(match.awayScore);
      
      if (stats[homeId]) {
        stats[homeId].goals_for += hs;
        stats[homeId].goals_against += as_;
        if (hs > as_) stats[homeId].wins += 1;
        else if (hs === as_) stats[homeId].draws += 1;
        else stats[homeId].losses += 1;
      }
      if (stats[awayId]) {
        stats[awayId].goals_for += as_;
        stats[awayId].goals_against += hs;
        if (as_ > hs) stats[awayId].wins += 1;
        else if (as_ === hs) stats[awayId].draws += 1;
        else stats[awayId].losses += 1;
      }
    });
    
    return standings.map(row => {
      const s = stats[row.club_id] || { wins: 0, draws: 0, losses: 0, goals_for: 0, goals_against: 0 };
      const gd = s.goals_for - s.goals_against;
      const pts = s.wins * 3 + s.draws * 1;
      return {
        ...row,
        matches_played: s.wins + s.draws + s.losses,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        goals_for: s.goals_for,
        goals_scored: s.goals_for,
        goals_against: s.goals_against,
        goal_difference: gd,
        points: pts
      };
    });
  }, [standings, fixtures]);

  // Group standings by group name if applicable
  const groupedStandings = useMemo(() => {
    if (!standingsWithStats || standingsWithStats.length === 0) return {};
    const groups: Record<string, any[]> = {};
    standingsWithStats.forEach(row => {
      const gName = row.group_name || "A";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(row);
    });
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_scored - a.goals_scored);
      return acc;
    }, {} as Record<string, any[]>);
  }, [standingsWithStats]);

  // Dynamically compute team stats for Boot, Ball, Glove, and Defender across all tournament matches (Group + KO)
  const teamStats = useMemo(() => {
    const goalsScored: Record<string, { name: string; logo: string; manager: string; value: number }> = {};
    const goalDiff: Record<string, { name: string; logo: string; manager: string; value: number }> = {};
    const cleanSheets: Record<string, { name: string; logo: string; manager: string; value: number }> = {};
    const defensiveStats: Record<string, { name: string; logo: string; manager: string; conceded: number; matches: number; value: number }> = {};

    const registerTeam = (id: string | number, name: string, logo: string, manager: string) => {
      const sId = String(id);
      if (!goalsScored[sId]) {
        goalsScored[sId] = { name, logo: logo || "", manager: manager || "Unknown", value: 0 };
        goalDiff[sId] = { name, logo: logo || "", manager: manager || "Unknown", value: 0 };
        cleanSheets[sId] = { name, logo: logo || "", manager: manager || "Unknown", value: 0 };
        defensiveStats[sId] = { name, logo: logo || "", manager: manager || "Unknown", conceded: 0, matches: 0, value: 0 };
      }
    };

    tournamentClubs.forEach(tc => {
      registerTeam(tc.club_id, tc.name, tc.logo_path, tc.manager);
    });

    standings.forEach(row => {
      registerTeam(row.club_id, row.club_name, row.club_logo, row.manager);
    });

    fixtures.forEach(f => {
      const homeId = String(f.homeClubId);
      const awayId = String(f.awayClubId);
      registerTeam(homeId, f.homeClub || f.homeManager || "Unknown", f.homeLogo, f.homeManager || "Unknown");
      registerTeam(awayId, f.awayClub || f.awayManager || "Unknown", f.awayLogo, f.awayManager || "Unknown");

      if (f.match_status === 'void') return;
      const isFinished = f.homeScore !== null && f.homeScore !== undefined && f.awayScore !== null && f.awayScore !== undefined;
      if (isFinished) {
        const hs = Number(f.homeScore) || 0;
        const as_ = Number(f.awayScore) || 0;

        // Goals Scored (Boot)
        if (goalsScored[homeId]) goalsScored[homeId].value += hs;
        if (goalsScored[awayId]) goalsScored[awayId].value += as_;

        // Conceded and matches count
        if (defensiveStats[homeId]) {
          defensiveStats[homeId].conceded += as_;
          defensiveStats[homeId].matches += 1;
        }
        if (defensiveStats[awayId]) {
          defensiveStats[awayId].conceded += hs;
          defensiveStats[awayId].matches += 1;
        }

        // Clean Sheets (Glove)
        if (as_ === 0) {
          if (cleanSheets[homeId]) cleanSheets[homeId].value += 1;
        }
        if (hs === 0) {
          if (cleanSheets[awayId]) cleanSheets[awayId].value += 1;
        }
      }
    });

    // Compute Goal Difference (Ball) = Goals Scored - Goals Conceded
    Object.keys(goalDiff).forEach(id => {
      const gf = goalsScored[id]?.value || 0;
      const ga = defensiveStats[id]?.conceded || 0;
      goalDiff[id].value = gf - ga;
    });

    // Map defensive stats values (conceded / matches)
    Object.values(defensiveStats).forEach(ds => {
      if (ds.matches > 0) {
        ds.value = Math.round((ds.conceded / ds.matches) * 100) / 100;
      } else {
        ds.value = 0;
      }
    });

    const sortedBoot = Object.entries(goalsScored)
      .map(([id, data]) => ({ name: data.name, logo: data.logo, manager: data.manager, value: data.value }))
      .sort((a, b) => b.value - a.value);

    const sortedBall = Object.entries(goalDiff)
      .map(([id, data]) => ({ name: data.name, logo: data.logo, manager: data.manager, value: data.value }))
      .sort((a, b) => b.value - a.value);

    const sortedGlove = Object.entries(cleanSheets)
      .map(([id, data]) => ({ name: data.name, logo: data.logo, manager: data.manager, value: data.value }))
      .sort((a, b) => b.value - a.value);

    const sortedDefender = Object.values(defensiveStats)
      .map(ds => ({
        name: ds.name,
        logo: ds.logo,
        manager: ds.manager,
        conceded: ds.conceded,
        matches: ds.matches,
        value: ds.value
      }))
      .sort((a, b) => {
        if (a.matches === 0 && b.matches === 0) return 0;
        if (a.matches === 0) return 1;
        if (b.matches === 0) return -1;
        return a.value - b.value;
      });

    return { boot: sortedBoot, ball: sortedBall, glove: sortedGlove, defender: sortedDefender };
  }, [fixtures, standings, tournamentClubs]);

  const relevantRounds = useMemo(() => {
    if (activeGroup === "Knockout") {
      const ko = roundsList.filter(r => r >= 100);
      return ko.length > 0 ? ko : roundsList;
    }
    if (activeGroup !== "All") {
      const grp = roundsList.filter(r => r < 100);
      return grp.length > 0 ? grp : roundsList;
    }
    return roundsList;
  }, [roundsList, activeGroup]);

  const handleGroupChange = (groupKey: string) => {
    setActiveGroup(groupKey);
    if (groupKey === "Knockout") {
      const koRounds = roundsList.filter(r => r >= 100);
      if (koRounds.length > 0 && activeRound < 100) {
        setActiveRound(koRounds[0]);
      }
    } else if (groupKey !== "All") {
      if (activeRound >= 100) {
        const groupRounds = roundsList.filter(r => r < 100);
        if (groupRounds.length > 0) {
          setActiveRound(groupRounds[groupRounds.length - 1]);
        }
      }
    }
  };

  const handlePrevRound = () => {
    const curIdx = relevantRounds.indexOf(activeRound);
    if (curIdx > 0) {
      const prev = relevantRounds[curIdx - 1];
      setActiveRound(prev);
      if (prev >= 100 && activeGroup !== "Knockout" && activeGroup !== "All") {
        setActiveGroup("Knockout");
      } else if (prev < 100 && activeGroup === "Knockout") {
        setActiveGroup("All");
      }
    }
  };

  const handleNextRound = () => {
    const curIdx = relevantRounds.indexOf(activeRound);
    if (curIdx < relevantRounds.length - 1) {
      const next = relevantRounds[curIdx + 1];
      setActiveRound(next);
      if (next >= 100 && activeGroup !== "Knockout" && activeGroup !== "All") {
        setActiveGroup("Knockout");
      } else if (next < 100 && activeGroup === "Knockout") {
        setActiveGroup("All");
      }
    }
  };

  // Dynamic round name helper
  const getRoundName = (rNum: number) => {
    if (rNum >= 100) {
      return getRoundDisplay(rNum);
    }
    return `Round ${rNum}`;
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading series details" />
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/special-tour" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Special Tours
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Tournament Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper" ref={containerRef}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "960px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb" style={{ marginBottom: "0.5rem" }}>
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-trophy" />
            Special Tour
          </div>
          <h1 className="rws-hero-title">
            {tournament.name.toUpperCase()} PORTAL
          </h1>
          <p className="rws-hero-sub">
            Track points standings, matches calendar, score outcomes, and live tournament results.
          </p>
        </div>

        {/* Segmented Tab Bar */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "4px", gap: "4px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { key: "table", icon: "fa-solid fa-list-ol", label: "Standings" },
              { key: "fixture", icon: "fa-solid fa-calendar-days", label: "Fixtures" },
              ...(knockoutRounds.length > 0 || fixtures.some(f => (f.roundNumber || 0) >= 100) ? [{ key: "bracket", icon: "fa-solid fa-sitemap", label: "Knockout Bracket" }] : []),
              { key: "stats", icon: "fa-solid fa-chart-simple", label: "Stats" },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "0.82rem", fontWeight: activeTab === tab.key ? 700 : 500, fontFamily: "var(--font-display)",
                  background: activeTab === tab.key ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "transparent",
                  color: activeTab === tab.key ? "#fff" : "rgba(255,255,255,0.45)",
                  boxShadow: activeTab === tab.key ? "0 4px 16px rgba(168,85,247,0.3)" : "none",
                  transition: "all 0.25s ease",
                }}
              >
                <i className={tab.icon} style={{ fontSize: "0.75rem" }} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════════════ TAB 1 — STANDINGS ═══════════════════════ */}
        {activeTab === "table" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {standings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <i className="fa-solid fa-chart-bar" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.3 }} />
                No standings data available yet.
              </div>
            ) : (
              <>
                {/* View Mode Toggle Switch */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.04)", padding: "3px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <button
                      type="button"
                      onClick={() => {
                        viewModeToggled.current = true;
                        setViewMode("table");
                      }}
                      style={{
                        padding: "5px 14px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        background: viewMode === "table" ? "rgba(168,85,247,0.85)" : "transparent",
                        color: viewMode === "table" ? "#fff" : "rgba(255,255,255,0.45)",
                        transition: "all 0.2s"
                      }}
                    >
                      <i className="fa-solid fa-table" style={{ marginRight: "4px" }} /> Table
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        viewModeToggled.current = true;
                        setViewMode("card");
                      }}
                      style={{
                        padding: "5px 14px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        border: "none",
                        cursor: "pointer",
                        background: viewMode === "card" ? "rgba(168,85,247,0.85)" : "transparent",
                        color: viewMode === "card" ? "#fff" : "rgba(255,255,255,0.45)",
                        transition: "all 0.2s"
                      }}
                    >
                      <i className="fa-solid fa-grip" style={{ marginRight: "4px" }} /> Cards
                    </button>
                  </div>
                </div>

                {tournament.num_groups && tournament.num_groups > 0 ? (
                  viewMode === "card" ? (
                    /* Group Stage - Card View */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
                      {Object.entries(groupedStandings).map(([groupName, rows]) => (
                        <div key={groupName} style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "1.25rem" }}>
                          <div style={{ paddingBottom: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }} />
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>Group {groupName}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {rows.map((row, idx) => {
                              const isPodium = idx < 2;
                              const rankColor = idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : "rgba(255,255,255,0.4)";
                              const cardBorder = idx === 0 ? "1px solid rgba(251, 191, 36, 0.3)" : idx === 1 ? "1px solid rgba(226, 232, 240, 0.25)" : "1px solid rgba(255, 255, 255, 0.06)";
                              const cardBg = idx === 0 ? "linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(10, 8, 20, 0.8) 100%)" : "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(10, 8, 20, 0.8) 100%)";
                              
                              return (
                                <div key={row.club_id} style={{ background: cardBg, border: cardBorder, borderRadius: "10px", padding: "0.85rem" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                      <span style={{ fontWeight: "bold", color: rankColor, fontSize: "0.9rem" }}>#{idx + 1}</span>
                                      {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "20px", height: "20px", objectFit: "cover", borderRadius: "50%" }} />}
                                      <div>
                                        <span style={{ fontWeight: "bold", color: "#fff", fontSize: "0.82rem" }}>{row.club_name}</span>
                                        <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>{row.manager || "Unknown"}</div>
                                      </div>
                                    </div>
                                    <div style={{ textAlign: "right" }}>
                                      <span style={{ fontWeight: "800", color: "#fbbf24", fontSize: "0.95rem" }}>{row.points}</span>
                                      <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginLeft: "2px" }}>PTS</span>
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem", fontSize: "0.7rem", textAlign: "center" }}>
                                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px" }}>
                                      <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", display: "block" }}>PLAYED</span>
                                      <strong style={{ color: "#fff" }}>{row.matches_played}</strong>
                                    </div>
                                    <div style={{ background: "rgba(34, 197, 94, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                      <span style={{ fontSize: "0.58rem", color: "#86efac", display: "block" }}>W</span>
                                      <strong style={{ color: "#22c55e" }}>{row.wins}</strong>
                                    </div>
                                    <div style={{ background: "rgba(148, 163, 184, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                      <span style={{ fontSize: "0.58rem", color: "#cbd5e1", display: "block" }}>D</span>
                                      <strong style={{ color: "#cbd5e1" }}>{row.draws}</strong>
                                    </div>
                                    <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                      <span style={{ fontSize: "0.58rem", color: "#fca5a5", display: "block" }}>L</span>
                                      <strong style={{ color: "#ef4444" }}>{row.losses}</strong>
                                    </div>
                                  </div>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "0.35rem", fontSize: "0.68rem", marginTop: "0.4rem" }}>
                                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                      <span style={{ color: "rgba(255,255,255,0.4)" }}>GF:</span>
                                      <strong style={{ color: "#fff" }}>{row.goals_for}</strong>
                                    </div>
                                    <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                      <span style={{ color: "rgba(255,255,255,0.4)" }}>GA:</span>
                                      <strong style={{ color: "#fff" }}>{row.goals_against}</strong>
                                    </div>
                                    <div style={{ background: row.goal_difference > 0 ? "rgba(34, 197, 94, 0.08)" : row.goal_difference < 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                      <span style={{ color: "rgba(255,255,255,0.4)" }}>DIFF:</span>
                                      <strong style={{ color: row.goal_difference > 0 ? "#22c55e" : row.goal_difference < 0 ? "#ef4444" : "#fff" }}>
                                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Group Stage - Table View */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.25rem" }}>
                      {Object.entries(groupedStandings).map(([groupName, rows]) => (
                        <div key={groupName} style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }} />
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "#fff", textTransform: "uppercase", letterSpacing: "1px" }}>Group {groupName}</span>
                          </div>
                          <div style={{ padding: "0.5rem 0", overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "320px" }}>
                              <thead>
                                <tr style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "left", width: "30px" }}>#</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "left" }}>Club</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "30px" }}>MP</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "25px" }}>W</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "25px" }}>D</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "25px" }}>L</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "30px" }}>GF</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "30px" }}>GA</th>
                                  <th style={{ padding: "0.5rem 0.5rem", textAlign: "center", width: "35px" }}>GD</th>
                                  <th style={{ padding: "0.5rem 0.75rem", textAlign: "center", width: "35px" }}>Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row, idx) => (
                                  <tr key={row.club_id} style={{ borderTop: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                    <td style={{ padding: "0.6rem 0.75rem" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "20px", height: "20px", borderRadius: "6px", fontSize: "0.68rem", fontWeight: 700, background: idx === 0 ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)", color: idx === 0 ? "#c084fc" : "rgba(255,255,255,0.5)" }}>{idx + 1}</span>
                                    </td>
                                    <td style={{ padding: "0.6rem 0.5rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                        {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "18px", height: "18px", objectFit: "cover", borderRadius: "50%" }} />}
                                        <div>
                                          <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "90px" }}>{row.club_name}</div>
                                          <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>{row.manager || "Unknown"}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.6rem 0.5rem" }}>{row.matches_played}</td>
                                    <td style={{ textAlign: "center", color: "#22c55e", padding: "0.6rem 0.5rem" }}>{row.wins}</td>
                                    <td style={{ textAlign: "center", color: "#cbd5e1", padding: "0.6rem 0.5rem" }}>{row.draws}</td>
                                    <td style={{ textAlign: "center", color: "#ef4444", padding: "0.6rem 0.5rem" }}>{row.losses}</td>
                                    <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.6rem 0.5rem" }}>{row.goals_for}</td>
                                    <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.6rem 0.5rem" }}>{row.goals_against}</td>
                                    <td style={{ textAlign: "center", padding: "0.6rem 0.5rem", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: row.goal_difference > 0 ? "#4ade80" : row.goal_difference < 0 ? "#f87171" : "rgba(255,255,255,0.35)" }}>
                                      {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                    </td>
                                    <td style={{ textAlign: "center", padding: "0.6rem 0.75rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fbbf24", fontSize: "0.82rem" }}>{row.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  /* League Standings */
                  viewMode === "card" ? (
                    /* League - Card View */
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1.25rem", width: "100%" }}>
                      {standingsWithStats.map((row, idx) => {
                        const isPodium = idx < 3;
                        const rankColor = idx === 0 ? "#fbbf24" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#d97706" : "rgba(255,255,255,0.4)";
                        const cardBorder = idx === 0 ? "1px solid rgba(251, 191, 36, 0.3)" : idx === 1 ? "1px solid rgba(226, 232, 240, 0.25)" : idx === 2 ? "1px solid rgba(205, 127, 50, 0.25)" : "1px solid rgba(255, 255, 255, 0.06)";
                        const cardBg = idx === 0 ? "linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(10, 8, 20, 0.8) 100%)" : "linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(10, 8, 20, 0.8) 100%)";
                        
                        return (
                          <div key={row.club_id} style={{ background: cardBg, border: cardBorder, borderRadius: "12px", padding: "1rem", boxShadow: idx === 0 ? "0 4px 12px rgba(251, 191, 36, 0.05)" : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "0.5rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontWeight: "bold", color: rankColor, fontSize: "0.95rem" }}>#{idx + 1}</span>
                                {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "20px", height: "20px", objectFit: "cover", borderRadius: "50%" }} />}
                                <div>
                                  <span style={{ fontWeight: "bold", color: "#fff", fontSize: "0.85rem" }}>{row.club_name}</span>
                                  <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)" }}>{row.manager || "Unknown"}</div>
                                </div>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontWeight: "800", color: "#fbbf24", fontSize: "1rem" }}>{row.points}</span>
                                <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", marginLeft: "2px" }}>PTS</span>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem", fontSize: "0.75rem", textAlign: "center" }}>
                              <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px" }}>
                                <span style={{ fontSize: "0.58rem", color: "rgba(255,255,255,0.4)", display: "block" }}>PLAYED</span>
                                <strong style={{ color: "#fff" }}>{row.matches_played}</strong>
                              </div>
                              <div style={{ background: "rgba(34, 197, 94, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                <span style={{ fontSize: "0.58rem", color: "#86efac", display: "block" }}>W</span>
                                <strong style={{ color: "#22c55e" }}>{row.wins}</strong>
                              </div>
                              <div style={{ background: "rgba(148, 163, 184, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                <span style={{ fontSize: "0.58rem", color: "#cbd5e1", display: "block" }}>D</span>
                                <strong style={{ color: "#cbd5e1" }}>{row.draws}</strong>
                              </div>
                              <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "4px", borderRadius: "6px" }}>
                                <span style={{ fontSize: "0.58rem", color: "#fca5a5", display: "block" }}>L</span>
                                <strong style={{ color: "#ef4444" }}>{row.losses}</strong>
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: "0.35rem", fontSize: "0.7rem", marginTop: "0.4rem" }}>
                              <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)" }}>GF:</span>
                                <strong style={{ color: "#fff" }}>{row.goals_for}</strong>
                              </div>
                              <div style={{ background: "rgba(255,255,255,0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)" }}>GA:</span>
                                <strong style={{ color: "#fff" }}>{row.goals_against}</strong>
                              </div>
                              <div style={{ background: row.goal_difference > 0 ? "rgba(34, 197, 94, 0.08)" : row.goal_difference < 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.02)", padding: "4px", borderRadius: "6px", display: "flex", justifyContent: "space-between", paddingLeft: "8px", paddingRight: "8px" }}>
                                <span style={{ color: "rgba(255,255,255,0.4)" }}>DIFF:</span>
                                <strong style={{ color: row.goal_difference > 0 ? "#22c55e" : row.goal_difference < 0 ? "#ef4444" : "#fff" }}>
                                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                </strong>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* League - Table View */
                    <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <i className="fa-solid fa-list-ol" style={{ color: "#a855f7", fontSize: "0.85rem" }} />
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>League Standings</span>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "550px" }}>
                          <thead>
                            <tr style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                              <th style={{ padding: "0.75rem 1.25rem", textAlign: "left", width: "40px" }}>#</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "left" }}>Club</th>
                              {tournament?.num_groups && <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "70px" }}>Group</th>}
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "44px" }}>MP</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "36px" }}>W</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "36px" }}>D</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "36px" }}>L</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "40px" }}>GF</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "40px" }}>GA</th>
                              <th style={{ padding: "0.75rem 0.5rem", textAlign: "center", width: "44px" }}>GD</th>
                              <th style={{ padding: "0.75rem 1.25rem", textAlign: "center", width: "50px" }}>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standingsWithStats.map((row, idx) => (
                              <tr key={row.club_id} style={{ borderTop: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                <td style={{ padding: "0.7rem 1.25rem" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", fontSize: "0.72rem", fontWeight: 700, background: idx === 0 ? "rgba(168,85,247,0.15)" : idx === 1 ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.04)", color: idx === 0 ? "#c084fc" : idx === 1 ? "#60a5fa" : "rgba(255,255,255,0.5)" }}>{idx + 1}</span>
                                </td>
                                <td style={{ padding: "0.7rem 0.5rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                    {row.club_logo && <img src={row.club_logo} alt="" style={{ width: "22px", height: "22px", objectFit: "cover", borderRadius: "50%" }} />}
                                    <div>
                                      <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{row.club_name}</div>
                                      <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.35)", marginTop: "1px" }}>{row.manager || "Unknown"}</div>
                                    </div>
                                  </div>
                                </td>
                                {tournament?.num_groups && (
                                  <td style={{ textAlign: "center", fontSize: "0.72rem", fontWeight: 600, color: "#fbbf24", padding: "0.7rem 0.5rem" }}>
                                    {row.group_name ? `Grp ${row.group_name}` : "—"}
                                  </td>
                                )}
                                <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.matches_played}</td>
                                <td style={{ textAlign: "center", color: "#22c55e", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.wins}</td>
                                <td style={{ textAlign: "center", color: "#cbd5e1", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.draws}</td>
                                <td style={{ textAlign: "center", color: "#ef4444", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.losses}</td>
                                <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.goals_for}</td>
                                <td style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", padding: "0.7rem 0.5rem", fontSize: "0.82rem" }}>{row.goals_against}</td>
                                <td style={{ textAlign: "center", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: row.goal_difference > 0 ? "#4ade80" : row.goal_difference < 0 ? "#f87171" : "rgba(255,255,255,0.35)", padding: "0.7rem 0.5rem" }}>
                                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                </td>
                                <td style={{ textAlign: "center", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#fbbf24", fontSize: "0.95rem", padding: "0.7rem 1.25rem" }}>{row.points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2 — FIXTURES */}
        {activeTab === "fixture" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            
            {/* Round + Group Filter Bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px" }}>
              {/* Round Nav */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button type="button" onClick={handlePrevRound} disabled={relevantRounds.indexOf(activeRound) === 0}
                  style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: relevantRounds.indexOf(activeRound) === 0 ? 0.3 : 1, transition: "all 0.2s" }}>
                  <i className="fa-solid fa-chevron-left" style={{ fontSize: "0.65rem" }} />
                </button>
                <div style={{ padding: "0 0.75rem", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: activeRound >= 100 ? "#c084fc" : "#fff", minWidth: "120px", textAlign: "center" }}>
                  {getRoundName(activeRound)}
                </div>
                <button type="button" onClick={handleNextRound} disabled={relevantRounds.indexOf(activeRound) === relevantRounds.length - 1}
                  style={{ width: "30px", height: "30px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: relevantRounds.indexOf(activeRound) === relevantRounds.length - 1 ? 0.3 : 1, transition: "all 0.2s" }}>
                  <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.65rem" }} />
                </button>
              </div>

              {/* Group Tabs */}
              {(availableGroups.length > 0 || knockoutRounds.length > 0 || fixtures.some(f => (f.roundNumber || 0) >= 100)) && (
                <div style={{ display: "flex", gap: "3px", background: "rgba(0,0,0,0.25)", padding: "3px", borderRadius: "8px", flexWrap: "wrap" }}>
                  {[
                    { key: "All", label: "All" },
                    ...availableGroups.map(g => ({ key: g, label: `Grp ${g}` })),
                    ...(fixtures.some(f => (f.roundNumber || 0) >= 100 || !f.groupName) || knockoutRounds.length > 0 ? [{ key: "Knockout", label: "KO" }] : [])
                  ].map(g => {
                    const isSelected = (activeGroup === g.key) || (activeRound >= 100 && g.key === "Knockout" && activeGroup !== "All");
                    return (
                      <button key={g.key} type="button" onClick={() => handleGroupChange(g.key)}
                        style={{ padding: "4px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: isSelected ? 700 : 500, background: isSelected ? "rgba(168,85,247,0.85)" : "transparent", color: isSelected ? "#fff" : "rgba(255,255,255,0.45)", transition: "all 0.2s" }}>
                        {g.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Match Cards */}
            {filteredFixtures.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <i className="fa-solid fa-calendar-xmark" style={{ fontSize: "2rem", marginBottom: "1rem", display: "block", opacity: 0.3 }} />
                No matches for this selection.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {filteredFixtures.map((match) => {
                  const isFinished = match.homeScore !== null && match.awayScore !== null;
                  const homeWon = isFinished && (match.homeScore ?? 0) > (match.awayScore ?? 0);
                  const awayWon = isFinished && (match.awayScore ?? 0) > (match.homeScore ?? 0);
                  const isWalkover = match.match_status?.startsWith('wo');
                  const isKnockout = (match.roundNumber || 0) >= 100 || !match.groupName;

                  return (
                    <div key={match.id} style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: isKnockout ? "1px solid rgba(168,85,247,0.18)" : "1px solid rgba(255,255,255,0.06)", borderRadius: "14px", padding: "1rem 1.5rem", transition: "all 0.25s ease", cursor: "default" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = isKnockout ? "rgba(168,85,247,0.18)" : "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}>
                      {/* Meta row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {getRoundName(match.roundNumber)} {match.groupName ? `· Grp ${match.groupName}` : ""}
                          </span>
                          {isKnockout && (
                            <span style={{ fontSize: "0.6rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)" }}>
                              KNOCKOUT
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: "0.62rem",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: match.match_status === 'void' ? "rgba(239, 68, 68, 0.15)" : isWalkover ? "rgba(245, 158, 11, 0.15)" : isFinished ? "rgba(34, 197, 94, 0.15)" : "rgba(168,85,247,0.1)",
                          color: match.match_status === 'void' ? "#ef4444" : isWalkover ? "#f59e0b" : isFinished ? "#34d399" : "#c084fc",
                          border: match.match_status === 'void' ? "1px solid rgba(239, 68, 68, 0.3)" : isWalkover ? "1px solid rgba(245, 158, 11, 0.3)" : isFinished ? "1px solid rgba(34, 197, 94, 0.3)" : "1px solid rgba(168,85,247,0.3)"
                        }}>
                          {match.match_status === 'void' ? 'VOID' : isWalkover ? 'WALKOVER' : isFinished ? 'PLAYED' : 'UPCOMING'}
                        </span>
                      </div>
                      {/* Matchup */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {/* Home Team */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                            {match.homeLogo ? <img src={match.homeLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{match.homeClub?.slice(0,2).toUpperCase()}</span>}
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: homeWon ? 700 : 600, fontSize: "0.88rem", color: homeWon ? "#fff" : "rgba(255,255,255,0.8)" }}>{match.homeClub}</div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{match.homeManager || "Unknown"}</div>
                          </div>
                        </div>
                        {/* Score */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 1rem", borderRadius: "10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)", minWidth: "70px", justifyContent: "center" }}>
                          {!isFinished ? (
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>vs</span>
                          ) : (
                            <>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: homeWon ? "#fff" : "rgba(255,255,255,0.6)" }}>{match.homeScore}</span>
                              <span style={{ color: "rgba(255,255,255,0.15)", fontWeight: 300 }}>–</span>
                              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 800, color: awayWon ? "#fff" : "rgba(255,255,255,0.6)" }}>{match.awayScore}</span>
                            </>
                          )}
                        </div>
                        {/* Away Team */}
                        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.75rem", justifyContent: "flex-end" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: awayWon ? 700 : 600, fontSize: "0.88rem", color: awayWon ? "#fff" : "rgba(255,255,255,0.8)" }}>{match.awayClub}</div>
                            <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{match.awayManager || "Unknown"}</div>
                          </div>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                            {match.awayLogo ? <img src={match.awayLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>{match.awayClub?.slice(0,2).toUpperCase()}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3 — KNOCKOUT BRACKET */}
        {activeTab === "bracket" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {knockoutRounds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.02)", borderRadius: "16px", border: "1px solid rgba(255,255,255,0.04)" }}>
                <i className="fa-solid fa-sitemap" style={{ fontSize: "2.5rem", marginBottom: "1rem", display: "block", color: "rgba(168,85,247,0.4)" }} />
                <h3 style={{ color: "#fff", fontSize: "1.2rem", marginBottom: "0.5rem" }}>Knockout Bracket Pending</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Knockout rounds will appear here once the group stage concludes.</p>
              </div>
            ) : (
              <>
                {/* Champion Celebration Banner if Final is resolved */}
                {(() => {
                  const finalRound = knockoutRounds.find(r => r.round_name === 'FINAL' || r.round_order === 5);
                  const finalPairing = finalRound?.pairings?.[0];
                  if (!finalPairing || !finalPairing.winnerId) return null;
                  
                  const champion = finalPairing.winnerId === finalPairing.team1Id ? finalPairing.team1 : finalPairing.team2;
                  if (!champion) return null;

                  return (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(251, 191, 36, 0.12) 0%, rgba(168, 85, 247, 0.12) 100%)",
                      border: "1px solid rgba(251, 191, 36, 0.35)",
                      borderRadius: "16px",
                      padding: "1.75rem",
                      textAlign: "center",
                      marginBottom: "2rem",
                      boxShadow: "0 8px 32px rgba(251, 191, 36, 0.08)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.35rem" }}>🏆</div>
                      <div style={{ fontSize: "0.72rem", fontFamily: "var(--font-display)", fontWeight: 700, color: "#fbbf24", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                        Special Tour Champion
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.25rem 0" }}>
                        {champion.logo && (
                          <img src={champion.logo} alt="" style={{ width: "36px", height: "36px", borderRadius: "50%", objectFit: "cover", border: "2px solid #fbbf24" }} />
                        )}
                        <h2 style={{ fontSize: "1.75rem", fontWeight: 900, color: "#ffffff", margin: 0 }}>
                          {champion.name}
                        </h2>
                      </div>
                      {champion.manager && (
                        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "4px" }}>
                          Manager: <strong style={{ color: "#fff" }}>{champion.manager}</strong>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bracket Stages Grid */}
                <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))`, gap: "1.5rem", width: "100%" }}>
                  {knockoutRounds.map((round) => {
                    const roundTitle = round.round_name === 'QUARTER_FINAL' ? 'Quarter-Finals' : round.round_name === 'SEMI_FINAL' ? 'Semi-Finals' : round.round_name === 'FINAL' ? 'Grand Final' : round.round_name?.replace(/_/g, ' ');
                    const isFinal = round.round_name === 'FINAL' || round.round_order === 5;

                    return (
                      <div key={round.id} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <div style={{
                          background: isFinal ? "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(168,85,247,0.15) 100%)" : "rgba(255,255,255,0.03)",
                          border: isFinal ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: "10px",
                          padding: "0.6rem 1rem",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.85rem", color: isFinal ? "#fbbf24" : "#fff", letterSpacing: "1px", textTransform: "uppercase" }}>
                            {roundTitle}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontFamily: "var(--font-mono)" }}>
                            {round.status || "COMPLETED"}
                          </span>
                        </div>

                        {/* Pairings in this round */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          {(round.pairings || []).map((pairing: any, pIdx: number) => {
                            const match = fixtures.find(f => f.id === pairing.leg1MatchId);
                            const hs = match?.homeScore;
                            const as_ = match?.awayScore;
                            const isPlayed = hs !== null && hs !== undefined && as_ !== null && as_ !== undefined;
                            const isWo = match?.match_status?.startsWith('wo');

                            const team1Name = pairing.team1?.name || match?.homeClub || pairing.team1Placeholder || "TBD";
                            const team1Logo = pairing.team1?.logo || match?.homeLogo || "";
                            const team1Manager = pairing.team1?.manager || match?.homeManager || "";
                            const team1Won = pairing.winnerId && pairing.winnerId === pairing.team1Id;

                            const team2Name = pairing.team2?.name || match?.awayClub || pairing.team2Placeholder || "TBD";
                            const team2Logo = pairing.team2?.logo || match?.awayLogo || "";
                            const team2Manager = pairing.team2?.manager || match?.awayManager || "";
                            const team2Won = pairing.winnerId && pairing.winnerId === pairing.team2Id;

                            return (
                              <div key={pairing.id || pIdx} style={{
                                background: isFinal ? "linear-gradient(135deg, rgba(251,191,36,0.03) 0%, rgba(10,8,20,0.8) 100%)" : "rgba(255,255,255,0.02)",
                                backdropFilter: "blur(12px)",
                                border: isFinal ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(255,255,255,0.06)",
                                borderRadius: "12px",
                                padding: "0.85rem",
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem"
                              }}>
                                {/* Match Header */}
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.4rem" }}>
                                  <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                                    Match {pIdx + 1}
                                  </span>
                                  {isWo ? (
                                    <span style={{ fontSize: "0.6rem", color: "#f59e0b", background: "rgba(245,158,11,0.15)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                      WALKOVER
                                    </span>
                                  ) : isPlayed ? (
                                    <span style={{ fontSize: "0.6rem", color: "#34d399", background: "rgba(16,185,129,0.15)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                      FINAL SCORE
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: "0.6rem", color: "#c084fc", background: "rgba(168,85,247,0.1)", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                      SCHEDULED
                                    </span>
                                  )}
                                </div>

                                {/* Team 1 row */}
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  background: team1Won ? "rgba(34, 197, 94, 0.08)" : "transparent",
                                  border: team1Won ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid transparent"
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                                    {team1Logo ? (
                                      <img src={team1Logo} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                                    ) : (
                                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff" }}>
                                        {team1Name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ overflow: "hidden" }}>
                                      <div style={{ fontWeight: team1Won ? 700 : 500, color: team1Won ? "#fff" : "rgba(255,255,255,0.8)", fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {team1Name} {team1Won && <i className="fa-solid fa-crown" style={{ color: "#fbbf24", fontSize: "0.7rem", marginLeft: "4px" }} />}
                                      </div>
                                      {team1Manager && team1Manager !== team1Name && (
                                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>{team1Manager}</div>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: team1Won ? "#34d399" : isPlayed ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                                    {isPlayed ? hs : "-"}
                                  </span>
                                </div>

                                {/* Team 2 row */}
                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  background: team2Won ? "rgba(34, 197, 94, 0.08)" : "transparent",
                                  border: team2Won ? "1px solid rgba(34, 197, 94, 0.2)" : "1px solid transparent"
                                }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                                    {team2Logo ? (
                                      <img src={team2Logo} alt="" style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                                    ) : (
                                      <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#fff" }}>
                                        {team2Name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div style={{ overflow: "hidden" }}>
                                      <div style={{ fontWeight: team2Won ? 700 : 500, color: team2Won ? "#fff" : "rgba(255,255,255,0.8)", fontSize: "0.82rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {team2Name} {team2Won && <i className="fa-solid fa-crown" style={{ color: "#fbbf24", fontSize: "0.7rem", marginLeft: "4px" }} />}
                                      </div>
                                      {team2Manager && team2Manager !== team2Name && (
                                        <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.35)" }}>{team2Manager}</div>
                                      )}
                                    </div>
                                  </div>
                                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "0.95rem", color: team2Won ? "#34d399" : isPlayed ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                                    {isPlayed ? as_ : "-"}
                                  </span>
                                </div>
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
        )}

        {/* TAB 3 — STATS */}
        {activeTab === "stats" && (
          <div style={{ animation: "rwsFadeUp 0.4s ease-out both", width: "100%" }}>
            {/* Sub-Tab Pills */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "inline-flex", gap: "4px", background: "rgba(0,0,0,0.25)", padding: "3px", borderRadius: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { key: "boot", icon: "fa-solid fa-futbol", label: "Golden Boot", color: "#fbbf24" },
                  { key: "ball", icon: "fa-solid fa-award", label: "Golden Ball", color: "#38bdf8" },
                  { key: "glove", icon: "fa-solid fa-shield-halved", label: "Golden Glove", color: "#c084fc" },
                  { key: "defender", icon: "fa-solid fa-user-shield", label: "Best Defender", color: "#10b981" },
                ].map(st => (
                  <button key={st.key} type="button" onClick={() => setActiveSubTab(st.key)}
                    style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: activeSubTab === st.key ? 700 : 500, background: activeSubTab === st.key ? "rgba(255,255,255,0.08)" : "transparent", color: activeSubTab === st.key ? "#fff" : "rgba(255,255,255,0.4)", transition: "all 0.2s" }}>
                    <i className={st.icon} style={{ fontSize: "0.7rem", color: activeSubTab === st.key ? st.color : "rgba(255,255,255,0.25)" }} /> {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Leaderboard Cards */}
            {(() => {
              const config: Record<string, { data: typeof teamStats.boot; color: string; unit: string; icon: string; title: string }> = {
                boot: { data: teamStats.boot, color: "#fbbf24", unit: "Goals", icon: "fa-solid fa-futbol", title: "Top Scorers" },
                ball: { data: teamStats.ball, color: "#38bdf8", unit: "GD", icon: "fa-solid fa-award", title: "Best Goal Difference" },
                glove: { data: teamStats.glove, color: "#c084fc", unit: "Clean Sheets", icon: "fa-solid fa-shield-halved", title: "Most Clean Sheets" },
                defender: { data: teamStats.defender, color: "#10b981", unit: "GA/Match", icon: "fa-solid fa-user-shield", title: "Best Defender (Lowest GA/Match)" },
              };
              const c = config[activeSubTab] || config.boot;
              return (
                <div style={{ background: "rgba(255,255,255,0.02)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <i className={c.icon} style={{ color: c.color, fontSize: "0.9rem" }} />
                    <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{c.title}</span>
                  </div>
                  {c.data.length === 0 ? (
                    <div style={{ padding: "3rem 2rem", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "0.82rem" }}>No data recorded yet.</div>
                  ) : (
                    <div style={{ padding: "0.5rem 0" }}>
                      {c.data.map((s, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.6rem 1.5rem", borderTop: idx > 0 ? "1px solid rgba(255,255,255,0.03)" : "none", transition: "background 0.2s" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 700, background: idx === 0 ? `${c.color}22` : "rgba(255,255,255,0.04)", color: idx === 0 ? c.color : "rgba(255,255,255,0.4)" }}>{idx + 1}</span>
                            {s.logo && <img src={s.logo} alt="" style={{ width: "20px", height: "20px", objectFit: "cover", borderRadius: "50%" }} />}
                            <div>
                              <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{s.name}</span>
                              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", marginTop: "1px" }}>{s.manager}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: idx === 0 ? c.color : "#fff" }}>
                              {activeSubTab === "ball" && s.value > 0 ? `+${s.value}` : s.value}
                            </span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "rgba(255,255,255,0.3)", fontWeight: 500 }}>{c.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>
    </div>
  );
}
