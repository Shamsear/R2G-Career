"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from 'next/link';
import { fetchPlayerById } from '../../../../../utils/solo/serverActions';
import './player-profile.css';
import '../player-database.css';

export default function PlayerProfilePage() {
    const params = useParams();
    const id = params.id as string;
    
    const [player, setPlayer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [imgError, setImgError] = useState(false);
    const [clubLogoError, setClubLogoError] = useState(false);
    const [hoverProgress, setHoverProgress] = useState(false);

    useEffect(() => {
        if (!id) return;
        async function loadPlayer() {
            try {
                const data = await fetchPlayerById(id);
                setPlayer(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        loadPlayer();
    }, [id]);

    if (loading) {
        return (
            <div className="portal-root-wrapper">
                <div className="cyber-welcome-screen">
                    <div className="cyber-welcome-loader">
                        <div className="welcome-message">Loading Profile</div>
                        <div className="loader-bar">
                            <div className="loader-fill"></div>
                        </div>
                        <div className="subtext">Connecting to database...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!player) {
        return (
            <div className="portal-root-wrapper">
                <div className="portal-bg-grid" />
                <div className="portal-glow-orb-1" />
                <div className="portal-glow-orb-2" />
                
                <div className="portal-container">
                    <div className="error-container">
                        <h2>Player Not Found</h2>
                        <p>The player with ID &quot;{id}&quot; does not exist in the database.</p>
                        <Link href="/solo-tour/player-database" className="portal-btn btn-secondary">
                            Back to Database
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Card theme based on base value
    const baseVal = player.value || 0;
    let themeClass = 'rivals-blue';
    let staticBg = '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_BLUE_STATIC.png';
    let animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_BLUE_LOOP.png';
    let displayTier = '3 Star Standard';

    if (baseVal >= 150) {
        themeClass = 'prime-icon';
        staticBg = '/assets/cards/download_24/backgrounds_23_B_BASE_PRIMEICON_STATIC.png';
        animBg = '/assets/cards/conv_anim_24/playercardui_primeicon_B_BASE_PRIMEICON_LOOP.png';
        displayTier = 'Legend';
    } else if (baseVal >= 120) {
        themeClass = 'rivals-icon';
        staticBg = '/assets/imgassets/background_blank.png';
        animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_ICON_LOOP.png';
        displayTier = '5 Star Standard';
    } else if (baseVal >= 100) {
        themeClass = 'rivals-red';
        staticBg = '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_RED_STATIC.png';
        animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_RED_LOOP.png';
        displayTier = '4 Star Standard';
    }

    // Parse season values
    const startSeason = player.startSeason ? player.startSeason.trim() : 'N/A';
    const expireSeason = player.expireSeason ? player.expireSeason.trim() : 'N/A';
    const contractStatus = player.contractStatus || 'N/A';

    // Abbreviated player name for card
    const cardName = (() => {
        const parts = player.name.trim().split(/\s+/);
        if (parts.length > 1) {
            return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
        }
        return player.name;
    })();

    // Season progress calculation supporting "Mid"
    const parseSeasonToNum = (s: string) => {
        if (!s || s === 'N/A') return 0;
        const isMid = s.toLowerCase().includes('mid') || s.includes('.5');
        const numPart = s.replace(/[^0-9.]/g, '');
        const val = parseFloat(numPart) || 0;
        return isMid && !numPart.includes('.5') ? val + 0.5 : val;
    };

    const currentSeasonVal = (player.activeSeasonNumber || 9) + (player.activeSeasonIsMid ? 0.5 : 0);
    const startNum = parseSeasonToNum(player.startSeason);
    const expireNum = parseSeasonToNum(player.expireSeason);
    const totalDuration = Math.max(0.5, expireNum - startNum);
    const elapsed = Math.max(0, currentSeasonVal - startNum);
    const progressPct = Math.min((elapsed / totalDuration) * 100, 100);

    const currentSeasonDisplay = player.activeSeasonIsMid ? `S${player.activeSeasonNumber} Mid` : `S${player.activeSeasonNumber}`;
    const seasonsLeft = Math.max(0, expireNum - currentSeasonVal);

    // Club logo path
    const clubLogoPath = (player.club === 'FREE AGENT' || player.club === 'Free Agent' || !player.club)
        ? '/assets/images/freeagent.WEBP'
        : `/assets/images/club-logos/${encodeURIComponent(player.club.replace(/\s+/g, '-'))}.webp`;

    return (
        <div className="portal-root-wrapper">
            {/* Background Effects */}
            <div className="portal-bg-grid" />
            <div className="portal-glow-orb-1" />
            <div className="portal-glow-orb-2" />

            <div className="portal-container">
                {/* Back Nav Breadcrumb */}
                <div className="portal-breadcrumb">
                    <Link href="/solo-tour/player-database" className="portal-btn btn-secondary back-link-btn">
                        <i className="fas fa-arrow-left"></i> Back to Players Database
                    </Link>
                </div>

                <div className="profile-grid-layout">
                    {/* Left Column: Card, Identity, and Stats Panel */}
                    <div className="profile-left-col">
                        <div className="profile-hero-card">
                            <div className="hero-card-showcase">
                                <div className="card-container">
                                    <div className={`card ${themeClass} large-card`}>
                                        <img className="card-bg-static" src={staticBg} alt="Card Background" />
                                        <div className="card-bg-animated" style={{ backgroundImage: `url('${animBg}')` }}></div>
                                        <img 
                                            className="player-img" 
                                            src={imgError ? '/assets/images/players/default.webp' : player.imagePath} 
                                            alt={player.name}
                                            onError={() => setImgError(true)}
                                        />
                                        <div className="player-info">
                                            <div className="rating-pos">
                                                <span className="position">{player.position}</span>
                                            </div>
                                            <div className="name">{cardName}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="hero-player-identity">
                            <h1 className="hero-player-name">{player.name}</h1>
                            <div className="hero-club-row">
                                <img 
                                    className="hero-club-logo" 
                                    src={clubLogoError ? '/assets/images/freeagent.WEBP' : clubLogoPath}
                                    alt={player.club}
                                    onError={() => setClubLogoError(true)}
                                />
                                <p className="hero-club-name">{player.club}</p>
                            </div>
                        </div>

                        {/* Player Stats Panel */}
                        <div className="player-stats-panel">
                            <div className="panel-stat-item">
                                <div className="panel-stat-icon icon-position">
                                    <i className="fas fa-shield-halved"></i>
                                </div>
                                <div className="panel-stat-info">
                                    <span className="panel-stat-label">Position</span>
                                    <span className="panel-stat-value">{player.position}</span>
                                </div>
                            </div>

                            <div className="panel-stat-item">
                                <div className="panel-stat-icon icon-value">
                                    <i className="fas fa-coins"></i>
                                </div>
                                <div className="panel-stat-info">
                                    <span className="panel-stat-label">Base Value</span>
                                    <span className="panel-stat-value">£{player.value}M</span>
                                </div>
                            </div>

                            <div className="panel-stat-item">
                                <div className="panel-stat-icon icon-salary">
                                    <i className="fas fa-wallet"></i>
                                </div>
                                <div className="panel-stat-info">
                                    <span className="panel-stat-label">Salary</span>
                                    <span className="panel-stat-value">£{player.salary}M</span>
                                </div>
                            </div>

                            <div className="panel-stat-item">
                                <div className="panel-stat-icon icon-card">
                                    <i className="fas fa-star"></i>
                                </div>
                                <div className="panel-stat-info">
                                    <span className="panel-stat-label">Card Type</span>
                                    <span className="panel-stat-value" style={{ textTransform: 'capitalize' }}>
                                        {displayTier}
                                    </span>
                                </div>
                            </div>

                            <div className="panel-stat-item">
                                <div className="panel-stat-icon icon-tier">
                                    <i className="fas fa-chart-simple"></i>
                                </div>
                                <div className="panel-stat-info">
                                    <span className="panel-stat-label">Rating Tier</span>
                                    <span className="panel-stat-value">
                                        {player.level !== 'undefined' ? player.level : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contract & Market History */}
                    <div className="profile-right-col">
                        {/* Contract Details */}
                        <div className="contract-section">
                            <div className="section-header">
                                <div className="section-header-icon">
                                    <i className="fas fa-file-signature"></i>
                                </div>
                                <div className="section-header-text">
                                    <h2 className="section-header-title">Contract Details</h2>
                                    <p className="section-header-sub">Current agreement and status overview</p>
                                </div>
                            </div>

                            <div className="contract-grid">
                                <div className="contract-item">
                                    <span className="contract-item-label">Start Season</span>
                                    <span className="contract-item-value">{startSeason}</span>
                                </div>
                                <div className="contract-item">
                                    <span className="contract-item-label">Expiry Season</span>
                                    <span className="contract-item-value">{expireSeason}</span>
                                </div>
                                <div className="contract-item">
                                    <span className="contract-item-label">Contract Status</span>
                                    <span className={`contract-item-value ${
                                        contractStatus.toLowerCase() === 'active' ? 'status-active' : 
                                        contractStatus.toLowerCase() === 'expired' ? 'status-expired' : ''
                                    }`} style={{ textTransform: 'capitalize' }}>
                                        {contractStatus}
                                    </span>
                                </div>
                                <div className="contract-item">
                                    <span className="contract-item-label">Club</span>
                                    <span className="contract-item-value">{player.club}</span>
                                </div>
                            </div>

                            {/* Season Range Visual */}
                            {startSeason !== 'N/A' && expireSeason !== 'N/A' && (
                                <div className="season-range-visual">
                                    <div className="season-range-labels">
                                        <div className="season-range-point">
                                            <span className="season-range-point-label">From</span>
                                            <span className="season-range-point-value">{startSeason}</span>
                                        </div>
                                        <div className="season-range-point">
                                            <span className="season-range-point-label">Until</span>
                                            <span className="season-range-point-value">{expireSeason}</span>
                                        </div>
                                    </div>
                                    <div 
                                        className="season-range-bar"
                                        onMouseEnter={() => setHoverProgress(true)}
                                        onMouseLeave={() => setHoverProgress(false)}
                                        onClick={() => setHoverProgress(prev => !prev)}
                                        style={{ position: 'relative', cursor: 'help' }}
                                    >
                                        <div className="season-range-fill" style={{ width: `${progressPct}%` }}></div>
                                        {hoverProgress && (
                                            <div className="progress-tooltip">
                                                Current: {currentSeasonDisplay} | Remaining: {seasonsLeft} {seasonsLeft === 1 ? 'Season' : 'Seasons'}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Market History Timeline */}
                        <div className="history-section">
                            <div className="section-header">
                                <div className="section-header-icon">
                                    <i className="fas fa-chart-line"></i>
                                </div>
                                <div className="section-header-text">
                                    <h2 className="section-header-title">Market &amp; Valuation History</h2>
                                    <p className="section-header-sub">Historical contract and valuation records</p>
                                </div>
                            </div>

                            {player.stats && player.stats.length > 0 ? (
                                <div className="timeline">
                                    {player.stats.map((stat: any, index: number) => (
                                        <div className="timeline-entry" key={index}>
                                            <div className="timeline-card">
                                                <div className="timeline-card-left">
                                                    <span className="timeline-season">
                                                        {stat.season} → {stat.expireSeason || 'N/A'}
                                                    </span>
                                                    <span className="timeline-team">{stat.team}</span>
                                                </div>
                                                <div className="timeline-value">£{stat.value}M</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="no-history-text">No historical market or valuation data available for this player.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
