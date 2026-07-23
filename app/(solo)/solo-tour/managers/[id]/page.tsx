"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./manager-detail.css";
import { useParams } from "next/navigation";
import { fetchManagerByName, fetchManagerTransactions } from "@/utils/solo/serverActions";

export default function ManagerDetail() {
    const params = useParams();
    const managerName = decodeURIComponent(params.id as string);
    const [manager, setManager] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Tab state
    const [activeTab, setActiveTab] = useState<"overview" | "squad" | "wallet" | "seasons">("overview");
    const [activeSeasons, setActiveSeasons] = useState<Record<number, boolean>>({});
    const [squadSearch, setSquadSearch] = useState("");

    // Wallet state
    const [selectedCurrency, setSelectedCurrency] = useState<'coin' | 'token' | 'voucher'>('coin');
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    useEffect(() => {
        if (!manager) return;
        async function loadTransactionLogs() {
            setLoadingLogs(true);
            try {
                const data = await fetchManagerTransactions(manager.id, selectedCurrency);
                setLogs(data || []);
            } catch (e) {
                console.error("Failed to load transactions:", e);
            } finally {
                setLoadingLogs(false);
            }
        }
        loadTransactionLogs();
    }, [manager?.id, selectedCurrency]);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchManagerByName(managerName);
                if (!data) {
                    setError(`Manager "${managerName}" not found`);
                    return;
                }
                const managerData = data as any;
                document.title = `${managerData.name} - Manager Profile | R2G`;
                setManager(managerData);
            } catch (err: any) {
                setError('Failed to load manager data. Please try again later.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [managerName]);

    const toggleSeason = (seasonNumber: number) => {
        setActiveSeasons(prev => ({
            ...prev,
            [seasonNumber]: !prev[seasonNumber]
        }));
    };

    if (loading) {
        return (
            <div className="portal-root-wrapper">
                <div className="portal-bg-grid" />
                <div className="portal-glow-orb-1" />
                <div className="portal-glow-orb-2" />

                <div className="portal-container">
                    <div style={{ width: "100%" }}>
                        <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "1.5rem" }}>
                            <i className="fas fa-arrow-left"></i> Back to Managers Directory
                        </Link>
                    </div>
                    <div className="manager-profile">
                        <div className="profile-header-card skeleton-card">
                            <div className="skeleton-loader skeleton-banner"></div>
                            <div className="profile-header-content">
                                <div className="skeleton-loader skeleton-avatar"></div>
                                <div className="skeleton-info">
                                    <div className="skeleton-loader skeleton-line-title"></div>
                                    <div className="skeleton-loader skeleton-line-sub"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !manager) {
        return (
            <div className="portal-root-wrapper">
                <div className="portal-bg-grid" />
                <div className="portal-glow-orb-1" />
                <div className="portal-glow-orb-2" />

                <div className="portal-container">
                    <div style={{ width: "100%" }}>
                        <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "1.5rem" }}>
                            <i className="fas fa-arrow-left"></i> Back to Managers Directory
                        </Link>
                    </div>
                    <div className="manager-profile">
                        <div className="no-results-message">
                            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i>
                            <h3>Error Loading Manager Profile</h3>
                            <p>{error || 'An unexpected error occurred while fetching manager profile details.'}</p>
                            <Link href="/solo-tour/managers" className="portal-btn btn-primary reset-btn" style={{ marginTop: '1rem', display: 'inline-block' }}>
                                Return to Managers Directory
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Stars Rating calculation
    const rating = parseInt(manager.star_rating || 0);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i === 3 && rating >= 6) {
            stars.push(<i key={i} className="fas fa-sun star" style={{ color: '#fbbf24' }}></i>);
        } else if (i <= rating) {
            stars.push(<i key={i} className="fas fa-star star"></i>);
        } else {
            stars.push(<i key={i} className="fas fa-star star empty"></i>);
        }
    }

    const positionOrder: Record<string, number> = {
        'GK': 1, 'CB': 2, 'LB': 3, 'RB': 4,
        'DM': 5, 'CM': 6, 'AM': 7,
        'LW': 8, 'RW': 9, 'ST': 10
    };

    const sortedPlayers = manager.squad && manager.squad.players ? [...manager.squad.players].sort((a: any, b: any) => {
        const posA = positionOrder[a.position] || 999;
        const posB = positionOrder[b.position] || 999;
        return posA - posB || (b.value || 0) - (a.value || 0);
    }) : [];

    const filteredPlayers = sortedPlayers.filter((p: any) => 
        (p.player_name || '').toLowerCase().includes(squadSearch.toLowerCase()) ||
        (p.position || '').toLowerCase().includes(squadSearch.toLowerCase()) ||
        (p.player_type || '').toLowerCase().includes(squadSearch.toLowerCase())
    );

    const totalSquadValue = sortedPlayers.reduce((acc: number, p: any) => acc + (Number(p.value) || 0), 0);
    const totalSquadSalary = sortedPlayers.reduce((acc: number, p: any) => acc + (Number(p.salary) || 0), 0);

    const sortedSeasons = manager.seasons ? [...manager.seasons].sort((a: any, b: any) => b.number - a.number) : [];

    const perf = manager.performance || {
        matches: manager.stats?.matches || 0,
        wins: manager.stats?.wins || 0,
        draws: manager.stats?.draws || 0,
        losses: manager.stats?.losses || 0,
        goals_scored: manager.stats?.goalsFor || 0,
        goals_conceded: manager.stats?.goalsAgainst || 0,
        goal_difference: (manager.stats?.goalsFor || 0) - (manager.stats?.goalsAgainst || 0),
        clean_sheets: manager.stats?.cleanSheets || 0
    };

    const matches = Number(perf.matches || 0);
    const wins = Number(perf.wins || 0);
    const winRate = matches > 0 ? ((wins / matches) * 100).toFixed(1) : '0.0';

    return (
        <div className="portal-root-wrapper">
            {/* Background Grids and Glow Orbs */}
            <div className="portal-bg-grid" />
            <div className="portal-glow-orb-1" />
            <div className="portal-glow-orb-2" />

            {/* Main Content Container */}
            <div className="portal-container">
                {/* Navigation / Back Button */}
                <div style={{ width: "100%" }}>
                    <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "1.5rem" }}>
                        <i className="fas fa-arrow-left"></i> Back to Managers Directory
                    </Link>
                </div>
                
                <div className="manager-profile">
                    {/* Glassmorphic Profile Header */}
                    <div className="profile-header-card">
                        <div 
                            className="profile-banner" 
                            style={{ backgroundImage: `url('/assets/images/club-backgrounds/${encodeURIComponent(manager.club)}.jpg'), linear-gradient(135deg, rgba(20, 25, 40, 0.9) 0%, rgba(10, 12, 20, 0.95) 100%)` }}
                        >
                            <div className="profile-banner-overlay" />
                        </div>
                        
                        <div className="profile-header-content">
                            <div className="manager-avatar-wrapper">
                                <div 
                                    className="manager-portrait" 
                                    style={{ 
                                        backgroundImage: manager.photo 
                                            ? `url('${manager.photo}')`
                                            : `url('/assets/images/managers/${manager.name.toLowerCase().replace(/\s+/g, '-')}.webp'), url('/assets/images/default-manager.webp')` 
                                    }}
                                />
                                <div 
                                    className="manager-club-badge-overlay" 
                                    style={{ backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(manager.club.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` }}
                                    title={manager.club}
                                />
                            </div>
                            
                            <div className="manager-info">
                                <div className="manager-title-row">
                                    <div>
                                        <h1 className="manager-name">{manager.name}</h1>
                                        <div className="manager-club">
                                            <span className="club-logo-mini" style={{ backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(manager.club.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` }}></span>
                                            {manager.club}
                                        </div>
                                    </div>
                                    {manager.star_rating && (
                                        <div className="star-rating" title={`${manager.star_rating} Star Manager`}>
                                            {stars}
                                        </div>
                                    )}
                                </div>

                                <div className="manager-badges">
                                    {manager.r2g_id && (
                                        <div className="badge">
                                            <i className="fas fa-id-badge"></i>
                                            <span>R2G ID: {manager.r2g_id}</span>
                                        </div>
                                    )}
                                    <div className="badge">
                                        <i className="fas fa-ranking-star"></i>
                                        <span>Rank: #{manager.age || '-'}</span>
                                    </div>
                                    <div className="badge">
                                        <i className="fas fa-trophy" style={{ color: "#fbbf24" }}></i>
                                        <span>Trophies: {manager.trophies || 0}</span>
                                    </div>
                                    <div 
                                        className="badge clickable"
                                        onClick={() => {
                                            setSelectedCurrency('coin');
                                            setActiveTab('wallet');
                                        }}
                                        title="Click to view Coin transactions"
                                    >
                                        <i className="fas fa-coins" style={{ color: "#fbbf24" }}></i>
                                        <span>{manager.r2g_coin_balance || 0} RC</span>
                                    </div>
                                    <div 
                                        className="badge clickable"
                                        onClick={() => {
                                            setSelectedCurrency('token');
                                            setActiveTab('wallet');
                                        }}
                                        title="Click to view Token transactions"
                                    >
                                        <i className="fas fa-medal" style={{ color: "#38bdf8" }}></i>
                                        <span>{manager.r2g_token_balance || 0} RT</span>
                                    </div>
                                    <Link 
                                        href={`/members/${encodeURIComponent(manager.r2g_id || manager.id)}`}
                                        className="badge clickable unified-badge"
                                        title="View combined stats across Solo, Special, and RWS Tournaments"
                                    >
                                        <i className="fas fa-user-gear"></i>
                                        <span>Unified Profile</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Navigation Tabs */}
                    <div className="manager-nav-tabs">
                        <button
                            type="button"
                            className={`nav-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            <i className="fas fa-chart-pie" /> Overview
                        </button>
                        <button
                            type="button"
                            className={`nav-tab-btn ${activeTab === 'squad' ? 'active' : ''}`}
                            onClick={() => setActiveTab('squad')}
                        >
                            <i className="fas fa-users" /> Squad ({sortedPlayers.length})
                        </button>
                        <button
                            type="button"
                            className={`nav-tab-btn ${activeTab === 'wallet' ? 'active' : ''}`}
                            onClick={() => setActiveTab('wallet')}
                        >
                            <i className="fas fa-wallet" /> Wallet Logs
                        </button>
                        <button
                            type="button"
                            className={`nav-tab-btn ${activeTab === 'seasons' ? 'active' : ''}`}
                            onClick={() => setActiveTab('seasons')}
                        >
                            <i className="fas fa-clock-rotate-left" /> Career History ({sortedSeasons.length})
                        </button>
                    </div>

                    {/* TAB 1: OVERVIEW & PERFORMANCE STATS */}
                    {activeTab === 'overview' && (
                        <div className="tab-pane fade-in">
                            {/* Key Highlights Grid */}
                            <div className="overview-highlights-grid">
                                <div className="highlight-card primary-glow">
                                    <div className="highlight-icon-box">
                                        <i className="fas fa-star" />
                                    </div>
                                    <div className="highlight-data">
                                        <span className="highlight-val">{parseFloat(manager.overall_rating || 0).toFixed(1)}</span>
                                        <span className="highlight-lbl">Overall Rating</span>
                                    </div>
                                </div>

                                <div className="highlight-card gold-glow">
                                    <div className="highlight-icon-box">
                                        <i className="fas fa-trophy" />
                                    </div>
                                    <div className="highlight-data">
                                        <span className="highlight-val">{manager.trophies || 0}</span>
                                        <span className="highlight-lbl">Trophies Won</span>
                                    </div>
                                </div>

                                <div className="highlight-card emerald-glow">
                                    <div className="highlight-icon-box">
                                        <i className="fas fa-chart-line" />
                                    </div>
                                    <div className="highlight-data">
                                        <span className="highlight-val">{winRate}%</span>
                                        <span className="highlight-lbl">Win Rate</span>
                                    </div>
                                </div>

                                <div className="highlight-card blue-glow">
                                    <div className="highlight-icon-box">
                                        <i className="fas fa-sack-dollar" />
                                    </div>
                                    <div className="highlight-data">
                                        <span className="highlight-val">{manager.club_total_value || 0}M RC</span>
                                        <span className="highlight-lbl">Club Value</span>
                                    </div>
                                </div>
                            </div>

                            {/* Complete Performance Grid */}
                            <div className="profile-section" style={{ marginTop: "1.5rem" }}>
                                <h2 className="section-title"><i className="fas fa-futbol"></i> Solo Career Match Performance & Statistics</h2>
                                {perf ? (
                                    <div className="stats-grid">
                                        <div className="stat-card">
                                            <i className="fas fa-gamepad stat-icon"></i>
                                            <span className="stat-value">{perf.matches || 0}</span>
                                            <span className="stat-label">Total Matches</span>
                                        </div>
                                        <div className="stat-card stat-win">
                                            <i className="fas fa-circle-check stat-icon"></i>
                                            <span className="stat-value">{perf.wins || 0}</span>
                                            <span className="stat-label">Wins</span>
                                        </div>
                                        <div className="stat-card stat-draw">
                                            <i className="fas fa-handshake stat-icon"></i>
                                            <span className="stat-value">{perf.draws || 0}</span>
                                            <span className="stat-label">Draws</span>
                                        </div>
                                        <div className="stat-card stat-loss">
                                            <i className="fas fa-circle-xmark stat-icon"></i>
                                            <span className="stat-value">{perf.losses || 0}</span>
                                            <span className="stat-label">Losses</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-bullseye stat-icon"></i>
                                            <span className="stat-value">{perf.goals_scored || 0}</span>
                                            <span className="stat-label">Goals Scored</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-shield-halved stat-icon"></i>
                                            <span className="stat-value">{perf.goals_conceded || 0}</span>
                                            <span className="stat-label">Goals Conceded</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-scale-balanced stat-icon"></i>
                                            <span className="stat-value">
                                                {perf.goal_difference > 0 ? `+${perf.goal_difference}` : perf.goal_difference || 0}
                                            </span>
                                            <span className="stat-label">Goal Difference</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-lock stat-icon"></i>
                                            <span className="stat-value">{perf.clean_sheets || 0}</span>
                                            <span className="stat-label">Clean Sheets</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-award stat-icon"></i>
                                            <span className="stat-value">{manager.awards || 0}</span>
                                            <span className="stat-label">Individual Awards</span>
                                        </div>
                                        <div className="stat-card">
                                            <i className="fas fa-users stat-icon"></i>
                                            <span className="stat-value">{sortedPlayers.length}</span>
                                            <span className="stat-label">Squad Size</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="empty-state-box">
                                        <i className="fas fa-folder-open" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                                        <p>No overall performance statistics recorded yet.</p>
                                    </div>
                                )}
                            </div>

                            {/* All-Time Honors & Individual Awards Gallery */}
                            <div className="profile-section" style={{ marginTop: "1.5rem" }}>
                                <h2 className="section-title"><i className="fas fa-award"></i> All-Time Honors & Individual Awards</h2>
                                {(() => {
                                    const awardCounts: Record<string, number> = {};
                                    (manager.seasons || []).forEach((s: any) => {
                                        if (Array.isArray(s.awards)) {
                                            s.awards.forEach((awd: string) => {
                                                if (!awd) return;
                                                awardCounts[awd] = (awardCounts[awd] || 0) + 1;
                                            });
                                        }
                                    });
                                    const awardEntries = Object.entries(awardCounts);
                                    return awardEntries.length > 0 ? (
                                        <div className="competitions" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "12px" }}>
                                            {awardEntries.map(([awd, count], idx: number) => (
                                                <div key={idx} className="competition-card" style={{ background: "rgba(251, 191, 36, 0.08)", border: "1px solid rgba(251, 191, 36, 0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <div className="competition-name" style={{ color: "#fbbf24", fontWeight: 600 }}>🏆 {awd}</div>
                                                    {count > 1 && (
                                                        <span className="award-count-badge" style={{ background: "#fbbf24", color: "#0f172a", fontWeight: 800, fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", marginLeft: "8px" }}>
                                                            x{count}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="empty-state-box">
                                            <i className="fas fa-award" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                                            <p>No individual or team awards recorded yet for this manager.</p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* TAB 2: SQUAD ROSTER */}
                    {activeTab === 'squad' && (
                        <div className="tab-pane fade-in">
                            <div className="squad-header-bar">
                                <div className="squad-summary-pills">
                                    <div className="summary-pill">
                                        <i className="fas fa-user-group" />
                                        <span>Total: <strong>{sortedPlayers.length} Players</strong></span>
                                    </div>
                                    <div className="summary-pill">
                                        <i className="fas fa-coins" />
                                        <span>Value: <strong>{totalSquadValue}M RC</strong></span>
                                    </div>
                                    <div className="summary-pill">
                                        <i className="fas fa-file-invoice-dollar" />
                                        <span>Salary: <strong>{totalSquadSalary}M RC/season</strong></span>
                                    </div>
                                </div>
                                
                                <div className="squad-search-box">
                                    <i className="fas fa-search search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search squad players or position..."
                                        value={squadSearch}
                                        onChange={(e) => setSquadSearch(e.target.value)}
                                    />
                                    {squadSearch && (
                                        <button type="button" className="clear-btn" onClick={() => setSquadSearch("")}>
                                            <i className="fas fa-times" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {filteredPlayers.length > 0 ? (
                                <div className="squad-grid">
                                    {filteredPlayers.map((player: any, i: number) => {
                                        const typeClass = player.player_type ? player.player_type.replace(/[^a-zA-Z0-9]/g, '-') : '';
                                        return (
                                            <div key={i} className="player-card">
                                                <div className={`player-position position-${player.position}`}>{player.position}</div>
                                                <div className="player-info">
                                                    <div className="player-name" title={player.player_name}>
                                                        <span>{player.player_name}</span>
                                                        {player.player_type && (
                                                            <span className={`player-type type-${typeClass}`}>{player.player_type}</span>
                                                        )}
                                                    </div>
                                                    <div className="player-details">
                                                        <span>{player.contract}</span>
                                                        <span className="dot-sep">•</span>
                                                        <span>{player.salary}M RC/yr</span>
                                                    </div>
                                                </div>
                                                <div className="player-value">{player.value}M RC</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state-box">
                                    <i className="fas fa-search-minus" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                                    <p>No squad players found matching &ldquo;{squadSearch}&rdquo;</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 3: WALLET & TRANSACTIONS */}
                    {activeTab === 'wallet' && (
                        <div className="tab-pane fade-in">
                            <div className="transaction-container">
                                <div className="transaction-header">
                                    <h2 className="section-title" style={{ margin: 0, border: "none", padding: 0 }}>
                                        <i className="fa-solid fa-receipt" /> Wallet & Transaction Logs
                                    </h2>
                                    
                                    <div className="transaction-tabs">
                                        <button 
                                            type="button"
                                            className={`transaction-tab ${selectedCurrency === 'coin' ? 'active' : ''}`}
                                            onClick={() => setSelectedCurrency('coin')}
                                        >
                                            <i className="fas fa-coins" style={{ color: "#fbbf24", marginRight: "6px" }} /> Coins (RC)
                                        </button>
                                        <button 
                                            type="button"
                                            className={`transaction-tab ${selectedCurrency === 'token' ? 'active' : ''}`}
                                            onClick={() => setSelectedCurrency('token')}
                                        >
                                            <i className="fas fa-medal" style={{ color: "#38bdf8", marginRight: "6px" }} /> Tokens (RT)
                                        </button>
                                        <button 
                                            type="button"
                                            className={`transaction-tab ${selectedCurrency === 'voucher' ? 'active' : ''}`}
                                            onClick={() => setSelectedCurrency('voucher')}
                                        >
                                            <i className="fas fa-ticket" style={{ color: "#ec4899", marginRight: "6px" }} /> Vouchers
                                        </button>
                                    </div>
                                </div>

                                <div className="transaction-list-card">
                                    {loadingLogs ? (
                                        <div className="logs-loading"><i className="fa-solid fa-spinner fa-spin" /> Loading transaction logs...</div>
                                    ) : logs.length === 0 ? (
                                        <div className="logs-empty">
                                            <i className="fa-solid fa-receipt" style={{ opacity: 0.3, fontSize: "2rem", marginBottom: "0.5rem" }} />
                                            <p>No transaction history found for this currency.</p>
                                        </div>
                                    ) : (
                                        <div className="logs-scroll-box">
                                            {logs.map((log: any, idx: number) => {
                                                const isPositive = Number(log.amount) >= 0;
                                                return (
                                                    <div key={idx} className="log-row-item">
                                                        <div className="log-row-left">
                                                            <span className="log-row-desc">{log.description}</span>
                                                            <span className="log-row-date">{new Date(log.created_at).toLocaleString()}</span>
                                                        </div>
                                                        <div className={`log-row-amount ${isPositive ? 'positive' : 'negative'}`}>
                                                            {isPositive ? '+' : ''}{log.amount} {selectedCurrency === 'coin' ? 'RC' : selectedCurrency === 'token' ? 'RT' : 'Voucher'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: CAREER SEASONS HISTORY */}
                    {activeTab === 'seasons' && (
                        <div className="tab-pane fade-in">
                            {sortedSeasons.length > 0 ? (
                                <div className="seasons-accordion">
                                    {sortedSeasons.map((season: any, index: number) => {
                                        const isActive = activeSeasons[season.number] || false;
                                        return (
                                            <div key={index} className={`season-item ${isActive ? 'active' : ''}`} data-season={season.number}>
                                                <div className="season-header" onClick={() => toggleSeason(season.number)}>
                                                    <div className="season-title">
                                                        <span className="season-number">Season {season.number}</span>
                                                        <span className="season-rank-tag">Rank: #{season.manager_rank} ({season.rank_point} pts)</span>
                                                    </div>
                                                    <div className="season-toggle">
                                                        <i className={`fas fa-chevron-${isActive ? 'up' : 'down'}`} />
                                                    </div>
                                                </div>
                                                
                                                {isActive && (
                                                    <div className="season-content fade-in">
                                                        <h3 className="sub-section-title"><i className="fas fa-sack-dollar" /> Financial Breakdown</h3>
                                                        <div className="season-stats">
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.team_income || 0}M RC</span>
                                                                <span className="stat-label">Income</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.team_expense || 0}M RC</span>
                                                                <span className="stat-label">Expense</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.team_profit || 0}M RC</span>
                                                                <span className="stat-label">Profit</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">
                                                                    {season.session_rewards || 0}M RC
                                                                    {Number(season.session_rewards_rt) > 0 ? ` / ${season.session_rewards_rt} RT` : ''}
                                                                </span>
                                                                <span className="stat-label">Rewards</span>
                                                            </div>
                                                        </div>
                                                        
                                                        {season.sp_tour_stats && (
                                                            <>
                                                                <h3 className="sub-section-title"><i className="fas fa-trophy" /> SP Tour Statistics</h3>
                                                                <div className="season-stats">
                                                                    <div className="stat-card"><span className="stat-value">{season.sp_tour_stats.matches || 0}</span><span className="stat-label">Matches</span></div>
                                                                    <div className="stat-card stat-win"><span className="stat-value">{season.sp_tour_stats.wins || 0}</span><span className="stat-label">Wins</span></div>
                                                                    <div className="stat-card stat-draw"><span className="stat-value">{season.sp_tour_stats.draws || 0}</span><span className="stat-label">Draws</span></div>
                                                                    <div className="stat-card stat-loss"><span className="stat-value">{season.sp_tour_stats.losses || 0}</span><span className="stat-label">Losses</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.sp_tour_stats.goals_scored || 0}</span><span className="stat-label">GS</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.sp_tour_stats.goals_conceded || 0}</span><span className="stat-label">GC</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.sp_tour_stats.goal_difference || 0}</span><span className="stat-label">GD</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.sp_tour_stats.clean_sheets || 0}</span><span className="stat-label">CS</span></div>
                                                                </div>
                                                            </>
                                                        )}
                                                        
                                                        {season.season_stats && (
                                                            <>
                                                                <h3 className="sub-section-title"><i className="fas fa-chart-simple" /> League Season Statistics</h3>
                                                                <div className="season-stats">
                                                                    <div className="stat-card"><span className="stat-value">{season.season_stats.matches || 0}</span><span className="stat-label">Matches</span></div>
                                                                    <div className="stat-card stat-win"><span className="stat-value">{season.season_stats.wins || 0}</span><span className="stat-label">Wins</span></div>
                                                                    <div className="stat-card stat-draw"><span className="stat-value">{season.season_stats.draws || 0}</span><span className="stat-label">Draws</span></div>
                                                                    <div className="stat-card stat-loss"><span className="stat-value">{season.season_stats.losses || 0}</span><span className="stat-label">Losses</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.season_stats.goals_scored || 0}</span><span className="stat-label">GS</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.season_stats.goals_conceded || 0}</span><span className="stat-label">GC</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.season_stats.goal_difference || 0}</span><span className="stat-label">GD</span></div>
                                                                    <div className="stat-card"><span className="stat-value">{season.season_stats.clean_sheets || 0}</span><span className="stat-label">CS</span></div>
                                                                </div>
                                                            </>
                                                        )}
                                                        
                                                        {season.competitions && Object.keys(season.competitions).length > 0 && (
                                                            <>
                                                                <h3 className="sub-section-title"><i className="fas fa-medal" /> Competitions & Placements</h3>
                                                                <div className="competitions">
                                                                    {Object.entries(season.competitions).map(([key, comp]: [string, any]) => comp.name ? (
                                                                        <div key={key} className="competition-card">
                                                                            <div className="competition-name">{comp.name}</div>
                                                                            <div className="competition-stage">{comp.placement || comp.stage || 'Completed'}</div>
                                                                        </div>
                                                                    ) : null)}
                                                                </div>
                                                            </>
                                                        )}
                                                        
                                                        <h3 className="sub-section-title"><i className="fas fa-award" /> Awards & Honors</h3>
                                                        <div className="competitions">
                                                            {(() => {
                                                                const sAwardCounts: Record<string, number> = {};
                                                                (season.awards || []).forEach((awd: string) => {
                                                                    if (!awd) return;
                                                                    sAwardCounts[awd] = (sAwardCounts[awd] || 0) + 1;
                                                                });
                                                                const entries = Object.entries(sAwardCounts);
                                                                return entries.length > 0 ? (
                                                                    entries.map(([award, count]: [string, number], i: number) => (
                                                                        <div key={i} className="competition-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                                            <div className="competition-name">🏆 {award}</div>
                                                                            {count > 1 && (
                                                                                <span className="award-count-badge" style={{ background: "#fbbf24", color: "#0f172a", fontWeight: 800, fontSize: "0.75rem", padding: "2px 8px", borderRadius: "12px", marginLeft: "8px" }}>
                                                                                    x{count}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className="competition-card">
                                                                        <div className="competition-name" style={{ opacity: 0.5 }}>No awards earned in this season</div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="empty-state-box">
                                    <i className="fas fa-history" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "0.5rem" }} />
                                    <p>No historical season records registered for this manager.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
