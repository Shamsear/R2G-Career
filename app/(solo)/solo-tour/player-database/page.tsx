"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import "./player-database.css";
import { fetchPlayersDb } from "../../../../utils/solo/serverActions";

export default function PlayerStatus() {
    const [players, setPlayers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMsg, setLoadingMsg] = useState('Connecting to database...');
    const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [starFilter, setStarFilter] = useState('all');
    const [clubFilter, setClubFilter] = useState('ALL');
    const [positionFilters, setPositionFilters] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24;

    useEffect(() => {
        document.title = "Players Database - Solo Tour | R2G";
        async function loadData() {
            setLoading(true);
            try {
                setLoadingMsg('Loading players...');
                const data = await fetchPlayersDb();
                data.sort((a, b) => {
                    if (a.value !== b.value) return b.value - a.value;
                    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                });
                setPlayers(data);
            } catch (err) {
                console.error(err);
            } finally {
                setTimeout(() => setLoading(false), 500);
            }
        }
        loadData();
    }, []);

    // Eager loading - lazy loading logic removed for faster perception

    const togglePosition = (pos: string) => {
        setPositionFilters(prev =>
            prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]
        );
        setCurrentPage(1);
    };

    const resetFilters = () => {
        setSearchTerm('');
        setStarFilter('all');
        setClubFilter('ALL');
        setPositionFilters([]);
        setCurrentPage(1);
    };

    const filteredPlayers = useMemo(() => {
        return players.filter(player => {
            if (searchTerm && !player.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;

            if (starFilter !== 'all') {
                const baseVal = player.value || 0;
                if (starFilter === 'legend' && baseVal < 150) return false;
                if (starFilter === '5-star' && (baseVal < 120 || baseVal >= 150)) return false;
                if (starFilter === '4-star' && (baseVal < 100 || baseVal >= 120)) return false;
                if (starFilter === '3-star' && baseVal >= 100) return false;
            }

            if (clubFilter !== 'ALL' && player.club !== clubFilter) return false;

            if (positionFilters.length > 0) {
                const pos = player.position.split(',').map((p: string) => p.trim());
                if (!pos.some((p: string) => positionFilters.includes(p))) return false;
            }

            return true;
        });
    }, [players, searchTerm, starFilter, clubFilter, positionFilters]);

    const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / itemsPerPage));
    const currentPlayers = filteredPlayers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const clubs = useMemo(() => {
        const c = new Set<string>();
        players.forEach(p => { if (p.club) c.add(p.club); });
        return Array.from(c).sort();
    }, [players]);

    const hasActiveFilters = searchTerm || starFilter !== 'all' || clubFilter !== 'ALL' || positionFilters.length > 0;

    // Build page numbers
    const getPageNumbers = () => {
        const pages: (number | 'ellipsis')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('ellipsis');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('ellipsis');
            pages.push(totalPages);
        }
        return pages;
    };

    const handleImgError = (playerId: number) => {
        setImgErrors(prev => new Set(prev).add(playerId));
    };

    return (
        <div className="portal-root-wrapper">
            <div className="portal-bg-grid" />
            <div className="portal-glow-orb-1" />
            <div className="portal-glow-orb-2" />

            {loading && (
                <div className="cyber-welcome-screen">
                    <div className="cyber-welcome-loader">
                        <div className="welcome-message">R2G Player Data</div>
                        <div className="loader-bar">
                            <div className="loader-fill"></div>
                        </div>
                        <div className="subtext">{loadingMsg}</div>
                    </div>
                </div>
            )}

            <div className="portal-container">
                {/* Page Hero */}
                <div className="db-page-hero">
                    <h1 className="db-hero-title">
                        Players Database
                        {!loading && (
                            <span className="db-hero-count">{players.length} Players</span>
                        )}
                    </h1>
                    <p className="db-hero-sub">Browse contracts, card tiers, positions, and valuations league-wide</p>
                </div>

                {/* Filter Toolbar */}
                <div className="filter-toolbar">
                    <div className="filter-toolbar-row">
                        <div className="toolbar-search">
                            <input
                                type="text"
                                placeholder="Search players..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                            <i className="fas fa-search search-icon"></i>
                            {searchTerm && (
                                <i
                                    className="fas fa-times search-clear"
                                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                                ></i>
                            )}
                        </div>

                        <select
                            className="toolbar-select"
                            value={starFilter}
                            onChange={e => { setStarFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="all">All Tiers</option>
                            <option value="legend">Legend</option>
                            <option value="5-star">5★ Standard</option>
                            <option value="4-star">4★ Standard</option>
                            <option value="3-star">3★ Standard</option>
                        </select>

                        <select
                            className="toolbar-select"
                            value={clubFilter}
                            onChange={e => { setClubFilter(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="ALL">All Clubs</option>
                            <option value="FREE AGENT">FREE AGENT</option>
                            {clubs.filter(c => c !== "FREE AGENT").map(club => (
                                <option key={club} value={club}>{club}</option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-toolbar-row">
                        <div className="toolbar-positions">
                            {['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'ST'].map(pos => (
                                <button
                                    key={pos}
                                    onClick={() => togglePosition(pos)}
                                    className={`pos-btn pos-${pos} ${positionFilters.includes(pos) ? 'active' : ''}`}
                                >
                                    {pos}
                                </button>
                            ))}
                        </div>
                        {hasActiveFilters && (
                            <button className="toolbar-reset-btn" onClick={resetFilters}>
                                <i className="fas fa-undo" style={{ marginRight: '0.3rem', fontSize: '0.6rem' }}></i>
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Active Filter Chips */}
                {hasActiveFilters && (
                    <div className="active-filters">
                        {searchTerm && (
                            <span className="filter-chip">
                                &quot;{searchTerm}&quot;
                                <i className="fas fa-times filter-chip-remove" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}></i>
                            </span>
                        )}
                        {starFilter !== 'all' && (
                            <span className="filter-chip">
                                {starFilter === 'legend' ? 'Legend' : `${starFilter.replace('-', '★ ')}`}
                                <i className="fas fa-times filter-chip-remove" onClick={() => { setStarFilter('all'); setCurrentPage(1); }}></i>
                            </span>
                        )}
                        {clubFilter !== 'ALL' && (
                            <span className="filter-chip">
                                {clubFilter}
                                <i className="fas fa-times filter-chip-remove" onClick={() => { setClubFilter('ALL'); setCurrentPage(1); }}></i>
                            </span>
                        )}
                        {positionFilters.map(pos => (
                            <span className="filter-chip" key={pos}>
                                {pos}
                                <i className="fas fa-times filter-chip-remove" onClick={() => togglePosition(pos)}></i>
                            </span>
                        ))}
                    </div>
                )}

                {/* Result Count */}
                <div className="result-count">
                    Showing <strong>{filteredPlayers.length}</strong> of {players.length} players
                    {currentPage > 1 && <> &middot; Page {currentPage}</>}
                </div>

                {/* Cards Grid */}
                {filteredPlayers.length === 0 ? (
                    <div className="no-results-message">
                        <i className="fa-solid fa-user-slash"></i>
                        <h3>No players found</h3>
                        <p>No players match the chosen filters or search query.</p>
                        <button className="toolbar-reset-btn" onClick={resetFilters} style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}>
                            Reset Filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="cards-wrapper">
                            {currentPlayers.map(player => {
                                let themeClass = 'rivals-blue';
                                let staticBg = '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_BLUE_STATIC.png';
                                let animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_BLUE_LOOP.png';

                                const baseVal = player.value || 0;
                                if (baseVal >= 150) {
                                    themeClass = 'prime-icon';
                                    staticBg = '/assets/cards/download_24/backgrounds_23_B_BASE_PRIMEICON_STATIC.png';
                                    animBg = '/assets/cards/conv_anim_24/playercardui_primeicon_B_BASE_PRIMEICON_LOOP.png';
                                } else if (baseVal >= 120) {
                                    themeClass = 'rivals-icon';
                                    staticBg = '/assets/imgassets/background_blank.png';
                                    animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_ICON_LOOP.png';
                                } else if (baseVal >= 100) {
                                    themeClass = 'rivals-red';
                                    staticBg = '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_RED_STATIC.png';
                                    animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_RED_LOOP.png';
                                } else {
                                    themeClass = 'rivals-blue';
                                    staticBg = '/assets/cards/download_24/backgrounds_23_B_RIVALS_LIVE_BLUE_STATIC.png';
                                    animBg = '/assets/cards/conv_anim_24/playercardui_rivals24_B_RIVALS_LIVE_BLUE_LOOP.png';
                                }

                                return (
                                    <Link
                                        key={player.id}
                                        href={`/solo-tour/player-database/${player.id}`}
                                        className={`card ${themeClass}`}
                                    >
                                        <img 
                                            className="card-bg-static" 
                                            src={staticBg} 
                                            alt="Card Background" 
                                            onError={(e) => { e.currentTarget.src = '/assets/imgassets/background_blank.png'; }} 
                                        />
                                        <div className="card-bg-animated" style={{ backgroundImage: `url('${animBg}')` }}></div>
                                        <img
                                            className="player-img"
                                            src={imgErrors.has(player.id) ? '/assets/images/players/default.webp' : player.imagePath}
                                            alt={player.name}
                                            onError={() => handleImgError(player.id)}
                                        />
                                        <div className="player-info">
                                            <div className="rating-pos">
                                                <span className="position">{player.position}</span>
                                            </div>
                                            <div className="name">
                                                {(() => {
                                                    const parts = player.name.trim().split(/\s+/);
                                                    if (parts.length > 1) {
                                                        return `${parts[0][0]}. ${parts.slice(1).join(' ')}`;
                                                    }
                                                    return player.name;
                                                })()}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="pagination-controls">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <i className="fas fa-chevron-left"></i>
                                </button>

                                {getPageNumbers().map((page, idx) =>
                                    page === 'ellipsis' ? (
                                        <span className="page-ellipsis" key={`ellipsis-${idx}`}>…</span>
                                    ) : (
                                        <button
                                            key={page}
                                            className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                                            onClick={() => setCurrentPage(page as number)}
                                        >
                                            {page}
                                        </button>
                                    )
                                )}

                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
