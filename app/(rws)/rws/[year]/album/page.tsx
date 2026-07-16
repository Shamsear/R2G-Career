"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchSeasonByRwsYear, fetchRwsAlbumPhotos } from "@/utils/solo/serverActions";
import "../../rws.css";

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
    title: "Opening Ceremony",
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

function RwsFullPageLoading({ text }: { text: string }) {
  return (
    <div className="portal-root-wrapper">
      <div className="portal-bg-grid" />
      <div className="portal-glow-orb-1" />
      <div className="portal-glow-orb-2" />
      <div className="portal-container" style={{ display: "flex", minHeight: "80vh", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          background: "rgba(255, 255, 255, 0.01)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.05)",
          padding: "3rem",
          borderRadius: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
          maxWidth: "320px",
          width: "100%",
          animation: "rwsFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both"
        }}>
          <div style={{ position: "relative", width: "70px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid transparent", borderTopColor: "#a855f7", borderRightColor: "#c084fc", animation: "rwsSpin 1.1s linear infinite" }} />
            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(168, 85, 247, 0.08)", border: "1px solid rgba(168, 85, 247, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", animation: "rwsPulse 1.2s infinite alternate" }}>
              <i className="fa-solid fa-trophy" style={{ color: "#c084fc", fontSize: "1rem" }} />
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", fontWeight: 800, color: "#fff", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              R2G // WORLD SERIES
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", letterSpacing: "0.5px" }}>
              {text}...
            </div>
          </div>
          <div style={{ width: "100px", height: "2px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "10px", overflow: "hidden", position: "relative" }}>
            <div style={{ position: "absolute", height: "100%", width: "60%", background: "linear-gradient(90deg, #a855f7, #c084fc)", borderRadius: "10px", animation: "rwsLoadingBar 1.6s ease-in-out infinite" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RwsYearAlbum() {
  const params = useParams();
  const yearStr = params.year as string;
  const year = parseInt(yearStr, 10);

  const [season, setSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);

  useEffect(() => {
    document.title = `RWS ${yearStr} - Trophy Album`;
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

        const dbPhotos = await fetchRwsAlbumPhotos(s.id);
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
          setPhotos([]);
        }
      } catch (e) {
        console.error("Failed to load active season or photos:", e);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [year, yearStr]);

  if (loading) {
    return <RwsFullPageLoading text="Loading gallery" />;
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
            <i className="fa-solid fa-images" />
            Moments Gallery
          </div>
          <h1 className="rws-hero-title">
            TROPHY ALBUM
          </h1>
          <p className="rws-hero-sub">
            Browse snaps of live draft boards, semifinal celebrations, and golden trophy moments of RWS {yearStr}.
          </p>
        </div>

        {/* Album grid */}
        {photos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "5rem 2rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px", color: "var(--text-secondary)" }}>
            <i className="fa-solid fa-images" style={{ fontSize: "3rem", marginBottom: "1.5rem", color: "var(--solo-primary)", opacity: 0.4 }} />
            <h3 style={{ color: "#fff", fontSize: "1.2rem", marginBottom: "0.5rem" }}>No Album Snaps Uploaded</h3>
            <p style={{ fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto", color: "rgba(255,255,255,0.4)" }}>
              The gallery is currently empty. Administrators can upload tournament highlights and awards from the Admin Console.
            </p>
          </div>
        ) : (
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
                  <h3 className="album-title">{photo.title.replace("Season 7", `RWS ${yearStr}`)}</h3>
                  <div className="album-meta-row">
                    <span className="album-tag">#{photo.tag}</span>
                    <span>{photo.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
