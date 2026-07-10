"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchActiveSeason, fetchRwsAlbumPhotos } from "@/utils/solo/serverActions";

interface Photo {
  id: number;
  title: string;
  date: string;
  tag: string;
  imageUrl: string;
  tiltClass: "tilt-left" | "tilt-right" | "tilt-straight";
}

const mockPhotos: Photo[] = [
  {
    id: 1,
    title: "Season 7 Opening Ceremony",
    date: "June 15, 2026",
    tag: "Ceremony",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-left",
  },
  {
    id: 2,
    title: "Semi-Final Matchday Triumph",
    date: "June 20, 2026",
    tag: "Matchday",
    imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-right",
  },
  {
    id: 3,
    title: "Nomination Gala Stage",
    date: "June 12, 2026",
    tag: "Banquet",
    imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-straight",
  },
  {
    id: 4,
    title: "Live Draft Board Room",
    date: "June 10, 2026",
    tag: "Draft",
    imageUrl: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-right",
  },
  {
    id: 5,
    title: "Grand Final Arena Pitch",
    date: "June 24, 2026",
    tag: "Stadium",
    imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-left",
  },
  {
    id: 6,
    title: "Championship Trophy Reveal",
    date: "June 25, 2026",
    tag: "Trophy",
    imageUrl: "https://images.unsplash.com/photo-1486282424096-58681347d19e?w=500&auto=format&fit=crop&q=80",
    tiltClass: "tilt-straight",
  },
];

export default function RwsAlbum() {
  const [rwsYear, setRwsYear] = useState<number | null>(2026);
  const [soloSeasonNum, setSoloSeasonNum] = useState<number>(9);
  const [hasRws, setHasRws] = useState<boolean>(true);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    document.title = "RWS - Trophy Album";
    async function loadData() {
      try {
        const season = await fetchActiveSeason();
        if (season) {
          setHasRws(!!season.has_rws);
          setSoloSeasonNum(season.season_number);
          setRwsYear(season.rws_year || null);
        }
        
        const dbPhotos = await fetchRwsAlbumPhotos();
        if (dbPhotos && dbPhotos.length > 0) {
          const mapped = dbPhotos.map((p: any, idx: number) => {
            const tilts: ("tilt-left" | "tilt-right" | "tilt-straight")[] = ["tilt-left", "tilt-right", "tilt-straight"];
            return {
              id: p.id,
              title: p.title,
              date: p.date_str,
              tag: p.tag,
              imageUrl: p.image_url,
              tiltClass: tilts[idx % 3]
            };
          });
          setPhotos(mapped);
        } else {
          setPhotos(mockPhotos);
        }
      } catch (e) {
        console.error("Failed to load active season or photos:", e);
        setPhotos(mockPhotos);
      }
    }
    loadData();
  }, []);

  if (!hasRws) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to RWS Hub
            </Link>
          </div>
          <div className="admin-card" style={{ padding: "3rem 2rem", background: "rgba(15, 23, 42, 0.6)", border: "1px solid rgba(236, 72, 153, 0.2)" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1.5rem", color: "var(--solo-primary)" }}>
              <i className="fa-solid fa-trophy" />
            </div>
            <h1 className="portal-title" style={{ fontSize: "2rem", marginBottom: "1rem" }}>TROPHY ALBUM</h1>
            <p className="portal-subtitle" style={{ fontSize: "1.1rem", color: "#94a3b8", lineHeight: "1.6" }}>
              The Road to Glory World Series (RWS) is not scheduled for Solo Tour Season {soloSeasonNum}.
            </p>
            <div style={{ marginTop: "2rem" }}>
              <Link href="/rws" className="portal-btn btn-primary" style={{ display: "inline-flex", padding: "10px 24px" }}>
                Return to RWS Hub
              </Link>
            </div>
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
          <Link href="/rws" className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to RWS Hub
          </Link>
        </div>

        {/* Hero Section */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-images" />
            Moments Gallery
          </div>
          <h1 className="rws-hero-title">
            TROPHY ALBUM
          </h1>
          <p className="rws-hero-sub">
            Browse through snaps of live draft boards, semifinal celebrations, and golden trophy moments of the R2G World Series.
          </p>
        </div>

        {/* Album grid */}
        <div className="album-gallery">
          {photos.map((photo) => (
            <div key={photo.id} className={`album-item ${photo.tiltClass}`}>
              <div className="album-image-wrapper">
                <img 
                  src={photo.imageUrl} 
                  alt={photo.title} 
                  className="album-img"
                  loading="lazy"
                />
                <div className="album-overlay" />
              </div>
              <div className="album-details">
                <h3 className="album-title">{photo.title.replace("Season 7", rwsYear ? `RWS ${rwsYear}` : "RWS")}</h3>
                <div className="album-meta-row">
                  <span className="album-tag">#{photo.tag}</span>
                  <span>{photo.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
