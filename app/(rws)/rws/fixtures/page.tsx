"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActiveSeason, fetchTournaments, fetchFixtures } from "@/utils/solo/serverActions";

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

export default function RwsFixtures() {
  const [seasonNum, setSeasonNum] = useState<number>(7);
  const [rounds, setRounds] = useState<Round[]>([]);

  useEffect(() => {
    document.title = "RWS - Series Fixtures";
    async function loadData() {
      try {
        const season = await fetchActiveSeason();
        if (season && season.season_number) {
          setSeasonNum(season.season_number);
        }

        const tournaments = await fetchTournaments();
        const rwsTourney = tournaments.find((t: any) => 
          t.tournament_type === "rws"
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
                homeLogo: (f.homeLogo || f.homeClub.slice(0, 2)).toUpperCase(),
                awayTeam: f.awayClub,
                awayLogo: (f.awayLogo || f.awayClub.slice(0, 2)).toUpperCase(),
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
      }
    }
    loadData();
  }, []);

  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />

      <div className="portal-container">
        
        {/* Breadcrumb back nav */}
        <div className="portal-breadcrumb">
          <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
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
            Track match schedules, live updates, and official knockout results for the Season {seasonNum} World Series.
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
                      <div className="team-logo">{match.homeLogo}</div>
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
                      <div className="team-logo">{match.awayLogo}</div>
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
