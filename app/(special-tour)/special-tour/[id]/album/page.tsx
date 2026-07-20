"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchTournamentById, fetchSpecialTourAlbumPhotos } from "@/utils/solo/serverActions";
import "../../../../(rws)/rws/rws.css";
import RwsFullPageLoading from "@/components/common/RwsFullPageLoading";

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
    title: "Special Invitational Kickoff",
    date: "July 2026",
    tag: "Matchday",
    imageUrl: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80",
    tiltClass: "tilt-left",
  },
  {
    id: 2,
    title: "Tournament Semi-Final Clash",
    date: "July 2026",
    tag: "Highlights",
    imageUrl: "https://images.unsplash.com/photo-1518091043644-c1d4457512c6?w=600&auto=format&fit=crop&q=80",
    tiltClass: "tilt-right",
  },
  {
    id: 3,
    title: "Championship Trophy Ceremony",
    date: "July 2026",
    tag: "Ceremony",
    imageUrl: "https://images.unsplash.com/photo-1486282424096-58681347d19e?w=600&auto=format&fit=crop&q=80",
    tiltClass: "tilt-straight",
  },
];

export default function SpecialTourAlbum() {
  const params = useParams();
  const tourneyId = parseInt(params.id as string, 10);

  const [tournament, setTournament] = useState<any>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    async function loadAlbum() {
      try {
        if (isNaN(tourneyId)) {
          setError("Invalid Tournament ID");
          setLoading(false);
          return;
        }

        const t = await fetchTournamentById(tourneyId);
        if (!t) {
          setError(`No Special Tournament details found for ID ${tourneyId}`);
          setLoading(false);
          return;
        }
        setTournament(t);
        document.title = `${t.name} - Trophy Album`;

        const dbPhotos = await fetchSpecialTourAlbumPhotos(tourneyId);
        if (dbPhotos && dbPhotos.length > 0) {
          const tilts: ("tilt-left" | "tilt-right" | "tilt-straight")[] = ["tilt-left", "tilt-right", "tilt-straight"];
          const mapped = dbPhotos.map((p: any, idx: number) => ({
            id: p.id,
            title: p.title,
            date: p.date_str || "Special Event",
            tag: p.tag || "Tournament",
            imageUrl: p.image_url,
            tiltClass: tilts[idx % tilts.length],
          }));
          setPhotos(mapped);
        } else {
          setPhotos(mockPhotos);
        }
      } catch (err: any) {
        console.error("Error loading album photos:", err);
        setError(err.message || "Failed to load album photos.");
      } finally {
        setLoading(false);
      }
    }

    loadAlbum();
  }, [tourneyId]);

  if (loading) {
    return <RwsFullPageLoading text="Loading tournament photo gallery" />;
  }

  if (error || !tournament) {
    return (
      <div className="portal-root-wrapper">
        <div className="portal-bg-grid" />
        <div className="portal-glow-orb-1" />
        <div className="portal-glow-orb-2" />
        <div className="portal-container" style={{ maxWidth: "800px", textAlign: "center", paddingTop: "5rem" }}>
          <div className="portal-breadcrumb" style={{ textAlign: "left" }}>
            <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
              <i className="fas fa-arrow-left" /> Back to Tournament Hub
            </Link>
          </div>
          <div className="portal-card" style={{ padding: "3rem", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "16px" }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: "3rem", color: "#ef4444", marginBottom: "1.5rem" }} />
            <h2 style={{ fontSize: "1.5rem", color: "#fff", marginBottom: "1rem" }}>Tournament Not Found</h2>
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
        
        {/* Navigation Breadcrumbs */}
        <div className="portal-breadcrumb">
          <Link href={`/special-tour/${tourneyId}`} className="portal-btn btn-secondary back-link-btn">
            <i className="fas fa-arrow-left" /> Back to Tournament Hub
          </Link>
        </div>

        {/* Hero Header */}
        <div className="rws-page-hero">
          <div className="portal-page-badge">
            <i className="fa-solid fa-images" />
            Moments Gallery
          </div>
          <h1 className="rws-hero-title">
            TROPHY ALBUM
          </h1>
          <p className="rws-hero-sub">
            Browse official ceremony snapshots, matchday highlights, and golden trophy moments of {tournament.name}.
          </p>
        </div>

        {/* Album Gallery Grid */}
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
              <div
                key={photo.id}
                className={`album-item ${photo.tiltClass}`}
                onClick={() => setSelectedPhoto(photo)}
              >
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
                  <h3 className="album-title">{photo.title}</h3>
                  <div className="album-meta-row">
                    <span className="album-tag">#{photo.tag}</span>
                    <span>{photo.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Lightbox Modal */}
        {selectedPhoto && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(12px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem"
            }}
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              style={{
                position: "relative",
                maxWidth: "900px",
                width: "100%",
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 25px 60px rgba(0,0,0,0.6)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: "absolute",
                  right: "1rem",
                  top: "1rem",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem"
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>

              <div style={{ borderRadius: "12px", overflow: "hidden", maxHeight: "70vh", display: "flex", justifyContent: "center", background: "#000" }}>
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>

              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", color: "#fff", margin: "0 0 0.2rem 0", fontWeight: 800 }}>{selectedPhoto.title}</h2>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{selectedPhoto.date}</span>
                </div>
                <span style={{
                  padding: "4px 12px",
                  borderRadius: "12px",
                  background: "rgba(168,85,247,0.15)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "#c084fc",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase"
                }}>
                  {selectedPhoto.tag}
                </span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
