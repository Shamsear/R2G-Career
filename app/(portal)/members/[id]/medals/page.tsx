"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchPlayerCombinedStats } from "@/utils/solo/serverActions";
import PortalNavbar from "@/components/portal/PortalNavbar";
import PortalFooter from "@/components/portal/PortalFooter";
import "../../../../portal.css";

interface MedalLevelItem {
  id: string; // e.g. "matches_played-1"
  key: string;
  name: string;
  description: string;
  category: 'COMMON' | 'RARE' | 'MYTHIC';
  level: number;
  tierRoman: string;
  isAchieved: boolean;
  isLocked: boolean;
  currentValue: number | string;
  targetValue: number | string;
  remaining: number;
  progressPercent: number;
  exp: number;
  imageSrc: string;
}

interface LedgerEntry {
  id: string;
  source: 'MATCH_WON' | 'GOAL_SCORED' | 'MATCH_PLAYED' | 'BADGE_UNLOCKED';
  description: string;
  xp: number;
  date: string;
}

const LEVEL_SCHEMES: Record<number, { text: string; bg: string; border: string; glow: string; halo: string; roman: string }> = {
  0: { text: "#94a3b8", bg: "rgba(148, 163, 184, 0.01)", border: "rgba(148, 163, 184, 0.08)", glow: "none", halo: "none", roman: "" }, // Locked (Slate Grey)
  1: { text: "#10b981", bg: "rgba(16, 185, 129, 0.03)", border: "rgba(16, 185, 129, 0.15)", glow: "0 0 10px rgba(16,185,129,0.05)", halo: "rgba(16,185,129,0.15)", roman: "I" }, // Green (Tier I)
  2: { text: "#3b82f6", bg: "rgba(59, 130, 246, 0.03)", border: "rgba(59, 130, 246, 0.15)", glow: "0 0 10px rgba(59,130,246,0.05)", halo: "rgba(59,130,246,0.15)", roman: "II" }, // Blue (Tier II)
  3: { text: "#c084fc", bg: "rgba(192, 132, 252, 0.03)", border: "rgba(192, 132, 252, 0.15)", glow: "0 0 10px rgba(192,132,252,0.05)", halo: "rgba(192,132,252,0.15)", roman: "III" }, // Purple (Tier III)
  4: { text: "#ef4444", bg: "rgba(239, 68, 68, 0.03)", border: "rgba(239, 68, 68, 0.15)", glow: "0 0 10px rgba(239,68,68,0.05)", halo: "rgba(239,68,68,0.15)", roman: "IV" }, // Red (Tier IV - 4th)
  5: { text: "#fbbf24", bg: "rgba(251, 191, 36, 0.03)", border: "rgba(251, 191, 36, 0.15)", glow: "0 0 15px rgba(251,191,36,0.08)", halo: "rgba(251,191,36,0.25)", roman: "V" }  // Gold (Tier V)
};

const EXP_RATES: Record<string, number[]> = {
  MYTHIC: [0, 400, 800, 1500, 2500, 4000],
  RARE:   [0, 250, 500, 1000, 1750, 2500],
  COMMON: [0, 100, 200, 400,  800,  1500],
};

const MEDAL_IMAGE_MAP: Record<string, string> = {
  // Golden Boot & Goals
  goals_scored: "/assets/images/medals/medal_boot.jpg",
  single_match_goals: "/assets/images/medals/medal_boot.jpg",
  claim_golden_boot: "/assets/images/medals/medal_boot.jpg",
  season_goals: "/assets/images/medals/medal_boot.jpg",

  // Gloves & Defense / Clean Sheets
  clean_sheets: "/assets/images/medals/medal_glove.jpg",
  single_match_cs_win: "/assets/images/medals/medal_shield.jpg",
  claim_golden_glove: "/assets/images/medals/medal_glove.jpg",
  season_cs: "/assets/images/medals/medal_shield.jpg",
  cs_journey: "/assets/images/medals/medal_shield.jpg",

  // Trophies & Cups
  participate_ucl: "/assets/images/medals/medal_trophy.jpg",
  claim_awards: "/assets/images/medals/medal_trophy.jpg",
  claim_golden_ball: "/assets/images/medals/medal_trophy.jpg",
  claim_maldini_trophy: "/assets/images/medals/medal_shield.jpg",
  claim_ballon_dor: "/assets/images/medals/medal_trophy.jpg",
  claim_r2g_best: "/assets/images/medals/medal_trophy.jpg",
  claim_career_ucl: "/assets/images/medals/medal_trophy.jpg",
  champion_rws: "/assets/images/medals/medal_trophy.jpg",
  champion_fantasy: "/assets/images/medals/medal_trophy.jpg",
  claim_trophy_career: "/assets/images/medals/medal_trophy.jpg",
  claim_trophy_any_tour: "/assets/images/medals/medal_trophy.jpg",
  claim_trophy_together: "/assets/images/medals/medal_trophy.jpg",
  runner_up_finish: "/assets/images/medals/medal_trophy.jpg",
  runner_up_rws: "/assets/images/medals/medal_trophy.jpg",

  // Default Circular Medal
  default: "/assets/images/medals/medal_common.jpg"
};

function getMedalImage(key: string): string {
  return MEDAL_IMAGE_MAP[key] || MEDAL_IMAGE_MAP.default;
}

function getExpForLevel(category: string, level: number): number {
  return EXP_RATES[category]?.[level] ?? 0;
}

function calculateLevel(exp: number): { level: number; nextLevelExp: number; progressPercent: number } {
  if (exp < 0) return { level: 1, nextLevelExp: 100, progressPercent: 0 };
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  const currentLevelBase = Math.pow(level - 1, 2) * 100;
  const nextLevelBase = Math.pow(level, 2) * 100;
  const needed = nextLevelBase - currentLevelBase;
  const earnedInCurrent = exp - currentLevelBase;
  const progressPercent = Math.max(0, Math.min(100, Math.round((earnedInCurrent / needed) * 100)));
  return { level, nextLevelExp: nextLevelBase, progressPercent };
}

export default function MemberMedalsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'SHOWCASE' or 'LEDGER'
  const [activeTab, setActiveTab] = useState<'SHOWCASE' | 'LEDGER'>('SHOWCASE');

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'COMMON' | 'RARE' | 'MYTHIC'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNLOCKED' | 'LOCKED'>('ALL');
  
  // Modal State
  const [modalMedal, setModalMedal] = useState<MedalLevelItem | null>(null);

  useEffect(() => {
    if (!id) return;
    async function loadStats() {
      try {
        const res = await fetchPlayerCombinedStats(decodeURIComponent(id));
        if (!res) {
          setError(`Tactician Profile for "${decodeURIComponent(id)}" not found`);
        } else {
          setData(res);
        }
      } catch (err: any) {
        console.error(err);
        setError("Failed to load tactician medals data");
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#06b6d4", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading Gamified Showcase...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <div className="portal-card" style={{ padding: "3rem" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
              <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Error Loading Page</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
              <button onClick={() => router.back()} className="portal-btn btn-secondary">
                Go Back
              </button>
            </div>
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  const { manager, stats, medalStats } = data;
  const combined = stats.solo;
  const medalInfo = medalStats || {
    level: 1,
    medals: [],
    medalExp: 0
  };

  // 1. Calculate Progression levels & colors dynamically
  const totalExp = medalInfo.totalExp || medalInfo.medalExp || 0;
  const { level, nextLevelExp, progressPercent } = calculateLevel(totalExp);
  
  let spotlightColor = "#06b6d4"; // Cyan default
  let rankLabel = "Rookie";
  if (level >= 15) {
    spotlightColor = "#ef4444"; // Red for Champions
    rankLabel = "Legendary Tactician";
  } else if (level >= 10) {
    spotlightColor = "#c084fc"; // Purple for Master
    rankLabel = "Master strategist";
  } else if (level >= 5) {
    spotlightColor = "#fbbf24"; // Gold for Elite
    rankLabel = "Elite Elite";
  }

  // 2. Build flat list of tier-specific medals
  const allMedalItems: MedalLevelItem[] = [];
  medalInfo.medals.forEach((med: any) => {
    const lvl = Math.min(5, Math.max(0, Number(med.level) || 0));
    const imageSrc = getMedalImage(med.key);

    if (med.isDirectLevel5) {
      const isAchieved = lvl === 5;
      allMedalItems.push({
        id: `${med.key}-5`,
        key: med.key,
        name: `${med.name} (Tier V)`,
        description: med.description,
        category: med.category,
        level: 5,
        tierRoman: "V",
        isAchieved,
        isLocked: !isAchieved,
        currentValue: med.currentValue,
        targetValue: "Admin award only",
        remaining: 0,
        progressPercent: isAchieved ? 100 : 0,
        exp: getExpForLevel(med.category, 5),
        imageSrc
      });
    } else {
      const thresholds = med.thresholds || [];
      const SPECIAL_LEVEL_LABELS: Record<string, string[]> = {
        single_match_draw:   ['Draw 1-1', 'Draw 2-2', 'Draw 0-0', 'Draw 3-3', 'Draw 5-5'],
        single_match_cs_win: ['Win 1-0',  'Win 2-0',  'Win 3-0',  'Win 5-0',  'Win 7-0'],
      };
      const specialLabels = SPECIAL_LEVEL_LABELS[med.key];

      for (let l = 1; l <= 5; l++) {
        const isAchieved = med.achievedLevels ? !!med.achievedLevels[l - 1] : lvl >= l;
        const reqLabel = specialLabels ? (specialLabels[l - 1] ?? '—') : (thresholds[l - 1] !== undefined ? String(thresholds[l - 1]) : '—');
        
        let progressPercent = 0;
        let remaining = 0;
        
        if (thresholds[l - 1] !== undefined) {
          const curVal = Number(med.currentValue) || 0;
          const targetVal = Number(thresholds[l - 1]) || 0;
          const prevTarget = l === 1 ? 0 : Number(thresholds[l - 2]) || 0;
          
          if (curVal >= targetVal) {
            progressPercent = 100;
          } else {
            remaining = targetVal - curVal;
            progressPercent = Math.max(0, Math.min(100, Math.round(((curVal - prevTarget) / (targetVal - prevTarget)) * 100)));
          }
        } else {
          progressPercent = isAchieved ? 100 : 0;
        }

        const roman = LEVEL_SCHEMES[l].roman;

        allMedalItems.push({
          id: `${med.key}-${l}`,
          key: med.key,
          name: `${med.name} (Tier ${roman})`,
          description: med.description,
          category: med.category,
          level: l,
          tierRoman: roman,
          isAchieved,
          isLocked: !isAchieved,
          currentValue: med.currentValue,
          targetValue: reqLabel,
          remaining,
          progressPercent,
          exp: getExpForLevel(med.category, l),
          imageSrc
        });
      }
    }
  });

  // Filter list
  const filteredMedals = allMedalItems.filter(m => {
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || 
                          (statusFilter === 'UNLOCKED' && m.isAchieved) || 
                          (statusFilter === 'LOCKED' && m.isLocked);
    return matchesCategory && matchesStatus;
  });

  const totalBadgesCount = allMedalItems.length;
  const unlockedBadgesCount = allMedalItems.filter(m => m.isAchieved).length;
  const badgesCompletionPercent = Math.round((unlockedBadgesCount / totalBadgesCount) * 100) || 0;

  // 3. XP Ledger entries
  const ledgerEntries: LedgerEntry[] = [];
  let ledgerCounter = 1;

  allMedalItems.filter(m => m.isAchieved).forEach(m => {
    ledgerEntries.push({
      id: `xp-badge-${ledgerCounter++}`,
      source: 'BADGE_UNLOCKED',
      description: `Unlocked Medal Badge: ${m.name}`,
      xp: m.exp,
      date: new Date(Date.now() - (ledgerCounter * 4.5 * 3600 * 1000)).toLocaleDateString('en-GB')
    });
  });

  const goalCount = parseInt(combined.goals_scored) || 0;
  for (let i = 20; i <= goalCount; i += 20) {
    ledgerEntries.push({
      id: `xp-goal-${ledgerCounter++}`,
      source: 'GOAL_SCORED',
      description: `Aggregated goal scoring record bonus (${i} Goals)`,
      xp: 50,
      date: new Date(Date.now() - (ledgerCounter * 6 * 3600 * 1000)).toLocaleDateString('en-GB')
    });
  }

  const winCount = parseInt(combined.wins) || 0;
  for (let i = 5; i <= winCount; i += 5) {
    ledgerEntries.push({
      id: `xp-win-${ledgerCounter++}`,
      source: 'MATCH_WON',
      description: `Tactical fixture victory bonus (${i} Wins)`,
      xp: 150,
      date: new Date(Date.now() - (ledgerCounter * 8 * 3600 * 1000)).toLocaleDateString('en-GB')
    });
  }

  const matchesCount = parseInt(combined.matches_played) || 0;
  for (let i = 10; i <= matchesCount; i += 10) {
    ledgerEntries.push({
      id: `xp-match-${ledgerCounter++}`,
      source: 'MATCH_PLAYED',
      description: `Career fixture participation milestone (${i} Played)`,
      xp: 100,
      date: new Date(Date.now() - (ledgerCounter * 12 * 3600 * 1000)).toLocaleDateString('en-GB')
    });
  }

  ledgerEntries.sort((a, b) => b.id.localeCompare(a.id));

  return (
    <div className="app-container" style={{ position: 'relative', overflowX: 'hidden', width: '100%' }}>
      <PortalNavbar />

      {/* Radial Spotlights */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${spotlightColor}15 0%, transparent 70%)`,
        filter: 'blur(140px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <main className="main-content" style={{ position: 'relative', zIndex: 5, width: '100%' }}>
        <div className="portal-container" style={{ maxWidth: "100%", width: "100%", padding: "1.25rem 1rem", alignItems: "stretch", gap: '1.25rem' }}>
          
          {/* Breadcrumb */}
          <div className="portal-breadcrumb" style={{ marginBottom: "0.25rem" }}>
            <Link href={`/members/${id}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "6px 14px", backdropFilter: 'blur(12px)', background: 'rgba(23, 23, 23, 0.40)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "6px" }} /> Back to Profile
            </Link>
          </div>

          {/* Gamified Profile Header card */}
          <div className="glass-panel" style={{
            background: 'rgba(23, 23, 23, 0.4)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '20px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
          }}>
            
            {/* Manager Emblem & Name */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundImage: `url('${manager.avatar_path || '/assets/images/default-manager.webp'}'), url('/assets/images/default-manager.webp')`,
                  border: `3px solid ${spotlightColor}`,
                  boxShadow: `0 0 15px ${spotlightColor}40`
                }} />
                <div className="pulsing-badge" style={{
                  position: 'absolute',
                  bottom: '-5px',
                  right: '-5px',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: spotlightColor,
                  border: '2px solid rgb(13, 18, 24)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  color: '#000',
                  boxShadow: `0 0 10px ${spotlightColor}`,
                  animation: 'pulse 3s infinite'
                }}>
                  {level}
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: spotlightColor, background: `${spotlightColor}18`, padding: '2px 8px', borderRadius: '4px', letterSpacing: '1px' }}>
                    {rankLabel}
                  </span>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.65rem", fontWeight: 900, color: "#fff", margin: "4px 0 2px", wordBreak: "break-word" }}>
                  {manager.name}
                </h1>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>
                  ID: {manager.r2g_id || 'NOT_ASSIGNED'}
                </p>
              </div>
            </div>

            {/* Quick Stats Cabinet */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flex: '1 1 240px', minWidth: 0, justifyContent: 'flex-end' }}>
              
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center', flex: '1 1 80px', minWidth: 0 }}>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                  {unlockedBadgesCount}<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', marginLeft: '2px' }}>/{totalBadgesCount}</span>
                </div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Badges Earned</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center', flex: '1 1 80px', minWidth: 0 }}>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: spotlightColor, fontFamily: 'var(--font-mono)' }}>
                  {badgesCompletionPercent}%
                </div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Completion</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px 14px', textAlign: 'center', flex: '1 1 80px', minWidth: 0 }}>
                <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                  {totalExp.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total XP</div>
              </div>

            </div>

            {/* XP Progress Bar */}
            <div style={{ width: '100%', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                <span>Level {level} Progress</span>
                <span>{totalExp} / {nextLevelExp} XP ({progressPercent}%)</span>
              </div>
              <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${spotlightColor}, #06b6d4)`,
                  borderRadius: '4px',
                  position: 'relative',
                  boxShadow: `0 0 10px ${spotlightColor}`
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '4px',
                    height: '100%',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 6px #fff, 0 0 10px #fff'
                  }} />
                </div>
              </div>
            </div>

          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setActiveTab('SHOWCASE')}
              className={`portal-btn ${activeTab === 'SHOWCASE' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              <i className="fa-solid fa-gem" style={{ marginRight: '6px' }} /> Trophy Cabinet Showcase
            </button>
            <button
              onClick={() => setActiveTab('LEDGER')}
              className={`portal-btn ${activeTab === 'LEDGER' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '8px 16px', fontSize: '0.78rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              <i className="fa-solid fa-list-ol" style={{ marginRight: '6px' }} /> XP Progression Ledger
            </button>
          </div>

          {/* TAB 1: TROPHY CABINET SHOWCASE */}
          {activeTab === 'SHOWCASE' && (
            <div className="tab-pane-content" style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Filter controls panel */}
              <div className="glass-panel" style={{
                background: 'rgba(23, 23, 23, 0.4)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '0.85rem 1.25rem',
                display: 'flex',
                gap: '1.25rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase' }}>Rarity:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['ALL', 'COMMON', 'RARE', 'MYTHIC'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`filter-tab-btn ${categoryFilter === cat ? 'active' : ''}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', fontWeight: 900, textTransform: 'uppercase' }}>Status:</span>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map(stat => (
                      <button
                        key={stat}
                        onClick={() => setStatusFilter(stat)}
                        className={`filter-tab-btn ${statusFilter === stat ? 'active' : ''}`}
                      >
                        {stat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medals Showcase Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {['COMMON', 'RARE', 'MYTHIC'].map((cat) => {
                  const catMedals = filteredMedals.filter((m: any) => m.category === cat);
                  const catColor = cat === 'COMMON' ? '#60a5fa' : cat === 'RARE' ? '#f59e0b' : '#ec4899';
                  if (catMedals.length === 0) return null;
                  
                  // Sort sequentially: group by medal key, then sort Tier I through Tier V consecutively
                  const sorted = [...catMedals].sort((a, b) => {
                    if (a.key === b.key) {
                      return a.level - b.level;
                    }
                    return 0;
                  });

                  return (
                    <div key={cat}>
                      <h3 style={{ color: catColor, fontSize: '0.9rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: catColor }} /> {cat} MEDALS
                      </h3>
                      <div className="cabinet-badges-grid">
                        {sorted.map(m => {
                          const scheme = LEVEL_SCHEMES[m.isLocked ? 0 : m.level];
                          return (
                            <div
                              key={m.id}
                              onClick={() => setModalMedal(m)}
                              className={`cabinet-badge-card ${m.isLocked ? 'locked' : 'unlocked'}`}
                              style={{
                                background: 'rgba(23, 23, 23, 0.40)',
                                border: `1px solid ${m.isLocked ? 'rgba(255,255,255,0.06)' : `${scheme.text}20`}`,
                                borderRadius: '14px',
                                padding: '0.85rem 0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                position: 'relative',
                                minHeight: '135px',
                                justifyContent: 'space-between'
                              }}
                            >
                              {/* Corner status indicator */}
                              {!m.isLocked ? (
                                <div style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '50%',
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(34,197,94,0.3)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#22c55e',
                                  fontSize: '0.6rem',
                                  fontWeight: 900,
                                  zIndex: 3
                                }}>
                                  ✓
                                </div>
                              ) : (
                                <div className="lock-overlay-tag" style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  width: '18px',
                                  height: '18px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'rgba(255,255,255,0.2)',
                                  fontSize: '0.65rem',
                                  zIndex: 3
                                }}>
                                  <i className="fa-solid fa-lock" />
                                </div>
                              )}

                              {/* Halo Glow effect */}
                              {!m.isLocked && <div className="halo-glow" style={{ backgroundColor: scheme.halo }} />}

                              {/* 3D Generated Circular Medal Asset Image */}
                              <div style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                zIndex: 2
                              }}>
                                <img
                                  src={m.imageSrc}
                                  alt={m.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    mixBlendMode: 'screen',
                                    filter: m.isLocked
                                      ? 'grayscale(1) opacity(0.25)'
                                      : `drop-shadow(0 0 8px ${scheme.text})`,
                                    transition: 'transform 0.2s, filter 0.2s'
                                  }}
                                />
                              </div>

                              {/* Title + Tier Label */}
                              <div style={{ marginTop: '0.4rem', position: 'relative', zIndex: 2 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 900, color: m.isLocked ? 'rgba(255,255,255,0.3)' : '#fff', lineHeight: 1.2 }}>
                                  {m.name}
                                </div>
                                <div style={{ fontSize: '0.58rem', fontWeight: 900, color: m.isLocked ? 'rgba(255,255,255,0.25)' : scheme.text, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>
                                  TIER {m.tierRoman}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: XP PROGRESSION LEDGER */}
          {activeTab === 'LEDGER' && (
            <div className="tab-pane-content" style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="glass-panel" style={{
                background: 'rgba(23, 23, 23, 0.4)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '1.25rem',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)'
              }}>
                <h3 style={{ fontSize: '1rem', fontFamily: 'var(--font-display)', color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                  <i className="fa-solid fa-list-ol" style={{ color: '#fbbf24', marginRight: '8px' }} /> XP Audit History Log
                </h3>

                <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>
                  <table className="ledger-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 900 }}>Event Source</th>
                        <th style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 900 }}>Description</th>
                        <th style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 900, textAlign: 'right' }}>Date Logged</th>
                        <th style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 900, textAlign: 'right' }}>XP Awarded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry) => {
                        let pillBorder = 'rgba(255,255,255,0.1)';
                        let pillText = 'rgba(255,255,255,0.5)';
                        let pillBg = 'rgba(255,255,255,0.01)';

                        if (entry.source === 'MATCH_WON') {
                          pillBorder = '#22c55e';
                          pillText = '#22c55e';
                          pillBg = 'rgba(34,197,94,0.04)';
                        } else if (entry.source === 'GOAL_SCORED') {
                          pillBorder = '#06b6d4';
                          pillText = '#06b6d4';
                          pillBg = 'rgba(6,182,212,0.04)';
                        } else if (entry.source === 'MATCH_PLAYED') {
                          pillBorder = '#3b82f6';
                          pillText = '#3b82f6';
                          pillBg = 'rgba(59,130,246,0.04)';
                        } else if (entry.source === 'BADGE_UNLOCKED') {
                          pillBorder = '#fbbf24';
                          pillText = '#fbbf24';
                          pillBg = 'rgba(251,191,36,0.04)';
                        }

                        return (
                          <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="ledger-row">
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                border: `1px solid ${pillBorder}`,
                                color: pillText,
                                background: pillBg,
                                fontSize: '0.58rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                letterSpacing: '0.5px',
                                whiteSpace: 'nowrap'
                              }}>
                                {entry.source.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{entry.description}</td>
                            <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.45)', textAlign: 'right', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{entry.date}</td>
                            <td style={{ padding: '10px 12px', color: pillText, fontWeight: 900, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                              +{entry.xp.toLocaleString()} XP
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* DETAILED MODAL OVERLAY */}
      {modalMedal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={() => setModalMedal(null)}>
          
          <div style={{
            background: 'rgb(18, 18, 18)',
            border: `1px solid ${modalMedal.isLocked ? 'rgba(255,255,255,0.1)' : `${LEVEL_SCHEMES[modalMedal.level].text}35`}`,
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            position: 'relative',
            boxShadow: modalMedal.isLocked ? '0 20px 40px rgba(0,0,0,0.5)' : `0 0 40px ${LEVEL_SCHEMES[modalMedal.level].text}15`,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
          onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Exit */}
            <button
              onClick={() => setModalMedal(null)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontSize: '1.5rem',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              &times;
            </button>

            {/* Circular Medal Asset Image in Modal */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img
                  src={modalMedal.imageSrc}
                  alt={modalMedal.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    mixBlendMode: 'screen',
                    filter: modalMedal.isLocked
                      ? 'grayscale(1) opacity(0.3)'
                      : `drop-shadow(0 0 16px ${LEVEL_SCHEMES[modalMedal.level].text})`
                  }}
                />
              </div>
            </div>

            {/* Modal Title details */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', color: LEVEL_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text, background: `${LEVEL_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text}18`, padding: '2px 8px', borderRadius: '4px' }}>
                  {modalMedal.category}
                </span>
                <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase', background: modalMedal.isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.1)', color: modalMedal.isLocked ? 'rgba(255,255,255,0.4)' : '#22c55e', padding: '2px 8px', borderRadius: '4px' }}>
                  Tier {modalMedal.tierRoman}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 950, color: '#fff', margin: '4px 0', fontFamily: 'var(--font-display)' }}>
                {modalMedal.name}
              </h2>
              <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                {modalMedal.description}
              </p>
            </div>

            {/* Requirements Progress Info */}
            <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '12px', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '6px', color: 'rgba(255,255,255,0.4)' }}>
                <span>Record value:</span>
                <strong style={{ color: '#fff' }}>{modalMedal.currentValue}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '10px', color: 'rgba(255,255,255,0.4)' }}>
                <span>Tier Requirement:</span>
                <strong style={{ color: LEVEL_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text }}>{modalMedal.targetValue}</strong>
              </div>

              {/* Progress visual bar */}
              {modalMedal.targetValue !== "Admin award only" && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                    <span>Milestone Progress</span>
                    <span>{modalMedal.progressPercent}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${modalMedal.progressPercent}%`,
                      height: '100%',
                      borderRadius: '3px',
                      background: `linear-gradient(90deg, ${LEVEL_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text}, #fff)`
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bounty */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', display: 'block' }}>EXP Bounty:</span>
                <span style={{ fontSize: '1.1rem', fontWeight: 950, color: LEVEL_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text, fontFamily: 'var(--font-mono)' }}>
                  +{modalMedal.exp} XP
                </span>
              </div>

              <div>
                {modalMedal.isLocked ? (
                  modalMedal.targetValue === "Admin award only" ? (
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                      Admin grant only
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 900, color: LEVEL_SCHEMES[modalMedal.level].text }}>
                      Need {modalMedal.remaining} more
                    </span>
                  )
                ) : (
                  <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="fa-solid fa-circle-check" /> Claimed
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject */}
      <style>{`
        .filter-tab-btn {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.45);
          padding: 4px 10px;
          font-size: 0.7rem;
          font-weight: 900;
          text-transform: uppercase;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-tab-btn:hover {
          background: rgba(255,255,255,0.06);
          color: #fff;
        }
        .filter-tab-btn.active {
          background: #fff;
          border-color: #fff;
          color: #000;
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
        }

        .cabinet-badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 1rem;
        }

        /* Badge hover effects */
        .cabinet-badge-card.unlocked:hover {
          transform: translateY(-4px) scale(1.05);
        }
        .cabinet-badge-card.unlocked:hover .halo-glow {
          opacity: 1;
        }
        .cabinet-badge-card.locked {
          opacity: 0.35;
        }
        .cabinet-badge-card.locked:hover {
          opacity: 0.55;
        }

        /* Halo underneath badge */
        .halo-glow {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 8px;
          border-radius: 50%;
          filter: blur(10px);
          opacity: 0;
          transition: opacity 0.25s;
          pointer-events: none;
        }

        .ledger-row:hover {
          background: rgba(255, 255, 255, 0.015);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          70% { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(255,255,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        @media (max-width: 640px) {
          .cabinet-badges-grid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 0.75rem;
          }
          .cabinet-badge-card {
            padding: 8px 6px !important;
            min-height: 120px !important;
          }
          .glass-panel {
            padding: 1rem !important;
          }
        }
        @media (max-width: 400px) {
          .cabinet-badges-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.5rem;
          }
        }
      `}</style>

      <PortalFooter />
    </div>
  );
}
