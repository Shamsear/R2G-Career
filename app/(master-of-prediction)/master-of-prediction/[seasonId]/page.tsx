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
  PredictionSeason
} from "@/utils/solo/predictionServerActions";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";
import "../../../portal.css";
import "../../../(rws)/rws/rws.css";

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
  const [activeTab, setActiveTab] = useState<"overall" | "weekly" | "matrix" | "motw">("overall");
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

        document.title = `${data.season.name} | Standings`;
      } catch (err: any) {
        console.error(err);
        setError("Failed to load prediction standings.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [seasonParam]);

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

  // Top 3 Podium
  const top3 = useMemo(() => {
    return overallStandings.slice(0, 3);
  }, [overallStandings]);

  // Champion
  const champion = useMemo(() => {
    if (overallStandings.length === 0) return null;
    const top = overallStandings[0];
    const isCompleted = (season?.completed_days || 0) >= 36 || season?.status === "completed";
    return isCompleted ? top : null;
  }, [overallStandings, season]);

  // Generate WhatsApp Share Text
  const generateWhatsAppText = () => {
    if (!season) return "";
    let text = `❇️ *${season.name.toUpperCase()}*\n`;
    text += `📊 *STANDINGS AFTER DAY ${season.completed_days || 0} OF 36*\n\n`;

    const displayStandings = overallStandings.slice(0, 15);
    displayStandings.forEach((m) => {
      const medal = m.rank === 1 ? "👑" : m.rank === 2 ? "🥈" : m.rank === 3 ? "🥉" : `${m.rank}.`;
      text += `${medal} *${m.name}* (${m.r2g_id || `ID:${m.member_id}`}) - *${m.total_points} pts*\n`;
    });

    if (overallStandings.length > 15) {
      text += `... and ${overallStandings.length - 15} more members\n`;
    }

    // Include Week MOTW
    const activeWeek = Math.min(6, Math.max(1, Math.ceil((season.completed_days || 1) / 6)));
    const activeWeekObj = weeklyStandings.find((w) => w.week_number === activeWeek);
    if (activeWeekObj && activeWeekObj.motw) {
      text += `\n🌟 *WEEK ${activeWeek} MOTW*: ${activeWeekObj.motw.name} (${activeWeekObj.motw.points} pts)\n`;
    }

    text += `\n🌐 *Full Leaderboard & 36-Day Matrix*: ${typeof window !== "undefined" ? window.location.href : ""}`;
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
        <div className="portal-container" style={{ maxWidth: "700px", textAlign: "center" }}>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.02)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Season Not Found</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{error}</p>
            <Link href="/master-of-prediction" className="portal-btn btn-secondary" style={{ display: "inline-flex" }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Prediction Archives
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const progressPct = Math.round(((season.completed_days || 0) / 36) * 100);

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh", paddingBottom: "6rem" }}>
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container" style={{ maxWidth: "1350px" }}>
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "1.5rem" }}>
          <Link href="/master-of-prediction" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Seasons
          </Link>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setShowShareModal(true)}
              className="portal-btn btn-secondary"
              style={{
                borderColor: "rgba(37, 211, 102, 0.4)",
                color: "#25d366",
                background: "rgba(37, 211, 102, 0.08)",
              }}
            >
              <i className="fa-brands fa-whatsapp" style={{ marginRight: "6px" }} />
              Share Standings
            </button>

            <Link
              href="/solo-tour/admin/prediction"
              className="portal-btn btn-secondary"
              style={{ borderColor: "rgba(234, 179, 8, 0.3)", color: "#fbbf24", background: "rgba(234, 179, 8, 0.05)" }}
            >
              <i className="fa-solid fa-pen-to-square" style={{ marginRight: "6px" }} />
              Admin Entry
            </Link>
          </div>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ borderColor: "rgba(234, 179, 8, 0.4)", color: "#fbbf24" }}>
            <i className="fa-solid fa-crown" />
            Season {season.season_number} Championship
          </div>
          <h1 className="rws-hero-title">
            {season.name.toUpperCase()}
          </h1>
          <p className="rws-hero-sub">
            36 Days • 6 Weeks • Real-time leaderboard, weekly MOTW honors, and 36-day round performance matrix.
          </p>
        </div>

        {/* Champion / Season Progress Banner */}
        {champion ? (
          /* Season Champion Banner */
          <div
            className="portal-card"
            style={{
              padding: "2rem",
              marginBottom: "2rem",
              background: "linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(168, 85, 247, 0.15))",
              border: "2px solid #eab308",
              boxShadow: "0 0 35px rgba(234, 179, 8, 0.3)",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ fontSize: "0.85rem", fontWeight: 900, color: "#eab308", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              🏆 SEASON {season.season_number} CROWN CHAMPION 🏆
            </div>
            <h2 style={{ fontSize: "2.5rem", fontWeight: 900, color: "#fff", margin: "0 0 0.5rem 0", textShadow: "0 0 20px rgba(234, 179, 8, 0.6)" }}>
              {champion.name}
            </h2>
            <div style={{ fontSize: "1.2rem", color: "#eab308", fontWeight: 800, marginBottom: "1rem" }}>
              {champion.total_points} Total Points across 36 Days
            </div>
            <p style={{ color: "rgba(255, 255, 255, 0.8)", maxWidth: "600px", margin: "0 auto", fontSize: "0.9rem" }}>
              Crowned Champion of Road to Glory Master of Prediction Season {season.season_number} by dominating the 36-day campaign!
            </p>
          </div>
        ) : (
          /* Season Progress Ribbon */
          <div
            className="portal-card"
            style={{
              padding: "1.5rem 2rem",
              marginBottom: "2rem",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(234, 179, 8, 0.2)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fbbf24", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Campaign Progress
                </span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: "2px 0 0 0" }}>
                  Day {season.completed_days || 0} of 36 Completed
                </h3>
              </div>

              {top3.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Current Leader:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(234, 179, 8, 0.12)", padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
                    <i className="fa-solid fa-crown" style={{ color: "#eab308" }} />
                    <span style={{ fontWeight: 800, color: "#fff" }}>{top3[0].name}</span>
                    <span style={{ fontWeight: 900, color: "#eab308" }}>({top3[0].total_points} pts)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "8px", background: "rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #eab308, #fbbf24)",
                  borderRadius: "10px",
                  transition: "width 0.5s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Top 3 Podium Cards (Live Preview) */}
        {top3.length >= 3 && !champion && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            {/* Rank 2 (Silver) */}
            <div
              className="portal-card"
              style={{
                padding: "1.5rem",
                textAlign: "center",
                background: "rgba(148, 163, 184, 0.06)",
                border: "1px solid rgba(148, 163, 184, 0.3)",
              }}
            >
              <div style={{ fontSize: "2rem", color: "#94a3b8", marginBottom: "0.5rem" }}>🥈 #2</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", margin: "0 0 4px 0" }}>{top3[1].name}</h3>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "0.75rem" }}>{top3[1].r2g_id}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff" }}>{top3[1].total_points} pts</div>
            </div>

            {/* Rank 1 (Gold Leader) */}
            <div
              className="portal-card"
              style={{
                padding: "1.75rem 1.5rem",
                textAlign: "center",
                background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(168, 85, 247, 0.08))",
                border: "2px solid rgba(234, 179, 8, 0.6)",
                boxShadow: "0 0 25px rgba(234, 179, 8, 0.2)",
                transform: "scale(1.02)",
              }}
            >
              <div style={{ fontSize: "2.2rem", color: "#eab308", marginBottom: "0.5rem" }}>👑 #1</div>
              <h3 style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff", margin: "0 0 4px 0" }}>{top3[0].name}</h3>
              <div style={{ fontSize: "0.85rem", color: "#fbbf24", marginBottom: "0.75rem" }}>{top3[0].r2g_id}</div>
              <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#eab308" }}>{top3[0].total_points} pts</div>
            </div>

            {/* Rank 3 (Bronze) */}
            <div
              className="portal-card"
              style={{
                padding: "1.5rem",
                textAlign: "center",
                background: "rgba(217, 119, 6, 0.06)",
                border: "1px solid rgba(217, 119, 6, 0.3)",
              }}
            >
              <div style={{ fontSize: "2rem", color: "#cd7f32", marginBottom: "0.5rem" }}>🥉 #3</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", margin: "0 0 4px 0" }}>{top3[2].name}</h3>
              <div style={{ fontSize: "0.8rem", color: "#cd7f32", marginBottom: "0.75rem" }}>{top3[2].r2g_id}</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#fff" }}>{top3[2].total_points} pts</div>
            </div>
          </div>
        )}

        {/* View Navigation Tabs */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setActiveTab("overall")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: activeTab === "overall" ? "1.5px solid #fbbf24" : "1px solid rgba(255, 255, 255, 0.1)",
                background: activeTab === "overall" ? "rgba(234, 179, 8, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: activeTab === "overall" ? "#fbbf24" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fa-solid fa-trophy" style={{ marginRight: "6px" }} />
              Overall Standings ({overallStandings.length})
            </button>

            <button
              onClick={() => setActiveTab("weekly")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: activeTab === "weekly" ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                background: activeTab === "weekly" ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: activeTab === "weekly" ? "#38bdf8" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fa-solid fa-calendar-week" style={{ marginRight: "6px" }} />
              Weekly Breakdown &amp; MOTW
            </button>

            <button
              onClick={() => setActiveTab("matrix")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: activeTab === "matrix" ? "1.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                background: activeTab === "matrix" ? "rgba(168, 85, 247, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: activeTab === "matrix" ? "#c084fc" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fa-solid fa-table-cells" style={{ marginRight: "6px" }} />
              36-Day Full Matrix
            </button>

            <button
              onClick={() => setActiveTab("motw")}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: activeTab === "motw" ? "1.5px solid #eab308" : "1px solid rgba(255, 255, 255, 0.1)",
                background: activeTab === "motw" ? "rgba(234, 179, 8, 0.2)" : "rgba(15, 23, 42, 0.6)",
                color: activeTab === "motw" ? "#eab308" : "var(--text-secondary)",
                fontWeight: 800,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fa-solid fa-award" style={{ marginRight: "6px" }} />
              MOTW Honours (6 Weeks)
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member name or ID..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* TAB 1: OVERALL STANDINGS TABLE */}
        {activeTab === "overall" && (
          <div
            className="portal-card"
            style={{
              padding: "0",
              overflow: "hidden",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "var(--text-secondary)",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                    <th style={{ padding: "14px 18px", width: "70px", textAlign: "center" }}>Rank</th>
                    <th style={{ padding: "14px 18px" }}>Member</th>
                    <th style={{ padding: "14px 18px", textAlign: "center" }}>Days Scored</th>
                    <th style={{ padding: "14px 18px", textAlign: "center" }}>Avg / Day</th>
                    <th style={{ padding: "14px 18px", textAlign: "center" }}>Best Day</th>
                    <th style={{ padding: "14px 18px", textAlign: "center" }}>Recent Form</th>
                    <th style={{ padding: "14px 18px", textAlign: "right", width: "140px" }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOverall.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                        No members matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOverall.map((row) => {
                      const isRank1 = row.rank === 1;
                      const isRank2 = row.rank === 2;
                      const isRank3 = row.rank === 3;

                      return (
                        <tr
                          key={row.member_id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            background: isRank1
                              ? "rgba(234, 179, 8, 0.08)"
                              : isRank2
                              ? "rgba(148, 163, 184, 0.04)"
                              : isRank3
                              ? "rgba(217, 119, 6, 0.04)"
                              : "transparent",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {/* Rank */}
                          <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 900, fontSize: "1rem" }}>
                            {isRank1 ? (
                              <span style={{ color: "#eab308" }}>👑 1</span>
                            ) : isRank2 ? (
                              <span style={{ color: "#94a3b8" }}>🥈 2</span>
                            ) : isRank3 ? (
                              <span style={{ color: "#cd7f32" }}>🥉 3</span>
                            ) : (
                              <span style={{ color: "var(--text-secondary)" }}>#{row.rank}</span>
                            )}
                          </td>

                          {/* Member Photo & Name */}
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <div
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  borderRadius: "50%",
                                  background: "rgba(168, 85, 247, 0.15)",
                                  border: "1.5px solid rgba(168, 85, 247, 0.3)",
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
                                  <i className="fa-solid fa-user" style={{ color: "#c084fc", fontSize: "0.95rem" }} />
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#fff" }}>
                                  {row.name}
                                </div>
                                {row.r2g_id && (
                                  <div style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 700 }}>
                                    {row.r2g_id}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Days Scored */}
                          <td style={{ padding: "14px 18px", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                            {row.days_played} / 36
                          </td>

                          {/* Avg Points */}
                          <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                            {row.avg_points}
                          </td>

                          {/* Max Day Score */}
                          <td style={{ padding: "14px 18px", textAlign: "center", color: "#10b981", fontWeight: 700, fontSize: "0.9rem" }}>
                            {row.max_day_points > 0 ? `+${row.max_day_points}` : "-"}
                          </td>

                          {/* Recent Form */}
                          <td style={{ padding: "14px 18px", textAlign: "center" }}>
                            <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
                              {row.recent_form && row.recent_form.length > 0 ? (
                                row.recent_form.map((f, i) => (
                                  <span
                                    key={i}
                                    style={{
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      background: f > 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                                      color: f > 0 ? "#10b981" : "var(--text-secondary)",
                                      fontSize: "0.75rem",
                                      fontWeight: 800,
                                    }}
                                  >
                                    {f}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>-</span>
                              )}
                            </div>
                          </td>

                          {/* Total Points */}
                          <td
                            style={{
                              padding: "14px 18px",
                              textAlign: "right",
                              fontWeight: 900,
                              fontSize: "1.2rem",
                              color: isRank1 ? "#eab308" : isRank2 ? "#94a3b8" : isRank3 ? "#cd7f32" : "#fff",
                            }}
                          >
                            {row.total_points}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: WEEKLY BREAKDOWN */}
        {activeTab === "weekly" && (
          <div>
            {/* Week Selector Chips */}
            <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              {[1, 2, 3, 4, 5, 6].map((w) => {
                const isSel = selectedWeekNum === w;
                const weekObj = weeklyStandings.find((ws) => ws.week_number === w);

                return (
                  <button
                    key={w}
                    onClick={() => setSelectedWeekNum(w)}
                    style={{
                      flex: "1 0 auto",
                      minWidth: "150px",
                      padding: "12px 18px",
                      borderRadius: "12px",
                      border: isSel ? "1.5px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                      background: isSel ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                      color: isSel ? "#38bdf8" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", color: isSel ? "#38bdf8" : "var(--text-secondary)", fontWeight: 800, textTransform: "uppercase" }}>
                      Days {(w - 1) * 6 + 1} – {w * 6}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 900, margin: "2px 0" }}>
                      WEEK {w}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                      {weekObj?.completed_days || 0} / 6 Days Done
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Current Week MOTW Highlight Card */}
            {currentWeekData?.motw && (
              <div
                className="portal-card"
                style={{
                  padding: "1.5rem 2rem",
                  marginBottom: "1.5rem",
                  background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(56, 189, 248, 0.1))",
                  border: "1.5px solid rgba(234, 179, 8, 0.5)",
                  boxShadow: "0 0 25px rgba(234, 179, 8, 0.2)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "rgba(234, 179, 8, 0.2)",
                      border: "2px solid #eab308",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.6rem",
                      color: "#eab308",
                    }}
                  >
                    <i className="fa-solid fa-medal" />
                  </div>
                  <div>
                    <span style={{ fontSize: "0.75rem", fontWeight: 900, color: "#eab308", letterSpacing: "1px", textTransform: "uppercase" }}>
                      👑 WEEK {selectedWeekNum} MOTW (Top Scorer)
                    </span>
                    <h3 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#fff", margin: "2px 0 0 0" }}>
                      {currentWeekData.motw.name}
                    </h3>
                    <span style={{ fontSize: "0.8rem", color: "#fbbf24", fontWeight: 700 }}>
                      {currentWeekData.motw.r2g_id}
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Week {selectedWeekNum} Points</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, color: "#eab308" }}>
                    {currentWeekData.motw.points} pts
                  </div>
                </div>
              </div>
            )}

            {/* Week Standings Table */}
            <div
              className="portal-card"
              style={{
                padding: "0",
                overflow: "hidden",
                background: "rgba(15, 23, 42, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr
                      style={{
                        background: "rgba(0, 0, 0, 0.3)",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                        color: "var(--text-secondary)",
                        fontSize: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                      }}
                    >
                      <th style={{ padding: "14px 18px", width: "70px", textAlign: "center" }}>Rank</th>
                      <th style={{ padding: "14px 18px" }}>Member</th>
                      <th style={{ padding: "14px 18px", textAlign: "center" }}>Days Scored in Week</th>
                      <th style={{ padding: "14px 18px", textAlign: "right" }}>Week {selectedWeekNum} Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWeeklyMembers.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          No points recorded yet for Week {selectedWeekNum}.
                        </td>
                      </tr>
                    ) : (
                      filteredWeeklyMembers.map((row) => (
                        <tr
                          key={row.member_id}
                          style={{
                            borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                            background: row.rank === 1 && row.points > 0 ? "rgba(234, 179, 8, 0.08)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "14px 18px", textAlign: "center", fontWeight: 900 }}>
                            {row.rank === 1 && row.points > 0 ? (
                              <span style={{ color: "#eab308" }}>👑 1</span>
                            ) : (
                              <span style={{ color: "var(--text-secondary)" }}>#{row.rank}</span>
                            )}
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{ fontWeight: 700, color: "#fff" }}>{row.name}</span>
                              {row.r2g_id && (
                                <span style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 700 }}>
                                  ({row.r2g_id})
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "14px 18px", textAlign: "center", color: "var(--text-secondary)" }}>
                            {row.days_played} / 6
                          </td>
                          <td
                            style={{
                              padding: "14px 18px",
                              textAlign: "right",
                              fontWeight: 900,
                              fontSize: "1.1rem",
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

        {/* TAB 3: 36-DAY FULL MATRIX */}
        {activeTab === "matrix" && (
          <div
            className="portal-card"
            style={{
              padding: "0",
              overflow: "hidden",
              background: "rgba(15, 23, 42, 0.7)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ overflowX: "auto", maxWidth: "100%" }}>
              <table style={{ borderCollapse: "collapse", textAlign: "center", fontSize: "0.8rem", width: "max-content" }}>
                <thead>
                  {/* Super Header: Weeks 1 to 6 */}
                  <tr style={{ background: "rgba(0, 0, 0, 0.5)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)" }}>
                    <th
                      style={{
                        padding: "10px 14px",
                        position: "sticky",
                        left: 0,
                        background: "#0b0f19",
                        zIndex: 3,
                        textAlign: "left",
                        minWidth: "160px",
                      }}
                    >
                      Member
                    </th>
                    {[1, 2, 3, 4, 5, 6].map((w) => (
                      <th
                        key={w}
                        colSpan={6}
                        style={{
                          padding: "8px",
                          borderLeft: "2px solid rgba(255, 255, 255, 0.15)",
                          color: "#38bdf8",
                          fontWeight: 800,
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        Week {w} (Days {(w - 1) * 6 + 1}–{w * 6})
                      </th>
                    ))}
                    <th
                      style={{
                        padding: "10px 16px",
                        position: "sticky",
                        right: 0,
                        background: "#0b0f19",
                        zIndex: 3,
                        color: "#eab308",
                        fontWeight: 900,
                        borderLeft: "2px solid rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      Total
                    </th>
                  </tr>

                  {/* Sub Header: Days 1 to 36 */}
                  <tr style={{ background: "rgba(0, 0, 0, 0.3)", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-secondary)", fontSize: "0.7rem" }}>
                    <th style={{ padding: "8px 14px", position: "sticky", left: 0, background: "#0b0f19", zIndex: 3, textAlign: "left" }}>
                      Name (R2G ID)
                    </th>
                    {Array.from({ length: 36 }, (_, i) => i + 1).map((d) => (
                      <th
                        key={d}
                        style={{
                          padding: "6px 8px",
                          minWidth: "36px",
                          borderLeft: d % 6 === 1 ? "2px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.04)",
                        }}
                      >
                        D{d}
                      </th>
                    ))}
                    <th style={{ padding: "8px 16px", position: "sticky", right: 0, background: "#0b0f19", zIndex: 3, borderLeft: "2px solid rgba(255, 255, 255, 0.2)" }}>
                      PTS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatrix.map((row) => (
                    <tr
                      key={row.member_id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                        background: row.rank === 1 ? "rgba(234, 179, 8, 0.05)" : "transparent",
                      }}
                    >
                      {/* Sticky Name */}
                      <td
                        style={{
                          padding: "10px 14px",
                          position: "sticky",
                          left: 0,
                          background: "#0b0f19",
                          zIndex: 2,
                          textAlign: "left",
                          fontWeight: 700,
                          color: "#fff",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ color: row.rank === 1 ? "#eab308" : "var(--text-secondary)", marginRight: "6px" }}>
                          #{row.rank}
                        </span>
                        {row.name}
                      </td>

                      {/* 36 Days */}
                      {Array.from({ length: 36 }, (_, i) => i + 1).map((d) => {
                        const score = row.daily_scores[d];
                        return (
                          <td
                            key={d}
                            style={{
                              padding: "8px 4px",
                              borderLeft: d % 6 === 1 ? "2px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(255, 255, 255, 0.04)",
                              color: score > 0 ? "#10b981" : "rgba(255, 255, 255, 0.2)",
                              fontWeight: score > 0 ? 800 : 400,
                            }}
                          >
                            {score !== undefined ? score : "-"}
                          </td>
                        );
                      })}

                      {/* Sticky Total */}
                      <td
                        style={{
                          padding: "10px 16px",
                          position: "sticky",
                          right: 0,
                          background: "#0b0f19",
                          zIndex: 2,
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          color: row.rank === 1 ? "#eab308" : "#fff",
                          borderLeft: "2px solid rgba(255, 255, 255, 0.2)",
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
        )}

        {/* TAB 4: MOTW HONOURS LIST */}
        {activeTab === "motw" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((w) => {
              const weekObj = weeklyStandings.find((ws) => ws.week_number === w);
              const motw = weekObj?.motw;

              return (
                <div
                  key={w}
                  className="portal-card"
                  style={{
                    padding: "1.75rem",
                    background: motw
                      ? "linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(168, 85, 247, 0.05))"
                      : "rgba(15, 23, 42, 0.4)",
                    border: motw
                      ? "1.5px solid rgba(234, 179, 8, 0.4)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase" }}>
                      WEEK {w} (Days {(w - 1) * 6 + 1}–{w * 6})
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        background: weekObj?.is_completed ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.08)",
                        color: weekObj?.is_completed ? "#10b981" : "var(--text-secondary)",
                      }}
                    >
                      {weekObj?.is_completed ? "Completed" : `${weekObj?.completed_days || 0}/6 Days`}
                    </span>
                  </div>

                  {motw ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
                        <i className="fa-solid fa-medal" style={{ fontSize: "2rem", color: "#eab308" }} />
                        <div>
                          <div style={{ fontSize: "0.75rem", color: "#eab308", fontWeight: 800, textTransform: "uppercase" }}>
                            MOTW Winner
                          </div>
                          <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#fff" }}>
                            {motw.name}
                          </div>
                          {motw.r2g_id && (
                            <div style={{ fontSize: "0.75rem", color: "#c084fc", fontWeight: 700 }}>
                              {motw.r2g_id}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Week Points:</span>
                        <span style={{ fontSize: "1.3rem", fontWeight: 900, color: "#eab308" }}>{motw.points} pts</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "1.5rem 0", color: "var(--text-secondary)" }}>
                      <i className="fa-solid fa-hourglass-start" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }} />
                      <div style={{ fontSize: "0.85rem" }}>Awaiting week completion</div>
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
              maxWidth: "520px",
              padding: "2rem",
              background: "#0f172a",
              border: "1px solid rgba(37, 211, 102, 0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <i className="fa-brands fa-whatsapp" style={{ fontSize: "1.6rem", color: "#25d366" }} />
                <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  Share Standings to WhatsApp
                </h2>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <textarea
              readOnly
              rows={10}
              value={generateWhatsAppText()}
              style={{
                width: "100%",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "12px",
                color: "#fff",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                marginBottom: "1.5rem",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={handleCopyShare}
                className="portal-btn btn-secondary"
                style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
              >
                <i className={copied ? "fa-solid fa-check" : "fa-solid fa-copy"} style={{ marginRight: "6px" }} />
                {copied ? "Copied to Clipboard!" : "Copy Text"}
              </button>

              <button
                onClick={handleWhatsAppDirect}
                className="portal-btn btn-primary"
                style={{
                  background: "linear-gradient(135deg, #25d366, #128c7e)",
                  color: "#fff",
                  fontWeight: 800,
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
