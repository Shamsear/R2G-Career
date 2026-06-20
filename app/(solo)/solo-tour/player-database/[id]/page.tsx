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
    const startSeason = player.startSeason ? player.startSeason.replace(/[^0-9.]/g, '') : 'N/A';
    const expireSeason = player.expireSeason ? player.expireSeason.replace(/[^0-9.]/g, '') : 'N/A';
    const contractStatus = player.contractStatus || 'N/A';

    // Abbreviated player name for card
    const cardName = (() => {
        const parts = player.name.trim().split(/\s+/);
        if (parts.length > 1) {
            return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
        }
        return player.name;
    })();

    // Season progress (visual only)
    const startNum = parseFloat(startSeason) || 0;
    const expireNum = parseFloat(expireSeason) || 10;
    const totalSeasons = 10; // assume max season range
    const progressPct = Math.min(((expireNum - startNum) / totalSeasons) * 100, 100);

    // Club logo path
    const clubLogoPath = `/assets/images/club-logos/${encodeURIComponent(player.club.replace(/\s+/g, '-'))}.webp`;

    return (
        <div className="portal-root-wrapper">
            {/* Background Effects */}
            <div className="portal-bg-grid" />
            <div className="portal-glow-orb-1" />
            <div className="portal-glow-orb-2" />

            {/* Floating Back Button */}
            <Link href="/solo-tour/player-database" className="profile-back-btn">
                <i className="fas fa-arrow-left"></i>
                Database
            </Link>

            <div className="portal-container" style={{ maxWidth: 'none', padding: 0 }}>
                {/* ── Hero Section ── */}
                <div className="profile-hero">
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

                    <div className="hero-player-identity">
                        <h1 className="hero-player-name">{player.name}</h1>
                        <div className="hero-club-row">
                            <img 
                                className="hero-club-logo" 
                                src={clubLogoError ? '/assets/images/default-club-logo.png' : clubLogoPath}
                                alt={player.club}
                                onError={() => setClubLogoError(true)}
                            />
                            <p className="hero-club-name">{player.club}</p>
                        </div>
                    </div>
                </div>

                {/* ── Stats Ribbon ── */}
                <div className="stats-ribbon">
                    <div className="stat-chip">
                        <div className="stat-chip-icon icon-position">
                            <i className="fas fa-shield-halved"></i>
                        </div>
                        <div className="stat-chip-text">
                            <span className="stat-chip-label">Position</span>
                            <span className="stat-chip-value">{player.position}</span>
                        </div>
                    </div>

                    <div className="stat-chip">
                        <div className="stat-chip-icon icon-value">
                            <i className="fas fa-coins"></i>
                        </div>
                        <div className="stat-chip-text">
                            <span className="stat-chip-label">Base Value</span>
                            <span className="stat-chip-value">£{player.value}M</span>
                        </div>
                    </div>

                    <div className="stat-chip">
                        <div className="stat-chip-icon icon-salary">
                            <i className="fas fa-wallet"></i>
                        </div>
                        <div className="stat-chip-text">
                            <span className="stat-chip-label">Salary</span>
                            <span className="stat-chip-value">£{player.salary}M</span>
                        </div>
                    </div>

                    <div className="stat-chip">
                        <div className="stat-chip-icon icon-card">
                            <i className="fas fa-star"></i>
                        </div>
                        <div className="stat-chip-text">
                            <span className="stat-chip-label">Card Type</span>
                            <span className="stat-chip-value" style={{ textTransform: 'capitalize' }}>
                                {displayTier}
                            </span>
                        </div>
                    </div>

                    <div className="stat-chip">
                        <div className="stat-chip-icon icon-tier">
                            <i className="fas fa-chart-simple"></i>
                        </div>
                        <div className="stat-chip-text">
                            <span className="stat-chip-label">Rating Tier</span>
                            <span className="stat-chip-value">
                                {player.level !== 'undefined' ? player.level : 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="profile-content">
                    {/* Contract Section */}
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
                                <div className="season-range-bar">
                                    <div className="season-range-fill" style={{ width: `${progressPct}%` }}></div>
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
    );
}
