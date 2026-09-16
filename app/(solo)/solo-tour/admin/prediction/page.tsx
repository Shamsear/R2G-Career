"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import "../../../../portal.css";
import "../admin.css";
import {
  fetchPredictionSeasons,
  fetchPredictionSeasonById,
  fetchPredictionDayData,
  savePredictionDayScores,
  createPredictionSeason,
  fetchPredictionLeaderboard,
  PredictionSeason,
  PredictionDay,
  MemberDayScore
} from "@/utils/solo/predictionServerActions";

export default function PredictionAdminPage() {
  const [seasons, setSeasons] = useState<PredictionSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<PredictionSeason | null>(null);
  const [days, setDays] = useState<PredictionDay[]>([]);
  
  // Navigation State
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);

  // Day Data & Points
  const [dayInfo, setDayInfo] = useState<PredictionDay | null>(null);
  const [dayTitle, setDayTitle] = useState<string>("");
  const [matchDate, setMatchDate] = useState<string>("");
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [dayNotes, setDayNotes] = useState<string>("");

  const [members, setMembers] = useState<MemberDayScore[]>([]);
  const [memberScores, setMemberScores] = useState<Record<number, number>>({});
  const [memberNotes, setMemberNotes] = useState<Record<number, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");

  // UI States
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create Season Modal
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState<boolean>(false);
  const [newSeasonNum, setNewSeasonNum] = useState<number>(2);
  const [newSeasonName, setNewSeasonName] = useState<string>("");
  const [newSeasonNotes, setNewSeasonNotes] = useState<string>("");
  const [creatingSeason, setCreatingSeason] = useState<boolean>(false);

  // Live Standings Modal
  const [showStandingsModal, setShowStandingsModal] = useState<boolean>(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState<any>(null);
  const [loadingLiveStandings, setLoadingLiveStandings] = useState<boolean>(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Initial Load: Fetch seasons
  useEffect(() => {
    async function loadSeasons() {
      try {
        const seasonsList = await fetchPredictionSeasons();
        setSeasons(seasonsList);
        if (seasonsList.length > 0) {
          const firstSeason = seasonsList[0];
          setSelectedSeasonId(firstSeason.id);
          setSelectedSeason(firstSeason);
          setNewSeasonNum(seasonsList.length + 1);
        }
      } catch (err) {
        console.error(err);
        showToast("Failed to load seasons", "error");
      } finally {
        setLoading(false);
      }
    }
    loadSeasons();
  }, []);

  // 2. When Season changes, fetch days
  useEffect(() => {
    if (!selectedSeasonId) return;
    async function loadSeasonDetails() {
      try {
        setLoading(true);
        const { season, days: seasonDays } = await fetchPredictionSeasonById(selectedSeasonId!);
        setSelectedSeason(season);
        setDays(seasonDays);
        if (seasonDays.length > 0) {
          // Select current active day or day 1
          const targetDay = season?.current_day || 1;
          setSelectedDayNum(targetDay);
          setSelectedWeek(Math.ceil(targetDay / 6));
        }
      } catch (err) {
        console.error(err);
        showToast("Error loading season details", "error");
      } finally {
        setLoading(false);
      }
    }
    loadSeasonDetails();
  }, [selectedSeasonId]);

  // 3. When Day changes, fetch day data & member scores
  useEffect(() => {
    if (!selectedSeasonId || !selectedDayNum) return;
    async function loadDay() {
      try {
        const { dayInfo: fetchedDay, members: fetchedMembers } = await fetchPredictionDayData(
          selectedSeasonId!,
          selectedDayNum
        );
        setDayInfo(fetchedDay);
        setDayTitle(fetchedDay?.title || `Day ${selectedDayNum}`);
        setMatchDate(fetchedDay?.match_date || "");
        setIsCompleted(fetchedDay?.is_completed || false);
        setDayNotes(fetchedDay?.notes || "");

        setMembers(fetchedMembers);

        // Build score map
        const scoresMap: Record<number, number> = {};
        const notesMap: Record<number, string> = {};
        fetchedMembers.forEach((m) => {
          scoresMap[m.member_id] = m.points || 0;
          notesMap[m.member_id] = m.notes || "";
        });
        setMemberScores(scoresMap);
        setMemberNotes(notesMap);
      } catch (err) {
        console.error(err);
        showToast("Error loading day data", "error");
      }
    }
    loadDay();
  }, [selectedSeasonId, selectedDayNum]);

  // Handle Point Change for Member
  const handleScoreChange = (memberId: number, val: string | number) => {
    const num = val === "" ? 0 : Number(val);
    setMemberScores((prev) => ({
      ...prev,
      [memberId]: isNaN(num) ? 0 : num,
    }));
  };

  // Quick Point Add/Set
  const handleQuickPoint = (memberId: number, delta: number, mode: "set" | "add" = "set") => {
    setMemberScores((prev) => {
      const curr = prev[memberId] || 0;
      const next = mode === "add" ? curr + delta : delta;
      return {
        ...prev,
        [memberId]: Math.max(0, next),
      };
    });
  };

  // Bulk Save Day Points
  const handleSaveDay = async () => {
    if (!selectedSeasonId) return;
    setSaving(true);
    try {
      const scoresPayload = members.map((m) => ({
        member_id: m.member_id,
        points: memberScores[m.member_id] || 0,
        notes: memberNotes[m.member_id] || "",
      }));

      const dayPayload = {
        title: dayTitle.trim() || `Day ${selectedDayNum}`,
        match_date: matchDate ? matchDate : null,
        is_completed: isCompleted,
        notes: dayNotes.trim(),
      };

      const res = await savePredictionDayScores(
        selectedSeasonId,
        selectedDayNum,
        scoresPayload,
        dayPayload
      );

      if (res.success) {
        showToast(`✅ Day ${selectedDayNum} points saved successfully!`, "success");
        // Update local day in days list
        setDays((prev) =>
          prev.map((d) =>
            d.day_number === selectedDayNum
              ? {
                  ...d,
                  title: dayPayload.title,
                  match_date: dayPayload.match_date,
                  is_completed: dayPayload.is_completed,
                  notes: dayPayload.notes,
                }
              : d
          )
        );
      } else {
        showToast(`❌ Error: ${res.error}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to save points", "error");
    } finally {
      setSaving(false);
    }
  };

  // Create New Season
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonNum || !newSeasonName.trim()) {
      showToast("Please provide season number and name", "error");
      return;
    }
    setCreatingSeason(true);
    try {
      const res = await createPredictionSeason(
        newSeasonNum,
        newSeasonName.trim(),
        newSeasonNotes.trim()
      );
      if (res.success && res.season) {
        showToast(`🎉 Season ${newSeasonNum} created with 36 days!`, "success");
        setShowCreateSeasonModal(false);
        setNewSeasonName("");
        setNewSeasonNotes("");
        // Refresh seasons list
        const updated = await fetchPredictionSeasons();
        setSeasons(updated);
        setSelectedSeasonId(res.season.id);
      } else {
        showToast(`❌ Error: ${res.error}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating season", "error");
    } finally {
      setCreatingSeason(false);
    }
  };

  // Open Live Standings Preview
  const handleOpenLiveStandings = async () => {
    if (!selectedSeasonId) return;
    setShowStandingsModal(true);
    setLoadingLiveStandings(true);
    try {
      const data = await fetchPredictionLeaderboard(selectedSeasonId);
      setLiveLeaderboard(data);
    } catch (err) {
      console.error(err);
      showToast("Error loading live leaderboard", "error");
    } finally {
      setLoadingLiveStandings(false);
    }
  };

  // Filter members by search query
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.r2g_id && m.r2g_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Week Days (6 days per week)
  const weekStartDay = (selectedWeek - 1) * 6 + 1;
  const weekDays = days.filter(
    (d) => d.day_number >= weekStartDay && d.day_number <= weekStartDay + 5
  );

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
      {/* Background elements */}
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            background:
              toast.type === "success"
                ? "rgba(16, 185, 129, 0.95)"
                : toast.type === "error"
                ? "rgba(239, 68, 68, 0.95)"
                : "rgba(168, 85, 247, 0.95)",
            color: "#fff",
            fontWeight: "700",
            fontSize: "0.9rem",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            animation: "rwsFadeUp 0.3s ease-out",
          }}
        >
          <i
            className={
              toast.type === "success"
                ? "fa-solid fa-circle-check"
                : toast.type === "error"
                ? "fa-solid fa-triangle-exclamation"
                : "fa-solid fa-circle-info"
            }
          />
          {toast.message}
        </div>
      )}

      <div className="portal-container" style={{ maxWidth: "1350px" }}>
        {/* Navigation Breadcrumb */}
        <div
          className="portal-breadcrumb"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            marginBottom: "1.5rem",
          }}
        >
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Admin Console
          </Link>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleOpenLiveStandings}
              className="portal-btn btn-secondary"
              style={{
                borderColor: "rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
                background: "rgba(168, 85, 247, 0.08)",
              }}
            >
              <i className="fa-solid fa-ranking-star" style={{ marginRight: "6px" }} />
              Live Standings
            </button>

            {selectedSeason && (
              <Link
                href={`/master-of-prediction/${selectedSeason.id}`}
                target="_blank"
                className="portal-btn btn-secondary"
                style={{
                  borderColor: "rgba(59, 130, 246, 0.4)",
                  color: "#60a5fa",
                  background: "rgba(59, 130, 246, 0.08)",
                }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: "6px" }} />
                Public Hub
              </Link>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <div className="rws-page-hero" style={{ marginBottom: "2rem" }}>
          <div className="portal-page-badge" style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc" }}>
            <i className="fa-solid fa-square-poll-vertical" />
            Prediction Management Engine
          </div>
          <h1 className="rws-hero-title">MASTER OF PREDICTION</h1>
          <p className="rws-hero-sub">
            Update round points (10, 12, 15, etc.) for all registered members across 36 Days & 6 Weeks. Day 36 top rank crowns the Champion.
          </p>
        </div>

        {/* Season Selector Bar */}
        <div
          className="portal-card"
          style={{
            padding: "1.25rem 1.75rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
              <i className="fa-solid fa-folder-tree" style={{ color: "#c084fc", marginRight: "6px" }} />
              Active Season:
            </span>
            <select
              value={selectedSeasonId || ""}
              onChange={(e) => setSelectedSeasonId(Number(e.target.value))}
              style={{
                background: "rgba(30, 41, 59, 0.8)",
                color: "#fff",
                border: "1px solid rgba(168, 85, 247, 0.3)",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "0.95rem",
                cursor: "pointer",
              }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  Season {s.season_number} — {s.name} ({s.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => setShowCreateSeasonModal(true)}
              className="portal-btn btn-primary"
              style={{
                padding: "8px 16px",
                fontSize: "0.85rem",
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} />
              New Season
            </button>
          </div>
        </div>

        {/* 6 Weeks Tab Bar */}
        <div style={{ marginBottom: "1rem" }}>
          <div
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              paddingBottom: "8px",
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((w) => {
              const isActive = selectedWeek === w;
              const wStart = (w - 1) * 6 + 1;
              const wEnd = w * 6;
              const completedCount = days.filter(
                (d) => d.day_number >= wStart && d.day_number <= wEnd && d.is_completed
              ).length;

              return (
                <button
                  key={w}
                  onClick={() => {
                    setSelectedWeek(w);
                    setSelectedDayNum(wStart);
                  }}
                  style={{
                    flex: "1 0 auto",
                    minWidth: "140px",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: isActive
                      ? "1.5px solid #c084fc"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.25), rgba(124, 58, 237, 0.15))"
                      : "rgba(15, 23, 42, 0.5)",
                    color: isActive ? "#fff" : "var(--text-secondary)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.95rem", color: isActive ? "#c084fc" : "#fff" }}>
                      WEEK {w}
                    </span>
                    {completedCount === 6 && (
                      <span style={{ color: "#10b981", fontSize: "0.75rem", fontWeight: 700 }}>
                        <i className="fa-solid fa-circle-check" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", opacity: 0.8 }}>
                    Days {wStart} – {wEnd} ({completedCount}/6 done)
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Days of Current Week Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "10px",
            marginBottom: "2rem",
          }}
        >
          {weekDays.map((d) => {
            const isSelected = selectedDayNum === d.day_number;
            return (
              <button
                key={d.day_number}
                onClick={() => setSelectedDayNum(d.day_number)}
                style={{
                  padding: "14px 10px",
                  borderRadius: "12px",
                  border: isSelected
                    ? "2px solid #38bdf8"
                    : "1px solid rgba(255, 255, 255, 0.08)",
                  background: isSelected
                    ? "linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(14, 165, 233, 0.15))"
                    : "rgba(30, 41, 59, 0.4)",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontSize: "0.7rem", color: isSelected ? "#38bdf8" : "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Round {d.day_number}
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "#fff", margin: "2px 0" }}>
                  DAY {d.day_number}
                </div>
                <div style={{ fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                  {d.is_completed ? (
                    <span style={{ color: "#10b981", fontWeight: 700 }}>
                      <i className="fa-solid fa-check" /> Done
                    </span>
                  ) : (
                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>
                      <i className="fa-solid fa-clock" /> Open
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Day Header & Editing Panel */}
        <div
          className="portal-card"
          style={{
            padding: "1.5rem",
            marginBottom: "1.5rem",
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "4px",
                    background: isCompleted ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                    color: isCompleted ? "#10b981" : "#f59e0b",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                  }}
                >
                  {isCompleted ? "Completed Round" : "In Progress Round"}
                </span>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Week {selectedWeek} • Day {selectedDayNum} of 36
                </span>
              </div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                Score Entry: Day {selectedDayNum}
              </h2>
            </div>

            {/* Quick Actions / Save Button */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setIsCompleted(!isCompleted)}
                type="button"
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: isCompleted ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.2)",
                  background: isCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.05)",
                  color: isCompleted ? "#10b981" : "var(--text-secondary)",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <i className={isCompleted ? "fa-solid fa-circle-check" : "fa-regular fa-circle"} style={{ marginRight: "6px" }} />
                {isCompleted ? "Round Completed" : "Mark as Completed"}
              </button>

              <button
                onClick={handleSaveDay}
                disabled={saving}
                className="portal-btn btn-primary"
                style={{
                  padding: "10px 24px",
                  fontSize: "0.95rem",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }} /> Saving...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" style={{ marginRight: "8px" }} /> Save Day {selectedDayNum} Points
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Meta Fields: Title, Date, Notes */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1rem",
              background: "rgba(0, 0, 0, 0.2)",
              padding: "1rem",
              borderRadius: "8px",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "4px" }}>
                Round Title / Match Theme (Optional)
              </label>
              <input
                type="text"
                value={dayTitle}
                onChange={(e) => setDayTitle(e.target.value)}
                placeholder={`Day ${selectedDayNum} (Week ${selectedWeek})`}
                style={{
                  width: "100%",
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "4px" }}>
                Matchday Date (Optional)
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "4px" }}>
                Admin Notes (Optional)
              </label>
              <input
                type="text"
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                placeholder="e.g. UCL Round of 16 Predictions"
                style={{
                  width: "100%",
                  background: "rgba(30, 41, 59, 0.6)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>
        </div>

        {/* Member Search & Filter Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
            Participating Members ({filteredMembers.length})
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
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
              placeholder="Search member name or R2G ID..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 36px",
                background: "rgba(30, 41, 59, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
              }}
            />
          </div>
        </div>

        {/* Member Points Scoring List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filteredMembers.length === 0 ? (
            <div
              className="portal-card"
              style={{
                padding: "3rem",
                textAlign: "center",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              <i className="fa-solid fa-user-slash" style={{ fontSize: "2.5rem", color: "var(--text-secondary)", marginBottom: "1rem" }} />
              <div style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700 }}>No members found</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Try adjusting your search filter or make sure managers are registered in the directory.
              </p>
            </div>
          ) : (
            filteredMembers.map((m, idx) => {
              const currentScore = memberScores[m.member_id] || 0;
              const hasScore = currentScore > 0;

              return (
                <div
                  key={m.member_id}
                  className="portal-card"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    background: hasScore
                      ? "rgba(16, 185, 129, 0.04)"
                      : "rgba(15, 23, 42, 0.5)",
                    border: hasScore
                      ? "1px solid rgba(16, 185, 129, 0.25)"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Member Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "220px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        background: "rgba(168, 85, 247, 0.15)",
                        border: "1.5px solid rgba(168, 85, 247, 0.4)",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {m.photo ? (
                        <img
                          src={m.photo}
                          alt={m.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.target as any).style.display = "none";
                          }}
                        />
                      ) : (
                        <i className="fa-solid fa-user" style={{ color: "#c084fc", fontSize: "1.2rem" }} />
                      )}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>
                          {m.name}
                        </span>
                        {m.r2g_id && (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: "rgba(168, 85, 247, 0.15)",
                              color: "#c084fc",
                            }}
                          >
                            {m.r2g_id}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        Member #{m.member_id}
                      </div>
                    </div>
                  </div>

                  {/* Points Input & Quick Point Chips */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    {/* Quick Preset Buttons */}
                    <div style={{ display: "flex", gap: "6px" }}>
                      {[10, 12, 15, 20].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => handleQuickPoint(m.member_id, pts, "set")}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "6px",
                            border: currentScore === pts ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.1)",
                            background: currentScore === pts ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.05)",
                            color: currentScore === pts ? "#10b981" : "#fff",
                            fontWeight: "800",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          +{pts}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleQuickPoint(m.member_id, 0, "set")}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          background: "rgba(239, 68, 68, 0.08)",
                          color: "#ef4444",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                        title="Clear score to 0"
                      >
                        0
                      </button>
                    </div>

                    {/* Numeric Input */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={currentScore === 0 ? "" : currentScore}
                        onChange={(e) => handleScoreChange(m.member_id, e.target.value)}
                        placeholder="0"
                        style={{
                          width: "75px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: "rgba(30, 41, 59, 0.8)",
                          border: hasScore
                            ? "1.5px solid #10b981"
                            : "1px solid rgba(255, 255, 255, 0.15)",
                          color: hasScore ? "#10b981" : "#fff",
                          fontWeight: "900",
                          fontSize: "1.1rem",
                          textAlign: "center",
                        }}
                      />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700 }}>
                        pts
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Floating Save Bar on Scroll */}
        <div
          style={{
            position: "sticky",
            bottom: "20px",
            marginTop: "2rem",
            padding: "1rem 1.5rem",
            borderRadius: "14px",
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(12px)",
            border: "1.5px solid rgba(16, 185, 129, 0.4)",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 100,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: "0.95rem" }}>
              Day {selectedDayNum} (Week {selectedWeek})
            </span>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              • {Object.values(memberScores).filter((pts) => pts > 0).length} members scored
            </span>
          </div>

          <button
            onClick={handleSaveDay}
            disabled={saving}
            className="portal-btn btn-primary"
            style={{
              padding: "10px 28px",
              fontSize: "0.95rem",
              fontWeight: 900,
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: "8px" }} /> Saving...
              </>
            ) : (
              <>
                <i className="fa-solid fa-floppy-disk" style={{ marginRight: "8px" }} /> Save Day {selectedDayNum} Points
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal: Create New Season */}
      {showCreateSeasonModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
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
              border: "1px solid rgba(168, 85, 247, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                <i className="fa-solid fa-folder-plus" style={{ color: "#c084fc", marginRight: "8px" }} />
                Create Prediction Season
              </h2>
              <button
                onClick={() => setShowCreateSeasonModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Season Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={newSeasonNum}
                  onChange={(e) => setNewSeasonNum(Number(e.target.value))}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontWeight: "700",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Season Name
                </label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder={`Master of Prediction - Season ${newSeasonNum}`}
                  required
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Notes / Description (Optional)
                </label>
                <textarea
                  value={newSeasonNotes}
                  onChange={(e) => setNewSeasonNotes(e.target.value)}
                  rows={3}
                  placeholder="Details regarding this 36-day season campaign..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <div style={{ background: "rgba(168, 85, 247, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(168, 85, 247, 0.2)", fontSize: "0.8rem", color: "#c084fc" }}>
                <i className="fa-solid fa-circle-info" style={{ marginRight: "6px" }} />
                Creating a season automatically seeds <strong>36 Days</strong> organized across <strong>6 Weeks</strong>.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateSeasonModal(false)}
                  className="portal-btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSeason}
                  className="portal-btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #a855f7, #7c3aed)" }}
                >
                  {creatingSeason ? "Creating..." : "Initialize Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Live Standings Preview */}
      {showStandingsModal && (
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
            padding: "1.5rem",
          }}
        >
          <div
            className="portal-card"
            style={{
              width: "100%",
              maxWidth: "850px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "2rem",
              background: "#0f172a",
              border: "1px solid rgba(168, 85, 247, 0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  <i className="fa-solid fa-trophy" style={{ color: "#fbbf24", marginRight: "8px" }} />
                  Live Standings Preview
                </h2>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Season {selectedSeason?.season_number} • {selectedSeason?.name}
                </div>
              </div>
              <button
                onClick={() => setShowStandingsModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.4rem", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {loadingLiveStandings ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#c084fc", marginBottom: "1rem" }} />
                <div style={{ color: "var(--text-secondary)" }}>Calculating Leaderboard...</div>
              </div>
            ) : liveLeaderboard ? (
              <div>
                {/* MOTW Highlight from current week */}
                {liveLeaderboard.weeklyStandings?.[selectedWeek - 1]?.motw && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(168, 85, 247, 0.1))",
                      border: "1px solid rgba(234, 179, 8, 0.4)",
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <i className="fa-solid fa-medal" style={{ fontSize: "1.75rem", color: "#eab308" }} />
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "#eab308", textTransform: "uppercase" }}>
                          WEEK {selectedWeek} MOTW (Leader)
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>
                          {liveLeaderboard.weeklyStandings[selectedWeek - 1].motw.name}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "#eab308" }}>
                      {liveLeaderboard.weeklyStandings[selectedWeek - 1].motw.points} pts
                    </div>
                  </div>
                )}

                {/* Overall Table */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "10px" }}>Rank</th>
                      <th style={{ padding: "10px" }}>Member</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Days Played</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveLeaderboard.overallStandings?.slice(0, 20).map((row: any) => (
                      <tr
                        key={row.member_id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: row.rank === 1 ? "rgba(234, 179, 8, 0.06)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px", fontWeight: 800 }}>
                          {row.rank === 1 ? "👑 #1" : row.rank === 2 ? "🥈 #2" : row.rank === 3 ? "🥉 #3" : `#${row.rank}`}
                        </td>
                        <td style={{ padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{row.name}</span>
                          {row.r2g_id && (
                            <span style={{ fontSize: "0.7rem", color: "#c084fc" }}>({row.r2g_id})</span>
                          )}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)" }}>
                          {row.days_played} / 36
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: "1.05rem", color: row.rank === 1 ? "#eab308" : "#fff" }}>
                          {row.total_points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
