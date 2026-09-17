"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  fetchPredictionLeaderboard,
  LeaderboardEntry,
  WeeklyLeaderboard,
  ScoreMatrixEntry,
  PredictionDay,
  PredictionSeason,
} from "@/utils/solo/predictionServerActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../portal.css";
import "../../../(rws)/rws/rws.css";

const SPORTS_ICONS: Record<string, string> = {
  football: "⚽",
  cricket: "🏏",
  basketball: "🏀",
  tennis: "🎾",
  "formula 1": "🏎️",
  "boxing / mma": "🥊",
  boxing: "🥊",
  mma: "🥊",
  esports: "🎮",
  other: "🎯",
};

export default function PredictionSeasonHub() {
  const params = useParams();
  const seasonParam = params.seasonId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data from backend
  const [season, setSeason] = useState<PredictionSeason | null>(null);
  const [days, setDays] = useState<PredictionDay[]>([]);
  const [overallStandings, setOverallStandings] = useState<LeaderboardEntry[]>([]);
  const [weeklyStandings, setWeeklyStandings] = useState<WeeklyLeaderboard[]>([]);
  const [matrixEntries, setMatrixEntries] = useState<ScoreMatrixEntry[]>([]);

  // Active View Tabs
  const [activeTab, setActiveTab] = useState<"standings" | "fixtures" | "weekly" | "matrix" | "motw">("standings");
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Share Modal
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    async function loadData() {
      try {
        const seasonId = parseInt(seasonParam, 10);
        if (isNaN(seasonId)) {
          setError("Invalid Season ID");
          return;
        }

        const data = await fetchPredictionLeaderboard(seasonId);
        if (!data || !data.season) {
          setError("Prediction season not found.");
          return;
        }

        setSeason(data.season);
        setDays(data.days);
        setOverallStandings(data.overallStandings || []);
        setWeeklyStandings(data.weeklyStandings || []);
        setMatrixEntries(data.matrixEntries || []);

        document.title = `${data.season.name} | Standings & Real Matches`;
      } catch (err: any) {
        console.error(err);
        setError("Failed to load prediction standings.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [seasonParam]);

  // Current active day and week
  const currentActiveDayNum = season?.current_day || 1;
  const currentDayObj = useMemo(() => {
    return days.find((d) => d.day_number === currentActiveDayNum) || days[0] || null;
  }, [days, currentActiveDayNum]);

  const currentActiveWeek = useMemo(() => {
    const done = season?.completed_days || 0;
    return Math.min(6, Math.max(1, Math.ceil((done + 1) / 6)));
  }, [season]);

  // Filtered Overall Standings
  const filteredOverall = useMemo(() => {
    if (!searchQuery.trim()) return overallStandings;
    const q = searchQuery.toLowerCase();
    return overallStandings.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.r2g_id && m.r2g_id.toLowerCase().includes(q))
    );
  }, [overallStandings, searchQuery]);

  // Filtered Weekly Standings
  const currentWeekData = useMemo(() => {
    return weeklyStandings.find((w) => w.week_number === selectedWeekNum) || null;
  }, [weeklyStandings, selectedWeekNum]);

  const filteredWeeklyMembers = useMemo(() => {
    if (!currentWeekData) return [];
    if (!searchQuery.trim()) return currentWeekData.standings;
    const q = searchQuery.toLowerCase();
    return currentWeekData.standings.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.r2g_id && m.r2g_id.toLowerCase().includes(q))
    );
  }, [currentWeekData, searchQuery]);

  // Filtered Matrix Entries
  const filteredMatrix = useMemo(() => {
    if (!searchQuery.trim()) return matrixEntries;
    const q = searchQuery.toLowerCase();
    return matrixEntries.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.r2g_id && m.r2g_id.toLowerCase().includes(q))
    );
  }, [matrixEntries, searchQuery]);

  // Generate WhatsApp Share Text
  const generateWhatsAppText = () => {
    if (!season) return "";
    let text = `❇️ *${season.name.toUpperCase()}*
`;
    text += `📊 *STANDINGS AFTER DAY ${season.completed_days || 0} OF 36 (WEEK ${currentActiveWeek})*
`;

    if (currentDayObj && currentDayObj.match_name) {
      const icon = SPORTS_ICONS[(currentDayObj.sport || "").toLowerCase()] || "🏆";
      text += `
${icon} *TODAY'S MATCH (Day ${currentDayObj.day_number})*: ${currentDayObj.match_name}`;
      if (currentDayObj.match_result) text += ` (${currentDayObj.match_result})`;
      text += `
`;
    }

    text += `
`;
    const displayStandings = overallStandings.slice(0, 15);
    displayStandings.forEach((m) => {
      const medal = m.rank === 1 ? "👑" : m.rank === 2 ? "🥈" : m.rank === 3 ? "🥉" : `${m.rank}.`;
      text += `${medal} *${m.name}* (${m.r2g_id || `ID:${m.member_id}`}) — *${m.total_points} pts*
`;
    });

    if (overallStandings.length > 15) {
      text += `... and ${overallStandings.length - 15} more members
`;
    }

    const activeWeekObj = weeklyStandings.find((w) => w.week_number === currentActiveWeek);
    if (activeWeekObj && activeWeekObj.motw) {
      text += `
🌟 *WEEK ${currentActiveWeek} MOTW*: ${activeWeekObj.motw.name} (${activeWeekObj.motw.points} pts)
`;
    }

    text += `
🌐 *Full Leaderboard & 36-Day Matrix*: ${typeof window !== "undefined" ? window.location.href : ""}`;
    return text;
  };

  const handleCopyShare = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleWhatsAppDirect = () => {
    const text = encodeURIComponent(generateWhatsAppText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  if (loading) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <RwsFullPageLoading text="Loading Master of Prediction Standings..." />
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="portal-root-wrapper" style={{ minHeight: "100vh", padding: "4rem 1rem" }}>
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/master-of-prediction" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Seasons
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Season Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((season.completed_days || 0) / 36) * 100);

  const TABS = [
    { key: "standings", icon: "fa-solid fa-list-ol", label: "Standings" },
    { key: "fixtures", icon: "fa-solid fa-futbol", label: "Real Matches" },
    { key: "weekly", icon: "fa-solid fa-calendar-days", label: "Weekly" },
    { key: "matrix", icon: "fa-solid fa-table-cells", label: "36-Day Matrix" },
    { key: "motw", icon: "fa-solid fa-medal", label: "MOTW Honours" },
  ];

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh", paddingBottom: "4rem" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" style={{ background: "radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, transparent 70%)" }} />
      <div className="portal-glow-orb-2" style={{ background: "radial-gradient(circle, rgba(234, 179, 8, 0.12) 0%, transparent 70%)" }} />

      <div className="portal-container" style={{ maxWidth: "1100px", width: "100%", padding: "1rem 1rem 2.5rem", gap: "0.85rem", alignItems: "stretch" }}>
        
        {/* Navigation Breadcrumb Bar */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}>
          <Link href="/master-of-prediction" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Seasons
          </Link>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowShareModal(true)}
              className="portal-btn btn-secondary back-link-btn"
              style={{
                borderColor: "rgba(37, 211, 102, 0.35)",
                color: "#25d366",
                background: "rgba(37, 211, 102, 0.08)",
                fontSize: "0.8rem",
                padding: "6px 14px",
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ marginRight: "6px" }} />
              Share Table
            </button>

            <Link
              href="/solo-tour/admin/prediction"
              className="portal-btn btn-secondary back-link-btn"
              style={{
                borderColor: "rgba(16, 185, 129, 0.25)",
                color: "#10b981",
                background: "rgba(16, 185, 129, 0.06)",
                fontSize: "0.8rem",
                padding: "6px 14px",
              }}
            >
              <i className="fa-solid fa-user-gear" style={{ marginRight: "6px" }} />
              Admin Console
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ padding: "0.25rem 0 0.5rem" }}>
          <div className="portal-page-badge" style={{ marginBottom: "0.4rem" }}>
            <i className="fa-solid fa-crown" />
            Season 0{season.season_number} // Real Match Predictions
          </div>
          <h1 className="rws-hero-title" style={{ fontSize: "2rem", margin: 0 }}>
            {season.name.toUpperCase()}
          </h1>
          <p className="rws-hero-sub" style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
            Real-world sports fixtures (Football, Cricket, etc.) across 36 Days and 6 Weeks.
          </p>
        </div>

        {/* Campaign Progress Ribbon */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "12px",
            padding: "0.65rem 1.25rem",
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff", fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {season.total_days || 36} Days • {season.total_weeks || 6} Weeks Campaign
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)" }}>
              {season.completed_days || 0} / {season.total_days || 36} Days Completed ({progressPct}%)
            </span>
            <div style={{ width: "100px", height: "5px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #a855f7, #c084fc)",
                  borderRadius: "10px",
                }}
              />
            </div>
          </div>
        </div>

        {/* Featured Latest / Active Real Match Card */}
        {currentDayObj && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(56, 189, 248, 0.08), rgba(168, 85, 247, 0.05))",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: "rgba(56, 189, 248, 0.15)",
                  border: "1.5px solid rgba(56, 189, 248, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.6rem",
                  flexShrink: 0,
                }}
              >
                {SPORTS_ICONS[(currentDayObj.sport || "").toLowerCase()] || "🏆"}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.7rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.75px" }}>
                    {currentDayObj.sport || "Sports"} • DAY {currentDayObj.day_number}
                  </span>
                  {currentDayObj.is_completed ? (
                    <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(34, 197, 94, 0.15)", color: "#86efac", fontWeight: 700 }}>
                      Completed
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "4px", background: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontWeight: 700 }}>
                      Live / Open
                    </span>
                  )}
                </div>

                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "#fff", margin: "2px 0 0 0" }}>
                  {currentDayObj.match_name || `Day ${currentDayObj.day_number} Matchday`}
                </h3>

                {currentDayObj.match_date && (
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>
                    <i className="fa-regular fa-calendar" style={{ marginRight: "4px" }} />
                    {currentDayObj.match_date}
                  </div>
                )}
              </div>
            </div>

            {currentDayObj.match_result && (
              <div style={{ textAlign: "right", background: "rgba(0,0,0,0.3)", padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>Result</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#86efac" }}>
                  {currentDayObj.match_result}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════ SEGMENTED TAB BAR ═══════════════════ */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0.25rem 0 0 0",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              padding: "4px",
              gap: "4px",
              overflowX: "auto",
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 16px",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 500,
                    fontFamily: "var(--font-display)",
                    background: isActive ? "linear-gradient(135deg, #a855f7, #7c3aed)" : "transparent",
                    color: isActive ? "#fff" : "rgba(255, 255, 255, 0.45)",
                    boxShadow: isActive ? "0 4px 16px rgba(168, 85, 247, 0.3)" : "none",
                    transition: "all 0.25s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <i className={tab.icon} style={{ fontSize: "0.75rem" }} /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar for Table Tabs */}
        {activeTab !== "motw" && activeTab !== "fixtures" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
              margin: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a855f7" }} />
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "#fff",
                  textTransform: "uppercase",
                  letterSpacing: "0.75px",
                }}
              >
                {activeTab === "standings"
                  ? "Overall Standings"
                  : activeTab === "weekly"
                  ? `Week ${selectedWeekNum} Standings`
                  : "36-Day Score Matrix"}
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "rgba(255, 255, 255, 0.4)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  padding: "2px 8px",
                  borderRadius: "6px",
                }}
              >
                {activeTab === "standings"
                  ? `${filteredOverall.length} Members`
                  : activeTab === "weekly"
                  ? `${filteredWeeklyMembers.length} Members`
                  : `${filteredMatrix.length} Members`}
              </span>
            </div>

            <div style={{ position: "relative", width: "100%", maxWidth: "280px" }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255, 255, 255, 0.35)",
                  fontSize: "0.8rem",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search member..."
                style={{
                  width: "100%",
                  padding: "7px 30px 7px 32px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.82rem",
                  outline: "none",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  type="button"
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "rgba(255, 255, 255, 0.4)",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                  }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════ TAB 1 — STANDINGS ═══════════════════════ */}
        {activeTab === "standings" && (
          <div style={{ animation: "rwsFadeUp 0.3s ease-out both", width: "100%" }}>
            {filteredOverall.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem 1.5rem",
                  color: "rgba(255, 255, 255, 0.35)",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "14px",
                  border: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <i className="fa-solid fa-chart-bar" style={{ fontSize: "1.75rem", marginBottom: "0.75rem", display: "block", opacity: 0.3 }} />
                No prediction standings data found.
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "14px",
                  overflow: "hidden",
                }}
              >
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "650px" }}>
                    <thead>
                      <tr
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                          color: "rgba(255, 255, 255, 0.35)",
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.75px",
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        <th style={{ padding: "0.65rem 0.85rem", textAlign: "left", width: "45px" }}>Pos</th>
                        <th style={{ padding: "0.65rem 0.85rem", textAlign: "left" }}>Participant Manager</th>
                        <th style={{ padding: "0.65rem 0.65rem", textAlign: "center", width: "95px" }}>Days Played</th>
                        <th style={{ padding: "0.65rem 0.65rem", textAlign: "center", width: "85px" }}>Avg / Day</th>
                        <th style={{ padding: "0.65rem 0.65rem", textAlign: "center", width: "75px" }}>Best Day</th>
                        <th style={{ padding: "0.65rem 0.65rem", textAlign: "center", width: "110px" }}>Form</th>
                        <th style={{ padding: "0.65rem 1rem", textAlign: "right", width: "85px" }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOverall.map((row) => {
                        const isRank1 = row.rank === 1 && row.total_points > 0;
                        const isRank2 = row.rank === 2 && row.total_points > 0;
                        const isRank3 = row.rank === 3 && row.total_points > 0;
                        const rankColor = isRank1 ? "#eab308" : isRank2 ? "#cbd5e1" : isRank3 ? "#cd7f32" : "rgba(255,255,255,0.4)";

                        return (
                          <tr
                            key={row.member_id}
                            style={{
                              borderTop: "1px solid rgba(255, 255, 255, 0.03)",
                              background: isRank1 ? "rgba(234, 179, 8, 0.04)" : "transparent",
                              transition: "background 0.2s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = isRank1 ? "rgba(234, 179, 8, 0.04)" : "transparent")
                            }
                          >
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "22px",
                                  height: "22px",
                                  borderRadius: "5px",
                                  fontSize: "0.7rem",
                                  fontWeight: 800,
                                  background: isRank1
                                    ? "rgba(234, 179, 8, 0.15)"
                                    : isRank2
                                    ? "rgba(148, 163, 184, 0.12)"
                                    : isRank3
                                    ? "rgba(217, 119, 6, 0.12)"
                                    : "rgba(255, 255, 255, 0.04)",
                                  color: rankColor,
                                }}
                              >
                                {row.rank}
                              </span>
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                                <div
                                  style={{
                                    width: "26px",
                                    height: "26px",
                                    borderRadius: "50%",
                                    background: "rgba(168, 85, 247, 0.15)",
                                    border: isRank1 ? "1.5px solid #eab308" : "1px solid rgba(255, 255, 255, 0.1)",
                                    overflow: "hidden",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  {row.photo ? (
                                    <img
                                      src={row.photo}
                                      alt={row.name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      onError={(e) => {
                                        (e.target as any).style.display = "none";
                                      }}
                                    />
                                  ) : (
                                    <i className="fa-solid fa-user" style={{ color: "#c084fc", fontSize: "0.7rem" }} />
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.82rem" }}>
                                    {row.name}
                                  </div>
                                  {row.r2g_id && (
                                    <div style={{ fontSize: "0.65rem", color: "#c084fc", fontWeight: 600 }}>
                                      {row.r2g_id}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.65rem", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.78rem" }}>
                              {row.days_played} / 36
                            </td>

                            <td style={{ padding: "0.6rem 0.65rem", textAlign: "center", color: "#fff", fontWeight: 600, fontSize: "0.78rem" }}>
                              {row.avg_points}
                            </td>

                            <td style={{ padding: "0.6rem 0.65rem", textAlign: "center", color: row.max_day_points > 0 ? "#86efac" : "rgba(255, 255, 255, 0.3)", fontWeight: 700, fontSize: "0.78rem" }}>
                              {row.max_day_points > 0 ? `+${row.max_day_points}` : "-"}
                            </td>

                            <td style={{ padding: "0.6rem 0.65rem", textAlign: "center" }}>
                              <div style={{ display: "flex", justifyContent: "center", gap: "3px" }}>
                                {row.recent_form && row.recent_form.length > 0 ? (
                                  row.recent_form.map((f, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        padding: "1px 4px",
                                        borderRadius: "3px",
                                        background: f > 0 ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                        color: f > 0 ? "#86efac" : "rgba(255, 255, 255, 0.3)",
                                        fontSize: "0.65rem",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {f}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "rgba(255, 255, 255, 0.25)", fontSize: "0.68rem" }}>-</span>
                                )}
                              </div>
                            </td>

                            <td
                              style={{
                                padding: "0.6rem 1rem",
                                textAlign: "right",
                                fontWeight: 800,
                                fontSize: "0.95rem",
                                color: isRank1 ? "#eab308" : "#fff",
                              }}
                            >
                              {row.total_points}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════ TAB 2 — REAL MATCHES FIXTURES ═══════════════════════ */}
        {activeTab === "fixtures" && (
          <div style={{ animation: "rwsFadeUp 0.3s ease-out both", width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Week Filter Pills */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "3px",
                  gap: "3px",
                  overflowX: "auto",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((w) => {
                  const isSel = selectedWeekNum === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeekNum(w)}
                      style={{
                        padding: "5px 14px",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: isSel ? 700 : 500,
                        fontFamily: "var(--font-display)",
                        background: isSel ? "linear-gradient(135deg, #38bdf8, #0284c7)" : "transparent",
                        color: isSel ? "#fff" : "rgba(255, 255, 255, 0.45)",
                        boxShadow: isSel ? "0 4px 12px rgba(56, 189, 248, 0.25)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      Week {w}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fixture Cards Grid for Selected Week */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.85rem" }}>
              {days
                .filter((d) => d.week_number === selectedWeekNum)
                .map((d) => {
                  const sportIcon = SPORTS_ICONS[(d.sport || "").toLowerCase()] || "🏆";
                  return (
                    <div
                      key={d.id || d.day_number}
                      style={{
                        background: "rgba(255, 255, 255, 0.02)",
                        border: d.is_completed ? "1px solid rgba(34, 197, 94, 0.25)" : "1px solid rgba(255, 255, 255, 0.06)",
                        borderRadius: "12px",
                        padding: "1rem",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "1.2rem" }}>{sportIcon}</span>
                          <div>
                            <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>
                              {d.sport || "Sport"} • Day {d.day_number}
                            </span>
                            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", margin: "2px 0 0 0" }}>
                              {d.match_name || `Round ${d.day_number}`}
                            </h4>
                          </div>
                        </div>

                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "2px 7px",
                            borderRadius: "4px",
                            background: d.is_completed ? "rgba(34, 197, 94, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: d.is_completed ? "#86efac" : "#fbbf24",
                            fontWeight: 700,
                          }}
                        >
                          {d.is_completed ? "Completed" : "Scheduled"}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "0.5rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>
                          {d.match_date ? d.match_date : `Week ${d.week_number}`}
                        </span>

                        {d.match_result ? (
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#86efac" }}>
                            {d.match_result}
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.3)" }}>
                            -
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ═══════════════════════ TAB 3 — WEEKLY ═══════════════════════ */}
        {activeTab === "weekly" && (
          <div style={{ animation: "rwsFadeUp 0.3s ease-out both", width: "100%", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ display: "flex", justifyContent: "center", margin: 0 }}>
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "10px",
                  padding: "3px",
                  gap: "3px",
                  overflowX: "auto",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((w) => {
                  const isSel = selectedWeekNum === w;
                  const weekObj = weeklyStandings.find((ws) => ws.week_number === w);

                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setSelectedWeekNum(w)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: isSel ? 700 : 500,
                        fontFamily: "var(--font-display)",
                        background: isSel ? "linear-gradient(135deg, #38bdf8, #0284c7)" : "transparent",
                        color: isSel ? "#fff" : "rgba(255, 255, 255, 0.45)",
                        boxShadow: isSel ? "0 4px 12px rgba(56, 189, 248, 0.25)" : "none",
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Week {w} {weekObj?.is_completed && <i className="fa-solid fa-check" style={{ marginLeft: "4px", fontSize: "0.65rem" }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Week MOTW Feature Card */}
            {currentWeekData?.motw && currentWeekData.motw.points > 0 && (
              <div
                style={{
                  background: "linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(168, 85, 247, 0.05))",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(234, 179, 8, 0.35)",
                  borderRadius: "12px",
                  padding: "0.85rem 1.25rem",
                  margin: 0,
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <i className="fa-solid fa-medal" style={{ fontSize: "1.4rem", color: "#eab308" }} />
                  <div>
                    <span style={{ fontSize: "0.65rem", fontWeight: 800, color: "#eab308", textTransform: "uppercase", letterSpacing: "1px" }}>
                      👑 WEEK {selectedWeekNum} MOTW (Top Scorer)
                    </span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", margin: "1px 0 0 0" }}>
                      {currentWeekData.motw.name}
                    </h3>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)" }}>Week {selectedWeekNum} Points</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#eab308" }}>
                    {currentWeekData.motw.points} pts
                  </div>
                </div>
              </div>
            )}

            {/* Week Standings Table */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: "500px" }}>
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                        color: "rgba(255, 255, 255, 0.35)",
                        fontSize: "0.68rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.75px",
                        fontFamily: "var(--font-display)",
                      }}
                    >
                      <th style={{ padding: "0.65rem 0.85rem", textAlign: "left", width: "45px" }}>Pos</th>
                      <th style={{ padding: "0.65rem 0.85rem", textAlign: "left" }}>Participant Manager</th>
                      <th style={{ padding: "0.65rem 0.65rem", textAlign: "center", width: "110px" }}>Days Scored</th>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "right", width: "95px" }}>Week Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWeeklyMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "2.5rem", textAlign: "center", color: "rgba(255, 255, 255, 0.35)" }}>
                          No points recorded yet for Week {selectedWeekNum}.
                        </td>
                      </tr>
                    ) : (
                      filteredWeeklyMembers.map((row) => (
                        <tr
                          key={row.member_id}
                          style={{
                            borderTop: "1px solid rgba(255, 255, 255, 0.03)",
                            background: row.rank === 1 && row.points > 0 ? "rgba(234, 179, 8, 0.04)" : "transparent",
                            transition: "background 0.2s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)")}
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              row.rank === 1 && row.points > 0 ? "rgba(234, 179, 8, 0.04)" : "transparent")
                          }
                        >
                          <td style={{ padding: "0.6rem 0.85rem" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "22px",
                                height: "22px",
                                borderRadius: "5px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: row.rank === 1 && row.points > 0 ? "rgba(234, 179, 8, 0.15)" : "rgba(255, 255, 255, 0.04)",
                                color: row.rank === 1 && row.points > 0 ? "#eab308" : "rgba(255, 255, 255, 0.4)",
                              }}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td style={{ padding: "0.6rem 0.85rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.82rem" }}>{row.name}</span>
                              {row.r2g_id && (
                                <span style={{ fontSize: "0.65rem", color: "#c084fc", fontWeight: 600 }}>
                                  ({row.r2g_id})
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "0.6rem 0.65rem", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.78rem" }}>
                            {row.days_played} / 6
                          </td>
                          <td
                            style={{
                              padding: "0.6rem 1rem",
                              textAlign: "right",
                              fontWeight: 800,
                              fontSize: "0.95rem",
                              color: row.rank === 1 && row.points > 0 ? "#eab308" : "#fff",
                            }}
                          >
                            {row.points}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ TAB 4 — 36-DAY FULL MATRIX ═══════════════════════ */}
        {activeTab === "matrix" && (
          <div style={{ animation: "rwsFadeUp 0.3s ease-out both", width: "100%" }}>
            <div
              style={{
                background: "rgba(255, 255, 255, 0.02)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: "14px",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto", maxWidth: "100%" }}>
                <table style={{ borderCollapse: "collapse", textAlign: "center", fontSize: "0.78rem", width: "max-content" }}>
                  <thead>
                    {/* Super Header: Weeks 1 to 6 */}
                    <tr style={{ background: "rgba(0, 0, 0, 0.5)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <th
                        style={{
                          padding: "8px 12px",
                          position: "sticky",
                          left: 0,
                          background: "#0b0f19",
                          zIndex: 3,
                          textAlign: "left",
                          minWidth: "150px",
                          fontFamily: "var(--font-display)",
                          fontSize: "0.7rem",
                          color: "rgba(255,255,255,0.5)",
                          textTransform: "uppercase",
                        }}
                      >
                        Member
                      </th>
                      {[1, 2, 3, 4, 5, 6].map((w) => (
                        <th
                          key={w}
                          colSpan={6}
                          style={{
                            padding: "6px",
                            borderLeft: "1.5px solid rgba(255, 255, 255, 0.12)",
                            color: "#38bdf8",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            textTransform: "uppercase",
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          Week {w} (Days {(w - 1) * 6 + 1}–{w * 6})
                        </th>
                      ))}
                      <th
                        style={{
                          padding: "8px 14px",
                          position: "sticky",
                          right: 0,
                          background: "#0b0f19",
                          zIndex: 3,
                          color: "#eab308",
                          fontWeight: 800,
                          borderLeft: "2px solid rgba(255, 255, 255, 0.15)",
                          fontFamily: "var(--font-display)",
                          fontSize: "0.72rem",
                        }}
                      >
                        Total
                      </th>
                    </tr>

                    {/* Sub Header: Days 1 to 36 with Match details */}
                    <tr style={{ background: "rgba(0, 0, 0, 0.3)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)", color: "rgba(255, 255, 255, 0.35)", fontSize: "0.65rem" }}>
                      <th style={{ padding: "5px 12px", position: "sticky", left: 0, background: "#0b0f19", zIndex: 3, textAlign: "left" }}>
                        Name (ID)
                      </th>
                      {Array.from({ length: 36 }, (_, i) => i + 1).map((d) => {
                        const dayObj = days.find((day) => day.day_number === d);
                        return (
                          <th
                            key={d}
                            style={{
                              padding: "5px 6px",
                              minWidth: "32px",
                              borderLeft: d % 6 === 1 ? "1.5px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0.03)",
                            }}
                            title={dayObj?.match_name ? `Day ${d}: [${dayObj.sport || 'Match'}] ${dayObj.match_name}` : `Day ${d}`}
                          >
                            D{d}
                          </th>
                        );
                      })}
                      <th style={{ padding: "5px 14px", position: "sticky", right: 0, background: "#0b0f19", zIndex: 3, borderLeft: "2px solid rgba(255, 255, 255, 0.15)" }}>
                        PTS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrix.map((row) => (
                      <tr
                        key={row.member_id}
                        style={{
                          borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                          background: row.rank === 1 && row.total_points > 0 ? "rgba(234, 179, 8, 0.04)" : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "6px 12px",
                            position: "sticky",
                            left: 0,
                            background: "#0b0f19",
                            zIndex: 2,
                            textAlign: "left",
                            fontWeight: 700,
                            color: "#fff",
                            whiteSpace: "nowrap",
                            fontSize: "0.78rem",
                          }}
                        >
                          <span style={{ color: "rgba(255,255,255,0.35)", marginRight: "6px", fontSize: "0.7rem" }}>
                            #{row.rank}
                          </span>
                          {row.name}
                        </td>

                        {Array.from({ length: 36 }, (_, i) => i + 1).map((d) => {
                          const score = row.daily_scores[d];
                          return (
                            <td
                              key={d}
                              style={{
                                padding: "5px 4px",
                                borderLeft: d % 6 === 1 ? "1.5px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0.03)",
                                color: score > 0 ? "#86efac" : "rgba(255, 255, 255, 0.15)",
                                fontWeight: score > 0 ? 700 : 400,
                                fontSize: "0.75rem",
                              }}
                            >
                              {score !== undefined ? score : "-"}
                            </td>
                          );
                        })}

                        <td
                          style={{
                            padding: "6px 14px",
                            position: "sticky",
                            right: 0,
                            background: "#0b0f19",
                            zIndex: 2,
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            color: row.rank === 1 && row.total_points > 0 ? "#eab308" : "#fff",
                            borderLeft: "2px solid rgba(255, 255, 255, 0.15)",
                          }}
                        >
                          {row.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════ TAB 5 — MOTW HONOURS ═══════════════════════ */}
        {activeTab === "motw" && (
          <div
            style={{
              animation: "rwsFadeUp 0.3s ease-out both",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "0.85rem",
              width: "100%",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((w) => {
              const weekObj = weeklyStandings.find((ws) => ws.week_number === w);
              const motw = weekObj?.motw;

              return (
                <div
                  key={w}
                  style={{
                    background: motw
                      ? "linear-gradient(135deg, rgba(234, 179, 8, 0.08) 0%, rgba(10, 8, 20, 0.8) 100%)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: motw ? "1px solid rgba(234, 179, 8, 0.3)" : "1px solid rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    padding: "1.1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", fontFamily: "var(--font-display)" }}>
                      WEEK {w} (Days {(w - 1) * 6 + 1}–{w * 6})
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        padding: "2px 7px",
                        borderRadius: "4px",
                        background: weekObj?.is_completed ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.05)",
                        color: weekObj?.is_completed ? "#86efac" : "rgba(255, 255, 255, 0.4)",
                      }}
                    >
                      {weekObj?.is_completed ? "Completed" : `${weekObj?.completed_days || 0}/6 Days`}
                    </span>
                  </div>

                  {motw && motw.points > 0 ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
                        <i className="fa-solid fa-medal" style={{ fontSize: "1.5rem", color: "#eab308" }} />
                        <div>
                          <div style={{ fontSize: "0.65rem", color: "#eab308", fontWeight: 700, textTransform: "uppercase" }}>
                            MOTW Winner
                          </div>
                          <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#fff" }}>
                            {motw.name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.65rem", borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}>
                        <span style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.4)" }}>Week Points:</span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#eab308" }}>{motw.points} pts</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "1rem 0", color: "rgba(255, 255, 255, 0.3)" }}>
                      <i className="fa-solid fa-hourglass-start" style={{ fontSize: "1.25rem", marginBottom: "0.4rem", display: "block" }} />
                      <div style={{ fontSize: "0.75rem" }}>Awaiting week matches</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* WhatsApp Share Modal */}
      {showShareModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            className="portal-card"
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "2rem",
              background: "#0f172a",
              border: "1px solid rgba(37, 211, 102, 0.4)",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-brands fa-whatsapp" style={{ fontSize: "1.5rem", color: "#25d366" }} />
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "var(--font-display)" }}>
                  Share to WhatsApp
                </h2>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255, 255, 255, 0.5)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <textarea
              readOnly
              rows={9}
              value={generateWhatsAppText()}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "12px",
                color: "#fff",
                fontSize: "0.82rem",
                fontFamily: "monospace",
                marginBottom: "1.25rem",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={handleCopyShare}
                className="portal-btn btn-secondary back-link-btn"
                style={{ fontSize: "0.82rem", padding: "8px 16px" }}
              >
                <i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"} style={{ marginRight: "6px" }} />
                {copied ? "Copied!" : "Copy Text"}
              </button>

              <button
                onClick={handleWhatsAppDirect}
                className="portal-btn btn-primary"
                style={{
                  background: "linear-gradient(135deg, #25d366, #128c7e)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  padding: "8px 18px",
                }}
              >
                <i className="fa-brands fa-whatsapp" style={{ marginRight: "6px" }} />
                Open in WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
