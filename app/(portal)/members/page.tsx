"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAllPlayersDirectory } from "@/utils/solo/serverActions";
import PortalNavbar from "@/components/portal/PortalNavbar";
import PortalFooter from "@/components/portal/PortalFooter";
import "../../portal.css";

const STORAGE_KEY = "r2g_members_dir_filters";

export default function MembersDirectoryPage() {
  const [players, setPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qSearch = params.get("search");

    if (qSearch !== null) {
      setSearchTerm(qSearch);
    } else {
      try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.searchTerm !== undefined) setSearchTerm(parsed.searchTerm);
        }
      } catch (e) {
        console.error("Failed to restore members directory search", e);
      }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ searchTerm }));
    } catch (e) {
      console.error("Failed to save members directory search", e);
    }

    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    const queryString = params.toString();
    const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
    if (window.location.search !== (queryString ? `?${queryString}` : "")) {
      window.history.replaceState(null, "", newUrl);
    }
  }, [searchTerm, isInitialized]);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAllPlayersDirectory();
        setPlayers(data || []);
        setFilteredPlayers(data || []);
      } catch (err: any) {
        console.error(err);
        setError("Failed to load members directory");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = [...players];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.r2g_id && p.r2g_id.toLowerCase().includes(term))
      );
    }

    setFilteredPlayers(result);
  }, [searchTerm, players]);

  if (loading) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <PortalNavbar />
        <main style={{ position: 'relative', zIndex: 2, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "50px", height: "50px", borderRadius: "50%", border: "3px solid transparent", borderTopColor: "#c084fc", borderRightColor: "#a855f7", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Synchronizing Members Directory...</p>
          </div>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </main>
        <PortalFooter />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PortalNavbar />

      <main style={{ position: 'relative', zIndex: 2, flex: 1 }}>
        <div className="portal-container" style={{ maxWidth: "1200px", padding: "1.5rem 1.5rem" }}>
          
          {/* CSS Styles for Responsive Optimization */}
          <style>{`
            .search-filter-ribbon {
              display: flex;
              gap: 1rem;
              margin: 0.5rem 0 1rem;
              width: 100%;
            }
            .search-input-wrap {
              position: relative;
              flex: 1;
              width: 100%;
            }
            .search-input-wrap i {
              position: absolute;
              left: 14px;
              top: 50%;
              transform: translateY(-50%);
              color: rgba(255, 255, 255, 0.35);
              font-size: 0.9rem;
            }
            .search-bar-input {
              width: 100%;
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
              padding: 10px 16px 10px 40px;
              color: #fff;
              font-size: 0.92rem;
              outline: none;
              transition: all 0.2s ease;
            }
            .search-bar-input:focus {
              border-color: #a855f7;
              box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
            }
            .players-dir-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 1.25rem;
              margin-top: 0.75rem;
              width: 100%;
            }
            .player-dir-card {
              background: rgba(13, 18, 24, 0.45);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 12px;
              padding: 1.25rem;
              display: flex;
              align-items: center;
              gap: 1rem;
              backdrop-filter: blur(20px);
              transition: all 0.2s ease;
              cursor: pointer;
              text-decoration: none;
            }
            .player-dir-card:hover {
              border-color: rgba(168, 85, 247, 0.3);
              transform: translateY(-2px);
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }
            .player-dir-avatar {
              width: 60px;
              height: 60px;
              border-radius: 8px;
              background-size: cover;
              background-position: center;
              border: 2px solid rgba(255, 255, 255, 0.08);
              flex-shrink: 0;
            }
            .player-dir-info {
              flex: 1;
              min-width: 0;
            }
            .player-dir-name {
              font-family: var(--font-display);
              font-size: 1.05rem;
              font-weight: 800;
              color: #fff;
              margin: 0 0 0.15rem;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              letter-spacing: 0.5px;
            }
            .player-dir-badge-row {
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .player-dir-badge {
              font-size: 0.7rem;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(168, 85, 247, 0.1);
              border: 1px solid rgba(168, 85, 247, 0.25);
              color: #c084fc;
            }
            .no-players-placeholder {
              text-align: center;
              padding: 4rem 2rem;
              color: rgba(255, 255, 255, 0.35);
              background: rgba(255, 255, 255, 0.01);
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.04);
              grid-column: 1 / -1;
            }

            /* Responsive Tweaks */
            @media (max-width: 768px) {
              .portal-container {
                padding: 1rem 0.75rem;
              }
              .players-dir-grid {
                grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                gap: 1rem;
              }
              .player-dir-card {
                padding: 1rem;
                gap: 0.75rem;
              }
              .player-dir-avatar {
                width: 50px;
                height: 50px;
                border-radius: 6px;
              }
              .player-dir-name {
                font-size: 0.95rem;
              }
            }

            @media (max-width: 480px) {
              .players-dir-grid {
                grid-template-columns: 1fr;
              }
              .search-filter-ribbon {
                margin: 0.25rem 0 0.75rem;
              }
              .player-dir-card {
                padding: 0.85rem;
              }
            }
          `}</style>

          <div style={{ textAlign: "center", padding: "0.5rem 0 0.5rem", animation: "rwsFadeUp 0.5s ease-out both" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "4px 14px", borderRadius: "20px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.25)", fontSize: "0.72rem", fontWeight: 600, color: "#c084fc", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: "0.5rem" }}>
              <i className="fa-solid fa-users" /> R2G Community
            </div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 800, color: "#fff", margin: "0 0 0.25rem", letterSpacing: "2px", textTransform: "uppercase", background: "linear-gradient(135deg, #ffffff 0%, #c084fc 50%, #a855f7 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              MEMBERS DIRECTORY
            </h1>
            <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.5)", maxWidth: "550px", margin: "0 auto", lineHeight: 1.4 }}>
              Search and view complete multiversal stats and career details of all R2G tacticians.
            </p>
          </div>

          {/* Search Ribbon */}
          <div className="search-filter-ribbon" style={{ animation: "rwsFadeUp 0.5s ease-out both", animationDelay: "100ms" }}>
            <div className="search-input-wrap">
              <i className="fas fa-search" />
              <input
                type="text"
                className="search-bar-input"
                placeholder="Search by player name or R2G ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Directory Grid */}
          <div className="players-dir-grid" style={{ animation: "rwsFadeUp 0.6s ease-out both", animationDelay: "150ms" }}>
            {filteredPlayers.length === 0 ? (
              <div className="no-players-placeholder">
                <i className="fa-solid fa-user-slash" style={{ fontSize: "2rem", opacity: 0.3, marginBottom: "1rem", display: "block" }} />
                <h3 style={{ color: "#fff", fontSize: "1.1rem", marginBottom: "0.5rem" }}>No members matched</h3>
                <p style={{ fontSize: "0.82rem", margin: 0 }}>Try clearing your search term.</p>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const photoUrl = player.avatar_path 
                  ? player.avatar_path 
                  : `/assets/images/managers/${player.name.toLowerCase().replace(/\s+/g, "-")}.webp`;

                return (
                  <Link
                    key={player.id}
                    href={`/members/${encodeURIComponent(player.r2g_id || player.id)}`}
                    className="player-dir-card"
                  >
                    <div 
                      className="player-dir-avatar"
                      style={{
                        backgroundImage: `url('${photoUrl}'), url('/assets/images/default-manager.webp')`
                      }}
                    />
                    <div className="player-dir-info">
                      <h4 className="player-dir-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {player.r2g_id || player.name}
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: 'linear-gradient(135deg, #a855f7, #6b21a8)', color: '#fff' }}>
                          Lvl {player.level || 1} • {player.league || "Amateur"}
                        </span>
                      </h4>
                      {player.r2g_id && (
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', margin: '0 0 0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {player.name}
                        </p>
                      )}
                    </div>
                    <i className="fas fa-chevron-right" style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.8rem" }} />
                  </Link>
                );
              })
            )}
          </div>

        </div>
      </main>

      <PortalFooter />
    </div>
  );
}
