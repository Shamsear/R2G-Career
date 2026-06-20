"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./player-signing.css";
import { POSITIONS } from "@/utils/solo/playerAuctionFetcher";
import { fetchPlayerAuctionData } from "@/utils/solo/serverActions";

function getPlayerValue(baseValue: any) {
    switch (Number(baseValue)) {
        case 150: return 'Legend';
        case 120: return '5★ Standard';
        case 100: return '4★ Standard';
        case 80: return '3★ Standard';
        default: return 'Unknown';
    }
}

function formatCurrency(value: number) {
    if (!value) return '';
    return Number(value).toLocaleString('en-US', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function getRatingClass(baseValue: any) {
    switch (Number(baseValue)) {
        case 150: return 'five-star-legend';
        case 120: return 'five-star-standard';
        case 100: return 'four-star-standard';
        case 80: return 'three-star-standard';
        default: return 'unknown-rating';
    }
}

export default function PlayerSigning() {
    const [players, setPlayers] = useState<any[]>([]);
    const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchPlayerAuctionData();
                setPlayers(data);
            } catch (err: any) {
                setError('Failed to load auction data from database.');
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    useEffect(() => {
        let result = players;
        if (activeTab !== 'all') {
            result = result.filter(p => {
                const pos = String(p.position).toUpperCase().trim();
                let mapped = pos;
                if (pos.includes('GOALKEEPER') || pos === 'G' || pos === 'GOALIE' || pos === 'GK') mapped = 'GK';
                else if (pos.includes('CENTER BACK') || pos === 'CD' || pos === 'DC' || pos === 'CB' || pos.includes('CENTRE BACK')) mapped = 'CB';
                else if (pos.includes('LEFT BACK') || pos === 'LWB' || pos === 'LD' || pos === 'LB' || pos === 'LFB') mapped = 'LB';
                else if (pos.includes('RIGHT BACK') || pos === 'RWB' || pos === 'RD' || pos === 'RB' || pos === 'RFB') mapped = 'RB';
                else if (pos.includes('CENTER MID') || pos === 'CMF' || pos === 'MC' || pos === 'CM' || pos.includes('CENTRE MID')) mapped = 'CM';
                else if (pos.includes('DEFENSIVE MID') || pos === 'CDM' || pos === 'DMF' || pos === 'DM' || pos === 'DCM') mapped = 'DM';
                else if (pos.includes('ATTACKING MID') || pos === 'CAM' || pos === 'AMF' || pos === 'AM' || pos === 'ACM') mapped = 'AM';
                else if (pos.includes('STRIKER') || pos === 'FW' || pos === 'ST' || pos === 'CF' || pos.includes('FORWARD')) mapped = 'ST';
                else if (pos.includes('RIGHT WING') || pos === 'RM' || pos === 'RMF' || pos === 'RW' || pos === 'RF') mapped = 'RW';
                else if (pos.includes('LEFT WING') || pos === 'LM' || pos === 'LMF' || pos === 'LW' || pos === 'LF') mapped = 'LW';
                return mapped === activeTab;
            });
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(term) || 
                (p.team && p.team.toLowerCase().includes(term)) ||
                p.position.toLowerCase().includes(term)
            );
        }

        if (sortConfig !== null) {
            result.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];
                
                if (sortConfig.key === 'valueStr') {
                    valA = getPlayerValue(a.rating);
                    valB = getPlayerValue(b.rating);
                }

                if (typeof valA === 'string' && typeof valB === 'string') {
                    return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                }
                
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            });
        }

        setFilteredPlayers(result);
    }, [players, activeTab, searchTerm, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const renderSortIcon = (key: string) => {
        if (sortConfig?.key !== key) {
            return <i className="fas fa-sort"></i>;
        }
        return sortConfig.direction === 'asc' ? <i className="fas fa-sort-up"></i> : <i className="fas fa-sort-down"></i>;
    };

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
                    <Link href="/solo-tour/career-mode" className="portal-btn btn-secondary back-link-btn" style={{ marginBottom: "2rem" }}>
                        <i className="fas fa-arrow-left"></i> Back to Career Mode
                    </Link>
                </div>

                {/* Header Section */}
                <header className="portal-header">
                    <h1 className="portal-title">PLAYER SIGNINGS</h1>
                    <p className="portal-subtitle">
                        Inspect active player values, live transfer auction results, and contract payrolls for Season 2025-2026.
                    </p>
                </header>

                {/* Loading State Overlay */}
                {loading && (
                    <div className="loading-backdrop">
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Loading Player Database...</div>
                    </div>
                )}

                <div className="auction-container">
                    {/* Search Bar */}
                    <div className="search-container">
                        <div className="search-box">
                            <input 
                                type="text" 
                                placeholder="Search for player, team, or position..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <i className="fas fa-search"></i>
                        </div>
                    </div>
                    
                    {/* Position Filter Tabs */}
                    <div className="position-tabs">
                        <button 
                            className={`position-tab ${activeTab === 'all' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('all')}
                        >
                            All Positions
                        </button>
                        {POSITIONS.map(pos => (
                            <button 
                                key={pos} 
                                className={`position-tab ${activeTab === pos ? 'active' : ''}`} 
                                onClick={() => setActiveTab(pos)}
                            >
                                {pos}
                            </button>
                        ))}
                    </div>
                    
                    {/* Position Table Content */}
                    <div className="position-content active">
                        <div className="auction-table-container">
                            <table className="auction-table">
                                <thead>
                                    <tr>
                                        <th 
                                            onClick={() => requestSort('name')} 
                                            className={sortConfig?.key === 'name' ? 'sorted' : ''}
                                        >
                                            Player Name {renderSortIcon('name')}
                                        </th>
                                        {activeTab === 'all' && (
                                            <th 
                                                onClick={() => requestSort('position')} 
                                                className={sortConfig?.key === 'position' ? 'sorted' : ''}
                                            >
                                                Position {renderSortIcon('position')}
                                            </th>
                                        )}
                                        <th 
                                            onClick={() => requestSort('rating')} 
                                            className={sortConfig?.key === 'rating' ? 'sorted' : ''}
                                        >
                                            Base Value {renderSortIcon('rating')}
                                        </th>
                                        <th 
                                            onClick={() => requestSort('valueStr')} 
                                            className={sortConfig?.key === 'valueStr' ? 'sorted' : ''}
                                        >
                                            Rarity {renderSortIcon('valueStr')}
                                        </th>
                                        <th 
                                            onClick={() => requestSort('team')} 
                                            className={sortConfig?.key === 'team' ? 'sorted' : ''}
                                        >
                                            Signing Club {renderSortIcon('team')}
                                        </th>
                                        <th 
                                            onClick={() => requestSort('bidAmount')} 
                                            className={sortConfig?.key === 'bidAmount' ? 'sorted' : ''}
                                        >
                                            Signing Value {renderSortIcon('bidAmount')}
                                        </th>
                                        <th 
                                            onClick={() => requestSort('contract')} 
                                            className={sortConfig?.key === 'contract' ? 'sorted' : ''}
                                        >
                                            Contract {renderSortIcon('contract')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {error && filteredPlayers.length === 0 && (
                                        <tr className="no-results-row">
                                            <td colSpan={activeTab === 'all' ? 7 : 6} className="no-results-cell">
                                                <div className="no-results-content">
                                                    <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i>
                                                    <p style={{ color: '#ef4444' }}>{error}</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {!loading && !error && filteredPlayers.length === 0 && (
                                        <tr className="no-results-row">
                                            <td colSpan={activeTab === 'all' ? 7 : 6} className="no-results-cell">
                                                <div className="no-results-content">
                                                    <i className="fa-solid fa-magnifying-glass"></i>
                                                    <p>No players found matching "{searchTerm}" in {activeTab === 'all' ? 'any position' : activeTab}</p>
                                                    <button 
                                                        className="portal-btn btn-secondary reset-btn" 
                                                        onClick={() => { setSearchTerm(''); setActiveTab('all'); }}
                                                    >
                                                        Reset Filters
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {filteredPlayers.map((player, i) => (
                                        <tr key={player.rowId} className={getRatingClass(player.rating)}>
                                            <td data-label="Player" className="player-name">{player.name}</td>
                                            {activeTab === 'all' && <td data-label="Position">{player.position}</td>}
                                            <td data-label="Base Value" className="base-value">{player.rating}</td>
                                            <td data-label="Value" className="value">{getPlayerValue(player.rating)}</td>
                                            <td data-label="Signing Club" className="team-name">{player.team || 'Unsold'}</td>
                                            <td data-label="Signing Value" className="bid-amount">{player.bidAmount ? player.bidAmount : 'Not Bid'}</td>
                                            <td data-label="Contract">{player.contract || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Cohesive Footer */}
                <footer className="portal-footer">
                    <div className="portal-status-bar">
                        <div className="status-item">
                            <span className="status-indicator online"></span>
                            Ledger Status: Connected
                        </div>
                        <div className="status-item">
                            Total Records: {players.length}
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


