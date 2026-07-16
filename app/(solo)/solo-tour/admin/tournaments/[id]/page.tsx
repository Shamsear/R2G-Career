"use client";
import { useEffect, useState, useTransition, use, useRef, useMemo } from "react";
import Link from "next/link";
import "../../../../../portal.css";
import "../../admin.css";

import {
  fetchTournamentById,
  fetchFinancialRules,
  fetchFixtures,
  fetchRegisteredClubs,
  createFixture,
  updateFixture,
  deleteFixture,
  fetchTournamentTypes,
  updateTournamentDetails,
  fetchTournamentClubs,
  addClubToTournament,
  addMultipleClubsToTournament,
  removeClubFromTournament,
  assignClubToGroup,
  autoAssignGroups,
  clearAllGroups,
  autoGenerateFixtures,
  fetchTournamentStandings
} from "@/utils/solo/serverActions";

export default function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const tournamentId = parseInt(resolvedParams.id);

  const [tournament, setTournament] = useState<any>(null);
  const [financialRules, setFinancialRules] = useState<any[]>([]);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);
  const [activeRound, setActiveRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [activeSubTab, setActiveSubTab] = useState<string>("boot");
  const [clubs, setClubs] = useState<any[]>([]);
  const [tournamentTypes, setTournamentTypes] = useState<any[]>([]);

  // Team Edit States
  const [editingClubId, setEditingClubId] = useState<number | null>(null);
  const [editingCustomName, setEditingCustomName] = useState<string>("");
  const [editingCustomLogo, setEditingCustomLogo] = useState<string>("");
  const [editingUploadingLogo, setEditingUploadingLogo] = useState<boolean>(false);


  
  // Participating clubs
  const [tournamentClubs, setTournamentClubs] = useState<any[]>([]);
  const [selectedClubsToAdd, setSelectedClubsToAdd] = useState<number[]>([]);
  const [customNamesMap, setCustomNamesMap] = useState<Record<number, string>>({});
  const [customLogosMap, setCustomLogosMap] = useState<Record<number, string>>({});
  const [uploadingLogosMap, setUploadingLogosMap] = useState<Record<number, boolean>>({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);
  const [useExistingClubToAdd, setUseExistingClubToAdd] = useState(true);
  const [customTeamNameToAdd, setCustomTeamNameToAdd] = useState("");
  const [customLogoPathToAdd, setCustomLogoPathToAdd] = useState("");
  const [generateLegs, setGenerateLegs] = useState("single");

  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFormatType, setEditFormatType] = useState("League");
  const [editFinancialRuleId, setEditFinancialRuleId] = useState("");
  const [editTournamentType, setEditTournamentType] = useState("solo");
  const [editNumGroups, setEditNumGroups] = useState("");
  const [editTeamsPerGroup, setEditTeamsPerGroup] = useState("");
  const [editQualifiedPerGroup, setEditQualifiedPerGroup] = useState("");
  const [editNumTeams, setEditNumTeams] = useState("");
  const [editDivisionTier, setEditDivisionTier] = useState("");
  const [editPromotionCount, setEditPromotionCount] = useState("");
  const [editRelegationCount, setEditRelegationCount] = useState("");

  // Dynamically compute stats from match events
  const stats = useMemo(() => {
    const goalScorers: Record<string, number> = {};
    const playmakers: Record<string, number> = {};
    const discipline: Record<string, { yellow: number; red: number }> = {};

    fixtures.forEach(f => {
      if (f.matchEvents && Array.isArray(f.matchEvents)) {
        f.matchEvents.forEach(evt => {
          if (evt.type === 'goal') {
            if (evt.player) {
              goalScorers[evt.player] = (goalScorers[evt.player] || 0) + 1;
            }
            if (evt.detail && evt.detail.toLowerCase().includes("assist by ")) {
              const idx = evt.detail.toLowerCase().indexOf("assist by ");
              const assistPart = evt.detail.substring(idx + 10).trim();
              if (assistPart) {
                playmakers[assistPart] = (playmakers[assistPart] || 0) + 1;
              }
            }
          } else if (evt.type === 'yellow_card') {
            if (evt.player) {
              if (!discipline[evt.player]) discipline[evt.player] = { yellow: 0, red: 0 };
              discipline[evt.player].yellow += 1;
            }
          } else if (evt.type === 'red_card') {
            if (evt.player) {
              if (!discipline[evt.player]) discipline[evt.player] = { yellow: 0, red: 0 };
              discipline[evt.player].red += 1;
            }
          }
        });
      }
    });

    const sortedScorers = Object.entries(goalScorers)
      .map(([player, goals]) => ({ player, goals }))
      .sort((a, b) => b.goals - a.goals)
      .slice(0, 5);

    const sortedPlaymakers = Object.entries(playmakers)
      .map(([player, assists]) => ({ player, assists }))
      .sort((a, b) => b.assists - a.assists)
      .slice(0, 5);

    const sortedDiscipline = Object.entries(discipline)
      .map(([player, cards]) => ({ player, ...cards }))
      .sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow))
      .slice(0, 5);

    return { scorers: sortedScorers, playmakers: sortedPlaymakers, cards: sortedDiscipline };
  }, [fixtures]);

  // Group standings by group name if applicable
  const groupedStandings = useMemo(() => {
    if (!standings || standings.length === 0) return {};
    const groups: Record<string, any[]> = {};
    standings.forEach(row => {
      const gName = row.group_name || "A";
      if (!groups[gName]) groups[gName] = [];
      groups[gName].push(row);
    });
    // Sort keys alphabetically
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key].sort((a, b) => b.points - a.points || b.goal_difference - a.goal_difference || b.goals_scored - a.goals_scored);
      return acc;
    }, {} as Record<string, any[]>);
  }, [standings]);

  // Dynamically compute team stats for Boot, Ball, and Glove
  const teamStats = useMemo(() => {
    const goalsScored: Record<string, { logo: string; manager: string; value: number }> = {};
    const winsCount: Record<string, { logo: string; manager: string; value: number }> = {};
    const cleanSheets: Record<string, { logo: string; manager: string; value: number }> = {};

    // Initialize all participating teams
    tournamentClubs.forEach(tc => {
      goalsScored[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", value: 0 };
      winsCount[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", value: 0 };
      cleanSheets[tc.name] = { logo: tc.logo_path || "", manager: tc.manager || "Unknown", value: 0 };
    });

    // Parse standings for goals
    standings.forEach(row => {
      const name = row.club_name;
      const logo = row.club_logo || "";
      const existing = goalsScored[name];
      goalsScored[name] = { 
        logo, 
        manager: existing?.manager || "Unknown", 
        value: row.goals_scored || 0 
      };
    });

    // Parse fixtures for wins and clean sheets
    fixtures.forEach(f => {
      const isFinished = f.homeScore !== null && f.awayScore !== null;
      if (isFinished) {
        const hs = f.homeScore || 0;
        const as = f.awayScore || 0;

        // Wins (Golden Ball)
        if (hs > as) {
          if (winsCount[f.homeClub]) winsCount[f.homeClub].value += 1;
        } else if (as > hs) {
          if (winsCount[f.awayClub]) winsCount[f.awayClub].value += 1;
        }

        // Clean Sheets (Golden Glove)
        if (hs === 0) {
          if (cleanSheets[f.awayClub]) cleanSheets[f.awayClub].value += 1;
        }
        if (as === 0) {
          if (cleanSheets[f.homeClub]) cleanSheets[f.homeClub].value += 1;
        }
      }
    });

    const sortedBoot = Object.entries(goalsScored)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedBall = Object.entries(winsCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    const sortedGlove = Object.entries(cleanSheets)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);

    return { boot: sortedBoot, ball: sortedBall, glove: sortedGlove };
  }, [fixtures, standings, tournamentClubs]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      const [tourney, rules, matches, clubsData, types, tourneyClubs, standingsData] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchFinancialRules(),
        fetchFixtures(tournamentId),
        fetchRegisteredClubs(true),
        fetchTournamentTypes(),
        fetchTournamentClubs(tournamentId),
        fetchTournamentStandings(tournamentId)
      ]);
      setTournament(tourney);
      setFinancialRules(rules || []);
      setFixtures(matches || []);
      setClubs(clubsData || []);
      setTournamentTypes(types || []);
      setTournamentClubs(tourneyClubs || []);
      setStandings(standingsData || []);

      if (tourney) {
        setEditName(tourney.name);
        setEditFormatType(tourney.format_type);
        setEditFinancialRuleId(tourney.financial_rule_id ? tourney.financial_rule_id.toString() : "");
        setEditTournamentType(tourney.tournament_type || "solo");
        setEditNumGroups(tourney.num_groups !== null ? tourney.num_groups.toString() : "");
        setEditTeamsPerGroup(tourney.teams_per_group !== null ? tourney.teams_per_group.toString() : "");
        setEditQualifiedPerGroup(tourney.qualified_per_group !== null ? tourney.qualified_per_group.toString() : "");
        setEditNumTeams(tourney.num_teams !== null ? tourney.num_teams.toString() : "");
        setEditDivisionTier(tourney.division_tier !== null && tourney.division_tier !== undefined ? tourney.division_tier.toString() : "");
        setEditPromotionCount(tourney.promotion_count !== null && tourney.promotion_count !== undefined ? tourney.promotion_count.toString() : "");
        setEditRelegationCount(tourney.relegation_count !== null && tourney.relegation_count !== undefined ? tourney.relegation_count.toString() : "");
      }
    } catch {
      showToast("Error loading tournament details!");
    }
  };

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const handleUpdateTournament = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName) return showToast("Tournament name required!");
    startTransition(async () => {
      try {
        // Force no financial rule for RWS and Special Tour
        const isNoFinancialType = editTournamentType === 'rws' || editTournamentType === 'special';
        const ruleId = (!isNoFinancialType && editFinancialRuleId) ? parseInt(editFinancialRuleId) : null;
        const groups = editNumGroups ? parseInt(editNumGroups) : null;
        const totalTeams = editNumTeams ? parseInt(editNumTeams) : null;
        const divTier = editDivisionTier ? parseInt(editDivisionTier) : null;
        const promo = editPromotionCount ? parseInt(editPromotionCount) : 0;
        const releg = editRelegationCount ? parseInt(editRelegationCount) : 0;

        // Auto-calculate teams per group if total teams and groups are defined
        let teams = null;
        if (totalTeams && groups && groups > 0) {
          teams = Math.floor(totalTeams / groups);
        }

        const qualified = editQualifiedPerGroup ? parseInt(editQualifiedPerGroup) : null;

        await updateTournamentDetails(
          tournamentId,
          editName,
          editFormatType,
          ruleId,
          editTournamentType,
          groups,
          teams,
          qualified,
          totalTeams,
          divTier,
          promo,
          releg
        );
        showToast("Tournament details updated!");
        setIsEditing(false);
        loadData();
      } catch (error: any) {
        showToast("Failed to update tournament details!");
      }
    });
  };



  const handleUpdateFixtureScore = (fixtureId: number, home: string | number, away: string | number, status: string = 'played') => {
    const homeScore = home === "" ? null : parseInt(home.toString());
    const awayScore = away === "" ? null : parseInt(away.toString());
    startTransition(async () => {
      try {
        await updateFixture(fixtureId, homeScore, awayScore, status);
        showToast("Match status and score updated!");
        loadData();
      } catch {
        showToast("Error updating match!");
      }
    });
  };

  const handleDeleteFixture = (id: number) => {
    if (!confirm("Are you sure you want to delete this match?")) return;
    startTransition(async () => {
      try {
        await deleteFixture(id);
        showToast("Fixture deleted!");
        loadData();
      } catch {
        showToast("Error deleting fixture!");
      }
    });
  };

  const handleAddClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedClubsToAdd.length === 0) return showToast("Select at least one team to add!");

    startTransition(async () => {
      try {
        if (selectedClubsToAdd.length === 1 && !useExistingClubToAdd) {
          // Single custom team with custom logo URL/upload
          await addClubToTournament(
            tournamentId, 
            selectedClubsToAdd[0],
            customTeamNameToAdd || customNamesMap[selectedClubsToAdd[0]] || null,
            false,
            customLogoPathToAdd
          );
          showToast("Custom team added to tournament!");
          setCustomTeamNameToAdd("");
          setCustomLogoPathToAdd("");
          setUseExistingClubToAdd(true);
        } else {
          // Batch add multiple teams (with custom names and logos if configured)
          const names = selectedClubsToAdd.map(id => customNamesMap[id]?.trim() || null);
          const logos = selectedClubsToAdd.map(id => customLogosMap[id]?.trim() || null);
          await addMultipleClubsToTournament(tournamentId, selectedClubsToAdd, names, logos);
          showToast(`${selectedClubsToAdd.length} teams added to tournament!`);
        }
        setSelectedClubsToAdd([]);
        setCustomNamesMap({});
        setCustomLogosMap({});
        loadData();
      } catch {
        showToast("Error adding teams!");
      }
    });
  };

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `tour-logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: "/tournaments/custom-logos"
      });
      setCustomLogoPathToAdd(res.url);
      showToast("Logo uploaded successfully to ImageKit!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload logo to ImageKit.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoUploadForClub = async (clubId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogosMap(prev => ({ ...prev, [clubId]: true }));
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `tour-logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: "/tournaments/custom-logos"
      });
      setCustomLogosMap(prev => ({ ...prev, [clubId]: res.url }));
      showToast("Logo uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload logo.");
    } finally {
      setUploadingLogosMap(prev => ({ ...prev, [clubId]: false }));
    }
  };

  const handleEditLogoUpload = async (clubId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditingUploadingLogo(true);
    try {
      const { uploadImage } = await import("@/lib/imagekit/upload");
      const res = await uploadImage({
        file,
        fileName: `tour-logo-${Date.now()}-${file.name.replace(/\s+/g, "-")}`,
        folder: "/tournaments/custom-logos"
      });
      setEditingCustomLogo(res.url);
      showToast("Logo uploaded successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to upload logo.");
    } finally {
      setEditingUploadingLogo(false);
    }
  };

  const handleSaveEditClub = (clubId: number) => {
    startTransition(async () => {
      try {
        const useExisting = !editingCustomName.trim();
        await addClubToTournament(
          tournamentId,
          clubId,
          editingCustomName.trim() || null,
          useExisting,
          editingCustomLogo.trim() || null
        );
        showToast("Team custom name & logo updated!");
        setEditingClubId(null);
        loadData();
      } catch (err) {
        console.error(err);
        showToast("Failed to update team details!");
      }
    });
  };

  const handleRemoveClub = (clubId: number) => {
    if (!confirm("Are you sure you want to remove this team from the tournament? This deletes their standing record.")) return;
    startTransition(async () => {
      try {
        await removeClubFromTournament(tournamentId, clubId);
        showToast("Team removed from tournament!");
        loadData();
      } catch {
        showToast("Error removing team!");
      }
    });
  };

  const handleGroupChange = (clubId: number, groupName: string) => {
    startTransition(async () => {
      try {
        await assignClubToGroup(tournamentId, clubId, groupName || null);
        showToast("Group updated!");
        loadData();
      } catch {
        showToast("Error updating group assignment!");
      }
    });
  };

  const handleAutoAssignGroups = () => {
    if (!tournament.num_groups) return showToast("Define number of groups first!");
    startTransition(async () => {
      try {
        await autoAssignGroups(tournamentId, tournament.num_groups);
        showToast("Groups auto-assigned successfully!");
        loadData();
      } catch {
        showToast("Error auto-assigning groups!");
      }
    });
  };

  const handleClearAllGroups = () => {
    if (!confirm("Are you sure you want to clear all group assignments?")) return;
    startTransition(async () => {
      try {
        await clearAllGroups(tournamentId);
        showToast("All group assignments cleared!");
        loadData();
      } catch {
        showToast("Error clearing group assignments!");
      }
    });
  };

  const handleAutoFillTeams = () => {
    const availableClubs = clubs.filter(c => !tournamentClubs.some(tc => tc.club_id === c.id));
    if (availableClubs.length === 0) return showToast("No more registered clubs available to add!");
    
    let toAdd = availableClubs;
    if (tournament && tournament.num_teams) {
      const slotsRemaining = tournament.num_teams - tournamentClubs.length;
      if (slotsRemaining <= 0) return showToast("Tournament is already full!");
      toAdd = availableClubs.slice(0, slotsRemaining);
    }

    const ids = toAdd.map(c => c.id);
    startTransition(async () => {
      try {
        await addMultipleClubsToTournament(tournamentId, ids);
        showToast(`Successfully filled ${ids.length} teams!`);
        loadData();
      } catch {
        showToast("Error filling teams!");
      }
    });
  };

  const handleAutoGenerate = () => {
    if (tournamentClubs.length < 2) {
      return showToast("Need at least 2 participating teams to generate matchups!");
    }
    if (!confirm(`Are you sure you want to auto-generate fixtures for this tournament? This will clear all existing matches for this stage!`)) return;
    startTransition(async () => {
      try {
        const res = await autoGenerateFixtures(tournamentId, generateLegs);
        showToast(`Generated ${res.count} matchups successfully!`);
        loadData();
      } catch (err: any) {
        showToast(err.message || "Error generating matchups!");
      }
    });
  };

  if (!tournament) {
    return (
      <div className="portal-root-wrapper" data-module="tournaments">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        
        <div className="portal-container" style={{ maxWidth: "1200px" }}>
          {/* Breadcrumb Skeleton */}
          <div className="portal-breadcrumb" style={{ opacity: 0.5, marginBottom: "1.5rem", width: "100%" }}>
            <div className="skeleton" style={{ width: "160px", height: "32px", borderRadius: "6px" }} />
          </div>

          {/* Header Skeleton */}
          <div className="portal-header" style={{ marginBottom: "2rem", width: "100%" }}>
            <div className="skeleton" style={{ width: "120px", height: "20px", borderRadius: "4px", marginBottom: "0.75rem" }} />
            <div className="skeleton" style={{ width: "380px", height: "42px", borderRadius: "8px", marginBottom: "0.5rem" }} />
            <div className="skeleton" style={{ width: "240px", height: "16px", borderRadius: "4px" }} />
          </div>

          {/* 2-Column Sidebar Layout Skeleton */}
          <div className="financial-layout" style={{ width: "100%" }}>
            {/* Left Sidebar Skeletons */}
            <div className="financial-sidebar" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Tour Info Card Skeleton */}
              <div className="admin-card skeleton" style={{ marginTop: 0, padding: "1.5rem", minHeight: "180px" }}>
                <div className="skeleton" style={{ width: "60%", height: "20px", borderRadius: "4px", marginBottom: "1.25rem", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="skeleton" style={{ width: "85%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                  <div className="skeleton" style={{ width: "70%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                  <div className="skeleton" style={{ width: "90%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                  <div className="skeleton" style={{ width: "65%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                </div>
              </div>

              {/* Teams Card Skeleton */}
              <div className="admin-card skeleton" style={{ padding: "1.5rem", minHeight: "220px" }}>
                <div className="skeleton" style={{ width: "75%", height: "20px", borderRadius: "4px", marginBottom: "1.25rem", background: "rgba(255,255,255,0.06)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
                        <div className="skeleton" style={{ width: "20px", height: "20px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                        <div className="skeleton" style={{ width: "60%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                      </div>
                      <div className="skeleton" style={{ width: "14px", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Main Panel Skeleton */}
            <div className="financial-main">
              <div className="admin-card skeleton" style={{ marginTop: 0, padding: "1.5rem", minHeight: "420px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <div className="skeleton" style={{ width: "40%", height: "24px", borderRadius: "4px", background: "rgba(255,255,255,0.06)" }} />
                  <div className="skeleton" style={{ width: "120px", height: "30px", borderRadius: "6px", background: "rgba(255,255,255,0.06)" }} />
                </div>
                
                {/* Table Header Skeleton */}
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "0.75rem", marginBottom: "0.75rem", display: "flex" }}>
                  <div className="skeleton" style={{ width: "20%", height: "14px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                  <div className="skeleton" style={{ width: "50%", height: "14px", borderRadius: "3px", marginLeft: "10%", background: "rgba(255,255,255,0.04)" }} />
                  <div className="skeleton" style={{ width: "20%", height: "14px", borderRadius: "3px", marginLeft: "auto", background: "rgba(255,255,255,0.04)" }} />
                </div>

                {/* Table Rows Skeletons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.03)", paddingBottom: "1rem" }}>
                      <div className="skeleton" style={{ width: "15%", height: "16px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                      <div style={{ display: "flex", gap: "0.5rem", width: "45%", marginLeft: "10%", alignItems: "center" }}>
                        <div className="skeleton" style={{ width: "40%", height: "16px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                        <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.75rem" }}>vs</span>
                        <div className="skeleton" style={{ width: "40%", height: "16px", borderRadius: "3px", background: "rgba(255,255,255,0.04)" }} />
                      </div>
                      <div className="skeleton" style={{ width: "60px", height: "24px", borderRadius: "4px", marginLeft: "auto", background: "rgba(255,255,255,0.04)" }} />
                      <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "4px", marginLeft: "1rem", background: "rgba(255,255,255,0.04)" }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const linkedRule = financialRules.find(r => r.id === tournament.financial_rule_id);

  // Find unique rounds and filter matches
  const rounds = Array.from(new Set(fixtures.map(f => f.roundNumber || 1))).sort((a, b) => a - b);
  const roundFixtures = fixtures.filter(f => (f.roundNumber || 1) === activeRound);

  return (
    <div className="portal-root-wrapper" data-module="tournaments">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      {toast && <div className="toast-popup"><i className="fa-solid fa-circle-check" />{toast}</div>}

      <div className="portal-container" style={{ maxWidth: "1200px" }}>
        
        {/* Breadcrumb */}
        <div className="portal-breadcrumb" style={{ width: "100%" }}>
          <Link href="/solo-tour/admin/tournaments" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournaments
          </Link>
        </div>

        {/* Header */}
        <div className="portal-header" style={{ width: "100%" }}>
          <div className="portal-page-badge">
            <i className="fa-solid fa-sitemap" />
            Tournament Console
          </div>
          <h1 className="portal-title">{tournament.name}</h1>
          <p className="portal-subtitle">
            Format: <strong>{tournament.format_type}</strong> | Active Season: <strong>Season {tournament.season_number}</strong>
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs-filter" style={{ marginBottom: "1.5rem", display: "flex", gap: "0.5rem", width: "100%" }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <i className="fa-solid fa-circle-info" style={{ marginRight: "6px" }} /> Overview
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "teams" ? "active" : ""}`}
            onClick={() => setActiveTab("teams")}
          >
            <i className="fa-solid fa-users" style={{ marginRight: "6px" }} /> Teams ({tournamentClubs.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "table" ? "active" : ""}`}
            onClick={() => setActiveTab("table")}
          >
            <i className="fa-solid fa-list-ol" style={{ marginRight: "6px" }} /> Table
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "fixtures" ? "active" : ""}`}
            onClick={() => setActiveTab("fixtures")}
          >
            <i className="fa-solid fa-calendar-days" style={{ marginRight: "6px" }} /> Fixtures ({fixtures.length})
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "stats" ? "active" : ""}`}
            onClick={() => setActiveTab("stats")}
          >
            <i className="fa-solid fa-chart-simple" style={{ marginRight: "6px" }} /> Stats
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
            {/* Overview Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="sub-card-title" style={{ margin: 0 }}><i className="fa-solid fa-circle-info" /> Overview</h3>
                <button 
                  type="button" 
                  className="portal-btn btn-secondary" 
                  style={{ padding: "2px 8px", fontSize: "0.7rem", minHeight: "auto", height: "auto" }} 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateTournament} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Tournament Name</label>
                    <input 
                      type="text" 
                      className="admin-input" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editName} 
                      onChange={(e) => setEditName(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Format</label>
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editFormatType} 
                      onChange={(e) => setEditFormatType(e.target.value)}
                    >
                      <option value="League">League</option>
                      <option value="Knockout">Knockout</option>
                      <option value="Group + Knockout">Group + Knockout</option>
                      <option value="League + Knockout">League + Knockout</option>
                    </select>
                  </div>

                  {(editFormatType === "Group + Knockout" || editFormatType === "League + Knockout") && (() => {
                    const computedTeamsPerGroup = editNumTeams && editNumGroups 
                      ? Math.floor(parseInt(editNumTeams) / parseInt(editNumGroups)) 
                      : 0;
                    return (
                      <div style={{ display: "flex", gap: "0.5rem", width: "100%", margin: "0.5rem 0" }}>
                        <div className="admin-form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Total Teams</label>
                          <input 
                            type="number" 
                            className="admin-input" 
                            style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                            min={2} 
                            value={editNumTeams} 
                            onChange={(e) => setEditNumTeams(e.target.value)} 
                            placeholder="e.g. 16" 
                            required
                          />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Groups</label>
                          <input 
                            type="number" 
                            className="admin-input" 
                            style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                            min={1} 
                            value={editNumGroups} 
                            onChange={(e) => setEditNumGroups(e.target.value)} 
                            placeholder="e.g. 4" 
                            required
                          />
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Teams/Gp</label>
                          <div style={{ padding: "6px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", color: "#fbbf24", fontWeight: 700, fontSize: "0.85rem", height: "34px", display: "flex", alignItems: "center" }}>
                            {computedTeamsPerGroup || "—"}
                          </div>
                        </div>
                        <div className="admin-form-group" style={{ marginBottom: 0, flex: 1 }}>
                          <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Qualifying / Gp</label>
                          <select 
                            className="admin-select" 
                            style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                            value={editQualifiedPerGroup} 
                            onChange={(e) => setEditQualifiedPerGroup(e.target.value)}
                            required
                          >
                            <option value="">-- Choose --</option>
                            {Array.from({ length: computedTeamsPerGroup }, (_, i) => i + 1).map(num => (
                              <option key={num} value={num}>{num}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Type</label>
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editTournamentType} 
                      onChange={(e) => setEditTournamentType(e.target.value)}
                    >
                      {tournamentTypes.map(t => (
                        <option key={t.name} value={t.name}>{t.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Financial Template</label>
                    {(editTournamentType === 'rws' || editTournamentType === 'special') ? (
                      <div style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <i className="fa-solid fa-ban" style={{ marginRight: '0.4rem', color: '#ef4444' }} />
                        Not applicable for RWS &amp; Special Tour
                      </div>
                    ) : (
                    <select 
                      className="admin-select" 
                      style={{ fontSize: "0.85rem", padding: "6px 10px" }}
                      value={editFinancialRuleId} 
                      onChange={(e) => setEditFinancialRuleId(e.target.value)}
                    >
                      <option value="">-- Select Rule Template --</option>
                      {financialRules.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    )}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "0.5rem" }}>
                      <i className="fa-solid fa-layer-group" style={{ color: "#38bdf8", fontSize: "0.8rem" }} />
                      <span style={{ fontWeight: 600, fontSize: "0.75rem", color: "#fff" }}>Division Transition Settings</span>
                    </div>
                    <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.5rem" }}>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: "0.7rem" }}>Division Tier</label>
                        <input
                          type="number"
                          className="admin-input"
                          style={{ fontSize: "0.8rem", padding: "6px" }}
                          min={1}
                          value={editDivisionTier}
                          onChange={(e) => setEditDivisionTier(e.target.value)}
                          placeholder="None"
                        />
                      </div>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: "0.7rem" }}>Promote</label>
                        <input
                          type="number"
                          className="admin-input"
                          style={{ fontSize: "0.8rem", padding: "6px" }}
                          min={0}
                          value={editPromotionCount}
                          onChange={(e) => setEditPromotionCount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div className="admin-form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: "0.7rem" }}>Relegate</label>
                        <input
                          type="number"
                          className="admin-input"
                          style={{ fontSize: "0.8rem", padding: "6px" }}
                          min={0}
                          value={editRelegationCount}
                          onChange={(e) => setEditRelegationCount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="portal-btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "6px", fontSize: "0.8rem", marginTop: "0.75rem" }} disabled={isPending}>
                    Save Changes
                  </button>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <div>Name: <strong style={{ color: "#fff" }}>{tournament.name}</strong></div>
                  <div>Format: <strong style={{ color: "#fff" }}>{tournament.format_type}</strong></div>
                  {(tournament.format_type === "Group + Knockout" || tournament.format_type === "League + Knockout") && tournament.num_groups && (
                    <>
                      <div>Total Teams: <strong style={{ color: "#fff" }}>{tournament.num_teams || "—"}</strong></div>
                      <div>Groups: <strong style={{ color: "#fff" }}>{tournament.num_groups}</strong></div>
                      <div>Teams / Group: <strong style={{ color: "#fff" }}>{tournament.teams_per_group || "—"}</strong></div>
                      <div>Qualifying Teams / Group: <strong style={{ color: "#fff" }}>{tournament.qualified_per_group || "—"}</strong></div>
                    </>
                  )}
                  <div>Type: <strong style={{ color: "#38bdf8" }}>{tournamentTypes.find(tp => tp.name === tournament.tournament_type)?.display_name || tournament.tournament_type || "solo"}</strong></div>
                  <div>Season: <strong style={{ color: "#fff" }}>Season {tournament.season_number}</strong></div>
                  
                  {tournament.division_tier && (
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.6rem", marginTop: "0.2rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                      <div>Division Tier: <strong style={{ color: "#10b981" }}>{tournament.division_tier}</strong></div>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <span>Promote Count: <strong style={{ color: "#fff" }}>{tournament.promotion_count}</strong></span>
                        <span>Relegate Count: <strong style={{ color: "#fff" }}>{tournament.relegation_count}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Financial Rules Card — hidden for RWS and Special Tour */}
            {!(tournament.tournament_type === 'rws' || tournament.tournament_type === 'special') && (
            <div className="admin-card" style={{ marginTop: 0 }}>
              <h3 className="sub-card-title">
                <i className="fa-solid fa-scale-balanced" /> Linked Rules Template
              </h3>
              {linkedRule ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#fff", fontWeight: 700 }}>
                    {linkedRule.name}
                  </h4>
                  <div className="rule-card-pills">
                    <div className="rule-pill">
                      <span>Match Bonus:</span>
                      <span style={{ color: "#fbbf24", fontWeight: 700 }}>{linkedRule.match_bonus_rc} / {linkedRule.match_bonus_rt} / {linkedRule.match_bonus_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Winner Bonus:</span>
                      <span style={{ color: "#38bdf8", fontWeight: 700 }}>{linkedRule.tournament_bonus_rc} / {linkedRule.tournament_bonus_rt} / {linkedRule.tournament_bonus_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Walkover Fine:</span>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>{linkedRule.walkover_fine_rc} / {linkedRule.walkover_fine_rt} / {linkedRule.walkover_fine_voucher}</span>
                    </div>
                    <div className="rule-pill">
                      <span>Extension Fee:</span>
                      <span style={{ color: "#ec4899", fontWeight: 700 }}>{linkedRule.match_extension_fee_rc} / {linkedRule.match_extension_fee_rt} / {linkedRule.match_extension_fee_voucher}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  No financial template linked. Payouts will not be templates-calculated.
                </div>
              )}
            </div>
            )}
          </div>
        )}

        {/* Tab 2: Teams */}
        {activeTab === "teams" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
            {/* Participating Teams Card */}
            <div className="admin-card" style={{ marginTop: 0, overflow: "visible", zIndex: dropdownOpen ? 10 : 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 className="sub-card-title" style={{ margin: 0 }}>
                  <i className="fa-solid fa-users" /> Participating Teams ({tournamentClubs.length})
                </h3>
                {tournament && (tournament.format_type === "Group + Knockout" || tournament.format_type === "League + Knockout") && tournament.num_groups && (
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "auto" }}
                      onClick={handleAutoAssignGroups}
                      disabled={isPending || tournamentClubs.length === 0}
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" /> Auto-Assign
                    </button>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "auto", color: "#ef4444" }}
                      onClick={handleClearAllGroups}
                      disabled={isPending || tournamentClubs.length === 0}
                    >
                      <i className="fa-solid fa-trash-can" /> Clear
                    </button>
                  </div>
                )}
              </div>
              
              {tournamentClubs.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  No teams added yet. Add teams to generate fixtures.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1rem" }}>
                  {tournamentClubs.map(tc => {
                    const isEditingThisClub = editingClubId === tc.club_id;
                    return (
                      <div key={tc.club_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)", gap: "0.5rem" }}>
                        {isEditingThisClub ? (
                          // Inline editing layout
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem", flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                              {tc.logo_path && <img src={tc.logo_path} alt={tc.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{tc.original_name}</span>
                            </div>
                            <input
                              type="text"
                              className="admin-input"
                              style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", width: "130px", margin: 0 }}
                              placeholder="Custom Name"
                              value={editingCustomName}
                              onChange={(e) => setEditingCustomName(e.target.value)}
                            />
                            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                              <input
                                type="text"
                                className="admin-input"
                                style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", width: "130px", margin: 0 }}
                                placeholder="Logo URL"
                                value={editingCustomLogo}
                                onChange={(e) => setEditingCustomLogo(e.target.value)}
                              />
                              <input 
                                type="file" 
                                accept="image/*" 
                                id={`edit-logo-file-${tc.club_id}`}
                                style={{ display: "none" }}
                                onChange={(e) => handleEditLogoUpload(tc.club_id, e)}
                                disabled={editingUploadingLogo}
                              />
                              <label htmlFor={`edit-logo-file-${tc.club_id}`} className="portal-btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: editingUploadingLogo ? "none" : "auto", margin: 0 }}>
                                {editingUploadingLogo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
                              </label>
                            </div>
                          </div>
                        ) : (
                          // Default static view
                          <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {tc.logo_path && (
                              <img src={tc.logo_path} alt={tc.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />
                            )}
                            <strong style={{ color: "#fff" }}>
                              {tc.name} ({tc.manager})
                            </strong>
                          </span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {isEditingThisClub ? (
                            <>
                              <button
                                type="button"
                                className="portal-btn btn-primary"
                                style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "26px", margin: 0, background: "#22c55e", border: "none" }}
                                onClick={() => handleSaveEditClub(tc.club_id)}
                                disabled={isPending || editingUploadingLogo}
                              >
                                <i className="fa-solid fa-check" /> Save
                              </button>
                              <button
                                type="button"
                                className="portal-btn btn-secondary"
                                style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "26px", margin: 0 }}
                                onClick={() => setEditingClubId(null)}
                                disabled={isPending}
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
                          ) : (
                            <>
                              {(tournament.format_type === "Group + Knockout" || tournament.format_type === "League + Knockout") && tournament.num_groups && (
                                <select
                                  className="admin-select"
                                  style={{ 
                                    fontSize: "0.75rem", 
                                    padding: "2px 4px", 
                                    background: "rgba(0,0,0,0.3)", 
                                    border: "1px solid rgba(255,255,255,0.1)", 
                                    borderRadius: "4px", 
                                    color: "#fbbf24", 
                                    cursor: "pointer",
                                    width: "90px",
                                    height: "26px",
                                    margin: 0
                                  }}
                                  value={tc.group_name || ""}
                                  onChange={(e) => handleGroupChange(tc.club_id, e.target.value)}
                                  disabled={isPending}
                                >
                                  <option value="">-- Group --</option>
                                  {Array.from({ length: tournament.num_groups }, (_, i) => String.fromCharCode(65 + i)).map(g => (
                                    <option key={g} value={g}>Group {g}</option>
                                  ))}
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClubId(tc.club_id);
                                  setEditingCustomName(tc.custom_team_name || "");
                                  setEditingCustomLogo(tc.custom_logo_path || "");
                                }}
                                style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                                title="Edit Custom Name & Logo"
                              >
                                <i className="fa-solid fa-pen-to-square" style={{ fontSize: "0.85rem" }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveClub(tc.club_id)}
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                                title="Remove team"
                              >
                                <i className="fa-solid fa-xmark" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleAddClub} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {(() => {
                    const availableClubs = clubs.filter(c => !tournamentClubs.some(tc => tc.club_id === c.id));
                    const filteredClubs = availableClubs.filter(c => 
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      c.manager?.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    return (
                      <div ref={dropdownRef} style={{ position: "relative", flex: 1 }}>
                        <button 
                          type="button"
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="admin-select"
                          style={{ 
                            textAlign: "left", 
                            fontSize: "0.8rem", 
                            padding: "6px 10px", 
                            display: "flex", 
                            justifyContent: "space-between", 
                            alignItems: "center",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.15)",
                            color: selectedClubsToAdd.length > 0 ? "#fff" : "var(--text-secondary)",
                            width: "100%",
                            margin: 0
                          }}
                        >
                          <span>
                            {selectedClubsToAdd.length === 0 
                              ? "-- Select Teams --" 
                              : `${selectedClubsToAdd.length} team(s) selected`}
                          </span>
                          <i className="fa-solid fa-chevron-down" style={{ fontSize: "0.75rem", opacity: 0.7 }} />
                        </button>

                        {dropdownOpen && (
                          <div style={{ 
                            position: "absolute", 
                            top: "40px", 
                            left: 0, 
                            right: 0, 
                            background: "#242427", 
                            border: "1px solid rgba(255,255,255,0.25)", 
                            borderRadius: "8px", 
                            zIndex: 9999, 
                            padding: "6px",
                            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.7)", 
                            minWidth: "240px"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "4px 8px", marginBottom: "6px" }}>
                              <i className="fa-solid fa-magnifying-glass" style={{ opacity: 0.4, fontSize: "0.75rem", marginRight: "6px" }} />
                              <input 
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ 
                                  background: "none", 
                                  border: "none", 
                                  outline: "none", 
                                  color: "#fff", 
                                  fontSize: "0.75rem", 
                                  width: "100%", 
                                  padding: 0
                                }}
                                autoFocus
                              />
                            </div>

                            {filteredClubs.length > 1 && (
                              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "4px" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedClubsToAdd(prev => {
                                      const allFilteredIds = filteredClubs.map(c => c.id);
                                      const alreadySelectedAll = allFilteredIds.every(id => prev.includes(id));
                                      return alreadySelectedAll ? prev.filter(id => !allFilteredIds.includes(id)) : Array.from(new Set([...prev, ...allFilteredIds]));
                                    });
                                  }}
                                  style={{ background: "none", border: "none", color: "#fbbf24", fontSize: "0.65rem", cursor: "pointer", padding: 0 }}
                                >
                                  Toggle All Filtered
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedClubsToAdd([])}
                                  style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.65rem", cursor: "pointer", padding: 0 }}
                                >
                                  Clear All
                                </button>
                              </div>
                            )}

                            <div style={{ maxHeight: "200px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "2px" }}>
                              {filteredClubs.length === 0 ? (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", textAlign: "center", padding: "10px" }}>
                                  No available clubs found
                                </div>
                              ) : (
                                filteredClubs.map(c => {
                                  const isChecked = selectedClubsToAdd.includes(c.id);
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => {
                                        setSelectedClubsToAdd(prev => 
                                          prev.includes(c.id) 
                                            ? prev.filter(id => id !== c.id) 
                                            : [...prev, c.id]
                                        );
                                      }}
                                      style={{ 
                                        display: "flex", 
                                        alignItems: "center", 
                                        justifyContent: "space-between",
                                        width: "100%", 
                                        background: isChecked ? "rgba(251, 191, 36, 0.08)" : "transparent", 
                                        border: "none", 
                                        borderRadius: "4px", 
                                        padding: "6px 8px", 
                                        color: isChecked ? "#fbbf24" : "#ccc", 
                                        cursor: "pointer",
                                        textAlign: "left",
                                        fontSize: "0.75rem",
                                        transition: "background 0.15s ease"
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isChecked ? "rgba(251, 191, 36, 0.12)" : "rgba(255,255,255,0.03)"}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isChecked ? "rgba(251, 191, 36, 0.08)" : "transparent"}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                                        <input 
                                          type="checkbox" 
                                          checked={isChecked} 
                                          readOnly 
                                          style={{ accentColor: "#fbbf24", cursor: "pointer" }} 
                                        />
                                        <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{c.name}</span>
                                      </div>
                                      <span style={{ fontSize: "0.65rem", color: "var(--text-secondary)", flexShrink: 0, marginLeft: "8px" }}>{c.manager}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <button type="submit" className="portal-btn btn-primary" style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto" }} disabled={isPending}>
                    Add
                  </button>
                  {clubs.filter(c => !tournamentClubs.some(tc => tc.club_id === c.id)).length > 0 && (
                    <button 
                      type="button" 
                      className="portal-btn btn-secondary" 
                      style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto" }} 
                      onClick={handleAutoFillTeams}
                      disabled={isPending}
                      title="Automatically fill remaining empty slots with registered clubs"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: "4px" }} /> Auto-Fill
                    </button>
                  )}
                </div>
                {selectedClubsToAdd.length === 1 && (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      <input 
                        type="checkbox" 
                        id="useCustomTeam" 
                        checked={!useExistingClubToAdd} 
                        onChange={(e) => setUseExistingClubToAdd(!e.target.checked)} 
                      />
                      <label htmlFor="useCustomTeam" style={{ cursor: "pointer", color: "#fff" }}>Use custom nation or club name</label>
                    </div>
                    {!useExistingClubToAdd && (
                      <>
                        <input 
                          type="text" 
                          className="admin-input" 
                          style={{ fontSize: "0.8rem", padding: "6px 10px", marginTop: "0.25rem" }} 
                          placeholder="Custom Team Name" 
                          value={customTeamNameToAdd} 
                          onChange={(e) => setCustomTeamNameToAdd(e.target.value)} 
                          required 
                        />
                        <div className="admin-form-group" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                          <label style={{ fontSize: "0.75rem", marginBottom: "0.15rem" }}>Custom Team Logo</label>
                          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                            <input 
                              type="text" 
                              className="admin-input" 
                              style={{ fontSize: "0.8rem", padding: "6px 10px", flex: 1 }} 
                              placeholder="Logo URL (or upload)" 
                              value={customLogoToAdd} 
                              onChange={(e) => setCustomLogoToAdd(e.target.value)} 
                            />
                            <input 
                              type="file" 
                              accept="image/*" 
                              id="tour-logo-file" 
                              style={{ display: "none" }} 
                              onChange={handleLogoUploadForAdd} 
                              disabled={uploadingLogo} 
                            />
                            <label htmlFor="tour-logo-file" className="portal-btn btn-secondary" style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: uploadingLogo ? "none" : "auto" }}>
                              {uploadingLogo ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
                            </label>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {selectedClubsToAdd.length > 1 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem", padding: "0.75rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#fbbf24", marginBottom: "0.25rem" }}>
                      Customize Representing Teams (Optional)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingRight: "4px" }}>
                      {selectedClubsToAdd.map(id => {
                        const club = clubs.find(c => c.id === id);
                        if (!club) return null;
                        return (
                          <div key={id} style={{ display: "flex", flexDirection: "column", gap: "0.3rem", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClubsToAdd(prev => prev.filter(item => item !== id));
                                  setCustomNamesMap(prev => {
                                    const copy = { ...prev };
                                    delete copy[id];
                                    return copy;
                                  });
                                  setCustomLogosMap(prev => {
                                    const copy = { ...prev };
                                    delete copy[id];
                                    return copy;
                                  });
                                }}
                                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
                                title="Deselect team"
                              >
                                <i className="fa-solid fa-xmark" style={{ fontSize: "0.85rem" }} />
                              </button>
                              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#fff" }}>
                                {club.name} ({club.manager})
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginLeft: "1.4rem" }}>
                              <input 
                                type="text" 
                                className="admin-input" 
                                style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", flex: 1, margin: 0 }} 
                                placeholder="Custom Name" 
                                value={customNamesMap[id] || ""}
                                onChange={(e) => setCustomNamesMap(prev => ({ ...prev, [id]: e.target.value }))}
                              />
                              <div style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1 }}>
                                <input 
                                  type="text" 
                                  className="admin-input" 
                                  style={{ fontSize: "0.75rem", padding: "4px 8px", background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", color: "#fff", flex: 1, margin: 0 }} 
                                  placeholder="Logo URL" 
                                  value={customLogosMap[id] || ""}
                                  onChange={(e) => setCustomLogosMap(prev => ({ ...prev, [id]: e.target.value }))}
                                />
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  id={`logo-file-${id}`}
                                  style={{ display: "none" }}
                                  onChange={(e) => handleLogoUploadForClub(id, e)}
                                  disabled={uploadingLogosMap[id]}
                                />
                                <label htmlFor={`logo-file-${id}`} className="portal-btn btn-secondary" style={{ padding: "4px 8px", fontSize: "0.7rem", minHeight: "auto", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", pointerEvents: uploadingLogosMap[id] ? "none" : "auto", margin: 0 }}>
                                  {uploadingLogosMap[id] ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-cloud-arrow-up" />}
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Tab 4: Table */}
        {activeTab === "table" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
            {standings.length === 0 ? (
              <div className="admin-card" style={{ marginTop: 0, padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                No standings data available. Add teams and play matches to see standings.
              </div>
            ) : (tournament.format_type === "Group + Knockout" || tournament.format_type === "League + Knockout") && tournament.num_groups ? (
              // Grouped Standings (separated by Group A, Group B, etc.)
              <div className="portal-grid cols-2" style={{ gap: "1.5rem" }}>
                {Array.from({ length: tournament.num_groups }, (_, i) => String.fromCharCode(65 + i)).map(groupLetter => {
                  const rows = standings.filter(row => row.group_name === groupLetter);
                  return (
                    <div key={groupLetter} className="admin-card" style={{ marginTop: 0 }}>
                      <h3 className="sub-card-title"><i className="fa-solid fa-list-ol" /> Group {groupLetter}</h3>
                      <div className="table-responsive">
                        <table className="admin-list-table" style={{ fontSize: "0.8rem" }}>
                          <thead>
                            <tr>
                              <th style={{ width: "40px" }}>Pos</th>
                              <th>Club</th>
                              <th style={{ textAlign: "center" }}>MP</th>
                              <th style={{ textAlign: "center" }}>GD</th>
                              <th style={{ textAlign: "center", width: "50px" }}>Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length === 0 ? (
                              <tr>
                                <td colSpan={5} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "1rem" }}>
                                  No teams assigned to this group yet.
                                </td>
                              </tr>
                            ) : (
                              rows.map((row, idx) => (
                                <tr key={row.club_id}>
                                  <td>{idx + 1}</td>
                                  <td style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    {row.club_logo && <img src={row.club_logo} alt={row.club_name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                                    <strong>{row.club_name}</strong> <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: "normal", marginLeft: "0.2rem" }}>({row.manager || "Unknown"})</span>
                                  </td>
                                  <td style={{ textAlign: "center" }}>{row.matches_played}</td>
                                  <td style={{ textAlign: "center", color: row.goal_difference > 0 ? "#22c55e" : row.goal_difference < 0 ? "#ef4444" : "var(--text-secondary)" }}>
                                    {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                                  </td>
                                  <td style={{ textAlign: "center", fontWeight: "bold", color: "#fbbf24" }}>{row.points}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Single League Table
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title"><i className="fa-solid fa-list-ol" /> Standings Table</h3>
                <div className="table-responsive">
                  <table className="admin-list-table">
                    <thead>
                      <tr>
                        <th style={{ width: "50px" }}>Pos</th>
                        <th>Club</th>
                        <th style={{ textAlign: "center", width: "80px" }}>Group</th>
                        <th style={{ textAlign: "center", width: "60px" }}>MP</th>
                        <th style={{ textAlign: "center", width: "50px" }}>GF</th>
                        <th style={{ textAlign: "center", width: "50px" }}>GA</th>
                        <th style={{ textAlign: "center", width: "60px" }}>GD</th>
                        <th style={{ textAlign: "center", width: "80px" }}>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((row, idx) => (
                        <tr key={row.club_id}>
                          <td><strong>{idx + 1}</strong></td>
                          <td style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {row.club_logo && <img src={row.club_logo} alt={row.club_name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                            <strong>{row.club_name}</strong> <span style={{ color: "var(--text-secondary)", fontSize: "0.7rem", fontWeight: "normal", marginLeft: "0.2rem" }}>({row.manager || "Unknown"})</span>
                          </td>
                          <td style={{ textAlign: "center", color: "#fbbf24", fontWeight: "bold" }}>
                            {row.group_name ? `Group ${row.group_name}` : "—"}
                          </td>
                          <td style={{ textAlign: "center" }}>{row.matches_played}</td>
                          <td style={{ textAlign: "center" }}>{row.goals_scored}</td>
                          <td style={{ textAlign: "center" }}>{row.goals_against}</td>
                          <td style={{ textAlign: "center", color: row.goal_difference > 0 ? "#22c55e" : row.goal_difference < 0 ? "#ef4444" : "var(--text-secondary)" }}>
                            {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold", color: "#fbbf24", fontSize: "1rem" }}>{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Stats */}
        {activeTab === "stats" && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Stats Sub-Tabs */}
            <div className="tabs-filter" style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", width: "100%" }}>
              <button
                type="button"
                className={`tab-btn ${activeSubTab === "boot" ? "active" : ""}`}
                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={() => setActiveSubTab("boot")}
              >
                <i className="fa-solid fa-futbol" style={{ marginRight: "6px", color: "#fbbf24" }} /> Golden Boot
              </button>
              <button
                type="button"
                className={`tab-btn ${activeSubTab === "ball" ? "active" : ""}`}
                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={() => setActiveSubTab("ball")}
              >
                <i className="fa-solid fa-award" style={{ marginRight: "6px", color: "#38bdf8" }} /> Golden Ball
              </button>
              <button
                type="button"
                className={`tab-btn ${activeSubTab === "glove" ? "active" : ""}`}
                style={{ padding: "4px 12px", fontSize: "0.8rem" }}
                onClick={() => setActiveSubTab("glove")}
              >
                <i className="fa-solid fa-shield-halved" style={{ marginRight: "6px", color: "#a855f7" }} /> Golden Glove
              </button>
            </div>

            {/* Sub-Tab 1: Golden Boot (Top Goals) */}
            {activeSubTab === "boot" && (
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title">
                  <i className="fa-solid fa-futbol" style={{ marginRight: "0.5rem", color: "#fbbf24" }} /> Golden Boot (Most Goals Scored by Team)
                </h3>
                {teamStats.boot.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "1rem 0" }}>No goals recorded yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {teamStats.boot.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.8rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ color: "var(--text-secondary)", marginRight: "0.25rem" }}>#{idx + 1}</span>
                          {s.logo && <img src={s.logo} alt={s.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                          {s.name} <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>({s.manager})</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#fbbf24", fontSize: "0.95rem" }}>
                          {s.value} Goals
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Golden Ball (Most Wins) */}
            {activeSubTab === "ball" && (
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title">
                  <i className="fa-solid fa-award" style={{ marginRight: "0.5rem", color: "#38bdf8" }} /> Golden Ball (Most Wins by Team)
                </h3>
                {teamStats.ball.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "1rem 0" }}>No matches played yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {teamStats.ball.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.8rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ color: "var(--text-secondary)", marginRight: "0.25rem" }}>#{idx + 1}</span>
                          {s.logo && <img src={s.logo} alt={s.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                          {s.name} <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>({s.manager})</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#38bdf8", fontSize: "0.95rem" }}>
                          {s.value} Wins
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3: Golden Glove (Most Clean Sheets) */}
            {activeSubTab === "glove" && (
              <div className="admin-card" style={{ marginTop: 0 }}>
                <h3 className="sub-card-title">
                  <i className="fa-solid fa-shield-halved" style={{ marginRight: "0.5rem", color: "#a855f7" }} /> Golden Glove (Most Clean Sheets by Team)
                </h3>
                {teamStats.glove.length === 0 ? (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "1rem 0" }}>No clean sheets kept yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {teamStats.glove.map((s, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.8rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ color: "var(--text-secondary)", marginRight: "0.25rem" }}>#{idx + 1}</span>
                          {s.logo && <img src={s.logo} alt={s.name} style={{ width: "16px", height: "16px", objectFit: "contain" }} />}
                          {s.name} <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>({s.manager})</span>
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "#a855f7", fontSize: "0.95rem" }}>
                          {s.value} Clean Sheets
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Fixtures */}
        {activeTab === "fixtures" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", width: "100%" }}>
            {/* Auto-Fixture Generation Card */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 className="sub-card-title" style={{ marginBottom: "0.15rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <i className="fa-solid fa-wand-magic-sparkles" style={{ color: "#a855f7" }} /> Auto-Generate Matchups
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Schedules a Round Robin fixture list for all participating teams.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select 
                    className="admin-select" 
                    style={{ fontSize: "0.8rem", padding: "6px 10px", width: "130px" }}
                    value={generateLegs}
                    onChange={(e) => setGenerateLegs(e.target.value)}
                  >
                    <option value="single">Single Leg (1x)</option>
                    <option value="double">Double Leg (2x)</option>
                  </select>
                  <button 
                    type="button" 
                    className="portal-btn btn-primary" 
                    style={{ padding: "6px 12px", fontSize: "0.8rem", minHeight: "auto", height: "auto", display: "flex", alignItems: "center", gap: "0.3rem" }} 
                    onClick={handleAutoGenerate}
                    disabled={isPending || tournamentClubs.length < 2}
                  >
                    <i className="fa-solid fa-bolt" /> Generate Fixtures
                  </button>
                </div>
              </div>
            </div>

            {/* Match list */}
            <div className="admin-card" style={{ marginTop: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <h3 className="sub-card-title" style={{ margin: 0 }}><i className="fa-solid fa-calendar-days" /> Scheduled Fixtures</h3>
                {rounds.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "2px 8px", minWidth: "30px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0, fontSize: "0.75rem" }}
                      onClick={() => setActiveRound(prev => Math.max(1, prev - 1))}
                      disabled={activeRound <= 1}
                    >
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <select
                      className="admin-select"
                      style={{ textAlign: "center", fontSize: "0.75rem", padding: "2px 24px 2px 8px", margin: 0, fontWeight: "bold", color: "#fbbf24", cursor: "pointer", height: "26px", background: "none", border: "none", width: "110px" }}
                      value={activeRound}
                      onChange={(e) => setActiveRound(parseInt(e.target.value))}
                    >
                      {rounds.map(r => (
                        <option key={r} value={r}>Round {r}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="portal-btn btn-secondary"
                      style={{ padding: "2px 8px", minWidth: "30px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", margin: 0, fontSize: "0.75rem" }}
                      onClick={() => setActiveRound(prev => Math.min(rounds[rounds.length - 1], prev + 1))}
                      disabled={activeRound >= rounds[rounds.length - 1]}
                    >
                      <i className="fa-solid fa-chevron-right" />
                    </button>
                  </div>
                )}
              </div>
              
              {fixtures.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No matches scheduled for this tournament yet.
                </div>
              ) : roundFixtures.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No matches scheduled in Round {activeRound}.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="admin-list-table">
                    <thead>
                      <tr>
                        <th>Round</th>
                        <th>Matchup</th>
                        <th style={{ width: "120px", textAlign: "center" }}>Result Score</th>
                        <th style={{ width: "150px" }}>Match Status</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundFixtures.map(f => (
                        <tr key={f.id}>
                          <td><strong>Round {f.roundNumber || 1}{f.groupName ? ` (Group ${f.groupName})` : ""}</strong></td>
                          <td>
                            <strong>{f.homeClub}</strong> vs <strong>{f.awayClub}</strong>
                          </td>
                          <td style={{ textAlign: "center", fontWeight: "bold", fontSize: "1rem", color: "#fff" }}>
                            {f.homeScore !== null && f.awayScore !== null ? `${f.homeScore} - ${f.awayScore}` : "-"}
                          </td>
                          <td>
                            <span style={{
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: f.match_status === 'void' ? "rgba(239, 68, 68, 0.15)" : f.match_status?.startsWith('wo') ? "rgba(245, 158, 11, 0.15)" : (f.match_status === 'played' || (f.homeScore !== null && f.awayScore !== null)) ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.08)",
                              color: f.match_status === 'void' ? "#ef4444" : f.match_status?.startsWith('wo') ? "#f59e0b" : (f.match_status === 'played' || (f.homeScore !== null && f.awayScore !== null)) ? "#22c55e" : "var(--text-secondary)",
                              fontWeight: "bold",
                              textTransform: "uppercase"
                            }}>
                              {f.match_status || (f.homeScore !== null && f.awayScore !== null ? "played" : "scheduled")}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                              <Link href={`/solo-tour/admin/fixtures/${f.id}`} className="portal-btn btn-primary" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                                <i className="fa-solid fa-scale-balanced" style={{ marginRight: "4px" }} /> Manage
                              </Link>
                              <button className="portal-btn btn-danger" style={{ padding: "2px 8px", fontSize: "0.75rem" }} onClick={() => handleDeleteFixture(f.id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
