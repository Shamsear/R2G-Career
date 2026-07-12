"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear, fetchTournaments, fetchFixtures } from "@/utils/solo/serverActions";
import "../../rws.css";

interface Match {
  id: number;
  homeTeam: string;
  homeLogo: string;
  awayTeam: string;
  awayLogo: string;
  homeScore?: number;
  awayScore?: number;
  time: string;
  date: string;
  status: "live" | "upcoming" | "finished";
}

interface Round {
  roundName: string;
  matches: Match[];
}

const mockRounds: Round[] = [
  {
    roundName: "Grand Final",
    matches: [
      {
        id: 1,
        homeTeam: "Neo Tokyo FC",
        homeLogo: "NT",
        awayTeam: "Munich Red Bull",
        awayLogo: "MR",
        homeScore: 0,
        awayScore: 0,
        time: "20:00 UTC",
        date: "June 25, 2026",
        status: "upcoming",
      },
    ],
  },
  {
    roundName: "Semi-Finals",
    matches: [
      {
        id: 2,
        homeTeam: "Neo Tokyo FC",
        homeLogo: "NT",
        awayTeam: "Paris Saint-Germain",
        awayLogo: "PSG",
        homeScore: 3,
        awayScore: 2,
        time: "18:00 UTC",
        date: "June 20, 2026",
        status: "finished",
      },
      {
        id: 3,
        homeTeam: "Rio de Janeiro SC",
        homeLogo: "RJ",
        awayTeam: "Munich Red Bull",
        awayLogo: "MR",
        homeScore: 1,
        awayScore: 2,
        time: "20:30 UTC",
        date: "June 21, 2026",
        status: "finished",
      },
    ],
  },
];

export default function RwsYearFixtures() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);

  const [season, setSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    document.title = `RWS ${yearStr} - Series Fixtures`;
    async function loadData() {
      try {
        if (isNaN(year)) {
          setError("Invalid RWS Year");
          setLoading(false);
          return;
        }

        const s = await fetchSeasonByRwsYear(year);
        if (!s) {
          setError(`No R2G World Series scheduled for year ${yearStr}`);
          setLoading(false);
          return;
        }

        setSeason(s);

        const tournaments = await fetchTournaments();
        const rwsTourney = tournaments.find((t: any) => 
          t.tournament_type === "rws" && t.season_number === s.season_number
        );

        if (rwsTourney) {
          const dbFixtures = await fetchFixtures(rwsTourney.id);
          if (dbFixtures && dbFixtures.length > 0) {
            // Group by round number
            const groupedMap: Record<number, Match[]> = {};
            dbFixtures.forEach((f: any) => {
              const rNum = f.roundNumber || 1;
              if (!groupedMap[rNum]) groupedMap[rNum] = [];
              
              const isFinished = f.homeScore !== null && f.awayScore !== null;
              
              groupedMap[rNum].push({
                id: f.id,
                homeTeam: f.homeClub,
                homeLogo: f.homeLogo,
                awayTeam: f.awayClub,
                awayLogo: f.awayLogo,
                homeScore: f.homeScore ?? undefined,
                awayScore: f.awayScore ?? undefined,
                time: "20:00 UTC",
                date: `Matchday ${rNum}`,
                status: isFinished ? "finished" : "upcoming"
              });
            });

            const mappedRounds: Round[] = Object.keys(groupedMap)
              .map(Number)
              .sort((a, b) => b - a) // Show finals first
              .map((rNum) => {
                let name = `Round ${rNum}`;
                if (rNum === 3) name = "Grand Final";
                else if (rNum === 2) name = "Semi-Finals";
                else if (rNum === 1) name = "Quarter-Finals";
                return {
                  roundName: name,
                  matches: groupedMap[rNum]
                };
              });

            setRounds(mappedRounds);
          } else {
            setRounds(mockRounds);
          }
        } else {
          setRounds(mockRounds);
        }
      } catch (e) {
        console.error("Failed to load RWS fixtures:", e);
        setRounds(mockRounds);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [year, yearStr]);

  if (loading) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: "3rem", color: "var(--solo-primary)", marginBottom: "1.5rem" }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading fixtures...</p>
        </div>
      </div>
    );
  }

  if (error || !season) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to RWS Hub
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Edition Not Found</h2>
            <p style={{ color: "var(--text-secondary)" }}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href={`/rws/${yearStr}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to RWS Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-calendar-days" />
            Tournament Calendar
          </div>
          <h1 className="rws-hero-title">
            SERIES FIXTURES
          </h1>
          <p className="rws-hero-sub">
            Track match schedules, live updates, and official knockout results for the RWS {yearStr} World Series.
          </p>
        </div>

        {/* Grouped rounds */}
        {rounds.map((round, index) => (
          <div key={index} className="rws-round-section">
            <h2 className="round-header">
              <i className="fa-solid fa-circle-play" />
              {round.roundName}
            </h2>
            <div className="fixtures-grid">
              {round.matches.map((match) => (
                <div key={match.id} className="fixture-card">
                  <div className="fixture-meta">
                    <span className="fixture-time">{match.date} // {match.time}</span>
                    <span className={`fixture-status ${match.status}`}>
                      {match.status}
                    </span>
                  </div>

                  <div className="fixture-matchup">
                    <div className="fixture-team home">
                      <div className="team-logo">
                        {(match.homeLogo && (match.homeLogo.startsWith('/') || match.homeLogo.startsWith('http'))) ? (
                          <img src={match.homeLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
                        ) : (
                          (match.homeLogo || match.homeTeam.slice(0, 2)).toUpperCase()
                        )}
                      </div>
                      <span className="team-name">{match.homeTeam}</span>
                    </div>

                    <div className="fixture-score">
                      {match.status === "upcoming" ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>VS</span>
                      ) : (
                        <>
                          <span>{match.homeScore}</span>
                          <span className="score-divider">-</span>
                          <span>{match.awayScore}</span>
                        </>
                      )}
                    </div>

                    <div className="fixture-team">
                      <div className="team-logo">
                        {(match.awayLogo && (match.awayLogo.startsWith('/') || match.awayLogo.startsWith('http'))) ? (
                          <img src={match.awayLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
                        ) : (
                          (match.awayLogo || match.awayTeam.slice(0, 2)).toUpperCase()
                        )}
                      </div>
                      <span className="team-name">{match.awayTeam}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
