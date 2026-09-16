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
  updatePredictionSeasonSettings,
  fetchPredictionLeaderboard,
  PredictionSeason,
  PredictionDay,
  MemberDayScore,
} from "@/utils/solo/predictionServerActions";
import {
  fetchTournaments,
  fetchTournamentTypes,
} from "@/utils/solo/serverActions";

export default function PredictionAdminPage() {
  const [seasons, setSeasons] = useState<PredictionSeason[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<PredictionSeason | null>(null);
  const [days, setDays] = useState<PredictionDay[]>([]);
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [availableTournamentTypes, setAvailableTournamentTypes] = useState<any[]>([]);

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

  // Create Season Modal
  const [showCreateSeasonModal, setShowCreateSeasonModal] = useState<boolean>(false);
  const [newSeasonNum, setNewSeasonNum] = useState<number>(2);
  const [newSeasonName, setNewSeasonName] = useState<string>("");
  const [newSeasonDays, setNewSeasonDays] = useState<number>(36);
  const [newSeasonWeeks, setNewSeasonWeeks] = useState<number>(6);
  const [newSeasonDaysPerWeek, setNewSeasonDaysPerWeek] = useState<number>(6);
  const [newSeasonTypes, setNewSeasonTypes] = useState<string[]>(["solo"]);
  const [newSeasonTournamentIds, setNewSeasonTournamentIds] = useState<number[]>([]);
  const [newSeasonNotes, setNewSeasonNotes] = useState<string>("");
  const [creatingSeason, setCreatingSeason] = useState<boolean>(false);

  // Edit Season Settings Modal
  const [showEditSettingsModal, setShowEditSettingsModal] = useState<boolean>(false);
  const [editSeasonName, setEditSeasonName] = useState<string>("");
  const [editSeasonDays, setEditSeasonDays] = useState<number>(36);
  const [editSeasonWeeks, setEditSeasonWeeks] = useState<number>(6);
  const [editSeasonDaysPerWeek, setEditSeasonDaysPerWeek] = useState<number>(6);
  const [editSeasonTypes, setEditSeasonTypes] = useState<string[]>(["solo"]);
  const [editSeasonTournamentIds, setEditSeasonTournamentIds] = useState<number[]>([]);
  const [editSeasonStatus, setEditSeasonStatus] = useState<"active" | "completed" | "upcoming">("active");
  const [editSeasonNotes, setEditSeasonNotes] = useState<string>("");
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Live Standings Modal
  const [showStandingsModal, setShowStandingsModal] = useState<boolean>(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState<any>(null);
  const [loadingLiveStandings, setLoadingLiveStandings] = useState<boolean>(false);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 1. Initial Load: Fetch seasons, tournaments and types
  useEffect(() => {
    async function loadSeasons() {
      try {
        const [seasonsList, tourneys, types] = await Promise.all([
          fetchPredictionSeasons(),
          fetchTournaments().catch(() => []),
          fetchTournamentTypes().catch(() => [])
        ]);
        setSeasons(seasonsList);
        setAvailableTournaments(tourneys || []);
        setAvailableTournamentTypes(types || []);
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

        if (season) {
          setEditSeasonName(season.name);
          setEditSeasonDays(season.total_days || 36);
          setEditSeasonWeeks(season.total_weeks || 6);
          setEditSeasonDaysPerWeek(season.days_per_week || 6);
          setEditSeasonTypes(season.linked_tournament_types || ["solo"]);
          setEditSeasonTournamentIds(season.linked_tournament_ids || []);
          setEditSeasonStatus(season.status || "active");
          setEditSeasonNotes(season.notes || "");
        }

        if (seasonDays.length > 0) {
          const targetDay = season?.current_day || 1;
          const daysPerWeek = season?.days_per_week || 6;
          setSelectedDayNum(Math.min(seasonDays.length, targetDay));
          setSelectedWeek(Math.ceil(targetDay / daysPerWeek));
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

  // Create New Custom Season
  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonNum || !newSeasonName.trim()) {
      showToast("Please provide season number and name", "error");
      return;
    }
    setCreatingSeason(true);
    try {
      const res = await createPredictionSeason({
        seasonNumber: newSeasonNum,
        name: newSeasonName.trim(),
        totalDays: Number(newSeasonDays) || 36,
        totalWeeks: Number(newSeasonWeeks) || 6,
        daysPerWeek: Number(newSeasonDaysPerWeek) || 6,
        linkedTournamentTypes: newSeasonTypes,
        linkedTournamentIds: newSeasonTournamentIds,
        notes: newSeasonNotes.trim(),
      });

      if (res.success && res.season) {
        showToast(`🎉 Season ${newSeasonNum} created with ${newSeasonDays} custom days & ${newSeasonWeeks} weeks!`, "success");
        setShowCreateSeasonModal(false);
        setNewSeasonName("");
        setNewSeasonNotes("");
        setNewSeasonTypes(["solo"]);
        setNewSeasonTournamentIds([]);
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

  // Save Edit Season Settings
  const handleSaveSeasonSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeasonId) return;
    setSavingSettings(true);
    try {
      const res = await updatePredictionSeasonSettings(selectedSeasonId, {
        name: editSeasonName.trim(),
        total_days: Number(editSeasonDays) || 36,
        total_weeks: Number(editSeasonWeeks) || 6,
        days_per_week: Number(editSeasonDaysPerWeek) || 6,
        linked_tournament_types: editSeasonTypes,
        linked_tournament_ids: editSeasonTournamentIds,
        status: editSeasonStatus,
        notes: editSeasonNotes.trim(),
      });

      if (res.success && res.season) {
        showToast("✅ Season settings updated successfully!", "success");
        setShowEditSettingsModal(false);
        const { season: updatedSeason, days: updatedDays } = await fetchPredictionSeasonById(selectedSeasonId);
        setSelectedSeason(updatedSeason);
        setDays(updatedDays);
        const seasonsList = await fetchPredictionSeasons();
        setSeasons(seasonsList);
      } else {
        showToast(`❌ Error: ${res.error}`, "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Failed to update season settings", "error");
    } finally {
      setSavingSettings(false);
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

  // Dynamic Weeks & Days Calculations
  const totalWeeks = selectedSeason?.total_weeks || 6;
  const daysPerWeek = selectedSeason?.days_per_week || 6;
  const totalDays = selectedSeason?.total_days || 36;

  const weekStartDay = (selectedWeek - 1) * daysPerWeek + 1;
  const weekEndDay = Math.min(totalDays, selectedWeek * daysPerWeek);

  const currentWeekDays = days.filter(
    (d) => d.day_number >= weekStartDay && d.day_number <= weekEndDay
  );

  return (
    <div className="portal-root-wrapper" style={{ minHeight: "100vh", paddingBottom: "5rem" }}>
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

      <div className="portal-container" style={{ maxWidth: "1350px", width: "100%", padding: "1rem 1rem 3rem", gap: "1rem", alignItems: "stretch" }}>
        {/* Navigation Breadcrumb */}
        <div
          className="portal-breadcrumb"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            margin: 0,
          }}
        >
          <Link href="/solo-tour/admin" className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
            <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Admin Console
          </Link>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={handleOpenLiveStandings}
              className="portal-btn btn-secondary"
              style={{
                borderColor: "rgba(168, 85, 247, 0.4)",
                color: "#c084fc",
                background: "rgba(168, 85, 247, 0.08)",
                fontSize: "0.8rem",
                padding: "6px 14px",
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
                  fontSize: "0.8rem",
                  padding: "6px 14px",
                }}
              >
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: "6px" }} />
                Public Hub
              </Link>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <div className="rws-page-hero" style={{ padding: "0.25rem 0 0.5rem", margin: 0 }}>
          <div className="portal-page-badge" style={{ borderColor: "rgba(168, 85, 247, 0.4)", color: "#c084fc", marginBottom: "0.4rem" }}>
            <i className="fa-solid fa-square-poll-vertical" />
            100% Admin Configurable Prediction Engine
          </div>
          <h1 className="rws-hero-title" style={{ fontSize: "2rem", margin: 0 }}>MASTER OF PREDICTION</h1>
          <p className="rws-hero-sub" style={{ marginTop: "0.35rem", fontSize: "0.82rem" }}>
            Customize Total Days, Weeks &amp; Days per Week for every Season. Update member round points (10, 12, 15, etc.) and preview live standings.
          </p>
        </div>

        {/* Season Selector Bar with Settings Button */}
        <div
          className="portal-card"
          style={{
            padding: "1rem 1.25rem",
            margin: 0,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            background: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(168, 85, 247, 0.2)",
            borderRadius: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.75px" }}>
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
                padding: "6px 12px",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  Season {s.season_number} — {s.name} ({s.total_days} Days / {s.total_weeks} Wks)
                </option>
              ))}
            </select>

            {selectedSeason && (
              <span style={{ fontSize: "0.75rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "3px 8px", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
                {selectedSeason.total_days} Days • {selectedSeason.total_weeks} Weeks ({selectedSeason.days_per_week} Days/Wk)
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowEditSettingsModal(true)}
              className="portal-btn btn-secondary"
              style={{
                padding: "6px 14px",
                fontSize: "0.8rem",
                borderColor: "rgba(234, 179, 8, 0.4)",
                color: "#fbbf24",
                background: "rgba(234, 179, 8, 0.08)",
              }}
            >
              <i className="fa-solid fa-gear" style={{ marginRight: "6px" }} />
              Season Settings
            </button>

            <button
              onClick={() => setShowCreateSeasonModal(true)}
              className="portal-btn btn-primary"
              style={{
                padding: "6px 14px",
                fontSize: "0.8rem",
                background: "linear-gradient(135deg, #a855f7, #7c3aed)",
              }}
            >
              <i className="fa-solid fa-plus" style={{ marginRight: "6px" }} />
              New Custom Season
            </button>
          </div>
        </div>

        {/* Covered Competitions Ribbon */}
        {selectedSeason && (
          <div
            className="portal-card"
            style={{
              padding: "0.85rem 1.25rem",
              margin: 0,
              background: "rgba(15, 23, 42, 0.45)",
              border: "1px solid rgba(56, 189, 248, 0.2)",
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <i className="fa-solid fa-trophy" style={{ color: "#38bdf8", fontSize: "0.9rem" }} />
                <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Covered Competitions in Season {selectedSeason.season_number} ({selectedSeason.covered_tournaments?.length || 0})
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>Linked Types:</span>
                {(selectedSeason.linked_tournament_types || ["solo"]).map(t => (
                  <span key={t} style={{ fontSize: "0.68rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "rgba(168, 85, 247, 0.15)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.3)", textTransform: "uppercase" }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {(selectedSeason.covered_tournaments && selectedSeason.covered_tournaments.length > 0) ? (
                selectedSeason.covered_tournaments.map((tourney) => (
                  <Link
                    key={tourney.id}
                    href={`/solo-tour/admin/tournaments/${tourney.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "rgba(30, 41, 59, 0.7)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      color: "#fff",
                      textDecoration: "none",
                      transition: "all 0.2s ease"
                    }}
                    title="Click to view tournament details"
                  >
                    <span style={{ fontWeight: 700 }}>{tourney.name}</span>
                    <span style={{ fontSize: "0.65rem", color: "#38bdf8", background: "rgba(56, 189, 248, 0.15)", padding: "1px 5px", borderRadius: "3px" }}>
                      {tourney.format_type}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: tourney.status === "completed" ? "#34d399" : tourney.status === "upcoming" ? "#facc15" : "#38bdf8" }}>
                      ● {tourney.status || "active"}
                    </span>
                  </Link>
                ))
              ) : (
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                  No tournaments currently active for this season&apos;s linked types. Go to Tournament Manager or edit Season Settings to link tournaments.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Dynamic Weeks Tab Bar */}
        <div style={{ margin: 0 }}>
          <div
            style={{
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((w) => {
              const isActive = selectedWeek === w;
              const wStart = (w - 1) * daysPerWeek + 1;
              const wEnd = Math.min(totalDays, w * daysPerWeek);
              const completedCount = days.filter(
                (d) => d.day_number >= wStart && d.day_number <= wEnd && d.is_completed
              ).length;
              const totalInWeek = Math.max(1, wEnd - wStart + 1);

              return (
                <button
                  key={w}
                  onClick={() => {
                    setSelectedWeek(w);
                    setSelectedDayNum(wStart);
                  }}
                  style={{
                    flex: "1 0 auto",
                    minWidth: "120px",
                    padding: "8px 12px",
                    borderRadius: "8px",
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 800, fontSize: "0.85rem", color: isActive ? "#c084fc" : "#fff" }}>
                      WEEK {w}
                    </span>
                    {completedCount === totalInWeek && (
                      <span style={{ color: "#10b981", fontSize: "0.7rem", fontWeight: 700 }}>
                        <i className="fa-solid fa-circle-check" />
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.7rem", opacity: 0.8 }}>
                    Days {wStart}–{wEnd} ({completedCount}/{totalInWeek} done)
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Days of Current Week Selector */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(auto-fill, minmax(110px, 1fr))`,
            gap: "8px",
            margin: 0,
          }}
        >
          {currentWeekDays.map((d) => {
            const isSelected = selectedDayNum === d.day_number;
            return (
              <button
                key={d.day_number}
                onClick={() => setSelectedDayNum(d.day_number)}
                style={{
                  padding: "10px 8px",
                  borderRadius: "10px",
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
                <div style={{ fontSize: "0.65rem", color: isSelected ? "#38bdf8" : "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Round {d.day_number}
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 900, color: "#fff", margin: "1px 0" }}>
                  DAY {d.day_number}
                </div>
                <div style={{ fontSize: "0.65rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
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
            padding: "1.1rem 1.25rem",
            margin: 0,
            background: "rgba(15, 23, 42, 0.7)",
            border: "1px solid rgba(56, 189, 248, 0.2)",
            borderRadius: "12px",
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
                  Week {selectedWeek} of {totalWeeks} • Day {selectedDayNum} of {totalDays}
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
                placeholder="e.g. Round matchday notes"
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
            gap: "0.75rem",
            margin: 0,
          }}
        >
          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#fff" }}>
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
            </div>
          ) : (
            filteredMembers.map((m) => {
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

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
              Day {selectedDayNum} (Week {selectedWeek} of {totalWeeks})
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

      {/* Modal: Edit Season Settings */}
      {showEditSettingsModal && (
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
              border: "1px solid rgba(234, 179, 8, 0.4)",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                <i className="fa-solid fa-gear" style={{ color: "#fbbf24", marginRight: "8px" }} />
                Customize Season {selectedSeason?.season_number} Settings
              </h2>
              <button
                onClick={() => setShowEditSettingsModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSaveSeasonSettings} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Season Name
                </label>
                <input
                  type="text"
                  value={editSeasonName}
                  onChange={(e) => setEditSeasonName(e.target.value)}
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

              {/* Grid: Total Days, Total Weeks, Days Per Week */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Total Days / Rounds
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editSeasonDays}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setEditSeasonDays(d);
                      if (editSeasonDaysPerWeek > 0) {
                        setEditSeasonWeeks(Math.ceil(d / editSeasonDaysPerWeek));
                      }
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Days per Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={editSeasonDaysPerWeek}
                    onChange={(e) => {
                      const dpw = Number(e.target.value);
                      setEditSeasonDaysPerWeek(dpw);
                      if (dpw > 0) {
                        setEditSeasonWeeks(Math.ceil(editSeasonDays / dpw));
                      }
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Total Weeks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={editSeasonWeeks}
                    onChange={(e) => setEditSeasonWeeks(Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Season Status
                </label>
                <select
                  value={editSeasonStatus}
                  onChange={(e) => setEditSeasonStatus(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "rgba(30, 41, 59, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontWeight: "700",
                  }}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>

              {/* Tournament Types Inclusion */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#c084fc", fontWeight: 800, marginBottom: "6px" }}>
                  <i className="fa-solid fa-layer-group" style={{ marginRight: "6px" }} />
                  Linked Tournament Types (Auto-Include All Tournaments of These Types)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {availableTournamentTypes.map((tp) => {
                    const isChecked = editSeasonTypes.includes(tp.name);
                    return (
                      <label key={tp.name} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#fff", cursor: "pointer", background: isChecked ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.04)", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${isChecked ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.08)"}` }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditSeasonTypes((prev) => [...prev, tp.name]);
                            } else {
                              setEditSeasonTypes((prev) => prev.filter((t) => t !== tp.name));
                            }
                          }}
                          style={{ accentColor: "#a855f7" }}
                        />
                        <span style={{ fontWeight: 600 }}>{tp.display_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Individual Tournaments Inclusion */}
              {availableTournaments.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#38bdf8", fontWeight: 800, marginBottom: "6px" }}>
                    <i className="fa-solid fa-sitemap" style={{ marginRight: "6px" }} />
                    Individual Tournaments (Force-Include Specific Tournaments)
                  </label>
                  <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {availableTournaments.map((t) => {
                      const isTypeCovered = editSeasonTypes.includes(t.tournament_type);
                      const isIdChecked = editSeasonTournamentIds.includes(t.id);
                      const isChecked = isTypeCovered || isIdChecked;
                      const isExcluded = t.include_in_prediction === false;
                      return (
                        <label key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: isExcluded ? "#94a3b8" : "#fff", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", background: isChecked ? "rgba(56, 189, 248, 0.08)" : "transparent" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isTypeCovered}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditSeasonTournamentIds((prev) => [...prev, t.id]);
                                } else {
                                  setEditSeasonTournamentIds((prev) => prev.filter((id) => id !== t.id));
                                }
                              }}
                              style={{ accentColor: "#38bdf8" }}
                            />
                            <span>{t.name}</span>
                          </span>
                          <span style={{ fontSize: "0.7rem", color: isExcluded ? "#ef4444" : isTypeCovered ? "#c084fc" : "#38bdf8" }}>
                            {isExcluded ? "🚫 Excluded in Tourney" : isTypeCovered ? `via type [${t.tournament_type}]` : "manual"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Notes / Description
                </label>
                <textarea
                  value={editSeasonNotes}
                  onChange={(e) => setEditSeasonNotes(e.target.value)}
                  rows={2}
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowEditSettingsModal(false)}
                  className="portal-btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="portal-btn btn-primary"
                  style={{ background: "linear-gradient(135deg, #fbbf24, #d97706)", color: "#000", fontWeight: 800 }}
                >
                  {savingSettings ? "Saving..." : "Apply & Sync Days"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create New Season */}
      {showCreateSeasonModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
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
              maxWidth: "540px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
              background: "#0f172a",
              border: "1px solid rgba(168, 85, 247, 0.3)",
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                <i className="fa-solid fa-folder-plus" style={{ color: "#c084fc", marginRight: "8px" }} />
                Create Custom Prediction Season
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

              {/* Total Days, Weeks, Days Per Week */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Total Days / Rounds
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newSeasonDays}
                    onChange={(e) => {
                      const d = Number(e.target.value);
                      setNewSeasonDays(d);
                      if (newSeasonDaysPerWeek > 0) {
                        setNewSeasonWeeks(Math.ceil(d / newSeasonDaysPerWeek));
                      }
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Days per Week
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={newSeasonDaysPerWeek}
                    onChange={(e) => {
                      const dpw = Number(e.target.value);
                      setNewSeasonDaysPerWeek(dpw);
                      if (dpw > 0) {
                        setNewSeasonWeeks(Math.ceil(newSeasonDays / dpw));
                      }
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                    Total Weeks
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={newSeasonWeeks}
                    onChange={(e) => setNewSeasonWeeks(Number(e.target.value))}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      textAlign: "center",
                    }}
                  />
                </div>
              </div>

              {/* Tournament Types Inclusion */}
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#c084fc", fontWeight: 800, marginBottom: "6px" }}>
                  <i className="fa-solid fa-layer-group" style={{ marginRight: "6px" }} />
                  Linked Tournament Types (Auto-Include All Tournaments of These Types)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {availableTournamentTypes.map((tp) => {
                    const isChecked = newSeasonTypes.includes(tp.name);
                    return (
                      <label key={tp.name} style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "#fff", cursor: "pointer", background: isChecked ? "rgba(168, 85, 247, 0.2)" : "rgba(255, 255, 255, 0.04)", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${isChecked ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.08)"}` }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSeasonTypes((prev) => [...prev, tp.name]);
                            } else {
                              setNewSeasonTypes((prev) => prev.filter((t) => t !== tp.name));
                            }
                          }}
                          style={{ accentColor: "#a855f7" }}
                        />
                        <span style={{ fontWeight: 600 }}>{tp.display_name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Specific Individual Tournaments Inclusion */}
              {availableTournaments.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#38bdf8", fontWeight: 800, marginBottom: "6px" }}>
                    <i className="fa-solid fa-sitemap" style={{ marginRight: "6px" }} />
                    Individual Tournaments (Force-Include Specific Tournaments)
                  </label>
                  <div style={{ maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", background: "rgba(30, 41, 59, 0.5)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {availableTournaments.map((t) => {
                      const isTypeCovered = newSeasonTypes.includes(t.tournament_type);
                      const isIdChecked = newSeasonTournamentIds.includes(t.id);
                      const isChecked = isTypeCovered || isIdChecked;
                      const isExcluded = t.include_in_prediction === false;
                      return (
                        <label key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: isExcluded ? "#94a3b8" : "#fff", cursor: "pointer", padding: "4px 6px", borderRadius: "4px", background: isChecked ? "rgba(56, 189, 248, 0.08)" : "transparent" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isTypeCovered}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewSeasonTournamentIds((prev) => [...prev, t.id]);
                                } else {
                                  setNewSeasonTournamentIds((prev) => prev.filter((id) => id !== t.id));
                                }
                              }}
                              style={{ accentColor: "#38bdf8" }}
                            />
                            <span>{t.name}</span>
                          </span>
                          <span style={{ fontSize: "0.7rem", color: isExcluded ? "#ef4444" : isTypeCovered ? "#c084fc" : "#38bdf8" }}>
                            {isExcluded ? "🚫 Excluded in Tourney" : isTypeCovered ? `via type [${t.tournament_type}]` : "manual"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 700, marginBottom: "6px" }}>
                  Notes / Description (Optional)
                </label>
                <textarea
                  value={newSeasonNotes}
                  onChange={(e) => setNewSeasonNotes(e.target.value)}
                  rows={2}
                  placeholder="Details regarding this custom season campaign..."
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "0.5rem" }}>
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
                  {creatingSeason ? "Creating..." : "Initialize Custom Season"}
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
              borderRadius: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#fff", margin: 0 }}>
                  <i className="fa-solid fa-trophy" style={{ color: "#fbbf24", marginRight: "8px" }} />
                  Live Standings Preview
                </h2>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Season {selectedSeason?.season_number} • {selectedSeason?.name} ({selectedSeason?.total_days} Days / {selectedSeason?.total_weeks} Weeks)
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
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "10px" }}>Pos</th>
                      <th style={{ padding: "10px" }}>Member</th>
                      <th style={{ padding: "10px", textAlign: "center" }}>Days Played</th>
                      <th style={{ padding: "10px", textAlign: "right" }}>Total Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveLeaderboard.overallStandings?.map((row: any) => (
                      <tr
                        key={row.member_id}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          background: row.rank === 1 && row.total_points > 0 ? "rgba(234, 179, 8, 0.06)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px", fontWeight: 800 }}>
                          {row.rank === 1 && row.total_points > 0 ? "👑 #1" : `#${row.rank}`}
                        </td>
                        <td style={{ padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{row.name}</span>
                          {row.r2g_id && (
                            <span style={{ fontSize: "0.7rem", color: "#c084fc" }}>({row.r2g_id})</span>
                          )}
                        </td>
                        <td style={{ padding: "10px", textAlign: "center", color: "var(--text-secondary)" }}>
                          {row.days_played} / {selectedSeason?.total_days || 36}
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontWeight: 900, fontSize: "1.05rem", color: row.rank === 1 && row.total_points > 0 ? "#eab308" : "#fff" }}>
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
