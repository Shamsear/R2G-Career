"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import "./registered-clubs.css";
import { fetchRegisteredClubs } from "@/utils/solo/serverActions";

export default function RegisteredClubs() {
    const [searchTerm, setSearchTerm] = useState("");
    const [clubs, setClubs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchRegisteredClubs();
                setClubs(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.manager.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div style={{ color: 'white', textAlign: 'center', marginTop: '20vh' }}>Loading clubs...</div>;
    }

    return (
        <div className="portal-root-wrapper">
            <div className="portal-bg-grid" />
            <div className="portal-glow-orb-1" />
            <div className="portal-glow-orb-2" />

            <div className="portal-container">
                <div style={{ width: "100%", marginBottom: "1.5rem" }}>
                    <Link href="/solo-tour" className="portal-btn btn-secondary back-link-btn">
                        <i className="fas fa-arrow-left"></i> Back to Dashboard
                    </Link>
                </div>

                <div className="clubs-header-container">
                    <h1 className="portal-section-title">
                        <i className="fas fa-shield-alt" style={{ color: "var(--neon-green)" }}></i> Registered Clubs
                    </h1>
                    <div className="clubs-search-wrapper">
                        <i className="fas fa-search search-icon"></i>
                        <input
                            type="text"
                            className="clubs-search-input"
                            placeholder="Search by club or manager..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="clubs-grid">
                    {filteredClubs.length > 0 ? (
                        filteredClubs.map((club, index) => (
                            <div key={index} className="club-card portal-glass-card">
                                <div className="club-card-top">
                                    <div className="club-manager-img">
                                        <img src={club.image || '/assets/images/placeholder.webp'} alt={club.manager} />
                                    </div>
                                    <div className="club-info">
                                        <h3 className="club-name">{club.name}</h3>
                                        <p className="club-manager">
                                            <i className="fas fa-user-tie"></i> {club.manager}
                                        </p>
                                    </div>
                                </div>
                                <div className="club-card-bottom">
                                    <div className="club-number">#{club.number || index + 1}</div>
                                    <Link href={`/solo-tour/managers/${encodeURIComponent(club.manager)}`} className="portal-btn btn-primary view-manager-btn">
                                        View Profile
                                    </Link>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-clubs-found">
                            <i className="fas fa-search-minus"></i>
                            <p>No clubs found matching "{searchTerm}"</p>
                        </div>
                    )}
                </div>

                <footer className="portal-footer">
                    <div className="portal-status-panel">
                        <div className="status-item">
                            <span className="status-dot"></span> System Online
                        </div>
                        <div className="status-item">
                            Total Clubs: {clubs.length}
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
