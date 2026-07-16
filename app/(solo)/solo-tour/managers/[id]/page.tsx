"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
    const [activeSeasons, setActiveSeasons] = useState<Record<number, boolean>>({});

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
    }, [manager, selectedCurrency]);

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
                        <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
                            <i className="fas fa-arrow-left"></i> Back to Managers Directory
                        </Link>
                    </div>
                    <div className="manager-profile">
                        <div className="profile-header">
                            <div className="skeleton-loader skeleton-avatar"></div>
                            <div className="skeleton-info">
                                <div className="skeleton-loader skeleton-name" style={{ height: '24px', marginBottom: '0.5rem' }}></div>
                                <div className="skeleton-loader skeleton-club" style={{ height: '18px', marginBottom: '0.75rem' }}></div>
                                <div className="skeleton-badges">
                                    <div className="skeleton-loader skeleton-badge"></div>
                                    <div className="skeleton-loader skeleton-badge"></div>
                                    <div className="skeleton-loader skeleton-badge"></div>
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
                        <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
                            <i className="fas fa-arrow-left"></i> Back to Managers Directory
                        </Link>
                    </div>
                    <div className="manager-profile">
                        <div className="no-results-message" style={{ borderStyle: 'solid', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
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

    const rating = parseInt(manager.star_rating || 0);
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        if (i === 3 && rating >= 6) {
            stars.push(<i key={i} className="fas fa-sun star" style={{ color: 'gold' }}></i>);
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

    const sortedSeasons = manager.seasons ? [...manager.seasons].sort((a: any, b: any) => b.number - a.number) : [];

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
                    <Link href="/solo-tour/managers" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
                        <i className="fas fa-arrow-left"></i> Back to Managers Directory
                    </Link>
                </div>
                
                <div className="manager-profile">
                    {/* Profile Header Details Card */}
                    <div className="profile-header-card">
                        <div 
                            className="profile-banner" 
                            style={{ backgroundImage: `url('/assets/images/club-backgrounds/${manager.club.replace(/\s+/g, '%20')}.jpg'), linear-gradient(135deg, #1a2a3a 0%, #0d1218 100%)` }}
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
                                ></div>
                                <div 
                                    className="manager-club-badge-overlay" 
                                    style={{ backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(manager.club.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` }}
                                    title={manager.club}
                                ></div>
                            </div>
                            <div className="manager-info">
                                <h1 className="manager-name">{manager.name}</h1>
                                <p className="manager-club">
                                    <span className="club-logo-mini" style={{ backgroundImage: `url('/assets/images/club-logos/${encodeURIComponent(manager.club.replace(/\s+/g, '-'))}.webp'), url('/assets/images/default-club-logo.png')` }}></span>
                                    {manager.club}
                                </p>
                                {manager.star_rating && (
                                    <div className="star-rating">
                                        {stars}
                                    </div>
                                )}
                                <div className="manager-badges">
                                    {manager.r2g_id && (
                                        <div className="badge">
                                            <i className="fas fa-id-badge"></i>
                                            <span>R2G ID: {manager.r2g_id}</span>
                                        </div>
                                    )}
                                    <div className="badge">
                                        <i className="fas fa-sort-numeric-up"></i>
                                        <span>Rank: {manager.age || '-'}</span>
                                    </div>
                                    <div className="badge">
                                        <i className="fas fa-trophy"></i>
                                        <span>Trophies: {manager.trophies || 0}</span>
                                    </div>
                                    <div 
                                        className="badge clickable"
                                        onClick={() => {
                                            setSelectedCurrency('coin');
                                            document.getElementById('transaction-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        title="Click to view Coin transactions"
                                    >
                                        <i className="fas fa-coins"></i>
                                        <span>Coins: {manager.r2g_coin_balance || 0}</span>
                                    </div>
                                    <div 
                                        className="badge clickable"
                                        onClick={() => {
                                            setSelectedCurrency('token');
                                            document.getElementById('transaction-section')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        title="Click to view Token transactions"
                                    >
                                        <i className="fas fa-medal"></i>
                                        <span>Tokens: {manager.r2g_token_balance || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Manager Performance Stats Section */}
                    <div className="profile-section">
                        <h2 className="section-title"><i className="fas fa-chart-line"></i> Manager Statistics</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <i className="fas fa-star stat-icon"></i>
                                <span className="stat-value">{parseFloat(manager.overall_rating || 0).toFixed(1)}</span>
                                <span className="stat-label">Overall</span>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-trophy stat-icon"></i>
                                <span className="stat-value">{manager.trophies || 0}</span>
                                <span className="stat-label">Trophies</span>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-coins stat-icon"></i>
                                <span className="stat-value">{manager.club_total_value || 0}M</span>
                                <span className="stat-label">Club Value</span>
                            </div>
                            <div className="stat-card">
                                <i className="fas fa-medal stat-icon"></i>
                                <span className="stat-value">{manager.awards || 0}</span>
                                <span className="stat-label">Awards</span>
                            </div>
                            {manager.performance && (
                                <>
                                    <div className="stat-card">
                                        <i className="fas fa-futbol stat-icon"></i>
                                        <span className="stat-value">{manager.performance.matches || 0}</span>
                                        <span className="stat-label">Total Matches</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-check-circle stat-icon"></i>
                                        <span className="stat-value">{manager.performance.wins || 0}</span>
                                        <span className="stat-label">Wins</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-handshake stat-icon"></i>
                                        <span className="stat-value">{manager.performance.draws || 0}</span>
                                        <span className="stat-label">Draws</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-times-circle stat-icon"></i>
                                        <span className="stat-value">{manager.performance.losses || 0}</span>
                                        <span className="stat-label">Losses</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-futbol stat-icon"></i>
                                        <span className="stat-value">{manager.performance.goals_scored || 0}</span>
                                        <span className="stat-label">Goals Scored</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-shield-alt stat-icon"></i>
                                        <span className="stat-value">{manager.performance.goals_conceded || 0}</span>
                                        <span className="stat-label">Goals Conceded</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-balance-scale-right stat-icon"></i>
                                        <span className="stat-value">{manager.performance.goal_difference || 0}</span>
                                        <span className="stat-label">Goal Difference</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-lock stat-icon"></i>
                                        <span className="stat-value">{manager.performance.clean_sheets || 0}</span>
                                        <span className="stat-label">Clean Sheets</span>
                                    </div>
                                    <div className="stat-card">
                                        <i className="fas fa-percentage stat-icon"></i>
                                        <span className="stat-value">
                                            {manager.performance.matches ? ((manager.performance.wins / manager.performance.matches) * 100).toFixed(1) : '0.0'}%
                                        </span>
                                        <span className="stat-label">Win Rate</span>
                                    </div>
                                </>
                            )}
                            <div className="stat-card">
                                <i className="fas fa-users stat-icon"></i>
                                <span className="stat-value">{sortedPlayers.length}</span>
                                <span className="stat-label">Squad Size</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History Section */}
                    <div className="profile-section" id="transaction-section">
                        <h2 className="section-title"><i className="fa-solid fa-receipt"></i> Wallet Transaction Logs</h2>
                        <div className="transaction-container">
                            <div className="transaction-tabs">
                                <button 
                                    type="button"
                                    className={`transaction-tab ${selectedCurrency === 'coin' ? 'active' : ''}`}
                                    onClick={() => setSelectedCurrency('coin')}
                                >
                                    <i className="fas fa-coins" style={{ color: "#fbbf24", marginRight: "6px" }} /> Coins (RC) Logs
                                </button>
                                <button 
                                    type="button"
                                    className={`transaction-tab ${selectedCurrency === 'token' ? 'active' : ''}`}
                                    onClick={() => setSelectedCurrency('token')}
                                >
                                    <i className="fas fa-medal" style={{ color: "#38bdf8", marginRight: "6px" }} /> Tokens (RT) Logs
                                </button>
                                <button 
                                    type="button"
                                    className={`transaction-tab ${selectedCurrency === 'voucher' ? 'active' : ''}`}
                                    onClick={() => setSelectedCurrency('voucher')}
                                >
                                    <i className="fas fa-ticket" style={{ color: "#ec4899", marginRight: "6px" }} /> Vouchers Logs
                                </button>
                            </div>

                            <div className="transaction-list-card">
                                {loadingLogs ? (
                                    <div className="logs-loading"><i className="fa-solid fa-spinner fa-spin" /> Loading logs...</div>
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
                                                        {isPositive ? '+' : ''}{log.amount}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Squad Roster List Section */}
                    {sortedPlayers.length > 0 && (
                        <div className="profile-section">
                            <h2 className="section-title"><i className="fas fa-user-friends"></i> Squad ({sortedPlayers.length} Players)</h2>
                            <div className="squad-grid">
                                {sortedPlayers.map((player: any, i: number) => {
                                    const typeClass = player.player_type ? player.player_type.replace(' ', '-') : '';
                                    return (
                                        <div key={i} className="player-card">
                                            <div className={`player-position position-${player.position}`}>{player.position}</div>
                                            <div className="player-info">
                                                <div className="player-name" title={player.player_name}>
                                                    {player.player_name}
                                                    {player.player_type && (
                                                        <span className={`player-type type-${typeClass}`}>{player.player_type}</span>
                                                    )}
                                                </div>
                                                <div className="player-details">{player.contract} | ₦{player.salary}M/season</div>
                                            </div>
                                            <div className="player-value">₦{player.value}M</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Manager Career Season History Section */}
                    {sortedSeasons.length > 0 && (
                        <div className="profile-section">
                            <h2 className="section-title"><i className="fas fa-history"></i> Season History</h2>
                            <div className="seasons-accordion">
                                {sortedSeasons.map((season: any, index: number) => {
                                    const isActive = activeSeasons[season.number] || false;
                                    return (
                                        <div key={index} className={`season-item ${isActive ? 'active' : ''}`} data-season={season.number}>
                                            <div className="season-header" onClick={() => toggleSeason(season.number)}>
                                                <div className="season-title">
                                                    <span className="season-number">Season {season.number}</span>
                                                    <span>Rank: {season.manager_rank} ({season.rank_point} pts)</span>
                                                </div>
                                                <div className="season-toggle">
                                                    <i className="fas fa-chevron-down"></i>
                                                </div>
                                            </div>
                                            <div className="season-content">
                                                <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>Financial Breakdown</h3>
                                                <div className="season-stats">
                                                    <div className="stat-card">
                                                        <span className="stat-value">₦{season.team_income || 0}M</span>
                                                        <span className="stat-label">Income</span>
                                                    </div>
                                                    <div className="stat-card">
                                                        <span className="stat-value">₦{season.team_expense || 0}M</span>
                                                        <span className="stat-label">Expense</span>
                                                    </div>
                                                    <div className="stat-card">
                                                        <span className="stat-value">₦{season.team_profit || 0}M</span>
                                                        <span className="stat-label">Profit</span>
                                                    </div>
                                                    <div className="stat-card">
                                                        <span className="stat-value">₦{season.session_rewards || 0}M</span>
                                                        <span className="stat-label">Rewards</span>
                                                    </div>
                                                </div>
                                                
                                                {season.sp_tour_stats && (
                                                    <>
                                                        <h3 style={{ marginBottom: '15px', fontSize: '1.2rem' }}>SP Tour Statistics</h3>
                                                        <div className="season-stats">
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.matches || 0}</span>
                                                                <span className="stat-label">Matches</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.wins || 0}</span>
                                                                <span className="stat-label">Wins</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.draws || 0}</span>
                                                                <span className="stat-label">Draws</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.losses || 0}</span>
                                                                <span className="stat-label">Losses</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.goals_scored || 0}</span>
                                                                <span className="stat-label">GS</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.goals_conceded || 0}</span>
                                                                <span className="stat-label">GC</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.goal_difference || 0}</span>
                                                                <span className="stat-label">GD</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.sp_tour_stats.clean_sheets || 0}</span>
                                                                <span className="stat-label">CS</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {season.season_stats && (
                                                    <>
                                                        <h3 style={{ margin: '20px 0 15px', fontSize: '1.2rem' }}>Season Statistics</h3>
                                                        <div className="season-stats">
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.matches || 0}</span>
                                                                <span className="stat-label">Matches</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.wins || 0}</span>
                                                                <span className="stat-label">Wins</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.draws || 0}</span>
                                                                <span className="stat-label">Draws</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.losses || 0}</span>
                                                                <span className="stat-label">Losses</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.goals_scored || 0}</span>
                                                                <span className="stat-label">GS</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.goals_conceded || 0}</span>
                                                                <span className="stat-label">GC</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.goal_difference || 0}</span>
                                                                <span className="stat-label">GD</span>
                                                            </div>
                                                            <div className="stat-card">
                                                                <span className="stat-value">{season.season_stats.clean_sheets || 0}</span>
                                                                <span className="stat-label">CS</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {season.competitions && Object.keys(season.competitions).length > 0 && (
                                                    <>
                                                        <h3 style={{ margin: '20px 0 15px', fontSize: '1.2rem' }}>Competitions</h3>
                                                        <div className="competitions">
                                                            {Object.entries(season.competitions).map(([key, comp]: [string, any]) => comp.name ? (
                                                                <div key={key} className="competition-card">
                                                                    <div className="competition-name">{comp.name}</div>
                                                                    <div className="competition-stage" title={comp.placement || comp.stage || ''}>{comp.placement || comp.stage || ''}</div>
                                                                </div>
                                                            ) : null)}
                                                        </div>
                                                    </>
                                                )}
                                                
                                                <h3 style={{ margin: '20px 0 15px', fontSize: '1.2rem' }}>Awards</h3>
                                                <div className="competitions">
                                                    {season.awards && season.awards.length > 0 ? (
                                                        season.awards.map((award: string, i: number) => (
                                                            <div key={i} className="competition-card">
                                                                <div className="competition-name">🏆 {award}</div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="competition-card">
                                                            <div className="competition-name" style={{ opacity: 0.5 }}>No awards earned in this season</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Cohesive Footer */}
                <footer className="portal-footer">
                    <div className="portal-status-bar">
                        <div className="status-item">
                            <span className="status-indicator online"></span>
                            Profile Status: Synchronized
                        </div>
                        <div className="status-item">
                            Last Active: Active Season
                        </div>
                    </div>
                    <div className="portal-copyright">
                        &copy; 2026 Road to Glory. All rights reserved.
                    </div>
                </footer>
            </div>
        </div>
    );
}


