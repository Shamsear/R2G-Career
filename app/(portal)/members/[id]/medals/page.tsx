"use client";

import { useEffect, useState, useMemo } from "react";
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

const TIER_SCHEMES: Record<number, { name: string; text: string; border: string; glow: string; halo: string; roman: string }> = {
  0: { name: "Locked", text: "#64748b", border: "rgba(100, 116, 139, 0.2)", glow: "none", halo: "none", roman: "" },
  1: { name: "Tier I", text: "#f87171", border: "rgba(248, 113, 113, 0.3)", glow: "0 0 15px rgba(248,113,113,0.15)", halo: "rgba(248,113,113,0.25)", roman: "I" },
  2: { name: "Tier II", text: "#60a5fa", border: "rgba(96, 165, 250, 0.3)", glow: "0 0 15px rgba(96,165,250,0.15)", halo: "rgba(96,165,250,0.25)", roman: "II" },
  3: { name: "Tier III", text: "#34d399", border: "rgba(52, 211, 153, 0.3)", glow: "0 0 15px rgba(52,211,153,0.15)", halo: "rgba(52,211,153,0.25)", roman: "III" },
  4: { name: "Tier IV", text: "#c084fc", border: "rgba(192, 132, 252, 0.3)", glow: "0 0 15px rgba(192,132,252,0.15)", halo: "rgba(192,132,252,0.25)", roman: "IV" },
  5: { name: "Tier V", text: "#fbbf24", border: "rgba(251, 191, 36, 0.35)", glow: "0 0 20px rgba(251,191,36,0.25)", halo: "rgba(251,191,36,0.35)", roman: "V" }
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
  const [searchQuery, setSearchQuery] = useState('');
  
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

  // Build flat list of tier items
  const allMedalItems = useMemo(() => {
    if (!data) return [];
    const { medalStats } = data;
    const medalInfo = medalStats || { level: 1, medals: [], medalExp: 0 };
    const items: MedalLevelItem[] = [];

    medalInfo.medals.forEach((med: any) => {
      const lvl = Math.min(5, Math.max(0, Number(med.level) || 0));
      const imageSrc = getMedalImage(med.key);

      if (med.isDirectLevel5) {
        const isAchieved = lvl === 5;
        items.push({
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

          const roman = TIER_SCHEMES[l].roman;

          items.push({
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

    return items;
  }, [data]);

  // Filter and sort items
  const filteredMedals = useMemo(() => {
    return allMedalItems.filter(m => {
      const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || 
                            (statusFilter === 'UNLOCKED' && m.isAchieved) || 
                            (statusFilter === 'LOCKED' && m.isLocked);
      const matchesQuery = searchQuery.trim() === '' || 
                           m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           m.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesStatus && matchesQuery;
    });
  }, [allMedalItems, categoryFilter, statusFilter, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: allMedalItems.length,
      COMMON: allMedalItems.filter(m => m.category === 'COMMON').length,
      RARE: allMedalItems.filter(m => m.category === 'RARE').length,
      MYTHIC: allMedalItems.filter(m => m.category === 'MYTHIC').length,
    };
  }, [allMedalItems]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d12' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", border: "4px solid transparent", borderTopColor: "#06b6d4", animation: "spin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite", margin: "0 auto 1.25rem" }} />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.95rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" }}>Loading Master Trophy Cabinet...</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </main>
        <PortalFooter />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090d12' }}>
        <PortalNavbar />
        <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ maxWidth: "600px", textAlign: "center" }}>
            <div className="portal-card" style={{ padding: "3rem", borderRadius: "24px", border: "1px solid rgba(239,68,68,0.2)" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3.5rem", color: "#ef4444", marginBottom: "1.5rem" }} />
              <h2 style={{ fontSize: "1.6rem", color: "#fff", marginBottom: "1rem" }}>Tactician Profile Not Found</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
              <button onClick={() => router.back()} className="portal-btn btn-secondary">
                Return to Directory
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
  const medalInfo = medalStats || { level: 1, medals: [], medalExp: 0 };

  const totalExp = medalInfo.medalExp;
  const { level, nextLevelExp, progressPercent } = calculateLevel(totalExp);
  
  let spotlightColor = "#06b6d4"; // Cyan default
  let rankLabel = "ROOKIE TACTICIAN";
  let rankGradient = "linear-gradient(135deg, #06b6d4, #3b82f6)";
  
  if (level >= 15) {
    spotlightColor = "#ef4444"; // Red for Legend
    rankLabel = "LEGENDARY MASTER";
    rankGradient = "linear-gradient(135deg, #ef4444, #f59e0b)";
  } else if (level >= 10) {
    spotlightColor = "#c084fc"; // Purple for Master
    rankLabel = "MASTER STRATEGIST";
    rankGradient = "linear-gradient(135deg, #c084fc, #ec4899)";
  } else if (level >= 5) {
    spotlightColor = "#fbbf24"; // Gold for Elite
    rankLabel = "ELITE TACTICIAN";
    rankGradient = "linear-gradient(135deg, #fbbf24, #f59e0b)";
  }

  const totalBadgesCount = allMedalItems.length;
  const unlockedBadgesCount = allMedalItems.filter(m => m.isAchieved).length;
  const badgesCompletionPercent = Math.round((unlockedBadgesCount / totalBadgesCount) * 100) || 0;

  // Build XP Ledger entries
  const ledgerEntries: LedgerEntry[] = [];
  let ledgerCounter = 1;

  allMedalItems.filter(m => m.isAchieved).forEach(m => {
    ledgerEntries.push({
      id: `xp-badge-${ledgerCounter++}`,
      source: 'BADGE_UNLOCKED',
      description: `Unlocked Achievement: ${m.name}`,
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

  // Navigation handlers inside modal
  const handleModalNextTier = () => {
    if (!modalMedal) return;
    const currIndex = allMedalItems.findIndex(i => i.id === modalMedal.id);
    if (currIndex !== -1 && currIndex < allMedalItems.length - 1) {
      setModalMedal(allMedalItems[currIndex + 1]);
    }
  };

  const handleModalPrevTier = () => {
    if (!modalMedal) return;
    const currIndex = allMedalItems.findIndex(i => i.id === modalMedal.id);
    if (currIndex > 0) {
      setModalMedal(allMedalItems[currIndex - 1]);
    }
  };

  return (
    <div className="app-container" style={{ position: 'relative', overflow: 'hidden', background: '#080c10' }}>
      <PortalNavbar />

      {/* Cyber Ambient Lighting Spotlights */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '15%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${spotlightColor}18 0%, transparent 70%)`,
        filter: 'blur(160px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <div style={{
        position: 'absolute',
        top: '40%',
        right: '-10%',
        width: '550px',
        height: '550px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)',
        filter: 'blur(150px)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <main className="main-content" style={{ position: 'relative', zIndex: 5 }}>
        <div className="portal-container" style={{ maxWidth: "100%", width: "100%", padding: "1.5rem", gap: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          
          {/* Breadcrumb Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link href={`/members/${id}`} className="portal-btn btn-secondary back-link-btn" style={{ fontSize: "0.8rem", padding: "8px 18px", backdropFilter: 'blur(16px)', background: 'rgba(23, 23, 23, 0.50)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
              <i className="fas fa-arrow-left" style={{ marginRight: "8px", color: spotlightColor }} /> Return to Tactician Profile
            </Link>

            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
              SYSTEM STATUS: <span style={{ color: '#22c55e', fontWeight: 900 }}>ONLINE</span>
            </span>
          </div>

          {/* Gamified Hero Card (Glassmorphic AAA Design) */}
          <div style={{
            background: 'rgba(15, 20, 28, 0.55)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem' }}>
              
              {/* Avatar & Tactician Header */}
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '50%',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: `url('${manager.avatar_path || '/assets/images/default-manager.webp'}'), url('/assets/images/default-manager.webp')`,
                    border: `3px solid ${spotlightColor}`,
                    boxShadow: `0 0 25px ${spotlightColor}50, inset 0 0 15px rgba(0,0,0,0.5)`
                  }} />
                  <div className="pulsing-badge" style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: rankGradient,
                    border: '3px solid #0f141c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 950,
                    fontSize: '0.9rem',
                    color: '#fff',
                    boxShadow: `0 0 15px ${spotlightColor}`,
                    animation: 'pulse 3s infinite'
                  }}>
                    {level}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', color: spotlightColor, background: `${spotlightColor}18`, padding: '3px 10px', borderRadius: '6px', border: `1px solid ${spotlightColor}30`, letterSpacing: '1.5px' }}>
                      {rankLabel}
                    </span>
                  </div>
                  <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 950, color: "#fff", margin: "2px 0 4px", letterSpacing: '-0.5px' }}>
                    {manager.name}
                  </h1>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--font-mono)' }}>
                    R2G ID: <span style={{ color: '#fff', fontWeight: 700 }}>{manager.r2g_id || 'NOT_ASSIGNED'}</span>
                  </p>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', flex: 1, minWidth: '300px', justifyContent: 'flex-end' }}>
                
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fff', fontFamily: 'var(--font-mono)' }}>
                    {unlockedBadgesCount}<span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '1.1rem' }}>/{totalBadgesCount}</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>Tiers Earned</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: spotlightColor, fontFamily: 'var(--font-mono)' }}>
                    {badgesCompletionPercent}%
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>Completion</div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '12px 20px', textAlign: 'center', minWidth: '120px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 950, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                    {totalExp.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px' }}>Total XP</div>
                </div>

              </div>

            </div>

            {/* Level Progression Progress Bar */}
            <div style={{ width: '100%', marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                <span>LEVEL {level} EXP PROGRESSION</span>
                <span style={{ color: '#fff', fontWeight: 700 }}>{totalExp.toLocaleString()} / {nextLevelExp.toLocaleString()} XP ({progressPercent}%)</span>
              </div>
              <div style={{ width: '100%', height: '14px', background: 'rgba(0,0,0,0.4)', borderRadius: '7px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${spotlightColor}, #3b82f6, #fbbf24)`,
                  borderRadius: '5px',
                  position: 'relative',
                  boxShadow: `0 0 15px ${spotlightColor}`
                }}>
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    width: '5px',
                    height: '100%',
                    backgroundColor: '#fff',
                    boxShadow: '0 0 8px #fff, 0 0 15px #fff',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            </div>

          </div>

          {/* Navigation Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            
            {/* View Tab Switcher */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 20, 28, 0.6)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setActiveTab('SHOWCASE')}
                className={`nav-tab-btn ${activeTab === 'SHOWCASE' ? 'active' : ''}`}
              >
                <i className="fa-solid fa-trophy" style={{ marginRight: '8px' }} /> TROPHY CABINET SHOWCASE
              </button>
              <button
                onClick={() => setActiveTab('LEDGER')}
                className={`nav-tab-btn ${activeTab === 'LEDGER' ? 'active' : ''}`}
              >
                <i className="fa-solid fa-list-check" style={{ marginRight: '8px' }} /> XP AUDIT LEDGER
              </button>
            </div>

            {/* Live Search Input */}
            {activeTab === 'SHOWCASE' && (
              <div style={{ position: 'relative', minWidth: '260px' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)', fontSize: '0.85rem' }} />
                <input
                  type="text"
                  placeholder="Search medals by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(15, 20, 28, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '8px 14px 8px 38px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    outline: 'none',
                    backdropFilter: 'blur(10px)'
                  }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                    &times;
                  </button>
                )}
              </div>
            )}

          </div>

          {/* TAB 1: TROPHY CABINET SHOWCASE */}
          {activeTab === 'SHOWCASE' && (
            <div className="tab-pane-content" style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
              
              {/* Filter Chips Toolbar */}
              <div style={{
                background: 'rgba(15, 20, 28, 0.55)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '1rem 1.5rem',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {/* Rarity filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px' }}>Rarity:</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(['ALL', 'COMMON', 'RARE', 'MYTHIC'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`filter-chip-btn ${categoryFilter === cat ? 'active' : ''}`}
                      >
                        {cat} <span style={{ opacity: 0.6, fontSize: '0.68rem', marginLeft: '4px' }}>({categoryCounts[cat]})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px' }}>Status:</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {(['ALL', 'UNLOCKED', 'LOCKED'] as const).map(stat => (
                      <button
                        key={stat}
                        onClick={() => setStatusFilter(stat)}
                        className={`filter-chip-btn ${statusFilter === stat ? 'active' : ''}`}
                      >
                        {stat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medals Showcase Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                {['COMMON', 'RARE', 'MYTHIC'].map((cat) => {
                  const catMedals = filteredMedals.filter((m: any) => m.category === cat);
                  const catColor = cat === 'COMMON' ? '#60a5fa' : cat === 'RARE' ? '#f59e0b' : '#ec4899';
                  if (catMedals.length === 0) return null;
                  
                  // Sort sequentially: Group by key, then Tier I through Tier V
                  const sorted = [...catMedals].sort((a, b) => {
                    if (a.key === b.key) {
                      return a.level - b.level;
                    }
                    return 0;
                  });

                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '1.25rem' }}>
                        <h3 style={{ color: catColor, fontSize: '1rem', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '2px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: catColor, boxShadow: `0 0 10px ${catColor}` }} /> {cat} MEDALS SHOWCASE
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                          {catMedals.length} Items Listed
                        </span>
                      </div>

                      <div className="revamped-badges-grid">
                        {sorted.map(m => {
                          const scheme = TIER_SCHEMES[m.isLocked ? 0 : m.level];
                          return (
                            <div
                              key={m.id}
                              onClick={() => setModalMedal(m)}
                              className={`revamped-badge-card ${m.isLocked ? 'locked' : 'unlocked'}`}
                              style={{
                                background: 'rgba(15, 20, 28, 0.65)',
                                border: `1px solid ${m.isLocked ? 'rgba(255,255,255,0.08)' : `${scheme.text}35`}`,
                                borderRadius: '20px',
                                padding: '1.15rem 0.9rem',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                position: 'relative',
                                minHeight: '165px',
                                justifyContent: 'space-between'
                              }}
                            >
                              {/* Corner status indicator */}
                              {!m.isLocked ? (
                                <div style={{
                                  position: 'absolute',
                                  top: '10px',
                                  right: '10px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: 'rgba(34,197,94,0.15)',
                                  border: '1px solid rgba(34,197,94,0.4)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#22c55e',
                                  fontSize: '0.65rem',
                                  fontWeight: 950,
                                  zIndex: 3
                                }}>
                                  ✓
                                </div>
                              ) : (
                                <div className="lock-overlay-tag" style={{
                                  position: 'absolute',
                                  top: '10px',
                                  right: '10px',
                                  width: '20px',
                                  height: '20px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'rgba(255,255,255,0.25)',
                                  fontSize: '0.7rem',
                                  zIndex: 3
                                }}>
                                  <i className="fa-solid fa-lock" />
                                </div>
                              )}

                              {/* Halo Glow effect */}
                              {!m.isLocked && <div className="halo-glow" style={{ backgroundColor: scheme.halo }} />}

                              {/* 3D Generated Circular Medal Asset Image */}
                              <div style={{
                                width: '64px',
                                height: '64px',
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
                                      : `drop-shadow(0 0 10px ${scheme.text})`,
                                    transition: 'transform 0.25s, filter 0.25s'
                                  }}
                                />
                              </div>

                              {/* Title + Tier Roman Label */}
                              <div style={{ width: '100%', marginTop: '0.5rem', position: 'relative', zIndex: 2 }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 900, color: m.isLocked ? 'rgba(255,255,255,0.35)' : '#fff', lineHeight: 1.2, height: '2.4em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {m.name}
                                </div>

                                <div style={{
                                  fontSize: '0.6rem',
                                  fontWeight: 950,
                                  color: m.isLocked ? 'rgba(255,255,255,0.3)' : scheme.text,
                                  background: m.isLocked ? 'rgba(255,255,255,0.03)' : `${scheme.text}15`,
                                  border: `1px solid ${m.isLocked ? 'rgba(255,255,255,0.06)' : `${scheme.text}30`}`,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-block',
                                  marginTop: '6px',
                                  letterSpacing: '1px'
                                }}>
                                  TIER {m.tierRoman}
                                </div>
                              </div>

                              {/* Mini Card Progress Bar */}
                              {m.targetValue !== "Admin award only" && (
                                <div style={{ width: '100%', marginTop: '8px', zIndex: 2 }}>
                                  <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{
                                      width: `${m.progressPercent}%`,
                                      height: '100%',
                                      background: m.isLocked ? 'rgba(255,255,255,0.2)' : scheme.text,
                                      borderRadius: '2px'
                                    }} />
                                  </div>
                                </div>
                              )}

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
              <div style={{
                background: 'rgba(15, 20, 28, 0.65)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '24px',
                padding: '1.75rem',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-list-check" style={{ color: '#fbbf24' }} /> XP AUDIT HISTORY LEDGER
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                    Total Logs: {ledgerEntries.length}
                  </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table className="ledger-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', textAlign: 'left' }}>
                        <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 950, letterSpacing: '1px' }}>Event Source</th>
                        <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 950, letterSpacing: '1px' }}>Description</th>
                        <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 950, letterSpacing: '1px', textAlign: 'right' }}>Date Logged</th>
                        <th style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 950, letterSpacing: '1px', textAlign: 'right' }}>XP Awarded</th>
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
                          pillBg = 'rgba(34,197,94,0.06)';
                        } else if (entry.source === 'GOAL_SCORED') {
                          pillBorder = '#06b6d4';
                          pillText = '#06b6d4';
                          pillBg = 'rgba(6,182,212,0.06)';
                        } else if (entry.source === 'MATCH_PLAYED') {
                          pillBorder = '#3b82f6';
                          pillText = '#3b82f6';
                          pillBg = 'rgba(59,130,246,0.06)';
                        } else if (entry.source === 'BADGE_UNLOCKED') {
                          pillBorder = '#fbbf24';
                          pillText = '#fbbf24';
                          pillBg = 'rgba(251,191,36,0.06)';
                        }

                        return (
                          <tr key={entry.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s' }} className="ledger-row">
                            <td style={{ padding: '14px 14px' }}>
                              <span style={{
                                border: `1px solid ${pillBorder}`,
                                color: pillText,
                                background: pillBg,
                                fontSize: '0.62rem',
                                fontWeight: 950,
                                textTransform: 'uppercase',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                letterSpacing: '0.5px'
                              }}>
                                {entry.source.replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ padding: '14px 14px', color: '#fff', fontWeight: 600 }}>{entry.description}</td>
                            <td style={{ padding: '14px 14px', color: 'rgba(255,255,255,0.45)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{entry.date}</td>
                            <td style={{ padding: '14px 14px', color: pillText, fontWeight: 950, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
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
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          animation: 'fadeIn 0.25s ease-out'
        }}
        onClick={() => setModalMedal(null)}>
          
          <div style={{
            background: 'rgb(15, 20, 28)',
            border: `1px solid ${modalMedal.isLocked ? 'rgba(255,255,255,0.12)' : `${TIER_SCHEMES[modalMedal.level].text}45`}`,
            borderRadius: '28px',
            width: '100%',
            maxWidth: '520px',
            padding: '2.25rem',
            position: 'relative',
            boxShadow: modalMedal.isLocked ? '0 25px 50px rgba(0,0,0,0.7)' : `0 0 50px ${TIER_SCHEMES[modalMedal.level].text}25`,
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both'
          }}
          onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Exit */}
            <button
              onClick={() => setModalMedal(null)}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '1.25rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              &times;
            </button>

            {/* Circular Medal Asset Image in Modal */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
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
                      : `drop-shadow(0 0 20px ${TIER_SCHEMES[modalMedal.level].text})`
                  }}
                />
              </div>
            </div>

            {/* Modal Title details */}
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', color: TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text, background: `${TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text}18`, padding: '3px 10px', borderRadius: '6px', border: `1px solid ${TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text}30` }}>
                  {modalMedal.category}
                </span>
                <span style={{ fontSize: '0.65rem', fontWeight: 950, textTransform: 'uppercase', background: modalMedal.isLocked ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.12)', color: modalMedal.isLocked ? 'rgba(255,255,255,0.4)' : '#22c55e', padding: '3px 10px', borderRadius: '6px', border: `1px solid ${modalMedal.isLocked ? 'rgba(255,255,255,0.08)' : 'rgba(34,197,94,0.3)'}` }}>
                  Tier {modalMedal.tierRoman}
                </span>
              </div>

              <h2 style={{ fontSize: '1.45rem', fontWeight: 950, color: '#fff', margin: '6px 0', fontFamily: 'var(--font-display)', letterSpacing: '-0.3px' }}>
                {modalMedal.name}
              </h2>

              <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                {modalMedal.description}
              </p>
            </div>

            {/* Requirements Progress Info */}
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '1.15rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px', color: 'rgba(255,255,255,0.5)' }}>
                <span>Career Record:</span>
                <strong style={{ color: '#fff', fontFamily: 'var(--font-mono)' }}>{modalMedal.currentValue}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '12px', color: 'rgba(255,255,255,0.5)' }}>
                <span>Tier Requirement Target:</span>
                <strong style={{ color: TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text, fontFamily: 'var(--font-mono)' }}>{modalMedal.targetValue}</strong>
              </div>

              {/* Progress visual bar */}
              {modalMedal.targetValue !== "Admin award only" && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                    <span>TIER {modalMedal.tierRoman} COMPLETION</span>
                    <span>{modalMedal.progressPercent}%</span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${modalMedal.progressPercent}%`,
                      height: '100%',
                      borderRadius: '4px',
                      background: `linear-gradient(90deg, ${TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text}, #fff)`
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bounty & Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bounty Reward:</span>
                <span style={{ fontSize: '1.2rem', fontWeight: 950, color: TIER_SCHEMES[modalMedal.isLocked ? 0 : modalMedal.level].text, fontFamily: 'var(--font-mono)' }}>
                  +{modalMedal.exp.toLocaleString()} XP
                </span>
              </div>

              {/* Modal Prev / Next Tier buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleModalPrevTier}
                  className="portal-btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  <i className="fa-solid fa-chevron-left" /> Prev
                </button>
                <button
                  onClick={handleModalNextTier}
                  className="portal-btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                >
                  Next <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global CSS Inject */}
      <style>{`
        .nav-tab-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.5);
          padding: 8px 18px;
          font-size: 0.78rem;
          font-weight: 950;
          text-transform: uppercase;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          letter-spacing: 0.5px;
        }
        .nav-tab-btn:hover {
          color: #fff;
        }
        .nav-tab-btn.active {
          background: #fff;
          color: #000;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.2);
        }

        .filter-chip-btn {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.5);
          padding: 5px 14px;
          font-size: 0.72rem;
          font-weight: 950;
          text-transform: uppercase;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .filter-chip-btn:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }
        .filter-chip-btn.active {
          background: #fff;
          border-color: #fff;
          color: #000;
          box-shadow: 0 0 12px rgba(255, 255, 255, 0.2);
        }

        .revamped-badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 1.15rem;
        }

        /* Badge hover effects */
        .revamped-badge-card.unlocked:hover {
          transform: translateY(-5px) scale(1.05);
          border-color: rgba(255,255,255,0.3) !important;
          box-shadow: 0 15px 30px rgba(0,0,0,0.5);
        }
        .revamped-badge-card.unlocked:hover .halo-glow {
          opacity: 1;
        }
        .revamped-badge-card.locked {
          opacity: 0.4;
        }
        .revamped-badge-card.locked:hover {
          opacity: 0.65;
          transform: translateY(-2px);
        }

        /* Halo underneath badge */
        .halo-glow {
          position: absolute;
          bottom: 15px;
          left: 50%;
          transform: translateX(-50%);
          width: 70px;
          height: 10px;
          border-radius: 50%;
          filter: blur(12px);
          opacity: 0;
          transition: opacity 0.25s;
          pointer-events: none;
        }

        .ledger-row:hover {
          background: rgba(255, 255, 255, 0.025);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { transform: translateY(18px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
          70% { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(255,255,255,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }

        @media (max-width: 576px) {
          .revamped-badges-grid {
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 10px;
          }
          .revamped-badge-card {
            padding: 10px 6px !important;
            min-height: 135px !important;
          }
        }
      `}</style>

      <PortalFooter />
    </div>
  );
}
